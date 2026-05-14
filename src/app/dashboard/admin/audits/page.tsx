"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { canAccessAdmin, getCurrentUser } from "@/lib/userAuth";

interface AuditRow {
  id: number;
  email: string;
  name: string | null;
  company_name: string | null;
  phone: string | null;
  business_type: string | null;
  source: string | null;
  utm_source: string | null;
  priority: string | null;
  status: string | null;
  estimated_value: number | null;
  pain_points: string[] | null;
  notes: string | null;
  request_date: string | null;
  created_at: string | null;
  biggest_operational_bottleneck: string | null;
}

interface ParsedNotes {
  schema_version?: number;
  intake_summary?: string;
  pain_tags?: string[];
  sections?: {
    hiring_urgency_priority?: {
      urgency_level?: string;
      priority_process_to_automate?: string;
    };
  };
}

const ADMIN_TOKEN_KEY = "ottoserv_admin_api_token";

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

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-900/40 text-red-300 border-red-800",
  medium: "bg-amber-900/40 text-amber-300 border-amber-800",
  low: "bg-gray-800 text-gray-300 border-gray-700",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-blue-900/40 text-blue-300 border-blue-800",
  contacted: "bg-purple-900/40 text-purple-300 border-purple-800",
  scheduled: "bg-amber-900/40 text-amber-300 border-amber-800",
  completed: "bg-green-900/40 text-green-300 border-green-800",
  closed_lost: "bg-gray-800 text-gray-400 border-gray-700",
};

export default function AdminAuditsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Hydration-safe client-only auth/token read. localStorage isn't available
  // during SSR for this "use client" component, so the read must happen post-mount.
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
    if (authed && token) {
      void fetchRows(token);
    }
  }, [authed, token]);

  async function fetchRows(t: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/audit/list?limit=200", {
        headers: { "x-admin-token": t },
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("Admin token rejected. Re-enter it below.");
        setToken("");
        if (typeof window !== "undefined") localStorage.removeItem(ADMIN_TOKEN_KEY);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as { rows: AuditRow[] };
      setRows(data.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audits");
    } finally {
      setLoading(false);
    }
  }

  function saveToken(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(ADMIN_TOKEN_KEY, tokenInput.trim());
    }
    setToken(tokenInput.trim());
    setTokenInput("");
  }

  function clearToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
    setToken("");
    setRows([]);
  }

  if (authed === null) {
    return <div className="p-6 text-gray-400">Loading…</div>;
  }

  if (!authed) {
    const u = getCurrentUser();
    return (
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-red-400 mb-3">🚫 Access Denied</h1>
        <p className="text-gray-400 mb-4">
          This page is restricted to OttoServ super admins. {u?.email && <>Currently signed in as <span className="text-gray-200">{u.email}</span>.</>}
        </p>
        <Link href="/admin-access" className="text-blue-400 hover:text-blue-300">
          Set up super admin access →
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-3">Process Audit Submissions</h1>
        <p className="text-gray-400 mb-6">
          Enter the admin API token to load submissions. The token must match
          <code className="text-blue-300 mx-1">ADMIN_API_TOKEN</code> in the deployment env.
        </p>
        <form onSubmit={saveToken} className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-4">
          <input
            type="password"
            placeholder="Admin API token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded text-white placeholder-gray-500"
            autoComplete="off"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
          >
            Save token & load audits
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Process Audit Submissions
          </h1>
          <p className="text-gray-400 text-sm">
            Internal-only. Read-only view of <code className="text-blue-300">audit_requests</code> rows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRows(token)}
            className="bg-[#1f2937] hover:bg-[#374151] text-white text-sm px-4 py-2 rounded border border-gray-700"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            onClick={clearToken}
            className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded"
            title="Clear admin token from localStorage"
          >
            Sign out token
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-800 text-red-300 rounded-lg p-4 mb-4">
          {error}
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-10 text-center text-gray-400">
          No audit submissions yet.
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0d0d0d] text-gray-400 uppercase text-xs tracking-wider">
              <tr>
                <Th>Submitted</Th>
                <Th>Company</Th>
                <Th>Contact</Th>
                <Th>Industry</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th>Urgency</Th>
                <Th>Top pain signals</Th>
                <Th>Priority process</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const parsed = parseNotes(row.notes);
                const urgency = parsed.sections?.hiring_urgency_priority?.urgency_level;
                const priorityProc = parsed.sections?.hiring_urgency_priority?.priority_process_to_automate;
                const tags = parsed.pain_tags || row.pain_points || [];
                const date = row.request_date || row.created_at;
                return (
                  <tr key={row.id} className="border-t border-gray-800 hover:bg-[#0d0d0d]/60">
                    <Td>
                      <span className="text-gray-300">
                        {date ? new Date(date).toLocaleDateString() : "—"}
                      </span>
                      <span className="block text-gray-500 text-xs">
                        {date ? new Date(date).toLocaleTimeString() : ""}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-white font-medium">{row.company_name || "—"}</span>
                    </Td>
                    <Td>
                      <span className="text-gray-200">{row.name || "—"}</span>
                      <span className="block text-gray-500 text-xs">{row.email}</span>
                      {row.phone && <span className="block text-gray-500 text-xs">{row.phone}</span>}
                    </Td>
                    <Td>{row.business_type || "—"}</Td>
                    <Td>
                      <Badge value={row.priority} map={PRIORITY_BADGE} />
                    </Td>
                    <Td>
                      <Badge value={row.status} map={STATUS_BADGE} />
                    </Td>
                    <Td>
                      <span className="text-gray-300 text-xs">{urgency || "—"}</span>
                    </Td>
                    <Td>
                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="bg-[#0d0d0d] border border-gray-800 text-blue-300 text-xs px-2 py-0.5 rounded"
                            >
                              {t.replaceAll("_", " ")}
                            </span>
                          ))}
                          {tags.length > 4 && (
                            <span className="text-gray-500 text-xs">+{tags.length - 4}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">—</span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-gray-300 text-xs line-clamp-2">{priorityProc || "—"}</span>
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/admin/audits/${row.id}`}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Open →
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left px-4 py-3 whitespace-nowrap">{children}</th>;
}
function Td({ children }: { children?: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}

function Badge({ value, map }: { value: string | null; map: Record<string, string> }) {
  if (!value) return <span className="text-gray-500 text-xs">—</span>;
  const cls = map[value] || "bg-gray-800 text-gray-300 border-gray-700";
  return (
    <span className={`inline-block border text-xs font-medium px-2 py-0.5 rounded ${cls}`}>
      {value}
    </span>
  );
}
