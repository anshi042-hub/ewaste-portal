import ValuationCalculator from "@/components/ValuationCalculator";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900">E-Waste EPR Recycling Portal</h1>
        <p className="text-gray-600 mt-2">Turn electronic scrap into verified green credits</p>
      </div>
      <ValuationCalculator />
    </main>
  );
}