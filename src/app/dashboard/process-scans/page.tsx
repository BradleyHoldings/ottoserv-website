"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { canAccessAdmin } from "@/lib/userAuth";
import type { ProcessScan } from "@/lib/processScans";

const ADMIN_TOKEN_KEY = "ottoserv_admin_api_token";

export default function ProcessScansPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [rows, setRows] = useState<ProcessScan[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const isAdmin = canAccessAdmin();
    const saved = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) || "" : "";
    // Hydration-safe localStorage/auth read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(isAdmin);
    setToken(saved);
  }, []);

  useEffect(() => {
    if (authed && token) void loadRows(token);
  }, [authed, token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "all" || row.status === status || row.report_status === status;
      if (!matchesStatus) return false;
      if (!q) return true;
      return [
        row.company_name,
        row.contact_name,
        row.email,
        row.main_leak,
        row.process_name,
        row.business_type,
      ].some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [rows, query, status]);

  async function loadRows(t: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/process-scans", {
        headers: { "x-admin-token": t },
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("Admin token rejected. Re-enter it below.");
        setToken("");
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      setRows(body.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load process scans.");
    } finally {
      setLoading(false);
    }
  }

  function saveToken(e: React.FormEvent) {
    e.preventDefault();
    const next = tokenInput.trim();
    if (!next) return;
    localStorage.setItem(ADMIN_TOKEN_KEY, next);
    setToken(next);
    setTokenInput("");
  }

  if (authed === null) return <div className="p-6 text-gray-400">Loading...</div>;

  if (!authed) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="mb-3 text-2xl font-bold text-red-400">Access denied</h1>
        <p className="text-gray-400">Process scans are OttoServ-admin only.</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="mb-3 text-2xl font-bold text-white">Process Scans</h1>
        <p className="mb-6 text-gray-400">
          Enter the admin API token that matches <code className="text-blue-300">ADMIN_API_TOKEN</code>.
        </p>
        <form onSubmit={saveToken} className="space-y-4 rounded-xl border border-gray-800 bg-[#111827] p-6">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full rounded border border-gray-700 bg-[#0d0d0d] px-3 py-2 text-white"
            placeholder="Admin API token"
          />
          <button className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
            Save Token
          </button>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Free Leak Check Scans</h1>
          <p className="mt-1 text-sm text-gray-500">
            Submitted process scans, report status, and pilot recommendations.
          </p>
        </div>
        <button
          onClick={() => loadRows(token)}
          className="rounded border border-gray-700 bg-[#1f2937] px-4 py-2 text-sm font-semibold text-white hover:bg-[#374151]"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>}

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-800 bg-[#111827] p-4 md:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company, contact, leak, process..."
          className="min-w-0 flex-1 rounded border border-gray-700 bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-gray-700 bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="all">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="report_ready">Report ready</option>
          <option value="pilot_recommended">Pilot recommended</option>
          <option value="ready">Email ready</option>
          <option value="sent">Email sent</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#111827]">
        <table className="w-full text-sm">
          <thead className="bg-[#0d0d0d] text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <Th>Created</Th>
              <Th>Company</Th>
              <Th>Contact</Th>
              <Th>Main leak</Th>
              <Th>Process</Th>
              <Th>Business type</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  {loading ? "Loading scans..." : "No process scans found."}
                </td>
              </tr>
            ) : (
              filtered.map((scan) => (
                <tr
                  key={scan.id}
                  onClick={() => router.push(`/dashboard/process-scans/${scan.id}`)}
                  className="cursor-pointer border-t border-gray-800 hover:bg-[#0d0d0d]/70"
                >
                  <Td>
                    <span className="text-gray-300">{new Date(scan.created_at).toLocaleDateString()}</span>
                    <span className="block text-xs text-gray-600">{new Date(scan.created_at).toLocaleTimeString()}</span>
                  </Td>
                  <Td><span className="font-medium text-white">{scan.company_name}</span></Td>
                  <Td>
                    <span className="text-gray-200">{scan.contact_name}</span>
                    <span className="block text-xs text-gray-500">{scan.email}</span>
                  </Td>
                  <Td>{scan.main_leak.replaceAll("_", " ")}</Td>
                  <Td>{scan.process_name}</Td>
                  <Td>{scan.business_type || "-"}</Td>
                  <Td>
                    <span className="rounded border border-blue-900 bg-blue-950/40 px-2 py-1 text-xs text-blue-300">
                      {scan.status.replaceAll("_", " ")}
                    </span>
                  </Td>
                  <Td>
                    <Link
                      href={`/dashboard/process-scans/${scan.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Open
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top text-gray-300">{children}</td>;
}
