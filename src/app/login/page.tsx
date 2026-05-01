"use client";

import { loginAsJonathan, loginAsDemo } from "@/lib/userAuth";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Otto<span className="text-orange-400">Serv</span>
          </h1>
          <p className="text-gray-400">Access your AI-powered operating system</p>
        </div>

        {/* Quick Login Options */}
        <div className="space-y-4 mb-8">
          {/* Jonathan Super Admin */}
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  🔴 Super Admin Access
                </h3>
                <p className="text-red-300 text-sm">Jonathan Bradley - Live Data Only</p>
              </div>
            </div>
            <button
              onClick={loginAsJonathan}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Login as Jonathan (LIVE DATA)
            </button>
            <div className="mt-2 text-xs text-red-200">
              ✅ All client management • ✅ Aggregate analytics • ✅ Service controls • ❌ NO mock data
            </div>
          </div>

          {/* Demo Account */}
          <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  🎭 Demo Environment
                </h3>
                <p className="text-orange-300 text-sm">Safe testing with mock data</p>
              </div>
            </div>
            <button
              onClick={loginAsDemo}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Enter Demo Mode (MOCK DATA)
            </button>
            <div className="mt-2 text-xs text-orange-200">
              ✅ All features enabled • ✅ Safe sandbox • ✅ Realistic scenarios • ❌ NO real data
            </div>
          </div>
        </div>

        {/* Data Separation Notice */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
          <h4 className="text-white font-medium mb-2">📊 Data Separation Policy</h4>
          <div className="space-y-1 text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <span className="text-red-400">🔴</span>
              <span><strong>Super Admin:</strong> Real client data only - no mock/demo content</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-orange-400">🎭</span>
              <span><strong>Demo Mode:</strong> Simulated data only - completely separate environment</span>
            </div>
          </div>
        </div>

        {/* Traditional Login Form (for future clients) */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h3 className="text-white font-medium mb-4">Client Login</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="your@company.com"
                disabled
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="••••••••"
                disabled
              />
            </div>

            <button
              type="submit"
              disabled
              className="w-full bg-gray-600 text-gray-400 font-medium py-2 px-4 rounded-md cursor-not-allowed"
            >
              Coming Soon
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-400">
            Client authentication will be enabled after first client onboarding
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Need access? <Link href="/contact" className="text-orange-400 hover:text-orange-300">Contact us</Link></p>
        </div>
      </div>
    </div>
  );
}