"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PlatformLoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "", company_slug: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("ottoserv_platform_token");
    if (token) router.push("/platform/dashboard");
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("https://platform.ottoserv.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem("ottoserv_platform_token", data.token);
        localStorage.setItem("ottoserv_platform_user", JSON.stringify(data.user ?? {}));
        window.location.href = "/platform/dashboard";
      } else {
        setError(data.detail ?? data.error ?? "Invalid credentials. Please try again.");
      }
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{backgroundColor: 'var(--otto-gray-900)'}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
            OttoServ
          </Link>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-medium">Enterprise Platform</p>
          <h1 className="text-xl font-bold text-white mt-5">Sign in to your workspace</h1>
          <p className="text-gray-400 text-sm mt-1">Access your company&apos;s automation platform</p>
        </div>

        <div className="border rounded-xl p-8" style={{backgroundColor: 'var(--otto-gray-800)', borderColor: 'var(--otto-gray-700)'}}>
          {error && (
            <div className="mb-5 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="company_slug" className="block text-sm font-medium text-gray-300 mb-1.5">
                Company Workspace
              </label>
              <input
                id="company_slug"
                name="company_slug"
                type="text"
                required
                value={formData.company_slug}
                onChange={handleChange}
                className="w-full border text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors"
                style={{backgroundColor: 'var(--otto-gray-700)', borderColor: 'var(--otto-gray-600)'}}
                placeholder="your-company"
                autoComplete="organization"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full border text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors"
                style={{backgroundColor: 'var(--otto-gray-700)', borderColor: 'var(--otto-gray-600)'}}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full border text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors"
                style={{backgroundColor: 'var(--otto-gray-700)', borderColor: 'var(--otto-gray-600)'}}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold px-6 py-3 rounded-md transition-colors"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Not set up yet?{" "}
          <Link href="/contact" className="text-blue-400 hover:text-blue-300 transition-colors">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}
