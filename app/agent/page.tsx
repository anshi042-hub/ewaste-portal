"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Pickup {
  id: number;
  estimated_weight: number;
  estimated_price: number;
  address: string;
  status: string;
  scheduled_at?: string;
}

export default function AgentPortal() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPickups = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pickups").select("*").order("id", { ascending: false });
    if (error) console.error("Error fetching pickups:", error);
    else setPickups(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPickups();
  }, []);

  const completePickup = async (id: number) => {
    const { error } = await supabase
      .from("pickups")
      .update({ status: "completed" })
      .eq("id", id);

    if (!error) {
      alert(`Pickup #REQ-${id} verified and completed! Receipt generated.`);
      fetchPickups();
    } else {
      alert("Error updating pickup status.");
    }
  };

  // Metrics calculations
  const remainingCount = pickups.filter((p) => p.status === "scheduled" || p.status === "pending").length;
  const completedPickups = pickups.filter((p) => p.status === "completed");
  const collectedWeight = completedPickups.reduce((acc, p) => acc + Number(p.estimated_weight), 0).toFixed(1);
  const totalPaidOut = completedPickups.reduce((acc, p) => acc + Number(p.estimated_price), 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
          Field Agent
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-2">Good morning, Agent</h1>
        <p className="text-sm text-gray-500 mt-1">
          Weigh each item on-site, confirm its condition, then complete the pickup to issue a receipt.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</span>
          <p className="text-3xl font-bold text-gray-900 mt-2">{remainingCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Collected</span>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{collectedWeight} kg</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Paid out</span>
          <p className="text-3xl font-bold text-green-600 mt-2">₹{totalPaidOut}</p>
        </div>
      </div>

      {/* Pickups Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">Today&apos;s pickups</h2>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
            {pickups.length} assigned
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading assigned route...</div>
        ) : pickups.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">No pickups currently assigned on your route.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Slot / ID</th>
                  <th className="px-6 py-3.5">Customer & Address</th>
                  <th className="px-6 py-3.5">Est. Weight & Payout</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {pickups.map((p) => {
                  const isCompleted = p.status === "completed";
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 align-top">
                        <span className="font-semibold text-gray-950 block">09:00 – 11:00</span>
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 inline-block mt-1">
                          #REQ-{p.id}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top max-w-xs">
                        <p className="text-gray-900 font-medium">{p.address}</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="text-gray-900 font-medium">{p.estimated_weight} kg</p>
                        <p className="text-xs font-semibold text-green-600 mt-0.5">₹{p.estimated_price}</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-right">
                        {!isCompleted ? (
                          <button
                            onClick={() => completePickup(p.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition"
                          >
                            Verify Pickup
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg inline-block">
                            Receipt Issued
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}