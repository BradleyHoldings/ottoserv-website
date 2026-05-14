"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const JARVIS_AGENT_ID = "agent_0501kqg13ad2ej09zsyxywrb6gsz";
const CONVAI_WIDGET_SRC = "https://elevenlabs.io/convai-widget/index.js";

type UtmCtx = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  referrer: string;
};

function readUtm(): UtmCtx {
  if (typeof window === "undefined") {
    return {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
      referrer: "",
    };
  }
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source") || "",
    utm_medium: p.get("utm_medium") || "",
    utm_campaign: p.get("utm_campaign") || "",
    utm_term: p.get("utm_term") || "",
    utm_content: p.get("utm_content") || "",
    referrer: document.referrer || "",
  };
}

function trackEvent(name: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (typeof w.plausible === "function") w.plausible(name, { props });
  if (typeof w.gtag === "function") w.gtag("event", name, props || {});
}

type SectionedForm = {
  // Section 1 — Company Profile
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  role_title: string;
  industry: string;
  company_size: string;
  website: string;
  // Section 2 — Lead Intake
  primary_lead_sources: string[];
  current_lead_handling_process: string;
  missed_call_handling_process: string;
  average_response_time: string;
  biggest_lead_leakage_issue: string;
  // Section 3 — Follow-Up
  follow_up_current_process: string;
  follow_up_attempts: string;
  follow_up_where_breaks_down: string;
  leads_lost_to_slow_response: string;
  // Section 4 — Scheduling
  scheduling_booking_method: string;
  scheduling_friction: string;
  no_show_issues: string;
  inquiry_to_booked_handoff: string;
  // Section 5 — Admin Workload
  repetitive_admin_tasks: string;
  manual_data_entry: string;
  coordinator_admin_tasks: string;
  team_overwhelm: string;
  // Section 6 — Bottlenecks & Handoffs
  internal_communication_gaps: string;
  process_handoff_issues: string;
  tasks_falling_through_cracks: string;
  visibility_reporting_problems: string;
  // Section 7 — Tools & Systems
  tool_crm: string;
  tool_phone: string;
  tool_email_sms: string;
  tool_scheduling: string;
  tool_project_management: string;
  tool_other: string;
  // Section 8 — Hiring, Urgency, Priority
  hiring_admin_coordinator_ops: string;
  urgency_level: string;
  revenue_time_impact: string;
  priority_process_to_automate: string;
  anything_else: string;
  // Consent
  consent_to_contact: boolean;
};

const initialForm: SectionedForm = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  role_title: "",
  industry: "",
  company_size: "",
  website: "",
  primary_lead_sources: [],
  current_lead_handling_process: "",
  missed_call_handling_process: "",
  average_response_time: "",
  biggest_lead_leakage_issue: "",
  follow_up_current_process: "",
  follow_up_attempts: "",
  follow_up_where_breaks_down: "",
  leads_lost_to_slow_response: "",
  scheduling_booking_method: "",
  scheduling_friction: "",
  no_show_issues: "",
  inquiry_to_booked_handoff: "",
  repetitive_admin_tasks: "",
  manual_data_entry: "",
  coordinator_admin_tasks: "",
  team_overwhelm: "",
  internal_communication_gaps: "",
  process_handoff_issues: "",
  tasks_falling_through_cracks: "",
  visibility_reporting_problems: "",
  tool_crm: "",
  tool_phone: "",
  tool_email_sms: "",
  tool_scheduling: "",
  tool_project_management: "",
  tool_other: "",
  hiring_admin_coordinator_ops: "",
  urgency_level: "",
  revenue_time_impact: "",
  priority_process_to_automate: "",
  anything_else: "",
  consent_to_contact: true,
};

const LEAD_SOURCE_OPTIONS = [
  "Inbound phone calls",
  "Website forms",
  "Google / SEO",
  "Google Ads / PPC",
  "Referrals",
  "Social media",
  "Repeat / past clients",
  "Direct mail / outbound",
  "Other",
];

const INDUSTRY_OPTIONS = [
  "General contractor / remodeler",
  "Roofing",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Property management",
  "Smart home / AV",
  "IT / MSP",
  "Cleaning / janitorial",
  "Landscaping",
  "Other home / service",
];

const COMPANY_SIZE_OPTIONS = [
  "Just me / owner-operator",
  "2–5",
  "6–15",
  "16–50",
  "51–100",
  "100+",
];

