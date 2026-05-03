"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Set localStorage for client-side auth system
        localStorage.setItem("ottoserv_current_user", JSON.stringify(result.user));
        const token = result.user.role === "super_admin" ? "super_admin_token" :
                      result.user.role === "demo" ? "demo_token" :
                      `client_${result.user.id}_token`;
        localStorage.setItem("ottoserv_token", token);
        localStorage.setItem("ottoserv_client", JSON.stringify({
          name: result.user.name,
          business_name: result.user.company || (result.user.role === "super_admin" ? "OttoServ" : "Demo Company"),
        }));
        
        // For super_admin, also fetch a platform token so OS dashboard can access real data
        if (result.user.role === "super_admin") {
          try {
            const platRes = await fetch("https://platform.ottoserv.com/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            });
            if (platRes.ok) {
              const platData = await platRes.json();
              if (platData.token) {
                localStorage.setItem("ottoserv_platform_token", platData.token);
                localStorage.setItem("ottoserv_platform_user", JSON.stringify(platData.user ?? {}));
              }
            }
          } catch { /* platform login is best-effort */ }
        }

        // Redirect based on user role
        if (result.user.role === "super_admin") {
          window.location.href = "/dashboard/admin";
        } else if (result.user.role === "demo") {
          window.location.href = "/demo/dashboard";
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        const result = await response.json();
        setError(result.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Otto<span className="text-orange-400">Serv</span>
          </h1>
          <p className="text-gray-400">Access your AI-powered operating system</p>
        </div>

        {/* Single Login Form */}
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-700">
          <h2 className="text-white font-semibold mb-6 text-xl">Sign In</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-md">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="your@company.com"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Demo Credentials Helper */}
        <div className="mt-6 bg-gray-800 border border-gray-600 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Demo Access</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Demo Account:</span>
              <span className="text-orange-300 font-mono">demo@ottoserv.com</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Password:</span>
              <span className="text-orange-300 font-mono">demo</span>
            </div>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Use these credentials to explore OttoServ with sample data
          </p>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Need an account? <Link href="/contact" className="text-orange-400 hover:text-orange-300">Contact us</Link></p>
        </div>
      </div>
    </div>
  );
}