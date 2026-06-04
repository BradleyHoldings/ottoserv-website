// ─── Hermes live call execution adapter (Autonomy v2, sprint priority 3) ──────
//
// THE GAP THIS FILLS
// Symmetric to hermesEmailExecutor: the durable actor queue holds materialized CALL
// packets and prepareCallHandoff builds a call-ready packet + runs the full
// preflight (business hours, DNC/blacklist, cooldown, max attempts, contact path,
// evidence contract) — but nothing DIALS and writes back the call evidence (call
// id / disposition / summary / next action) that closes the packet. Without that,
// the call rail can never produce loop-closing evidence on its own.
//
// This adapter closes the call loop end to end under the approved call policy:
//   queued call packet → preflight (reuse guardrails) → DIAL (live only) →
//   call evidence (id/disposition/summary) → lifecycle completed → ledger.
//
// SAFETY (mirrors the email adapter):
//   - NO-DIAL BY DEFAULT. mode must be explicitly "live" to dial. No transport →
//     no dial. Tests run in no-dial mode or inject a STUB dialer (no telephony).
//   - NEVER FABRICATES EVIDENCE. Call evidence is attached ONLY from a real dialer
//     result that returns a call id. No dial → no evidence → packet stays queued.
//   - REUSES every guardrail via prepareCallHandoff: business hours, DNC/blacklist,
//     cooldown, per-lead max attempts, contact path, evidence contract, sensitive.
//   - Idempotent: completed/in-flight lifecycles are never re-dialed.
//   - Real Retell/Morgan dialing requires separate, approved credentials — not
//     bundled here. Live mode with no dialer reports "no_dialer" and dials nothing.

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveRevenueEngineDir } from "./revenueEngineReadAdapter.mjs";
import { loadRevenueDocument } from "./actorEvidenceIntake.mjs";
import { readActorQueue } from "./hermesActorQueue.mjs";
import { prepareCallHandoff } from "./hermesOutboundRails.mjs";
import { attachExecutionEvidence, advanceExecutionStatus } from "./approvalExecutionBridge.mjs";
import { upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";
import { recordLedgerEvents } from "./hermesOperatingLedger.mjs";

export const CALL_EXECUTOR_DEFAULT_MODE = "no_dial";

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function alreadyResolved(status) {
  return ["evidence_submitted", "hermes_reviewing", "completed", "cancelled"].includes(clean(status));
}

// Build call evidence from a REAL dialer result. Null if no call id → no evidence.
function evidenceFromCall(callResult, callReady, now) {
  const callId = clean(callResult?.call_id) || clean(callResult?.id);
  if (!callId) return null;
  const to = clean(callResult?.to) || clean(callReady?.to);
  const disposition = clean(callResult?.disposition) || clean(callResult?.status) || "completed";
  const summary = clean(callResult?.summary) || "Call placed; outcome recorded.";
  const nextAction = clean(callResult?.next_action) || "review_outcome";
  const at = clean(callResult?.ended_at) || clean(callResult?.placed_at) || now;
  const provider = clean(callResult?.provider) || "retell_morgan";
  return {
    evidence_type: "call_placed",
    evidence_reference: callId,
    evidence_summary: `Call to ${to} via ${provider} at ${at}; disposition=${disposition}; next=${nextAction}; summary="${summary}".`,
    submitted_by_agent: "Morgan",
    submitted_at: at,
    redaction_status: "unredacted",
  };
}

/**
 * Execute queued call packets against an (optional) dialer transport. Dials nothing
 * unless mode === "live" AND a dialer is provided. Returns new document + results +
 * summary + ledger events. The dialer may be sync or async; both are awaited.
 *
 * @param {object} ctx {
 *   now?, mode? ("no_dial"|"live"), dialer? (callReady)=>({call_id,disposition,summary,...}),
 *   dnc?, blacklist?, lastContactedAt?, cooldownDays?, attempts?, maxAttempts?,
 *   businessHours?, localHour?, flags?, dailyCap?
 * }
 */
export async function executeCallQueue(document = {}, ctx = {}) {
  const now = ctx.now || new Date().toISOString();
  const mode = clean(ctx.mode) || CALL_EXECUTOR_DEFAULT_MODE;
  const live = mode === "live";
  const dialer = typeof ctx.dialer === "function" ? ctx.dialer : null;

  const items = asArray(document?.approvalExecutionQueue?.items);
  const callEntries = readActorQueue(document, { channel: "call" });
  const entryByTask = new Map(
    callEntries.map((e) => [clean(e.actor_packet?.task_id) || clean(e.taskPacket?.task_id), e]),
  );

  let dialedThisRun = 0;
  const results = [];
  const ledgerEvents = [];
  const nextItems = items.slice();

  for (let i = 0; i < nextItems.length; i += 1) {
    const item = nextItems[i];
    const lc = item.lifecycle || {};
    const packet = item.taskPacket?.actor_packet || null;
    if (clean(packet?.channel) !== "call") continue;
    const taskId = clean(packet?.task_id) || clean(item.taskPacket?.task_id) || clean(lc.assigned_task_id);

    if (alreadyResolved(lc.execution_status)) {
      results.push({ task_id: taskId, status: "skipped", reason: `already_${clean(lc.execution_status)}` });
      continue;
    }

    const entry = entryByTask.get(taskId) || { actor_packet: packet };
    const pre = prepareCallHandoff(entry, {
      now,
      mode: live ? "live" : "no_send_no_call",
      dnc: ctx.dnc,
      blacklist: ctx.blacklist,
      lastContactedAt: ctx.lastContactedAt,
      cooldownDays: ctx.cooldownDays,
      attempts: ctx.attempts,
      maxAttempts: ctx.maxAttempts,
      businessHours: ctx.businessHours,
      localHour: ctx.localHour,
      flags: ctx.flags,
    });

    if (pre.status !== "ready") {
      results.push({ task_id: taskId, status: pre.status, reason: pre.block_reason || pre.gate_reason });
      continue;
    }
    if (Number.isFinite(Number(ctx.dailyCap)) && dialedThisRun >= Number(ctx.dailyCap)) {
      results.push({ task_id: taskId, status: "gated", reason: "run_daily_cap_reached" });
      continue;
    }

    // READY. No-dial mode (default / tests): prepare only — dial nothing, no evidence.
    if (!live) {
      results.push({ task_id: taskId, status: "prepared", dialed: false, to: clean(pre.call_ready?.to) });
      continue;
    }
    if (!dialer) {
      results.push({ task_id: taskId, status: "no_dialer", dialed: false, reason: "live mode requires a wired, credentialed call transport (Retell/Morgan)" });
      continue;
    }

    let callResult;
    try {
      callResult = await dialer(pre.call_ready);
    } catch (err) {
      results.push({ task_id: taskId, status: "failed", dialed: false, reason: clean(err?.message) || "dialer_error" });
      const failed = advanceExecutionStatus(lc, "failed", { now });
      if (failed.ok) nextItems[i] = { ...item, lifecycle: failed.lifecycle };
      ledgerEvents.push({ event_type: "status_changed", source_type: "execution_task", source_id: taskId, actor: "Morgan", to_status: "failed", outcome: "failure", detail: "Call dialer error.", dedupe_key: `${taskId}|failed` });
      continue;
    }

    const evidence = evidenceFromCall(callResult, pre.call_ready, now);
    if (!evidence) {
      results.push({ task_id: taskId, status: "failed", dialed: false, reason: "dialer_returned_no_call_id" });
      continue;
    }

    dialedThisRun += 1;
    const withEvidence = attachExecutionEvidence(lc, evidence, { now });
    const completed = advanceExecutionStatus(withEvidence, "completed", { now });
    const finalLc = completed.ok ? completed.lifecycle : withEvidence;
    nextItems[i] = { ...item, lifecycle: finalLc };
    results.push({
      task_id: taskId,
      status: "dialed",
      dialed: true,
      call_id: evidence.evidence_reference,
      to: clean(callResult.to) || clean(pre.call_ready?.to),
      disposition: clean(callResult.disposition) || "completed",
      lifecycle_status: clean(finalLc.execution_status),
    });
    ledgerEvents.push({ event_type: "status_changed", source_type: "execution_task", source_id: taskId, actor: "Morgan", to_status: clean(finalLc.execution_status), outcome: "success", detail: `Call placed (call ${evidence.evidence_reference}); evidence recorded.`, dedupe_key: `${taskId}|${clean(finalLc.execution_status)}` });
  }

  const changed = results.some((r) => r.status === "dialed" || r.status === "failed");
  const nextDoc = changed
    ? { ...document, approvalExecutionQueue: { ...document.approvalExecutionQueue, items: nextItems } }
    : document;

  const summary = {
    mode,
    dialer_wired: Boolean(dialer),
    candidates: results.length,
    dialed: results.filter((r) => r.status === "dialed").length,
    prepared: results.filter((r) => r.status === "prepared").length,
    blocked: results.filter((r) => r.status === "blocked").length,
    gated: results.filter((r) => r.status === "gated").length,
    failed: results.filter((r) => r.status === "failed").length,
    no_dialer: results.filter((r) => r.status === "no_dialer").length,
    skipped: results.filter((r) => r.status === "skipped").length,
  };
  return { document: nextDoc, results, summary, ledgerEvents, outbound_counters: { calls_placed: summary.dialed } };
}

/** Load → execute queued calls → persist (local + Supabase) + ledger. No-dial default. */
export async function applyCallExecution(options = {}) {
  const now = options.now || new Date().toISOString();
  const loaded = options.document !== undefined
    ? { available: true, document: options.document, source: { kind: "injected" } }
    : await loadRevenueDocument(options);
  if (!loaded.available) return { ok: false, reason: "state_unavailable", results: [], summary: null };

  const { document, results, summary, ledgerEvents } = await executeCallQueue(loaded.document, { ...options, now });

  let local_written = false;
  let supabase = { ok: false, skipped: true, reason: "disabled" };
  const changed = summary.dialed > 0 || summary.failed > 0;
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

export function callExecutorPaths(options = {}) {
  return { latest: path.join(resolveRevenueEngineDir(options), "latest.json") };
}
