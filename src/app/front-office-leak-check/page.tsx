"use client";

import Link from "next/link";
import { useState } from "react";

type FormState = {
  contact_name: string;
  email: string;
  phone: string;
  company_name: string;
  website: string;
  industry: string;
  call_volume: string;
  missed_call_handling: string;
  after_hours_coverage: string;
  form_response_time: string;
  follow_up_consistency: string;
  booking_method: string;
  average_job_value: string;
  biggest_concern: string;
  consent_to_contact: boolean;
};

const INITIAL: FormState = {
  contact_name: "",
  email: "",
  phone: "",
  company_name: "",
  website: "",
  industry: "",
  call_volume: "",
  missed_call_handling: "",
  after_hours_coverage: "",
  form_response_time: "",
  follow_up_consistency: "",
  booking_method: "",
  average_job_value: "",
  biggest_concern: "",
  consent_to_contact: false,
};

export default function FrontOfficeLeakCheckPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  const set = (k: keyof FormState, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrMsg("");
    try {
      const res = await fetch("/api/audit/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "leak_check",
          source: "front_office_leak_check_page",
          name: form.contact_name,
          email: form.email,
          phone: form.phone,
          company_name: form.company_name,
          website: form.website,
          business_type: form.industry,
          biggest_operational_bottleneck: form.biggest_concern,
          consent_to_contact: form.consent_to_contact,
          pain_points: [
            form.missed_call_handling === "often_missed" && "missed_calls",
            form.after_hours_coverage === "none" && "no_after_hours",
            form.form_response_time === "hours" && "slow_followup",
            form.form_response_time === "next_day_or_later" && "slow_followup",
            form.follow_up_consistency === "inconsistent" && "inconsistent_follow_up",
          ].filter(Boolean) as string[],
          intake_summary: `Leak Check — ${form.company_name}: call_volume=${form.call_volume}; missed=${form.missed_call_handling}; after_hours=${form.after_hours_coverage}; form_response=${form.form_response_time}; follow_up=${form.follow_up_consistency}; booking=${form.booking_method}; avg_job=${form.average_job_value}; concern=${form.biggest_concern}`,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Submission failed (${res.status}): ${t.slice(0, 200)}`);
      }
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (status === "ok") {
    return (
      <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="min-h-screen">
        <section className="py-20 md:py-28 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
              Leak Check Submitted
            </p>
            <h1 className="text-4xl font-bold text-white mb-6">Thanks — we'll be in touch.</h1>
            <p className="text-gray-400 text-lg mb-8">
              We'll review your answers and reach out within one business day with a brief
              read on where revenue is most likely leaking — and whether the $299 Front
              Desk AI pilot is the simplest next step.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/front-desk-ai"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-md transition-colors"
              >
                See the 30-Day Pilot
              </Link>
              <Link
                href="/"
                className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-6 py-3 rounded-md transition-colors"
              >
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }}>
      {/* Hero */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            Free · Fast Diagnostic · No Sales Pitch
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Front Office Leak Check
          </h1>
          <p className="text-lg text-gray-400">
            Answer a few questions about how leads come in, how fast they're handled, and
            whether after-hours is covered. We'll come back with a short read on where
            revenue is most likely leaking — and whether the $299 Front Desk AI pilot is
            the simplest next step.
          </p>
        </div>
      </section>

      {/* What we check */}
      <section className="py-10 px-4 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-white font-semibold text-lg mb-4 text-center">What the check looks at</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-gray-300 text-sm">
            <li>• Are calls being missed?</li>
            <li>• Is after-hours coverage available?</li>
            <li>• How fast are forms answered?</li>
            <li>• Is there a real booking process?</li>
            <li>• Is follow-up consistent?</li>
            <li>• Are leads tracked anywhere?</li>
            <li>• What opportunities are slipping?</li>
            <li>• Estimated monthly revenue leakage</li>
          </ul>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 px-4">
        <form onSubmit={submit} className="max-w-2xl mx-auto bg-[#111827] border border-gray-800 rounded-xl p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Your name" required value={form.contact_name} onChange={(v) => set("contact_name", v)} />
            <Field label="Business name" required value={form.company_name} onChange={(v) => set("company_name", v)} />
            <Field label="Email" type="email" required value={form.email} onChange={(v) => set("email", v)} />
            <Field label="Phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} />
            <Field label="Website" type="url" value={form.website} onChange={(v) => set("website", v)} placeholder="https://" />
            <Select label="Industry" required value={form.industry} onChange={(v) => set("industry", v)} options={[
              "Property Management", "HVAC", "Plumbing", "Electrical", "Roofing",
              "General Contractor / Remodeler", "Home Services (cleaning, landscaping, pest, pool)",
              "Smart Home / AV", "IT / MSP", "Other service business",
            ]} />
          </div>

          <Select label="Roughly how many calls does your business get per week?" value={form.call_volume} onChange={(v) => set("call_volume", v)} options={[
            "< 25", "25–50", "50–100", "100–250", "250+",
          ]} />
          <Select label="When your team can't pick up, what happens?" value={form.missed_call_handling} onChange={(v) => set("missed_call_handling", v)} options={[
            { value: "voicemail_checked_often", label: "Goes to voicemail; checked frequently" },
            { value: "voicemail_checked_late", label: "Goes to voicemail; checked late or not at all" },
            { value: "answering_service", label: "Forwarded to an answering service" },
            { value: "often_missed", label: "Often missed entirely — no record" },
          ]} />
          <Select label="After-hours coverage" value={form.after_hours_coverage} onChange={(v) => set("after_hours_coverage", v)} options={[
            { value: "full", label: "Full — humans or service answer 24/7" },
            { value: "partial", label: "Partial — voicemail, sometimes checked" },
            { value: "none", label: "None — calls drop after hours" },
          ]} />
          <Select label="How fast does a website form or email lead get a response?" value={form.form_response_time} onChange={(v) => set("form_response_time", v)} options={[
            { value: "minutes", label: "Within minutes" },
            { value: "hour", label: "Within an hour" },
            { value: "hours", label: "Several hours" },
            { value: "next_day_or_later", label: "Next day or later" },
            { value: "rarely", label: "Honestly? Inconsistent" },
          ]} />
          <Select label="Follow-up on prospects — how consistent?" value={form.follow_up_consistency} onChange={(v) => set("follow_up_consistency", v)} options={[
            { value: "automated_and_tracked", label: "Automated and tracked" },
            { value: "manual_and_tracked", label: "Manual but tracked" },
            { value: "inconsistent", label: "Inconsistent / depends on the person" },
            { value: "none", label: "We don't really follow up" },
          ]} />
          <Select label="How do appointments / estimates get booked?" value={form.booking_method} onChange={(v) => set("booking_method", v)} options={[
            "Online calendar (Calendly, similar)",
            "Phone, by someone on staff",
            "Back-and-forth email / SMS",
            "No formal booking process",
          ]} />
          <Select label="Average job or client value" value={form.average_job_value} onChange={(v) => set("average_job_value", v)} options={[
            "< $500", "$500–$2,000", "$2,000–$10,000", "$10,000–$50,000", "$50,000+",
          ]} />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              In one or two sentences — what concerns you most right now about how leads are handled?
            </label>
            <textarea
              value={form.biggest_concern}
              onChange={(e) => set("biggest_concern", e.target.value)}
              rows={3}
              className="w-full bg-[#0d0d0d] border border-gray-700 rounded-md p-3 text-gray-200 text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g., I know we're missing weekend calls but no idea how many"
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consent_to_contact}
              onChange={(e) => set("consent_to_contact", e.target.checked)}
              className="mt-1"
              required
            />
            <span>
              I agree to be contacted by OttoServ about the results of this leak check and the
              30-day pilot offer.
            </span>
          </label>

          {status === "error" && (
            <p className="text-red-400 text-sm">Something went wrong: {errMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-md transition-colors"
          >
            {status === "submitting" ? "Submitting…" : "Submit My Free Leak Check"}
          </button>
          <p className="text-gray-500 text-xs text-center">
            No credit card. No automated emails. We'll respond personally within one business day.
          </p>
        </form>
      </section>

      {/* Bridge to pilot */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Already know you're losing leads?
          </h2>
          <p className="text-gray-400 mb-8">
            Skip the diagnostic. Start the 30-day pilot and see exactly how many calls and
            forms we catch.
          </p>
          <Link
            href="/front-desk-ai"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-md transition-colors"
          >
            Start the 30-Day Pilot — $299
          </Link>
        </div>
      </section>
    </div>
  );
}

function Field({
  label, required, value, onChange, type = "text", placeholder,
}: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0d0d0d] border border-gray-700 rounded-md p-2.5 text-gray-200 text-sm focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

type OptionItem = string | { value: string; label: string };

function Select({
  label, required, value, onChange, options,
}: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void; options: OptionItem[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0d0d0d] border border-gray-700 rounded-md p-2.5 text-gray-200 text-sm focus:outline-none focus:border-blue-500"
      >
        <option value="">Select one…</option>
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const lab = typeof o === "string" ? o : o.label;
          return <option key={val} value={val}>{lab}</option>;
        })}
      </select>
    </div>
  );
}
