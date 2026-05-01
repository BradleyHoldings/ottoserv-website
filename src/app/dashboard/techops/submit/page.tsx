"use client";

import { useState } from "react";
import Link from "next/link";
import { TECHOPS_CATEGORIES } from "@/lib/mockData";

const URGENCY_OPTIONS = ["low", "medium", "high", "emergency"] as const;
const WINDOW_OPTIONS = ["ASAP", "Within 4 hours", "Today – business hours", "Tomorrow AM", "Evenings preferred", "Flexible"];

interface FormState {
  client: string;
  site: string;
  contact: string;
  contact_phone: string;
  category: string;
  subcategory: string;
  device: string;
  urgency: string;
  description: string;
  error_message: string;
  remote_access: boolean;
  business_critical: boolean;
  happened_before: boolean;
  preferred_window: string;
}

const INITIAL: FormState = {
  client: "",
  site: "",
  contact: "",
  contact_phone: "",
  category: "",
  subcategory: "",
  device: "",
  urgency: "medium",
  description: "",
  error_message: "",
  remote_access: false,
  business_critical: false,
  happened_before: false,
  preferred_window: "",
};

export default function SubmitRequestPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketId] = useState(() => `TKT-${1000 + Math.floor(Math.random() * 9000)}`);

  const subcategories = form.category ? TECHOPS_CATEGORIES[form.category] ?? [] : [];

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "category" ? { subcategory: "" } : {}),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  }

  const inputClass =
    "w-full bg-[#1f2937] border border-gray-700 text-white rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1.5";

  if (submitted) {
    return (
      <div>
        <div className="mb-6">
          <Link href="/dashboard/techops" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Back to TechOps
          </Link>
        </div>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-2xl mb-3">Request Submitted</h2>
          <p className="text-gray-400 mb-2">
            Ticket <span className="text-blue-400 font-mono">{ticketId}</span> has been created.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            TechOps AI is reviewing your request now. You will receive a response within minutes.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard/techops/tickets"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors text-center"
            >
              View Ticket
            </Link>
            <button
              onClick={() => { setForm(INITIAL); setSubmitted(false); }}
              className="w-full py-2.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/techops" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Back to TechOps
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Submit Tech Request</h1>
        <p className="text-gray-500 text-sm mt-1">Fill in as much detail as possible to help TechOps diagnose faster.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Client & Site */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Client & Site</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Client Name <span className="text-blue-400">*</span></label>
              <input
                type="text"
                required
                value={form.client}
                onChange={(e) => set("client", e.target.value)}
                placeholder="Acme Corp"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Site / Location <span className="text-blue-400">*</span></label>
              <input
                type="text"
                required
                value={form.site}
                onChange={(e) => set("site", e.target.value)}
                placeholder="Unit 4B – 320 Oak Ave"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Name <span className="text-blue-400">*</span></label>
              <input
                type="text"
                required
                value={form.contact}
                onChange={(e) => set("contact", e.target.value)}
                placeholder="Jane Smith"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Phone</label>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value)}
                placeholder="(555) 000-0000"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Issue Details */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Issue Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category <span className="text-blue-400">*</span></label>
              <select
                required
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={inputClass}
              >
                <option value="">Select category...</option>
                {Object.keys(TECHOPS_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Subcategory</label>
              <select
                value={form.subcategory}
                onChange={(e) => set("subcategory", e.target.value)}
                disabled={!form.category}
                className={`${inputClass} disabled:opacity-50`}
              >
                <option value="">Select subcategory...</option>
                {subcategories.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Device / System <span className="text-blue-400">*</span></label>
            <input
              type="text"
              required
              value={form.device}
              onChange={(e) => set("device", e.target.value)}
              placeholder="e.g. Ubiquiti AP AC Pro, Dell OptiPlex 7090, Ecobee SmartThermostat"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Description <span className="text-blue-400">*</span></label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe what's happening, when it started, and what you've already tried..."
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass}>Error Message or Code</label>
            <input
              type="text"
              value={form.error_message}
              onChange={(e) => set("error_message", e.target.value)}
              placeholder="e.g. DHCP timeout, Error 0x80070005, CRITICAL_PROCESS_DIED"
              className={inputClass}
            />
          </div>
        </div>

        {/* Urgency & Scheduling */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wide">Urgency & Scheduling</h2>
          <div>
            <label className={labelClass}>Urgency Level <span className="text-blue-400">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {URGENCY_OPTIONS.map((u) => {
                const colors: Record<string, string> = {
                  low: "border-green-700 text-green-400 bg-green-900/20",
                  medium: "border-yellow-700 text-yellow-400 bg-yellow-900/20",
                  high: "border-orange-700 text-orange-400 bg-orange-900/20",
                  emergency: "border-red-700 text-red-400 bg-red-900/20",
                };
                const isSelected = form.urgency === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => set("urgency", u)}
                    className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${
                      isSelected
                        ? colors[u]
                        : "border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300"
                    }`}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={labelClass}>Preferred Appointment Window</label>
            <select
              value={form.preferred_window}
              onChange={(e) => set("preferred_window", e.target.value)}
              className={inputClass}
            >
              <option value="">No preference</option>
              {WINDOW_OPTIONS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Flags */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wide mb-2">Additional Flags</h2>
          {(
            [
              { key: "remote_access", label: "Remote access is available", desc: "Technician can connect to the device remotely" },
              { key: "business_critical", label: "Business-critical issue", desc: "This issue is actively disrupting operations" },
              { key: "happened_before", label: "Has happened before", desc: "This is a recurring or repeated issue" },
            ] as { key: keyof FormState; label: string; desc: string }[]
          ).map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  onChange={(e) => set(key, e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    form[key] ? "bg-blue-600 border-blue-600" : "border-gray-600 group-hover:border-gray-400"
                  }`}
                >
                  {form[key] && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-gray-500 text-xs">{desc}</p>
              </div>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
