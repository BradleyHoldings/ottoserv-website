"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminAccess() {
  useEffect(() => {
    window.location.replace("/login");
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Admin access moved</h1>
        <p className="text-gray-400">Use the primary OttoServ login to create the secure admin session.</p>
        <Link href="/login" className="mt-5 inline-flex rounded-md bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700">
          Go to login
        </Link>
      </div>
    </div>
  );
}
