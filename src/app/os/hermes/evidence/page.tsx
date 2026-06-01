import { readApprovalExecutionLifecycle } from "@/lib/hermesApprovalOutbox";

export const dynamic = "force-dynamic";

export default async function HermesEvidencePage() {
  const [lifecycle, coworkBridge] = await Promise.all([readApprovalExecutionLifecycle(), readCoworkBridgeExport()]);
  const evidenceItems = lifecycle.flatMap((item) => item.submitted_evidence.map((evidence) => ({ lifecycle: item, evidence })));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Evidence Review</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Completion requires proof</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          Shows safe approval-linked evidence summaries exported by Hermes. Raw transcripts, credentials, provider keys,
          prompts, and private tool output stay out of OttoServ OS.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Metric label="Lifecycle records" value={String(lifecycle.length)} />
        <Metric label="Evidence submitted" value={String(evidenceItems.length)} />
        <Metric
          label="Waiting or missing"
          value={String(lifecycle.filter((item) => item.evidence_status === "required" || item.evidence_status === "missing").length)}
        />
      </div>

      <section className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-100">Cowork Bridge</p>
            <p className="mt-2 text-sm leading-6 text-cyan-50/80">
              {coworkBridge.connected ? "Cowork bridge connected through safe export." : "Cowork bridge not connected."}
            </p>
          </div>
          <span
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase ${
              coworkBridge.connected
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                : "border-amber-400/40 bg-amber-400/15 text-amber-100"
            }`}
          >
            {coworkBridge.connected ? coworkBridge.health?.bridge_mode || "connected" : "not connected"}
          </span>
        </div>

        {coworkBridge.connected && coworkBridge.health ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Queued Cowork tasks" value={String(coworkBridge.tasks.length)} />
            <Info label="Pending task count" value={String(coworkBridge.health.pending_task_count ?? 0)} />
            <Info label="Completed result count" value={String(coworkBridge.health.completed_result_count ?? 0)} />
            <Info label="Failed/blocked result count" value={String(coworkBridge.health.failed_result_count ?? 0)} />
            <Info label="Runner installed" value={coworkBridge.health.runner_installed ? "Yes" : "No"} />
            <Info label="Runner mode" value={coworkBridge.health.runner_mode || coworkBridge.health.bridge_mode || "Unavailable"} />
            <Info label="Runner last seen" value={coworkBridge.health.runner_last_seen || "Never"} />
            <Info label="Execution state" value={displayStatus(coworkBridge.health.current_cowork_execution_state)} />
            <Info label="Cowork result state" value={displayStatus(coworkBridge.health.cowork_result_state)} />
            <Info label="Cowork outbox evidence" value={String(coworkBridge.health.cowork_outbox_evidence_count ?? 0)} />
            <Info label="App worker installed" value={coworkBridge.health.app_worker_installed ? "Yes" : "No"} />
            <Info label="App worker source" value={coworkBridge.health.app_worker_latest_source || "Unavailable"} />
            <Info label="App worker interactive session" value={coworkBridge.health.app_worker_interactive_session ? "Yes" : "No"} />
            <Info label="Claude/Cowork app found" value={coworkBridge.health.app_worker_app_found ? "Yes" : "No"} />
            <Info label="Claude/Cowork visible window" value={coworkBridge.health.app_worker_visible_window_found ? "Yes" : "No"} />
            <Info label="Claude/Cowork app focused" value={coworkBridge.health.app_worker_app_focused ? "Yes" : "No"} />
            <Info label="App worker Windows user" value={coworkBridge.health.app_worker_windows_user || "Unavailable"} />
            <Info label="App worker session ID" value={String(coworkBridge.health.app_worker_process_session_id ?? "Unavailable")} />
            <Info label="Explorer session IDs" value={(coworkBridge.health.app_worker_explorer_session_ids || []).join(", ") || "Unavailable"} />
            <Info label="App window titles found" value={(coworkBridge.health.app_worker_window_titles_found || []).join(", ") || "None"} />
            <Info label="Browser worker source" value={coworkBridge.health.browser_worker_latest_source || "Unavailable"} />
            <Info label="Browser worker status" value={displayStatus(coworkBridge.health.browser_worker_status)} />
            <Info label="Browser worker mode" value={coworkBridge.health.browser_worker_mode || "Unavailable"} />
            <Info label="Browser worker name" value={coworkBridge.health.browser_worker_name || "Unavailable"} />
            <Info label="Browser waiting for confirmation" value={coworkBridge.health.browser_worker_waiting_for_user_confirmation ? "Yes" : "No"} />
            <Info label="Last packet detected" value={coworkBridge.health.last_packet_detected || "Unavailable"} />
            <Info label="Last submission attempt" value={coworkBridge.health.last_submission_attempt || "Unavailable"} />
            <Info label="Last result captured" value={coworkBridge.health.last_result_captured || "No result captured yet"} />
            <Info label="Last evidence ingestion" value={coworkBridge.health.last_evidence_ingestion || "No ingestion yet"} />
            <Info label="Last dashboard export" value={coworkBridge.health.last_dashboard_export || "No export yet"} />
            <Info
              label="Manual copy/paste required"
              value={coworkBridge.health.cowork_blocked_waiting_for_manual_copy ? "Yes" : "No - local runner is staging packets"}
            />
            <Info label="Hermes consumed evidence" value={coworkBridge.health.hermes_consumed_result_evidence ? "Yes" : "No evidence consumed yet"} />
            <Info label="App worker blocked reason" value={coworkBridge.health.app_worker_blocked_reason || "None"} />
            <Info label="Browser worker blocked reason" value={coworkBridge.health.browser_worker_blocked_reason || "None"} />
            <Info label="Blocked reason" value={coworkBridge.health.blocked_reason || "None"} />
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-cyan-200/20 bg-black/25 p-4 text-sm text-cyan-50/70">
            No Cowork bridge export found. Cowork is not silently operating from this dashboard view.
          </p>
        )}

        {coworkBridge.tasks.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {coworkBridge.tasks.slice(0, 4).map((task) => (
              <div key={task.task_id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="font-mono text-xs text-cyan-100/70">{task.task_id}</p>
                <p className="mt-2 text-sm font-bold text-white">{task.objective}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-gray-500">
                  {task.priority} / {task.status} / {task.task_type}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-300">{task.instructions}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {lifecycle.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <p className="text-lg font-black text-white">No execution lifecycle export found</p>
          <div className="mt-3 space-y-2 text-sm leading-6 text-gray-400">
            <p>Hermes has not consumed any approval decisions yet, or the safe lifecycle export is not reachable from OttoServ OS.</p>
            <p>No evidence has been submitted yet.</p>
            <p>Once Hermes consumes an approval decision, this page will show whether execution was queued, blocked, completed, or waiting for evidence.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {lifecycle.map((item) => (
          <article key={item.intake_id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-xs text-gray-500">{item.approval_item_id}</p>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold uppercase text-gray-300">
                {item.evidence_status.replace(/_/g, " ")}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-black text-white">{item.execution_status.replace(/_/g, " ")}</h2>
            <p className="mt-2 text-sm text-blue-200">
              {item.execution_rail.replace(/_/g, " ")} / {item.assigned_agent}
            </p>
            <div className="mt-4 grid gap-3">
              <Info label="Intake ID" value={item.intake_id} />
              <Info label="Task ID" value={item.assigned_task_id} />
              <Info label="Required evidence" value={item.required_evidence.length ? item.required_evidence.join("; ") : "No evidence required"} />
              <Info label="Hermes review result" value={item.hermes_review_result.replace(/_/g, " ")} />
              {item.blocker_reason ? <Info label="Blocker" value={item.blocker_reason} /> : null}
            </div>
            {item.submitted_evidence.length ? (
              <div className="mt-4 space-y-3">
                {item.submitted_evidence.map((evidence) => (
                  <div key={evidence.evidence_id} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <p className="font-mono text-xs text-emerald-100/70">{evidence.evidence_id}</p>
                    <p className="mt-2 text-sm font-bold text-white">{evidence.evidence_type.replace(/_/g, " ")}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-300">{evidence.evidence_summary}</p>
                    <p className="mt-2 break-all font-mono text-xs text-gray-500">{evidence.evidence_reference}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-500">
                      {evidence.review_status.replace(/_/g, " ")} / {evidence.redaction_status}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-white/15 bg-black/25 p-4 text-sm text-gray-400">
                {emptyStateForEvidence(item.evidence_status)}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-gray-100">{value}</p>
    </div>
  );
}

function emptyStateForEvidence(status: string) {
  if (status === "not_required") return "No evidence required for this approval lifecycle.";
  if (status === "missing") return "Evidence is required but has not been submitted yet.";
  if (status === "required") return "Evidence is required and awaiting agent submission.";
  if (status === "submitted") return "Evidence has been submitted and is awaiting Hermes review.";
  if (status === "accepted") return "Evidence was accepted, but no submitted evidence records were included in this export.";
  if (status === "rejected") return "Evidence was rejected or needs revision.";
  return "No safe evidence record has been exported for this lifecycle yet.";
}

function displayStatus(status?: string) {
  if (!status) return "Unavailable";
  return status.replace(/_/g, " ");
}

interface CoworkTask {
  task_id: string;
  priority: string;
  task_type: string;
  status: string;
  objective: string;
  instructions: string;
}

interface CoworkHealth {
  bridge_mode?: string;
  pending_task_count?: number;
  completed_result_count?: number;
  failed_result_count?: number;
  cowork_blocked_waiting_for_manual_copy?: boolean;
  hermes_consumed_result_evidence?: boolean;
  runner_installed?: boolean;
  runner_mode?: string;
  runner_last_seen?: string;
  last_packet_detected?: string;
  last_submission_attempt?: string;
  last_result_captured?: string;
  last_evidence_ingestion?: string;
  last_dashboard_export?: string;
  current_cowork_execution_state?: string;
  cowork_result_state?: string;
  cowork_outbox_evidence_count?: number;
  app_worker_installed?: boolean;
  app_worker_latest_source?: string;
  app_worker_app_found?: boolean;
  app_worker_app_focused?: boolean;
  app_worker_interactive_session?: boolean;
  app_worker_visible_window_found?: boolean;
  app_worker_blocked_reason?: string;
  app_worker_windows_user?: string;
  app_worker_process_session_id?: number;
  app_worker_explorer_session_ids?: number[];
  app_worker_window_titles_found?: string[];
  browser_worker_latest_source?: string;
  browser_worker_status?: string;
  browser_worker_mode?: string;
  browser_worker_name?: string;
  browser_worker_waiting_for_user_confirmation?: boolean;
  browser_worker_blocked_reason?: string;
  blocked_reason?: string;
  last_modified?: {
    copy_packet?: string;
  };
}

async function readCoworkBridgeExport(): Promise<{ connected: boolean; health: CoworkHealth | null; tasks: CoworkTask[] }> {
  const url = process.env.HERMES_SAFE_EXPORT_API_URL || process.env.HERMES_APPROVAL_API_URL?.replace(/\/approval-decisions$/, "/safe-export");
  const apiKey = process.env.HERMES_APPROVAL_API_KEY;
  if (!url || !apiKey) return { connected: false, health: null, tasks: [] };
  try {
    const response = await fetch(url, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) return { connected: false, health: null, tasks: [] };
    const payload = (await response.json()) as { files?: Array<{ file_name: string; status: string; content?: string }> };
    const health = parseExportJson<CoworkHealth>(payload, "cowork_bridge_health.json");
    const taskPayload = parseExportJson<{ tasks?: CoworkTask[] }>(payload, "cowork_tasks_today.json");
    return {
      connected: Boolean(health || taskPayload),
      health,
      tasks: (taskPayload?.tasks || []).filter((task) => task.task_id && task.objective),
    };
  } catch {
    return { connected: false, health: null, tasks: [] };
  }
}

function parseExportJson<T>(payload: { files?: Array<{ file_name: string; status: string; content?: string }> }, fileName: string): T | null {
  const file = payload.files?.find((item) => item.file_name === fileName && item.status === "available");
  if (!file?.content) return null;
  try {
    return JSON.parse(file.content) as T;
  } catch {
    return null;
  }
}
