"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Valuation", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Agent", href: "/agent" },
    { name: "Admin", href: "/admin" },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-green-600 text-white p-2 rounded-lg font-bold text-sm tracking-wide shadow-sm">
            ♻️ ReCircuit
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-150 ${
                  isActive
                    ? "bg-green-50 text-green-700 font-semibold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Auth / Action */}
        <div>
          <Link
            href="/login"
            className="text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}