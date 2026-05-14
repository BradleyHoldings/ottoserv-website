"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { canAccessAdmin } from "@/lib/userAuth";

const ADMIN_TOKEN_KEY = "ottoserv_admin_api_token";

interface AuditRow {
  id: number;
  email: string;
  name: string | null;
  company_name: string | null;
  phone: string | null;
  website: string | null;
  business_type: string | null;
  source: string | null;
  utm_source: string | null;
  priority: string | null;
  status: string | null;
  estimated_value: number | null;
  pain_points: string[] | null;
  notes: string | null;
  biggest_operational_bottleneck: string | null;
  current_tools_or_crm: string | null;
  consent_to_contact: boolean | null;
  request_date: string | null;
  created_at: string | null;
  audit_findings?: string | null;
  recommendations?: string | null;
  follow_up_notes?: string | null;
  assigned_to?: string | null;
}

interface ParsedNotes {
  schema_version?: number;
  source?: string;
  intake_summary?: string;
  submitted_at?: string;
  pain_tags?: string[];
  sections?: Record<string, Record<string, unknown> | undefined>;
}

const SECTION_TITLES: Record<string, string> = {
  company_profile: "Company Profile",
  lead_intake: "Lead Intake",
  follow_up: "Follow-Up",
  scheduling: "Scheduling",
  admin_workload: "Admin Workload",
  bottlenecks_handoffs: "Bottlenecks & Handoffs",
  tools_systems: "Tools & Systems",
  hiring_urgency_priority: "Hiring, Urgency & Priority",
};

function parseNotes(notes: string | null): ParsedNotes {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === "object") return parsed as ParsedNotes;
    return {};
  } catch {
    return {};
  }
}

