// ─── Hermes live email execution adapter (Autonomy v2, sprint priority 1) ─────
//
// THE GAP THIS FILLS
// The durable actor queue holds materialized email packets and the rail handoff
// builds a send-ready draft + runs the full preflight — but NOTHING ever executes
// the send and writes back the message evidence that closes the packet. That is
// the exact top blocker the operating cycle reports: `request_actor_evidence`,
// because "queued outbound has not executed and no message evidence exists." With
// no executed sends, the scorecard's loop-closure + evidence-discipline dimensions
// are not even applicable, so they cannot pass and the autonomy score stays capped.
//
// This module is that adapter. It closes the loop end to end:
//   queued packet → preflight (reuse existing guardrails) → SEND (live only) →
//   message evidence (id/recipient/timestamp/status) → lifecycle completed →
//   counters/ledger updated → next action.
//
// SAFETY (what makes this safe to ship and run unattended):
//   - NO-SEND BY DEFAULT. mode must be explicitly "live" to send. Anything else
//     (and the absence of a wired transport) prepares the draft but sends nothing.
//   - NEVER FABRICATES EVIDENCE. Evidence is attached ONLY from a real transport
//     result that returns a message id. No send → no evidence → packet stays
//     queued (honest), so the score is never inflated.
//   - REUSES every guardrail: caps / DNC / blacklist / cooldown / contact path /
//     evidence contract / sensitive-content gating all run via prepareEmailHandoff.
//     Over-cap/sensitive → gated; missing prerequisite → blocked; neither sends.
//   - DO NOT SEND IN TESTS: tests run in no-send mode, or inject a STUB transport
//     (no network) — the real transport requires separate, credentialed wiring.
//   - Idempotent: a completed/evidence_submitted lifecycle is never re-sent.
//
// executeEmailQueue() does NO disk/network I/O of its own (it only calls the
// transport you give it). applyEmailExecution() owns disk + Supabase + ledger
// persistence, mirroring hermesSafeExecutor.

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveRevenueEngineDir } from "./revenueEngineReadAdapter.mjs";
import { loadRevenueDocument } from "./actorEvidenceIntake.mjs";
import { readActorQueue } from "./hermesActorQueue.mjs";
import { prepareEmailHandoff } from "./hermesOutboundRails.mjs";
import { attachExecutionEvidence, advanceExecutionStatus } from "./approvalExecutionBridge.mjs";
import { upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";
import { recordLedgerEvents } from "./hermesOperatingLedger.mjs";

export const EMAIL_EXECUTOR_DEFAULT_MODE = "no_send";

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

// A lifecycle that is already done (or has evidence in flight) must not be re-sent.
function alreadyResolved(status) {
  return ["evidence_submitted", "hermes_reviewing", "completed", "cancelled"].includes(clean(status));
}

// Build the message-evidence record from a REAL transport result. Returns null if
// the transport did not return a usable message id — we never invent evidence.
function evidenceFromSend(sendResult, draft, now) {
  const messageId = clean(sendResult?.message_id) || clean(sendResult?.id);
  if (!messageId) return null;
  const to = clean(sendResult?.to) || clean(draft?.to);
  const status = clean(sendResult?.status) || "sent";
  const sentAt = clean(sendResult?.sent_at) || now;
  const provider = clean(sendResult?.provider) || "email_transport";
  return {
    evidence_type: "email_sent",
    evidence_reference: messageId,
    evidence_summary: `Email sent to ${to} via ${provider} at ${sentAt}; status=${status}; subject="${clean(draft?.subject)}".`,
    submitted_by_agent: "Hermes",
    submitted_at: sentAt,
    redaction_status: "unredacted",
  };
}

/**
 * Execute the queued email packets against an (optional) transport. Returns a new
 * document + per-packet results + summary + ledger events. Sends nothing unless
 * mode === "live" AND a transport function is provided. The transport may be sync
 * or async; both are awaited.
 *
 * @param {object} document revenue document with approvalExecutionQueue
 * @param {object} ctx {
 *   now?, mode? ("no_send"|"live"),
 *   transport? (draft)=>({message_id,status,to,sent_at,provider}) | Promise<...>,
 *   dnc?, blacklist?, sentToday?, lastContactedAt?, cooldownDays?, flags?, dailyCap?
 * }
 * @returns Promise<{ document, results[], summary, ledgerEvents[], outbound_counters }>
 */
export async function executeEmailQueue(document = {}, ctx = {}) {
  const now = ctx.now || new Date().toISOString();
  const mode = clean(ctx.mode) || EMAIL_EXECUTOR_DEFAULT_MODE;
  const live = mode === "live";
  const transport = typeof ctx.transport === "function" ? ctx.transport : null;

  const items = asArray(document?.approvalExecutionQueue?.items);
  const emailEntries = readActorQueue(document, { channel: "email" });
  const entryByTask = new Map(
    emailEntries.map((e) => [clean(e.actor_packet?.task_id) || clean(e.taskPacket?.task_id), e]),
  );

  const baseSent = Number(ctx.sentToday?.email || 0);
  let sentThisRun = 0;
  const results = [];
  const ledgerEvents = [];
  const nextItems = items.slice();

  for (let i = 0; i < nextItems.length; i += 1) {
    const item = nextItems[i];
    const lc = item.lifecycle || {};
    const packet = item.taskPacket?.actor_packet || null;
    const channel = clean(packet?.channel);
    if (channel !== "email") continue; // not ours
    const taskId = clean(packet?.task_id) || clean(item.taskPacket?.task_id) || clean(lc.assigned_task_id);

    if (alreadyResolved(lc.execution_status)) {
      results.push({ task_id: taskId, status: "skipped", reason: `already_${clean(lc.execution_status)}` });
      continue;
    }

    const entry = entryByTask.get(taskId) || { actor_packet: packet };
    // Preflight reuses ALL existing guardrails. sentToday reflects prior + this-run
    // sends so the per-day cap is real and not bypassed within a single run.
    const pre = prepareEmailHandoff(entry, {
      now,
      mode: live ? "live" : "no_send_no_call",
      dnc: ctx.dnc,
      blacklist: ctx.blacklist,
      sentToday: { email: baseSent + sentThisRun },
      lastContactedAt: ctx.lastContactedAt,
      cooldownDays: ctx.cooldownDays,
      flags: ctx.flags,
    });

    if (pre.status !== "ready") {
      results.push({ task_id: taskId, status: pre.status, reason: pre.block_reason || pre.gate_reason });
      continue;
    }

    if (Number.isFinite(Number(ctx.dailyCap)) && sentThisRun >= Number(ctx.dailyCap)) {
      results.push({ task_id: taskId, status: "gated", reason: "run_daily_cap_reached" });
      continue;
    }

    // READY. No-send mode (default / tests): prepare only — send nothing, write no
    // evidence; the packet stays queued (honest, never score-inflating).
    if (!live) {
      results.push({ task_id: taskId, status: "prepared", sent: false, to: clean(pre.draft?.to), subject: clean(pre.draft?.subject) });
      continue;
    }
    // Live mode but no transport wired → cannot send. Real credentials required.
    if (!transport) {
      results.push({ task_id: taskId, status: "no_transport", sent: false, reason: "live mode requires a wired, credentialed email transport" });
      continue;
    }

    // LIVE SEND via the supplied transport (sync or async).
    let sendResult;
    try {
      sendResult = await transport(pre.draft);
    } catch (err) {
      results.push({ task_id: taskId, status: "failed", sent: false, reason: clean(err?.message) || "transport_error" });
      const failed = advanceExecutionStatus(lc, "failed", { now });
      if (failed.ok) nextItems[i] = { ...item, lifecycle: failed.lifecycle };
      ledgerEvents.push({ event_type: "status_changed", source_type: "execution_task", source_id: taskId, actor: "Hermes", to_status: "failed", outcome: "failure", detail: "Email transport error.", dedupe_key: `${taskId}|failed` });
      continue;
    }

    const evidence = evidenceFromSend(sendResult, pre.draft, now);
    if (!evidence) {
      results.push({ task_id: taskId, status: "failed", sent: false, reason: "transport_returned_no_message_id" });
      continue;
    }

    sentThisRun += 1;
    // Attach REAL message evidence, then close the lifecycle (evidence-gated).
    const withEvidence = attachExecutionEvidence(lc, evidence, { now });
    const completed = advanceExecutionStatus(withEvidence, "completed", { now });
    const finalLc = completed.ok ? completed.lifecycle : withEvidence;
    nextItems[i] = { ...item, lifecycle: finalLc };
    results.push({
      task_id: taskId,
      status: "sent",
      sent: true,
      message_id: evidence.evidence_reference,
      to: clean(sendResult.to) || clean(pre.draft?.to),
      send_status: clean(sendResult.status) || "sent",
      lifecycle_status: clean(finalLc.execution_status),
    });
    ledgerEvents.push({ event_type: "status_changed", source_type: "execution_task", source_id: taskId, actor: "Hermes", to_status: clean(finalLc.execution_status), outcome: "success", detail: `Email sent (message ${evidence.evidence_reference}); evidence recorded.`, dedupe_key: `${taskId}|${clean(finalLc.execution_status)}` });
  }

  const changed = results.some((r) => r.status === "sent" || r.status === "failed");
  const nextDoc = changed
    ? { ...document, approvalExecutionQueue: { ...document.approvalExecutionQueue, items: nextItems } }
    : document;

  const summary = {
    mode,
    transport_wired: Boolean(transport),
    candidates: results.length,
    sent: results.filter((r) => r.status === "sent").length,
    prepared: results.filter((r) => r.status === "prepared").length,
    blocked: results.filter((r) => r.status === "blocked").length,
    gated: results.filter((r) => r.status === "gated").length,
    failed: results.filter((r) => r.status === "failed").length,
    no_transport: results.filter((r) => r.status === "no_transport").length,
    skipped: results.filter((r) => r.status === "skipped").length,
  };
  return { document: nextDoc, results, summary, ledgerEvents, outbound_counters: { email_sent: summary.sent } };
}

/**
 * Load the revenue document, execute queued emails, and persist (local + Supabase)
 * + record ledger events. Default mode is no_send → sends nothing. Live sends only
 * happen when mode === "live" AND a transport is supplied (separately, with creds).
 */
export async function applyEmailExecution(options = {}) {
  const now = options.now || new Date().toISOString();
  const loaded = options.document !== undefined
    ? { available: true, document: options.document, source: { kind: "injected" } }
    : await loadRevenueDocument(options);
  if (!loaded.available) return { ok: false, reason: "state_unavailable", results: [], summary: null };

  const { document, results, summary, ledgerEvents } = await executeEmailQueue(loaded.document, { ...options, now });

  let local_written = false;
  let supabase = { ok: false, skipped: true, reason: "disabled" };
  const changed = summary.sent > 0 || summary.failed > 0;
  if (changed) {
    if (options.writeLocal !== false && loaded.source.kind === "local_file") {
      try {
        await fs.writeFile(loaded.source.file, `${JSON.stringify(document, null, 2)}\n`, "utf8");
        local_written = true;
      } catch (err) {
        return { ok: false, error: `Applied in memory but failed to write ${loaded.source.file}: ${String(err?.message || err)}`, results, summary };
      }
    }
    if (options.persistSupabase !== false) supabase = await upsertRevenueState(document);
    if (options.recordLedger !== false && asArray(ledgerEvents).length) {
      await recordLedgerEvents(ledgerEvents, { ...options, now });
    }
  }

  return { ok: true, results, summary, document, persisted: { local: local_written, supabase } };
}

export function emailExecutorPaths(options = {}) {
  return { latest: path.join(resolveRevenueEngineDir(options), "latest.json") };
}
