"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { canAccessAdmin } from "@/lib/userAuth";
import type { ProcessScan } from "@/lib/processScans";
import type { PilotStartConversion } from "@/lib/processScanConversions";

const ADMIN_TOKEN_KEY = "ottoserv_admin_api_token";

export default function ProcessScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [scan, setScan] = useState<ProcessScan | null>(null);
  const [pilotStarts, setPilotStarts] = useState<PilotStartConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPilotStarts = useCallback(async (scanId: string) => {
    if (!scanId || !token) return;
    try {
      const res = await fetch("/api/process-scans/start-pilot", {
        headers: { "x-admin-token": token },
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const rows = Array.isArray(body.rows) ? body.rows : [];
      setPilotStarts(rows.filter((row: PilotStartConversion) => row.scan_id === scanId));
    } catch {
      setPilotStarts([]);
    }
  }, [token]);

  const loadScan = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/process-scans/${id}`, {
        headers: { "x-admin-token": token },
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      setScan(body.scan);
      void loadPilotStarts(body.scan?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load process scan.");
    } finally {
      setLoading(false);
    }
  }, [id, token, loadPilotStarts]);

  useEffect(() => {
    // Hydration-safe localStorage/auth read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(canAccessAdmin());
    setToken(typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) || "" : "");
  }, []);

  useEffect(() => {
    // Data load is intentionally triggered after client auth/token hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (authed && token) void loadScan();
  }, [authed, token, loadScan]);

  async function patchScan(patch: Partial<ProcessScan>, success: string) {
    if (!scan) return;
    setNotice("");
    setError("");
    try {
      const res = await fetch(`/api/process-scans/${scan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      setScan(body.scan);
      setNotice(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function copyEmail() {
    if (!scan) return;
    const draft = `Subject: ${scan.email_subject || ""}\n\nPreview: ${scan.email_preview_text || ""}\n\n${scan.email_body_markdown || ""}`;
    await navigator.clipboard.writeText(draft);
    setNotice("Email draft copied.");
  }

  if (authed === null || loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!authed) return <div className="p-8 text-red-400">Access denied.</div>;
  if (!token) {
    return (
      <div className="p-8">
        <p className="text-gray-300">Admin token not set.</p>
        <Link href="/dashboard/process-scans" className="text-blue-400 hover:text-blue-300">Back to process scans</Link>
      </div>
    );
  }
  if (error && !scan) {
    return (
      <div className="p-8">
        <Link href="/dashboard/process-scans" className="text-blue-400 hover:text-blue-300">Back to process scans</Link>
        <div className="mt-4 rounded border border-red-900 bg-red-950/40 p-4 text-red-300">{error}</div>
      </div>
    );
  }
  if (!scan) return <div className="p-6 text-gray-400">Not found.</div>;

  const reportHref = `/front-office-leak-check/report/${scan.public_report_slug}`;
  const leaks = asStringArray(scan.leaks_detected_json);
  const opportunities = asStringArray(scan.automation_opportunities_json);
  const risks = asObjectArray<{ title?: string; impact?: string; severity?: string }>(scan.revenue_risks_json);
  const priorities = asObjectArray<{ priority?: string; title?: string; action?: string; severity?: string }>(scan.priority_ranking_json);
  const nextActions = asStringArray(scan.practical_next_actions_json);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard/process-scans" className="text-sm text-blue-400 hover:text-blue-300">
        Back to process scans
      </Link>

      <div className="mt-3 mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">{scan.company_name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {scan.process_name} | {scan.business_type || "business type n/a"} | submitted {new Date(scan.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={reportHref} target="_blank" className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Open Report
          </Link>
          <button onClick={copyEmail} className="rounded border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500">
            Copy Email Draft
          </button>
        </div>
      </div>

      {notice && <div className="mb-4 rounded border border-green-900 bg-green-950/30 p-3 text-sm text-green-300">{notice}</div>}
      {error && <div className="mb-4 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Contact">
          <div>{scan.contact_name}</div>
          <div className="text-xs text-gray-500">{scan.email}</div>
          {scan.phone && <div className="text-xs text-gray-500">{scan.phone}</div>}
        </Stat>
        <Stat label="Status">{scan.status.replaceAll("_", " ")}</Stat>
        <Stat label="Recording">{(scan.recording_status || "not_provided").replaceAll("_", " ")}</Stat>
        <Stat label="Audio">{scan.audio_included ? "Narration captured" : (scan.audio_status || "unknown").replaceAll("_", " ")}</Stat>
        <Stat label="Report">{scan.report_status}</Stat>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => patchScan({ analysis_status: "queued" }, "Analysis placeholder queued.")} className="rounded bg-[#1f2937] px-4 py-2 text-sm text-white hover:bg-[#374151]">
          Generate Analysis
        </button>
        <button onClick={() => patchScan({ status: "pilot_recommended", recommended_next_step: "Recommend 30-day pilot" }, "Marked ready for pilot.")} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Recommend 30-Day Pilot
        </button>
        <button onClick={() => patchScan({ email_sent_at: new Date().toISOString(), report_status: "sent" }, "Report email marked sent.")} className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:border-gray-500">
          Mark Email Sent
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title="Intake Details">
            <Detail label="Main leak" value={scan.main_leak.replaceAll("_", " ")} />
            <Detail label="Industry" value={scan.industry || "-"} />
            <Detail label="Website" value={scan.website || "-"} />
            <Detail label="Software used" value={scan.software_used || "-"} />
            <Detail label="Monthly lead volume" value={scan.monthly_lead_volume || "-"} />
            <Detail label="Best time to contact" value={scan.best_time_to_contact || "-"} />
            <Detail label="Current process" value={scan.current_process_description} block />
            <Detail label="Failure impact" value={scan.failure_impact || "-"} block />
          </Panel>

          <Panel title="Recording">
            {scan.recording_url ? (
              <video controls src={scan.recording_url} className="aspect-video w-full rounded bg-black" />
            ) : (
              <p className="text-gray-400">
                No recording URL yet. Browser recording is captured locally in the MVP and upload storage still needs wiring.
              </p>
            )}
          </Panel>

          <Panel title="Report Draft">
            <Detail label="Executive summary" value={scan.executive_summary || "Pending"} block />
            <Detail label="Transcript" value={scan.transcript || "Placeholder - transcription not connected yet."} block />
            <Detail label="Process summary" value={scan.process_summary || "Pending"} block />
            <Detail label="Current SOP" value={scan.current_sop_markdown || "Pending"} block />
            <Detail label="Recommended SOP" value={scan.recommended_sop_markdown || "Pending"} block />
          </Panel>

          <Panel title="Pilot Start Requests">
            {pilotStarts.length ? (
              <div className="space-y-3">
                {pilotStarts.map((event) => (
                  <div key={event.id} className="rounded border border-gray-800 bg-[#0d0d0d] p-3 text-sm text-gray-300">
                    <div className="font-semibold text-white">{event.name} at {event.company}</div>
                    <div className="mt-1 text-xs text-gray-500">{event.email}{event.phone ? ` | ${event.phone}` : ""}</div>
                    <div className="mt-2">Workflow: {event.workflow}</div>
                    <div className="text-xs text-gray-500">Consent: {event.consent_to_contact ? "yes" : "no"} | {new Date(event.created_at).toLocaleString()}</div>
                    {event.notes && <div className="mt-2 whitespace-pre-wrap text-xs text-gray-400">{event.notes}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No pilot start conversion events recorded for this scan yet.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Detected Leaks">
            <SmallList items={leaks} />
          </Panel>
          <Panel title="Revenue Risks">
            <ObjectList items={risks.map((risk) => `${risk.severity || "risk"}: ${risk.title || "Untitled"} - ${risk.impact || ""}`)} />
          </Panel>
          <Panel title="Priority Ranking">
            <ObjectList items={priorities.map((item) => `${item.priority || "P"}: ${item.title || "Untitled"} - ${item.action || ""}`)} />
          </Panel>
          <Panel title="Practical Next Actions">
            <SmallList items={nextActions} />
          </Panel>
          <Panel title="Automation Opportunities">
            <SmallList items={opportunities} />
          </Panel>
          <Panel title="AI Employee Recommendation">
            <p className="text-gray-200">{scan.ai_employee_recommendation || "Pending"}</p>
          </Panel>
          <Panel title="Email Draft">
            <Detail label="Subject" value={scan.email_subject || "-"} block />
            <Detail label="Preview" value={scan.email_preview_text || "-"} block />
            <pre className="mt-3 whitespace-pre-wrap rounded border border-gray-800 bg-[#0d0d0d] p-3 text-xs text-gray-300">
              {scan.email_body_markdown || "Email draft pending."}
            </pre>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#111827] p-4">
      <div className="mb-1 text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-sm text-gray-200">{children}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-800 bg-[#111827] p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-400">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Detail({ label, value, block }: { label: string; value: string; block?: boolean }) {
  return (
    <div className={block ? "block" : "grid grid-cols-[130px_1fr] gap-3"}>
      <dt className="text-xs uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm text-gray-300">{value}</dd>
    </div>
  );
}

function SmallList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-gray-500">Placeholder - pending reviewed analysis.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="rounded border border-gray-800 bg-[#0d0d0d] p-3 text-sm text-gray-300">
          {item}
        </li>
      ))}
    </ul>
  );
}

function ObjectList({ items }: { items: string[] }) {
  return <SmallList items={items.filter(Boolean)} />;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function asObjectArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item): item is T => Boolean(item && typeof item === "object")) : [];
}