function humanize(key: string): string {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.length === 0 ? "—" : v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

interface PlatformSession {
  session_id: string;
  client_token?: string | null;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  submission_method?: string | null;
  company_name?: string | null;
  industry?: string | null;
  counts?: { operational_fires?: number; recommendations?: number };
  client_url?: string;
  admin_url?: string;
}

type PlatformLookup =
  | { status: "loading" }
  | { status: "ok"; session: PlatformSession }
  | { status: "none"; reason: string }
  | { status: "error"; message: string };

export default function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [row, setRow] = useState<AuditRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [platform, setPlatform] = useState<PlatformLookup>({ status: "loading" });

  // Hydration-safe client-only auth/token read.
  useEffect(() => {
    const a = canAccessAdmin();
    const t = typeof window !== "undefined"
      ? localStorage.getItem(ADMIN_TOKEN_KEY) || ""
      : "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(a);
    setToken(t);
  }, []);

  useEffect(() => {
    async function run() {
      if (!authed || !token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/audit/${id}`, {
          headers: { "x-admin-token": token },
          cache: "no-store",
        });
        if (res.status === 401) {
          setError("Admin token rejected. Go back to the list and re-enter it.");
          return;
        }
        if (res.status === 404) {
          setError("Audit submission not found.");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const data = (await res.json()) as { row: AuditRow };
        setRow(data.row);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load audit");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [authed, token, id]);

  // Cross-link to the platform's auto-generated onboarding session, if the
  // bridge processed this audit. Lookup is best-effort; failures degrade to
  // a "no session yet" message rather than blocking the page.
  useEffect(() => {
    async function lookup() {
      if (!authed || !token) return;
      setPlatform({ status: "loading" });
      try {
        const res = await fetch(`/api/audit/${id}/platform-session`, {
          headers: { "x-admin-token": token },
          cache: "no-store",
        });
        const data = (await res.json()) as {
          session: PlatformSession | null;
          reason?: string;
        };
        if (data.session) {
          setPlatform({ status: "ok", session: data.session });
        } else {
          setPlatform({ status: "none", reason: data.reason || "no_session_yet" });
        }
      } catch (e) {
        setPlatform({
          status: "error",
          message: e instanceof Error ? e.message : "Lookup failed",
        });
      }
    }
    void lookup();
  }, [authed, token, id]);

  if (authed === null || loading) {
    return <div className="p-6 text-gray-400">Loading…</div>;
  }

  if (!authed) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-red-400 mb-3">🚫 Access Denied</h1>
        <Link href="/admin-access" className="text-blue-400 hover:text-blue-300">
          Set up super admin access →
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <p className="text-gray-300 mb-4">Admin token not set.</p>
        <Link href="/dashboard/admin/audits" className="text-blue-400 hover:text-blue-300">
          ← Back to audit list to enter token
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Link href="/dashboard/admin/audits" className="text-blue-400 hover:text-blue-300 text-sm">
          ← Back to audit list
        </Link>
        <div className="mt-4 bg-red-900/40 border border-red-800 text-red-300 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }

  if (!row) return <div className="p-6 text-gray-400">Not found.</div>;

  const parsed = parseNotes(row.notes);
  const sections = parsed.sections || {};
  const date = row.request_date || row.created_at;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/dashboard/admin/audits" className="text-blue-400 hover:text-blue-300 text-sm">
        ← Back to audit list
      </Link>

      <div className="mt-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          {row.company_name || "(no company)"}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Audit #{row.id} · {row.business_type || "industry n/a"} · submitted{" "}
          {date ? new Date(date).toLocaleString() : "n/a"}
        </p>
      </div>

      {/* Top metadata strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Contact">
          <div className="text-gray-200">{row.name || "—"}</div>
          <div className="text-gray-400 text-xs">{row.email}</div>
          {row.phone && <div className="text-gray-400 text-xs">{row.phone}</div>}
        </Stat>
        <Stat label="Priority">{row.priority || "—"}</Stat>
        <Stat label="Status">{row.status || "—"}</Stat>
        <Stat label="Est. value">
          {typeof row.estimated_value === "number"
            ? `$${row.estimated_value.toLocaleString()}`
            : "—"}
        </Stat>
      </div>

      {/* Platform session cross-link — shows the auto-generated onboarding
          session spawned by the audit bridge, if any. */}
      <PlatformSessionCard state={platform} />

      {/* Pain signals */}
      {(parsed.pain_tags && parsed.pain_tags.length > 0) ||
      (row.pain_points && row.pain_points.length > 0) ? (
        <div className="mb-6">
          <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-2">
            Top pain signals
          </h2>
          <div className="flex flex-wrap gap-2">
            {(parsed.pain_tags || row.pain_points || []).map((t) => (
              <span
                key={t}
                className="bg-blue-600/15 text-blue-300 border border-blue-800 rounded px-3 py-1 text-sm"
              >
                {t.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {parsed.intake_summary && (
        <div className="mb-8 bg-[#111827] border border-gray-800 rounded-xl p-5">
          <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-2">Summary</h2>
          <p className="text-gray-200">{parsed.intake_summary}</p>
        </div>
      )}

      {/* Sections */}
      {Object.keys(sections).length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-2">
            Legacy submission (no sectioned intake)
          </h2>
          {row.biggest_operational_bottleneck && (
            <p className="text-gray-200 mb-2">
              <strong className="text-gray-400">Bottleneck:</strong>{" "}
              {row.biggest_operational_bottleneck}
            </p>
          )}
          {row.current_tools_or_crm && (
            <p className="text-gray-200">
              <strong className="text-gray-400">Tools:</strong> {row.current_tools_or_crm}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(SECTION_TITLES).map(([key, title]) => {
            const data = sections[key];
            if (!data) return null;
            return (
              <div
                key={key}
                className="bg-[#111827] border border-gray-800 rounded-xl p-6"
              >
                <h2 className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
                  {title}
                </h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {Object.entries(data).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                        {humanize(k)}
                      </dt>
                      <dd className="text-gray-200 text-sm whitespace-pre-wrap">
                        {renderValue(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw notes JSON */}
      <details className="mt-8 bg-[#0d0d0d] border border-gray-800 rounded-xl p-4">
        <summary className="text-gray-400 text-sm cursor-pointer">Raw notes JSON</summary>
        <pre className="mt-3 text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap">
          {row.notes || "(empty)"}
        </pre>
      </details>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
      <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</div>
      <div className="text-gray-200">{children}</div>
    </div>
  );
}

function PlatformSessionCard({ state }: { state: PlatformLookup }) {
  if (state.status === "loading") {
    return (
      <div className="mb-6 bg-[#0d0d0d] border border-gray-800 rounded-xl p-4 text-gray-500 text-sm">
        Checking enterprise-platform for a linked onboarding session…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mb-6 bg-[#0d0d0d] border border-yellow-900 rounded-xl p-4">
        <div className="text-yellow-400 text-xs uppercase tracking-widest mb-1">
          Platform lookup failed
        </div>
        <div className="text-gray-300 text-sm">{state.message}</div>
      </div>
    );
  }

  if (state.status === "none") {
    const message =
      state.reason === "no_session_yet"
        ? "Bridge hasn't processed this audit yet. Either it predates the bridge build, or the platform was unreachable when the audit was submitted."
        : state.reason === "bridge_not_configured"
          ? "AUDIT_BRIDGE_URL / AUDIT_BRIDGE_KEY aren't set on this deploy — the cross-link can't be looked up."
          : state.reason === "platform_unreachable"
            ? "Enterprise-platform isn't responding right now. Try refreshing once it's back up."
            : "No platform session found for this audit.";
    return (
      <div className="mb-6 bg-[#0d0d0d] border border-gray-800 rounded-xl p-4">
        <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">
          Platform session
        </div>
        <div className="text-gray-400 text-sm">{message}</div>
      </div>
    );
  }

  const s = state.session;
  const fires = s.counts?.operational_fires ?? 0;
  const recs = s.counts?.recommendations ?? 0;
  return (
    <div className="mb-6 bg-blue-950/30 border border-blue-900 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-blue-300 text-xs uppercase tracking-widest">
          Platform session (auto-generated)
        </h2>
        <span className="text-xs text-gray-400">
          {s.status === "completed" ? "✓ finalized" : `status: ${s.status || "?"}`}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Fires</div>
          <div className="text-gray-100 text-lg">{fires}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Recommendations</div>
          <div className="text-gray-100 text-lg">{recs}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Submitted via</div>
          <div className="text-gray-300 text-sm">{s.submission_method || "—"}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Completed</div>
          <div className="text-gray-300 text-sm">
            {s.completed_at ? new Date(s.completed_at).toLocaleString() : "—"}
          </div>
        </div>
      </div>
      <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Session ID</div>
      <code className="block text-gray-300 text-xs mb-3 break-all">{s.session_id}</code>
      {s.client_url && (
        <div className="text-gray-400 text-sm">
          Client URL:{" "}
          <code className="text-gray-300 break-all">{s.client_url}</code>
        </div>
      )}
      {s.admin_url && (
        <div className="text-gray-400 text-sm">
          Platform admin URL:{" "}
          <code className="text-gray-300 break-all">{s.admin_url}</code>
        </div>
      )}
    </div>
  );
}
