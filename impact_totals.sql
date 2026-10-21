-- =====================================================================
-- Impact totals + atomic pickup completion.
-- Run once in the Supabase SQL Editor (runs as postgres) after ewaste_schema.sql.
-- Safe to re-run: every statement is idempotent.
-- =====================================================================

-- 1. Impact totals on profiles (what the dashboard reads).
--    The 0-1000 impact score is NOT stored: it is derived from these in lib/valuation.ts.
alter table public.profiles
  add column if not exists total_co2_saved_kg       numeric(14,4) not null default 0 check (total_co2_saved_kg >= 0),
  add column if not exists total_copper_reclaimed_g numeric(14,2) not null default 0 check (total_copper_reclaimed_g >= 0),
  add column if not exists total_weight_recycled_kg numeric(14,2) not null default 0 check (total_weight_recycled_kg >= 0),
  add column if not exists pickups_completed        integer       not null default 0 check (pickups_completed >= 0);

-- 2. Make the copper unit explicit (the trigger and the app both rely on it).
comment on column public.scrap_categories.copper_yield_per_kg is
  'kg of copper recovered per 1 kg of scrap (e.g. 0.05 = 5%). Reported in grams on the dashboard (x1000).';

-- 3. Certificate trigger: issues the EPR credit AND increments the customer's totals,
--    in the same transaction as the status change. SECURITY DEFINER, so agents never need
--    write access to epr_credits or to other users' profiles.
create or replace function public.issue_epr_credit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_co2      numeric;
  v_copper_g numeric;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then

    -- certificate_code comes from the column default and is protected by a UNIQUE constraint
    insert into public.epr_credits (pickup_id, total_co2_offset)
    select new.id, round(new.final_weight * c.co2_saved_per_kg, 4)
    from public.scrap_categories c
    where c.id = new.category_id
    on conflict (pickup_id) do nothing
    returning total_co2_offset into v_co2;

    -- Only increment when a certificate was actually issued (keeps it idempotent)
    if found then
      select round(new.final_weight * c.copper_yield_per_kg * 1000, 2)
        into v_copper_g
      from public.scrap_categories c
      where c.id = new.category_id;

      update public.profiles
      set total_co2_saved_kg       = total_co2_saved_kg + v_co2,
          total_copper_reclaimed_g = total_copper_reclaimed_g + coalesce(v_copper_g, 0),
          total_weight_recycled_kg = total_weight_recycled_kg + new.final_weight,
          pickups_completed        = pickups_completed + 1
      where id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;

-- 4. Stop users editing their own totals through the "update own profile" policy.
--    Changes made inside the SECURITY DEFINER trigger run as the table owner
--    (current_user is not 'authenticated'), so they pass.
create or replace function public.profiles_guard_impact()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon')
     and public.get_user_role() is distinct from 'admin'
     and (   new.total_co2_saved_kg       is distinct from old.total_co2_saved_kg
          or new.total_copper_reclaimed_g is distinct from old.total_copper_reclaimed_g
          or new.total_weight_recycled_kg is distinct from old.total_weight_recycled_kg
          or new.pickups_completed        is distinct from old.pickups_completed) then
    raise exception 'Impact totals are managed by the system';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_impact on public.profiles;
create trigger trg_profiles_guard_impact
  before update on public.profiles
  for each row execute function public.profiles_guard_impact();

-- 5. complete_pickup(): the one call the field-agent modal makes.
--    Two guarded updates (scheduled -> verified -> completed) in ONE transaction, then it returns
--    everything the receipt needs, including the certificate code - which the agent cannot SELECT
--    afterwards because completed pickups drop out of the agent's read policy.
--    SECURITY DEFINER, so ownership is checked by hand; the pickups guard trigger still runs
--    (auth.uid() is the caller's), and pricing/certificate/totals come from the triggers.
create or replace function public.complete_pickup(
  p_pickup_id            uuid,
  p_final_weight         numeric,
  p_condition_multiplier numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid    := (select auth.uid());
  v_role    text    := public.get_user_role();
  v_weight  numeric := round(p_final_weight, 2);
  v_mult    numeric := round(p_condition_multiplier, 2);
  v_pickup  public.pickups%rowtype;
  v_cat     public.scrap_categories%rowtype;
  v_cert    text;
  v_co2     numeric;
begin
  if v_uid is null or v_role not in ('agent', 'admin') then
    raise exception 'Only field agents can complete pickups' using errcode = '42501';
  end if;
  if v_weight is null or v_weight <= 0 then
    raise exception 'Final weight must be at least 0.01 kg';
  end if;
  if v_mult is null or v_mult <= 0 or v_mult > 1 then
    raise exception 'Condition multiplier must be between 0 and 1';
  end if;

  -- Lock the row so two devices can't complete the same pickup twice.
  select * into v_pickup from public.pickups where id = p_pickup_id for update;
  if not found or (v_role = 'agent' and v_pickup.agent_id is distinct from v_uid) then
    raise exception 'Pickup not found or not assigned to you' using errcode = '42501';
  end if;
  if v_pickup.status = 'completed' then
    raise exception 'This pickup is already completed';
  end if;

  update public.pickups
     set final_weight = v_weight, condition_multiplier = v_mult, status = 'verified'
   where id = p_pickup_id;

  update public.pickups set status = 'completed' where id = p_pickup_id;  -- fires issue_epr_credit

  select e.certificate_code, e.total_co2_offset
    into v_cert, v_co2
  from public.epr_credits e where e.pickup_id = p_pickup_id;

  select * into v_pickup from public.pickups where id = p_pickup_id;
  select * into v_cat from public.scrap_categories where id = v_pickup.category_id;

  return jsonb_build_object(
    'final_weight',        v_pickup.final_weight,
    'final_price',         v_pickup.final_price,
    'certificate_code',    v_cert,
    'co2_saved_kg',        v_co2,
    'copper_reclaimed_g',  round(v_pickup.final_weight * v_cat.copper_yield_per_kg * 1000, 2)
  );
end;
$$;

revoke execute on function public.complete_pickup(uuid, numeric, numeric) from public, anon;
grant  execute on function public.complete_pickup(uuid, numeric, numeric) to authenticated;

-- 6. Backfill for pickups completed before this migration. It SETS totals from the certificates
--    (it does not add), so it is safe to run more than once.
update public.profiles pr
set total_co2_saved_kg       = s.co2,
    total_copper_reclaimed_g = s.copper_g,
    total_weight_recycled_kg = s.kg,
    pickups_completed        = s.n
from (
  select p.user_id,
         sum(e.total_co2_offset)                                      as co2,
         sum(round(p.final_weight * c.copper_yield_per_kg * 1000, 2)) as copper_g,
         sum(p.final_weight)                                          as kg,
         count(*)                                                     as n
  from public.pickups p
  join public.epr_credits e      on e.pickup_id = p.id
  join public.scrap_categories c on c.id = p.category_id
  group by p.user_id
) s
where pr.id = s.user_id;
