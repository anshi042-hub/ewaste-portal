"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Pickup {
  id: number;
  estimated_weight: number;
  estimated_price: number;
  address: string;
  status: string;
  scheduled_at: string;
}

export default function ConsumerDashboard() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserPickups() {
      const { data, error } = await supabase
        .from("pickups")
        .select("*")
        .order("scheduled_at", { ascending: false });

      if (error) console.error("Error fetching pickups:", error);
      else setPickups(data || []);
      setLoading(false);
    }
    fetchUserPickups();
  }, []);

  const totalCO2Saved = pickups.reduce((acc, p) => acc + Number(p.estimated_weight) * 12, 0).toFixed(1);
  const totalEarnings = pickups.reduce((acc, p) => acc + Number(p.estimated_price), 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Consumer Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Track your scheduled e-waste pickups, earnings, and ecological impact.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pickups</span>
          <p className="text-3xl font-bold text-gray-900 mt-2">{pickups.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Payout Earned</span>
          <p className="text-3xl font-bold text-green-600 mt-2">₹{totalEarnings}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">CO₂ Offset Saved</span>
          <p className="text-3xl font-bold text-emerald-600 mt-2">🌱 {totalCO2Saved} kg</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Your Pickup History</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading pickups...</div>
        ) : pickups.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">No pickups scheduled yet. Head to Valuation to book one!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Pickup Address</th>
                  <th className="px-6 py-3">Weight</th>
                  <th className="px-6 py-3">Payout</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {pickups.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">#REQ-{p.id}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{p.address}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{p.estimated_weight} kg</td>
                    <td className="px-6 py-4 text-green-600 font-semibold">₹{p.estimated_price}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 capitalize">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}