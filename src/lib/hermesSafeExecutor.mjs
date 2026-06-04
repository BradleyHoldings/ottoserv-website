// ─── Hermes safe internal execution adapter (Autonomy v2, milestone 8) ────────
//
// THE GAP THIS FILLS
// The orchestrator PROPOSES "review_and_complete_evidence" but a human still had
// to act on it, so even the safest, evidence-backed step kept Jonathan/Hermes in
// the loop. This adapter lets Hermes EXECUTE the one safe internal class itself:
// accept sufficient evidence on an already-approved task and advance its lifecycle
// to completed. That is the difference between "Hermes recommends" and "Hermes
// runs the safe loop" — with the bottleneck removed only where it is provably
// safe.
//
// HARD LIMITS (what makes this safe):
//   - Internal STATUS ONLY. It advances an execution lifecycle that is already
//     approved + has accepted evidence. It sends nothing, calls nothing, charges
//     nothing, deploys nothing.
//   - Evidence-gated: completion requires canCompleteExecution (real evidence).
//   - Never touches approval-gated proposals (calls/emails/proposals/build/
//     research) — those are not in the auto-execute set.
//   - Idempotent: an already-completed lifecycle is a no-op.
//   - Reuses approvalEvidenceWriteback/approvalExecutionBridge primitives; no
//     parallel store. Persists via the existing revenue document + ledger.

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveRevenueEngineDir } from "./revenueEngineReadAdapter.mjs";
import { loadRevenueDocument } from "./actorEvidenceIntake.mjs";
import { advanceExecutionStatus, canCompleteExecution } from "./approvalExecutionBridge.mjs";
import { upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";
import { recordLedgerEvents } from "./hermesOperatingLedger.mjs";

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Apply the safe internal execution class to a revenue document. Pure: returns a
 * NEW document plus { executed, skipped }. The only auto-executed transition is
 * evidence_submitted → completed for tasks whose evidence is sufficient.
 */
export function executeSafeInternalActions(document = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const items = asArray(document?.approvalExecutionQueue?.items);
  const executed = [];
  const skipped = [];

  const nextItems = items.map((item) => {
    const lc = item.lifecycle || {};
    const taskId = clean(lc.assigned_task_id) || clean(item.taskPacket?.task_id);
    const status = clean(lc.execution_status);

    if (status === "completed") {
      skipped.push({ task_id: taskId, reason: "already_completed" });
      return item;
    }
    // The safe auto-execute trigger: evidence is in and sufficient → close it.
    if (status === "evidence_submitted" && canCompleteExecution(lc)) {
      const advanced = advanceExecutionStatus(lc, "completed", { now });
      if (advanced.ok) {
        executed.push({ task_id: taskId, from: status, to: "completed", actor: "Hermes" });
        return { ...item, lifecycle: advanced.lifecycle };
      }
      skipped.push({ task_id: taskId, reason: advanced.error || "advance_failed" });
      return item;
    }
    // Everything else is NOT in the safe auto-execute set (needs evidence, actor,
    // or approval) — left for the proposal queue.
    skipped.push({ task_id: taskId, reason: status === "evidence_submitted" ? "evidence_insufficient" : `not_auto_executable (${status || "unknown"})` });
    return item;
  });

  const nextDoc = executed.length
    ? { ...document, approvalExecutionQueue: { ...document.approvalExecutionQueue, items: nextItems } }
    : document;
  return { document: nextDoc, executed, skipped };
}

/**
 * Load the revenue document, auto-execute the safe internal class, and persist the
 * result (local latest.json + Supabase default row), recording each completion to
 * the operating ledger. Returns a summary. No external side effects.
 */
export async function applySafeExecutions(options = {}) {
  const now = options.now || new Date().toISOString();
  const loaded = options.document !== undefined
    ? { available: true, document: options.document, source: { kind: "injected" } }
    : await loadRevenueDocument(options);

  if (!loaded.available) {
    return { ok: false, reason: "state_unavailable", executed: [], skipped: [] };
  }

  const { document, executed, skipped } = executeSafeInternalActions(loaded.document, { now });

  let local_written = false;
  let supabase = { ok: false, skipped: true, reason: "disabled" };
  if (executed.length) {
    // Persist updated document the same way the loop does.
    if (options.writeLocal !== false && loaded.source.kind === "local_file") {
      try {
        await fs.writeFile(loaded.source.file, `${JSON.stringify(document, null, 2)}\n`, "utf8");
        local_written = true;
      } catch (err) {
        return { ok: false, error: `Applied in memory but failed to write ${loaded.source.file}: ${String(err?.message || err)}`, executed, skipped };
      }
    }
    if (options.persistSupabase !== false) supabase = await upsertRevenueState(document);

    // Record each completion to the operating ledger (memory + learning).
    if (options.recordLedger !== false) {
      await recordLedgerEvents(
        executed.map((e) => ({
          event_type: "status_changed",
          source_type: "execution_task",
          source_id: e.task_id,
          actor: "Hermes",
          to_status: "completed",
          outcome: "success",
          detail: "Safe auto-completion: sufficient evidence accepted.",
          dedupe_key: `${e.task_id}|completed`,
        })),
        { ...options, now },
      );
    }
  }

  return {
    ok: true,
    executed,
    skipped,
    document,
    persisted: { local: local_written, supabase },
  };
}

export function safeExecutorPaths(options = {}) {
  return { latest: path.join(resolveRevenueEngineDir(options), "latest.json") };
}
