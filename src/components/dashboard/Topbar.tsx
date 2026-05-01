"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface TopbarProps {
  title?: string;
}

export default function Topbar({ title }: TopbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("ottoserv_token");
    localStorage.removeItem("ottoserv_client");
    router.push("/login");
  };

  return (
    <header className="h-14 bg-[#0a0a0a] border-b border-gray-800 flex items-center px-6 gap-4 sticky top-16 z-30">
      {title && (
        <h1 className="text-white font-semibold hidden lg:block">{title}</h1>
      )}

      <div className="flex items-center gap-3 ml-auto">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-[#1f2937] border border-gray-700 rounded-lg px-3 py-1.5 w-56">
          <span className="text-gray-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-gray-300 text-sm outline-none w-full placeholder:text-gray-500"
          />
        </div>

        {/* Notifications bell */}
        <button className="relative p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-600/50 flex items-center justify-center text-blue-400 text-xs font-semibold">
              U
            </div>
            <svg className="w-4 h-4 text-gray-500 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#111827] border border-gray-700 rounded-xl shadow-xl z-50">
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/dashboard/settings");
                    }}
                    className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg text-sm"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-red-400 hover:bg-gray-800 rounded-lg text-sm"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
