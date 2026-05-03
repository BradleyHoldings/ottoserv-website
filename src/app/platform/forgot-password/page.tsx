"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [formData, setFormData] = useState({ email: "", company_slug: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("https://platform.ottoserv.com/crm/login/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("If an account with that email exists, you will receive a password reset link.");
      } else {
        setError(data.detail ?? data.message ?? "An error occurred. Please try again.");
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
          <h1 className="text-xl font-bold text-white mt-5">Reset your password</h1>
          <p className="text-gray-400 text-sm mt-1">Enter your email to receive a reset link</p>
        </div>

        <div className="border rounded-xl p-8" style={{backgroundColor: 'var(--otto-gray-800)', borderColor: 'var(--otto-gray-700)'}}>
          {error && (
            <div className="mb-5 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 p-3 bg-green-900/30 border border-green-800 rounded-md text-green-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="company_slug" className="block text-sm font-medium text-gray-300 mb-1.5">
                Company Workspace <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                id="company_slug"
                name="company_slug"
                type="text"
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold px-6 py-3 rounded-md transition-colors"
            >
              {submitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Remember your password?{" "}
          <Link href="/platform/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}