const URGENCY_OPTIONS = [
  "Urgent — bleeding money now",
  "Within 30–60 days",
  "Within 3 months",
  "Just exploring",
];

const HIRING_OPTIONS = [
  "Yes — actively hiring admin / coordinator / ops",
  "Considering it",
  "No — looking to automate instead",
];

const FORM_SECTIONS: { id: string; title: string; subtitle?: string }[] = [
  { id: "company", title: "1 · Company Profile", subtitle: "Tell us who you are." },
  { id: "leads", title: "2 · Lead Intake", subtitle: "How leads come in and what happens next." },
  { id: "followup", title: "3 · Follow-Up", subtitle: "What happens after the first touch." },
  { id: "scheduling", title: "4 · Scheduling", subtitle: "How appointments get booked." },
  { id: "admin", title: "5 · Admin Workload", subtitle: "Where manual work piles up." },
  { id: "bottlenecks", title: "6 · Bottlenecks & Handoffs", subtitle: "Where work falls through the cracks." },
  { id: "tools", title: "7 · Tools & Systems", subtitle: "What you're using today." },
  { id: "priority", title: "8 · Hiring, Urgency & Priority", subtitle: "What to fix first." },
];

function buildSectionedPayload(form: SectionedForm) {
  return {
    schema_version: 1,
    submitted_at: new Date().toISOString(),
    sections: {
      company_profile: {
        company_name: form.company_name,
        contact_name: form.contact_name,
        email: form.email,
        phone: form.phone,
        role_title: form.role_title,
        industry: form.industry,
        company_size: form.company_size,
        website: form.website,
      },
      lead_intake: {
        primary_lead_sources: form.primary_lead_sources,
        current_lead_handling_process: form.current_lead_handling_process,
        missed_call_handling_process: form.missed_call_handling_process,
        average_response_time: form.average_response_time,
        biggest_lead_leakage_issue: form.biggest_lead_leakage_issue,
      },
      follow_up: {
        current_process: form.follow_up_current_process,
        follow_up_attempts: form.follow_up_attempts,
        where_breaks_down: form.follow_up_where_breaks_down,
        leads_lost_to_slow_response: form.leads_lost_to_slow_response,
      },
      scheduling: {
        booking_method: form.scheduling_booking_method,
        scheduling_friction: form.scheduling_friction,
        no_show_issues: form.no_show_issues,
        inquiry_to_booked_handoff: form.inquiry_to_booked_handoff,
      },
      admin_workload: {
        repetitive_tasks: form.repetitive_admin_tasks,
        manual_data_entry: form.manual_data_entry,
        coordinator_tasks: form.coordinator_admin_tasks,
        team_overwhelm: form.team_overwhelm,
      },
      bottlenecks_handoffs: {
        internal_communication_gaps: form.internal_communication_gaps,
        process_handoff_issues: form.process_handoff_issues,
        tasks_falling_through_cracks: form.tasks_falling_through_cracks,
        visibility_reporting_problems: form.visibility_reporting_problems,
      },
      tools_systems: {
        crm: form.tool_crm,
        phone_system: form.tool_phone,
        email_sms_tools: form.tool_email_sms,
        scheduling_tools: form.tool_scheduling,
        project_management_tools: form.tool_project_management,
        other_software: form.tool_other,
      },
      hiring_urgency_priority: {
        hiring_admin_coordinator_ops: form.hiring_admin_coordinator_ops,
        urgency_level: form.urgency_level,
        revenue_time_impact: form.revenue_time_impact,
        priority_process_to_automate: form.priority_process_to_automate,
        anything_else: form.anything_else,
      },
    },
  };
}

