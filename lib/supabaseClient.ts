import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ CRITICAL: Supabase environment variables are missing! Make sure they start with NEXT_PUBLIC_")
}

export const supabase = createClient(supabaseUrl, supabaseKey)