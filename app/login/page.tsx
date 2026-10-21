"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setLoading(false);
      setErrorMsg(authError?.message || "Invalid login credentials.");
      return;
    }

    // 2. Fetch the user's role from the database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    setLoading(false);

    if (profileError || !profile) {
      // Default fallback if profile row isn't created yet
      router.push("/dashboard");
      return;
    }

    // 3. Route based on verified role
    if (profile.role === "admin") {
      router.push("/admin");
    } else if (profile.role === "agent") {
      router.push("/agent");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-xs">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in to ReCircuit</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your credentials to access your portal.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm transition shadow-xs"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}