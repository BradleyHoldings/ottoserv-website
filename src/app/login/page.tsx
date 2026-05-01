"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = "https://api.ottoserv.com";
const API_KEY = "c4f8a2d9e3b7c105a6d2f8e9c4b710a5f6d2e8c9f4a710b5c6d2f8e9c4a710b5";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem("ottoserv_token", data.token);
        localStorage.setItem("ottoserv_client", JSON.stringify(data.client));
        window.location.href = "/dashboard";
        return;
      } else {
        setError(data.detail || data.error || "Invalid email or password");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
            OttoServ
          </Link>
          <h1 className="text-xl font-bold text-white mt-4">Client Portal Login</h1>
          <p className="text-gray-400 text-sm mt-1">For existing OttoServ clients</p>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
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
                className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="you@example.com"
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
                className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold px-6 py-3 rounded-md transition-colors"
            >
              {submitting ? "Logging in..." : "Log In"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Not a client yet?{" "}
          <Link href="/contact" className="text-blue-400 hover:text-blue-300 transition-colors">
            Book a discovery call
          </Link>
        </p>
      </div>
    </div>
  );
}
