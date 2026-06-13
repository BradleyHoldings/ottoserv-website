"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PlatformLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{backgroundColor: 'var(--otto-gray-900)'}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
            OttoServ
          </Link>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-medium">Enterprise Platform</p>
          <h1 className="text-xl font-bold text-white mt-5">One OttoServ login</h1>
          <p className="text-gray-400 text-sm mt-1">Use the primary OS login for platform access.</p>
        </div>

        <div className="border rounded-xl p-8 text-center" style={{backgroundColor: 'var(--otto-gray-800)', borderColor: 'var(--otto-gray-700)'}}>
          <p className="text-gray-300 text-sm">
            OttoServ now uses one secure login for the OS and Enterprise Platform.
          </p>
          <Link href="/login" className="mt-5 inline-flex w-full justify-center rounded-md bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
            Continue to OttoServ Login
          </Link>
          <Link href="/platform/forgot-password" className="mt-4 block text-blue-400 hover:text-blue-300 transition-colors text-sm">
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
}
