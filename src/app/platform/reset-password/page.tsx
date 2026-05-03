"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const [formData, setFormData] = useState({ new_password: "", confirm_password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError("No reset token provided");
      setLoading(false);
      return;
    }

    // Validate the token
    const validateToken = async () => {
      try {
        const res = await fetch(`https://platform.ottoserv.com/crm/login/reset?token=${token}`);
        const data = await res.json();

        if (data.action === "reset_password") {
          setTokenValid(true);
          setEmail(data.email || "");
        } else {
          setError(data.error || "Invalid or expired reset token");
        }
      } catch {
        setError("Unable to validate reset token. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (formData.new_password !== formData.confirm_password) {
      setError("Passwords do not match");
      setSubmitting(false);
      return;
    }

    if (formData.new_password.length < 8) {
      setError("Password must be at least 8 characters long");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("https://platform.ottoserv.com/crm/login/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          new_password: formData.new_password
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("Password has been reset successfully! You can now sign in with your new password.");
        setTimeout(() => {
          router.push('/platform/login');
        }, 3000);
      } else {
        setError(data.detail ?? data.message ?? "An error occurred. Please try again.");
      }
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{backgroundColor: 'var(--otto-gray-900)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Validating reset token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{backgroundColor: 'var(--otto-gray-900)'}}>
        <div className="w-full max-w-md text-center">
          <div className="border rounded-xl p-8" style={{backgroundColor: 'var(--otto-gray-800)', borderColor: 'var(--otto-gray-700)'}}>
            <div className="mb-5 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
              {error}
            </div>
            <Link href="/platform/forgot-password" className="text-blue-400 hover:text-blue-300 transition-colors">
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{backgroundColor: 'var(--otto-gray-900)'}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
            OttoServ
          </Link>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-medium">Enterprise Platform</p>
          <h1 className="text-xl font-bold text-white mt-5">Set new password</h1>
          {email && <p className="text-gray-400 text-sm mt-1">for {email}</p>}
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
              <div className="mt-2 text-xs text-gray-300">
                Redirecting to login page...
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="new_password" className="block text-sm font-medium text-gray-300 mb-1.5">
                New Password
              </label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                required
                value={formData.new_password}
                onChange={handleChange}
                className="w-full border text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors"
                style={{backgroundColor: 'var(--otto-gray-700)', borderColor: 'var(--otto-gray-600)'}}
                placeholder="••••••••"
                minLength={8}
                disabled={success !== ""}
              />
              <p className="text-gray-500 text-xs mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                value={formData.confirm_password}
                onChange={handleChange}
                className="w-full border text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors"
                style={{backgroundColor: 'var(--otto-gray-700)', borderColor: 'var(--otto-gray-600)'}}
                placeholder="••••••••"
                disabled={success !== ""}
              />
            </div>

            {success === "" && (
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold px-6 py-3 rounded-md transition-colors"
              >
                {submitting ? "Updating..." : "Update Password"}
              </button>
            )}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{backgroundColor: 'var(--otto-gray-900)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}