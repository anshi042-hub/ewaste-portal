"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ScrapCategory {
  id: number;
  name: string;
  type?: string;
  base_rate_per_kg: number;
  description?: string;
  co2_saved_per_kg?: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"pricing" | "inventory" | "compliance">("pricing");
  const [filter, setFilter] = useState<"all" | "metal" | "device">("all");
  const [categories, setCategories] = useState<ScrapCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState({ totalPickups: 0, totalWeight: 0, totalPayout: 0 });

  // Fetch categories & stats from Supabase
  const fetchData = async () => {
    setLoading(true);
    const { data: catData } = await supabase.from("scrap_categories").select("*");
    if (catData) setCategories(catData);

    const { data: pickupData } = await supabase.from("pickups").select("*");
    if (pickupData) {
      const totalPickups = pickupData.length;
      const totalWeight = pickupData.reduce((acc, p) => acc + Number(p.estimated_weight), 0);
      const totalPayout = pickupData.reduce((acc, p) => acc + Number(p.estimated_price), 0);
      setStats({ totalPickups, totalWeight, totalPayout });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle rate input change locally
  const handleRateChange = (id: number, newRate: string) => {
    setCategories(
      categories.map((cat) => (cat.id === id ? { ...cat, base_rate_per_kg: Number(newRate) } : cat))
    );
  };

  // Save updated rates to Supabase
  const handleSaveRates = async () => {
    setSaving(true);
    setMessage("");

    for (const cat of categories) {
      await supabase
        .from("scrap_categories")
        .update({ base_rate_per_kg: cat.base_rate_per_kg })
        .eq("id", cat.id);
    }

    setSaving(false);
    setMessage("✅ Rates updated successfully across the platform!");
    setTimeout(() => setMessage(""), 4000);
  };

  // Filtered categories
  const filteredCategories = categories.filter((cat) => {
    if (filter === "metal") return cat.type?.toLowerCase() === "metal";
    if (filter === "device") return cat.type?.toLowerCase() === "device";
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set scrap rates, monitor collected stock and report recycling outcomes for EPR compliance.
        </p>
      </div>

      {/* Admin Sub-Tabs */}
      <div className="flex border-b border-gray-200 mb-8 gap-8">
        <button
          onClick={() => setActiveTab("pricing")}
          className={`pb-3 text-sm font-medium border-b-2 transition ${
            activeTab === "pricing"
              ? "border-green-600 text-green-700 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Dynamic Pricing
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`pb-3 text-sm font-medium border-b-2 transition ${
            activeTab === "inventory"
              ? "border-green-600 text-green-700 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Warehouse Inventory
        </button>
        <button
          onClick={() => setActiveTab("compliance")}
          className={`pb-3 text-sm font-medium border-b-2 transition ${
            activeTab === "compliance"
              ? "border-green-600 text-green-700 font-semibold"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          EPR Compliance
        </button>
      </div>

      {/* TAB 1: DYNAMIC PRICING */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Per-kg base rates</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Rates feed the customer valuation calculator and field agent payouts. Changes apply after saving.
              </p>
            </div>
            {/* Filter Pills */}
            <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-md transition ${filter === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600"}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("metal")}
                className={`px-3 py-1.5 rounded-md transition ${filter === "metal" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600"}`}
              >
                Metals
              </button>
              <button
                onClick={() => setFilter("device")}
                className={`px-3 py-1.5 rounded-md transition ${filter === "device" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600"}`}
              >
                Devices
              </button>
            </div>
          </div>

          {/* Rates Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-sm text-gray-500">Loading dynamic rates...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Item</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Rate (₹/kg)</th>
                    <th className="px-6 py-3.5 text-right">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{cat.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{cat.description || "Standard e-waste scrap grade"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {cat.type || "Device"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 focus:outline-none"
                          value={cat.base_rate_per_kg}
                          onChange={(e) => handleRateChange(cat.id, e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-4 text-right text-gray-400 font-medium">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Footer Action */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {message ? <b className="text-green-600">{message}</b> : "No unsaved changes"}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={fetchData}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveRates}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  {saving ? "Saving..." : "Save rates"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WAREHOUSE INVENTORY */}
      {activeTab === "inventory" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Plant Pickups</span>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPickups}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Weight Stored</span>
            <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.totalWeight} kg</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Payout Disbursed</span>
            <p className="text-3xl font-bold text-green-600 mt-2">₹{stats.totalPayout}</p>
          </div>
        </div>
      )}

      {/* TAB 3: EPR COMPLIANCE */}
      {activeTab === "compliance" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Extended Producer Responsibility (EPR) Overview</h2>
          <p className="text-sm text-gray-600">
            All processed e-waste weights are audited and reported to comply with statutory recycling quotas. Your live collection feed is actively synchronizing with Supabase.
          </p>
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
            Database Connected & Live Sync Enabled
          </div>
        </div>
      )}
    </div>
  );
}