function derivePainTags(form: SectionedForm): string[] {
  const tags = new Set<string>();
  const text = [
    form.biggest_lead_leakage_issue,
    form.missed_call_handling_process,
    form.follow_up_where_breaks_down,
    form.leads_lost_to_slow_response,
    form.team_overwhelm,
    form.manual_data_entry,
    form.coordinator_admin_tasks,
    form.repetitive_admin_tasks,
    form.scheduling_friction,
    form.no_show_issues,
    form.process_handoff_issues,
    form.visibility_reporting_problems,
    form.internal_communication_gaps,
    form.tasks_falling_through_cracks,
    form.average_response_time,
  ]
    .join(" ")
    .toLowerCase();

  if (/missed call|miss.*call|voicemail|after hours|after-hours|don.?t answer/.test(text)) tags.add("missed_calls");
  if (/slow.*follow|follow.?up.*slow|takes hours|takes days|never call back|don.?t follow/.test(text)) tags.add("slow_followup");
  if (/admin|coordinator|paperwork|manual entry|data entry|spreadsheet|copy.?paste/.test(text)) tags.add("admin_overload");
  if (/no.?show|cancel|reschedule|reminder/.test(text)) tags.add("scheduling_friction");
  if (/handoff|hand.?off|drop the ball|tribal knowledge|silo|communication/.test(text)) tags.add("handoff_breakdown");
  if (/visibility|don.?t know|no report|gut feel|find out late/.test(text)) tags.add("low_visibility");
  if (form.hiring_admin_coordinator_ops?.toLowerCase().startsWith("yes")) tags.add("hiring_to_patch");
  if (form.urgency_level?.toLowerCase().includes("urgent")) tags.add("urgent");
  return Array.from(tags);
}

function deriveSummary(form: SectionedForm): string {
  const bits: string[] = [];
  if (form.industry) bits.push(form.industry);
  if (form.company_size) bits.push(`${form.company_size} team`);
  if (form.priority_process_to_automate) bits.push(`priority: ${form.priority_process_to_automate}`);
  return bits.join(" · ");
}

