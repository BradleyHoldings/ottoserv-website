"use client";

import { useState } from "react";

type Props = {
  sourcePage: string;
  intent: "book_demo" | "process_audit" | "pricing" | "missed_call_recovery" | "general_inquiry";
  title?: string;
  buttonLabel?: string;
};

const initialForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  estimated_call_volume: "",
  missed_call_concern: "",
  message: "",
  consent_to_contact: false,
};

export default function LeadCaptureForm({ sourcePage, intent, title = "Tell us where leads are leaking", buttonLabel = "Send Request" }: Props) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const setField = (key: keyof typeof initialForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const res = await fetch("/api/leads/capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, source_page: sourcePage, intent }),
    });
    const data = await res.json();

    if (!res.ok && res.status !== 202) {
      setStatus("error");
      setMessage(data.error || "Could not submit the request. Please try again.");
      return;
    }

    setStatus("success");
    setMessage(data.message || "Received. We will follow up shortly.");
    setForm(initialForm);
  }

  return (
    <section className="bg-[#0a0a0a] px-4 py-16">
      <form onSubmit={submit} className="max-w-4xl mx-auto bg-[#111827] border border-gray-800 rounded-xl p-6 md:p-8">
        <div className="mb-6">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-2">Revenue intake</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
          <p className="text-gray-400 mt-3">
            Submissions are captured, scored, queued, and surfaced in OttoServ ops reports. If the lead is A-tier, it can become a Jarvis call packet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" required value={form.name} onChange={(value) => setField("name", value)} />
          <Field label="Company" required value={form.company} onChange={(value) => setField("company", value)} />
          <Field label="Email" type="email" required value={form.email} onChange={(value) => setField("email", value)} />
          <Field label="Phone" type="tel" value={form.phone} onChange={(value) => setField("phone", value)} />
          <Field label="Website" type="url" value={form.website} onChange={(value) => setField("website", value)} placeholder="https://" />
          <label className="block">
            <span className="block text-sm font-medium text-gray-300 mb-2">Industry</span>
            <select
              value={form.industry}
              onChange={(event) => setField("industry", event.target.value)}
              className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-3 text-gray-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select industry</option>
              <option>Property Management</option>
              <option>HVAC</option>
              <option>Plumbing</option>
              <option>Roofing</option>
              <option>Contractor / Home Services</option>
              <option>Other SMB</option>
            </select>
          </label>
          <Field label="Estimated call volume" value={form.estimated_call_volume} onChange={(value) => setField("estimated_call_volume", value)} placeholder="Example: 40 calls/week" />
          <Field label="Missed-call concern" value={form.missed_call_concern} onChange={(value) => setField("missed_call_concern", value)} placeholder="Example: after-hours calls go to voicemail" />
        </div>

        <label className="block mt-4">
          <span className="block text-sm font-medium text-gray-300 mb-2">Notes / message</span>
          <textarea
            rows={4}
            value={form.message}
            onChange={(event) => setField("message", event.target.value)}
            className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-3 text-gray-100 focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Tell us what happens today when someone calls, fills out a form, or asks for pricing."
          />
        </label>

        <label className="flex gap-3 mt-5 text-sm text-gray-400 leading-relaxed">
          <input
            type="checkbox"
            checked={form.consent_to_contact}
            onChange={(event) => setField("consent_to_contact", event.target.checked)}
            className="mt-1 h-4 w-4"
            required
          />
          I agree OttoServ may contact me about this request. No spam, no resale of contact information.
        </label>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-7 py-4 rounded-md"
          >
            {status === "submitting" ? "Sending..." : buttonLabel}
          </button>
          {message && (
            <p className={status === "error" ? "text-red-300 text-sm" : "text-green-300 text-sm"}>
              {message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-300 mb-2">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-3 text-gray-100 focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
      />
    </label>
  );
}
