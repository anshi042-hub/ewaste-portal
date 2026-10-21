"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ScrapCategory {
  id: number;
  name: string;
  base_rate_per_kg: number;
  co2_saved_per_kg: number;
  copper_yield_per_kg: number;
}

export default function ValuationCalculator() {
  const [categories, setCategories] = useState<ScrapCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [weight, setWeight] = useState<number>(1);
  const [condition, setCondition] = useState<number>(1.0);
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    async function fetchCategories() {
     const { data, error } = await supabase.from("scrap_categories").select("*");
      if (error) console.error("Error fetching rates:", error);
      else if (data && data.length > 0) {
        setCategories(data);
        setSelectedCategoryId(data[0].id.toString());
      }
    }
    fetchCategories();
  }, []);

  const selectedCategory = categories.find((c) => c.id.toString() === selectedCategoryId);
  const baseRate = selectedCategory ? selectedCategory.base_rate_per_kg : 0;
  const estimatedPrice = Math.round(baseRate * weight * condition);
  const co2Saved = selectedCategory ? (selectedCategory.co2_saved_per_kg * weight).toFixed(1) : "0";

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("pickups").insert([
      {
        category_id: Number(selectedCategoryId),
        estimated_weight: weight,
        condition_multiplier: condition,
        estimated_price: estimatedPrice,
        address: address,
        status: "scheduled",
        scheduled_at: new Date().toISOString(),
      },
    ]);

    setLoading(false);
    if (error) {
      setMessage(`Booking failed: ${error.message}`);
    } else {
      setMessage("✅ Pickup scheduled successfully! A field agent will be assigned.");
      setAddress("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-xl border border-gray-100 my-8">
      <h2 className="text-2xl font-bold text-green-700 mb-2">E-Waste Valuation & Pickup</h2>
      <p className="text-gray-600 mb-6">Estimate your payout and schedule doorstep pickup.</p>

      <div className="space-y-4 bg-green-50 p-4 rounded-lg mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scrap Category</label>
          <select
            className="w-full p-2 border rounded-md text-gray-800"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} (₹{cat.base_rate_per_kg}/kg)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              className="w-full p-2 border rounded-md text-gray-800"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <select
              className="w-full p-2 border rounded-md text-gray-800"
              value={condition}
              onChange={(e) => setCondition(Number(e.target.value))}
            >
              <option value={1.0}>Working Condition (100%)</option>
              <option value={0.8}>Partially Damaged (80%)</option>
              <option value={0.5}>Dead Scrap / Wires (50%)</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-green-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-500 block">Environmental Offset</span>
            <span className="text-sm font-semibold text-green-800">🌱 Saves {co2Saved} kg CO2</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Estimated Payout</span>
            <span className="text-2xl font-extrabold text-green-700">₹{estimatedPrice}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleBooking} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Address</label>
          <textarea
            required
            rows={2}
            className="w-full p-2 border rounded-md text-gray-800"
            placeholder="Enter full address with pincode..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-md transition duration-200"
        >
          {loading ? "Scheduling..." : "Confirm & Schedule Pickup"}
        </button>

        {message && <p className="text-center font-medium text-sm mt-2">{message}</p>}
      </form>
    </div>
  );
}