export default function ProcessAuditPage() {
  const [form, setForm] = useState<SectionedForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [voiceActive, setVoiceActive] = useState(false);
  const voicePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent("process_audit_page_view");
  }, []);

  // Lazy-load ElevenLabs ConvAI widget script once, only after the user clicks Start the Audit.
  useEffect(() => {
    if (!voiceActive) return;
    if (typeof document === "undefined") return;
    if (document.querySelector(`script[src="${CONVAI_WIDGET_SRC}"]`)) return;
    const s = document.createElement("script");
    s.src = CONVAI_WIDGET_SRC;
    s.async = true;
    document.head.appendChild(s);
  }, [voiceActive]);

  const startAudit = () => {
    trackEvent("process_audit_start_clicked");
    setVoiceActive(true);
    if (typeof window === "undefined") return;
    // Give the widget panel a frame to render before scrolling to it.
    window.setTimeout(() => {
      voicePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const scrollToForm = () => {
    trackEvent("process_audit_scroll_to_form");
    if (typeof document === "undefined") return;
    const target = document.getElementById("audit-form");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    const firstInput = target.querySelector<HTMLInputElement>("input, textarea, select");
    firstInput?.focus({ preventScroll: true });
  };

  const setField = <K extends keyof SectionedForm>(k: K, v: SectionedForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleLeadSource = (value: string) => {
    setForm((f) => {
      const has = f.primary_lead_sources.includes(value);
      return {
        ...f,
        primary_lead_sources: has
          ? f.primary_lead_sources.filter((v) => v !== value)
          : [...f.primary_lead_sources, value],
      };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    trackEvent("process_audit_submit");
    try {
      const utm = readUtm();
      const intake = buildSectionedPayload(form);
      const pain_tags = derivePainTags(form);
      const summary = deriveSummary(form);

      const payload = {
        // legacy flat fields (kept for backward compat with existing audit_requests columns)
        name: form.contact_name,
        email: form.email,
        company: form.company_name,
        company_name: form.company_name,
        website: form.website,
        phone: form.phone,
        business_type: form.industry,
        biggest_operational_bottleneck:
          form.biggest_lead_leakage_issue ||
          form.priority_process_to_automate ||
          form.process_handoff_issues ||
          "",
        current_tools_or_crm: [
          form.tool_crm,
          form.tool_phone,
          form.tool_email_sms,
          form.tool_scheduling,
          form.tool_project_management,
          form.tool_other,
        ]
          .filter(Boolean)
          .join(" | "),
        consent_to_contact: form.consent_to_contact,
        pain_points: pain_tags,
        source: "process_audit_page",
        utm_source: utm.utm_source,
        // structured intake — server stores as JSON in notes column
        intake,
        intake_summary: summary,
      };

      const res = await fetch("/api/audit/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        trackEvent("process_audit_error", { status: res.status });
        throw new Error(body?.error || "Could not submit request");
      }
      trackEvent("process_audit_success");

      if (typeof window !== "undefined") {
        try {
          const ctx = {
            schema_version: 1,
            saved_at: new Date().toISOString(),
            industry: form.industry,
            company_size: form.company_size,
            urgency_level: form.urgency_level,
            priority_process_to_automate: form.priority_process_to_automate,
            pain_tags,
          };
          localStorage.setItem("ottoserv_audit_context", JSON.stringify(ctx));
        } catch {
          // best-effort; storage may be unavailable
        }
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-10 text-center">
            <div className="text-green-400 text-5xl mb-4">✓</div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Audit submitted</h1>
            <p className="text-gray-300 mb-6">
              Jonathan will review your responses and reach out within 1 business day with the
              leaks we spotted and what to fix first.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/demo"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors"
              >
                Watch the Guided Demo →
              </Link>
              <Link
                href="/"
                className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }}>
      {/* Hero */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            OttoServ Process Audit
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Find Out Where Your Business Is Leaking
            <br className="hidden md:block" /> Leads, Time, and Revenue.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Walk through how your business actually runs — lead intake, follow-up,
            scheduling, admin work, handoffs, and tools. Eight short sections, about
            10 minutes.
          </p>

          <button
            type="button"
            onClick={startAudit}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-12 py-5 rounded-md text-lg transition-colors"
          >
            Start the Audit →
          </button>

          <p className="text-gray-400 text-sm mt-5 max-w-lg mx-auto">
            Talk it through with Jarvis — tap the mic when it appears.{" "}
            <button
              type="button"
              onClick={scrollToForm}
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              Prefer to type? Use the form below.
            </button>
          </p>

          {voiceActive && (
            <div
              ref={voicePanelRef}
              className="mt-10 max-w-xl mx-auto bg-[#111827] border border-blue-700/40 rounded-xl p-6 md:p-8"
            >
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-3">
                Talking with Jarvis
              </p>
              <p className="text-gray-300 text-sm mb-5">
                Tap the mic, allow your microphone, and speak naturally. Jarvis will walk
                you through the audit one question at a time.
              </p>
              <div className="flex justify-center">
                {/* @ts-expect-error — ElevenLabs ConvAI custom element */}
                <elevenlabs-convai agent-id={JARVIS_AGENT_ID} />
              </div>
              <p className="text-gray-500 text-xs text-center mt-5">
                Voice not loading?{" "}
                <button
                  type="button"
                  onClick={scrollToForm}
                  className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                >
                  Use the form below
                </button>
                {" "}— same audit, typed.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Form */}
      <section id="audit-form" className="pb-20 px-4 scroll-mt-8">
        <div className="max-w-3xl mx-auto mb-8 pt-8 border-t border-gray-800">
          <h2 className="text-white text-xl md:text-2xl font-semibold mb-2">
            Process Audit — 8 sections
          </h2>
          <p className="text-gray-400 text-sm">
            Company profile through priority. Most owners get through it in 10–15 minutes.
            Required fields are marked with a red asterisk.
          </p>
        </div>
        <form onSubmit={submit} className="max-w-3xl mx-auto space-y-8">

          {/* Section 1 — Company Profile */}
          <FormSection meta={FORM_SECTIONS[0]}>
            <Grid2>
              <Field label="Company name" required>
                <input
                  required
                  value={form.company_name}
                  onChange={(e) => setField("company_name", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Your name" required>
                <input
                  required
                  value={form.contact_name}
                  onChange={(e) => setField("contact_name", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Email" required>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Role / title">
                <input
                  placeholder="Owner, Operations Manager, etc."
                  value={form.role_title}
                  onChange={(e) => setField("role_title", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Website">
                <input
                  value={form.website}
                  onChange={(e) => setField("website", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Industry">
                <select
                  value={form.industry}
                  onChange={(e) => setField("industry", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Choose…</option>
                  {INDUSTRY_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="Company size">
                <select
                  value={form.company_size}
                  onChange={(e) => setField("company_size", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Choose…</option>
                  {COMPANY_SIZE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
            </Grid2>
          </FormSection>

          {/* Section 2 — Lead Intake */}
          <FormSection meta={FORM_SECTIONS[1]}>
            <Field label="Primary lead sources (select all that apply)">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {LEAD_SOURCE_OPTIONS.map((opt) => {
                  const active = form.primary_lead_sources.includes(opt);
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => toggleLeadSource(opt)}
                      className={`text-left text-sm rounded border px-3 py-2 transition-colors ${
                        active
                          ? "border-blue-500 bg-blue-600/10 text-white"
                          : "border-[#333] bg-[#1a1a1a] text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="How do leads typically get handled today?" hint="Who answers, where it goes, when they get called back.">
              <textarea
                rows={3}
                value={form.current_lead_handling_process}
                onChange={(e) => setField("current_lead_handling_process", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="What happens to missed calls?" hint="After-hours, weekends, while on jobs.">
              <textarea
                rows={2}
                value={form.missed_call_handling_process}
                onChange={(e) => setField("missed_call_handling_process", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Grid2>
              <Field label="Average response time to a new lead">
                <input
                  placeholder="e.g. 15 min / 2 hrs / next day"
                  value={form.average_response_time}
                  onChange={(e) => setField("average_response_time", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Biggest lead-leakage issue">
                <input
                  placeholder="Where leads go cold most often"
                  value={form.biggest_lead_leakage_issue}
                  onChange={(e) => setField("biggest_lead_leakage_issue", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Grid2>
          </FormSection>

          {/* Section 3 — Follow-Up */}
          <FormSection meta={FORM_SECTIONS[2]}>
            <Field label="What does your current follow-up process look like?">
              <textarea
                rows={3}
                value={form.follow_up_current_process}
                onChange={(e) => setField("follow_up_current_process", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Grid2>
              <Field label="How many follow-up attempts are made before giving up?">
                <input
                  placeholder="e.g. 1, 2–3, 5+, never"
                  value={form.follow_up_attempts}
                  onChange={(e) => setField("follow_up_attempts", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Where does follow-up usually break down?">
                <input
                  value={form.follow_up_where_breaks_down}
                  onChange={(e) => setField("follow_up_where_breaks_down", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Grid2>
            <Field label="Are leads being lost due to slow response?">
              <textarea
                rows={2}
                placeholder="Best guess: how many per month, and what's it worth?"
                value={form.leads_lost_to_slow_response}
                onChange={(e) => setField("leads_lost_to_slow_response", e.target.value)}
                className={inputCls}
              />
            </Field>
          </FormSection>

          {/* Section 4 — Scheduling */}
          <FormSection meta={FORM_SECTIONS[3]}>
            <Grid2>
              <Field label="How do appointments / consultations get booked today?">
                <textarea
                  rows={2}
                  value={form.scheduling_booking_method}
                  onChange={(e) => setField("scheduling_booking_method", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Where is the scheduling friction?">
                <textarea
                  rows={2}
                  placeholder="Back-and-forth, double-bookings, calendar visibility…"
                  value={form.scheduling_friction}
                  onChange={(e) => setField("scheduling_friction", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="No-show or cancellation issues">
                <input
                  value={form.no_show_issues}
                  onChange={(e) => setField("no_show_issues", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Handoff from inquiry → booked appointment">
                <input
                  value={form.inquiry_to_booked_handoff}
                  onChange={(e) => setField("inquiry_to_booked_handoff", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Grid2>
          </FormSection>

          {/* Section 5 — Admin Workload */}
          <FormSection meta={FORM_SECTIONS[4]}>
            <Grid2>
              <Field label="Repetitive admin tasks the team does every week">
                <textarea
                  rows={2}
                  value={form.repetitive_admin_tasks}
                  onChange={(e) => setField("repetitive_admin_tasks", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Manual data entry / copy-paste between tools">
                <textarea
                  rows={2}
                  value={form.manual_data_entry}
                  onChange={(e) => setField("manual_data_entry", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Tasks currently handled by coordinators / admins">
                <textarea
                  rows={2}
                  value={form.coordinator_admin_tasks}
                  onChange={(e) => setField("coordinator_admin_tasks", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Where is the team most overwhelmed?">
                <textarea
                  rows={2}
                  value={form.team_overwhelm}
                  onChange={(e) => setField("team_overwhelm", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Grid2>
          </FormSection>

          {/* Section 6 — Bottlenecks & Handoffs */}
          <FormSection meta={FORM_SECTIONS[5]}>
            <Grid2>
              <Field label="Internal communication gaps">
                <textarea
                  rows={2}
                  value={form.internal_communication_gaps}
                  onChange={(e) => setField("internal_communication_gaps", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Process handoff issues (e.g. sales → ops)">
                <textarea
                  rows={2}
                  value={form.process_handoff_issues}
                  onChange={(e) => setField("process_handoff_issues", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Tasks that fall through the cracks">
                <textarea
                  rows={2}
                  value={form.tasks_falling_through_cracks}
                  onChange={(e) => setField("tasks_falling_through_cracks", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Visibility / reporting problems">
                <textarea
                  rows={2}
                  value={form.visibility_reporting_problems}
                  onChange={(e) => setField("visibility_reporting_problems", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Grid2>
          </FormSection>

          {/* Section 7 — Tools & Systems */}
          <FormSection meta={FORM_SECTIONS[6]}>
            <Grid2>
              <Field label="CRM">
                <input
                  placeholder="HubSpot, Salesforce, Pipedrive, spreadsheet, none…"
                  value={form.tool_crm}
                  onChange={(e) => setField("tool_crm", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Phone system">
                <input
                  placeholder="OpenPhone, RingCentral, cell phones…"
                  value={form.tool_phone}
                  onChange={(e) => setField("tool_phone", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Email / SMS tools">
                <input
                  placeholder="Mailchimp, Twilio, manual…"
                  value={form.tool_email_sms}
                  onChange={(e) => setField("tool_email_sms", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Scheduling tool">
                <input
                  placeholder="Calendly, Acuity, Google Calendar, paper…"
                  value={form.tool_scheduling}
                  onChange={(e) => setField("tool_scheduling", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Project / job management">
                <input
                  placeholder="ServiceTitan, JobNimbus, Asana, none…"
                  value={form.tool_project_management}
                  onChange={(e) => setField("tool_project_management", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Other software in the stack">
                <input
                  value={form.tool_other}
                  onChange={(e) => setField("tool_other", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </Grid2>
          </FormSection>

          {/* Section 8 — Hiring, Urgency, Priority */}
          <FormSection meta={FORM_SECTIONS[7]}>
            <Grid2>
              <Field label="Hiring an admin / coordinator / ops person right now?">
                <select
                  value={form.hiring_admin_coordinator_ops}
                  onChange={(e) => setField("hiring_admin_coordinator_ops", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Choose…</option>
                  {HIRING_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="Urgency level">
                <select
                  value={form.urgency_level}
                  onChange={(e) => setField("urgency_level", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Choose…</option>
                  {URGENCY_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
            </Grid2>
            <Field label="Estimated revenue or time impact of these problems">
              <textarea
                rows={2}
                placeholder="Best estimate — even rough numbers help."
                value={form.revenue_time_impact}
                onChange={(e) => setField("revenue_time_impact", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="If we could automate ONE process first, which would it be?">
              <textarea
                rows={2}
                value={form.priority_process_to_automate}
                onChange={(e) => setField("priority_process_to_automate", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Anything else you want us to know?">
              <textarea
                rows={2}
                value={form.anything_else}
                onChange={(e) => setField("anything_else", e.target.value)}
                className={inputCls}
              />
            </Field>
          </FormSection>

          {/* Consent + Submit */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 md:p-8">
            <label className="flex items-start gap-3 text-sm text-gray-300 mb-6">
              <input
                type="checkbox"
                checked={form.consent_to_contact}
                onChange={(e) => setField("consent_to_contact", e.target.checked)}
                className="mt-1"
              />
              <span>I&rsquo;m happy to be contacted about the findings and recommended next steps.</span>
            </label>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-4 rounded text-lg transition-colors"
            >
              {submitting ? "Submitting…" : "Submit the Process Audit"}
            </button>
            <p className="text-gray-500 text-xs text-center mt-4">
              Most owners take 5–8 minutes. We review every submission personally.
            </p>
          </div>
        </form>
      </section>

      {/* Next step */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Already know you want to see the system?
          </h2>
          <p className="text-gray-400 mb-8">
            Watch the Guided Demo to see how OttoServ captures leads, qualifies opportunities,
            books appointments, and gives leadership visibility into the work that normally
            falls through the cracks.
          </p>
          <Link
            href="/demo"
            className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
          >
            Watch the Guided Demo
          </Link>
        </div>
      </section>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500";

function FormSection({
  meta,
  children,
}: {
  meta: { id: string; title: string; subtitle?: string };
  children: React.ReactNode;
}) {
  return (
    <fieldset className="bg-[#111827] border border-gray-800 rounded-xl p-6 md:p-8 space-y-5">
      <legend className="px-2 -ml-2">
        <span className="block text-blue-400 font-semibold text-sm uppercase tracking-widest">
          {meta.title}
        </span>
      </legend>
      {meta.subtitle && (
        <p className="text-gray-400 text-sm -mt-2">{meta.subtitle}</p>
      )}
      {children}
    </fieldset>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-gray-200 text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </span>
      {hint && <span className="block text-gray-500 text-xs mb-2">{hint}</span>}
      {children}
    </label>
  );
}
