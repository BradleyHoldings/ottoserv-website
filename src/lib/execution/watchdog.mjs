// ─── Hermes execution watchdog (stall detection + self-repair) ────────────────
//
// THE DEFECT THIS FIXES
// Hermes did not notice for ~50 minutes that the job never started, and only
// admitted it when asked. This watchdog scans durable task state on a schedule and
// PROACTIVELY detects stalls, mismatches, and unverifiable completions — then marks
// the real state, diagnoses the failure class, proposes/attempts a safe repair, and
// emits an alert the droplet must send WITHOUT being asked.
//
// It never fabricates evidence. A "completed" task whose evidence does not validate
// is demoted to verification_failed.

import { EXECUTION_TRUTH, transition } from "./taskLifecycle.mjs";
import { validateReceipt } from "./executionReceipt.mjs";
import { assertClaimConsistent, renderStatus } from "./telegramStatus.mjs";

function clean(v) { return String(v ?? "").trim(); }
function asArray(v) { return Array.isArray(v) ? v : []; }
function ageMin(iso, now) { const t = Date.parse(clean(iso)); return Number.isNaN(t) ? null : (Date.parse(now) - t) / 60000; }

// Default stall thresholds (minutes). Conservative; tune per rail.
export const WATCHDOG_THRESHOLDS = {
  approved_to_submitted: 2,
  submission_to_queued: 2,
  queued_to_accepted: 5,
  running_heartbeat: 10,
};

// Failure classes → safe repair recommendation + whether Hermes may auto-apply it.
const REPAIR_BY_CLASS = {
  approved_not_submitted:   { repair: "resubmit_to_rail", auto: true, to: "submission_pending" },
  submitted_no_queue:       { repair: "recreate_queue_submission", auto: true, to: "submission_pending" },
  queued_no_worker:         { repair: "restart_or_route_worker", auto: false, to: "blocked" },
  running_no_heartbeat:     { repair: "rehydrate_and_recheck_worker", auto: false, to: "blocked" },
  repeated_retry_failure:   { repair: "escalate_repair_handoff", auto: false, to: "failed" },
  unverifiable_completion:  { repair: "demote_and_reverify", auto: true, to: "verification_failed" },
  conversational_mismatch:  { repair: "send_correction", auto: true, to: null },
  missing_worker:           { repair: "start_runner_or_route_actor", auto: false, to: "blocked" },
};

/**
 * Scan one task and return any detected issue (or null). Pure.
 * @param {object} options { now, thresholds, conversationalClaim? }
 */
export function inspectTask(task, options = {}) {
  const now = options.now || new Date().toISOString();
  const T = { ...WATCHDOG_THRESHOLDS, ...(options.thresholds || {}) };
  const state = clean(task.state);
  const sinceUpdate = ageMin(task.updated_at, now);

  // 1. Conversational/operational mismatch (highest priority: truthfulness).
  if (clean(options.conversationalClaim)) {
    const check = assertClaimConsistent(options.conversationalClaim, task);
    if (!check.ok) {
      return issue("conversational_mismatch", "critical", task, now,
        `Conversational claim contradicts state "${state}": ${check.violations.map((v) => v.detail).join("; ")}`);
    }
  }

  // 2. Unverifiable completion: state says completed but evidence does not validate.
  if (state === "completed") {
    const v = validateReceipt({ kind: "receipt", source: "rail", completion_evidence_ref: clean(task.last_evidence_ref) }, { expectedRail: "completion", allowStub: true });
    if (!v.ok || !clean(task.last_evidence_ref)) {
      return issue("unverifiable_completion", "critical", task, now, "Marked completed but completion evidence is missing/invalid.");
    }
  }

  // 3. Stall detections by state + age.
  if (state === "approved" && sinceUpdate !== null && sinceUpdate > T.approved_to_submitted) {
    return issue("approved_not_submitted", "high", task, now, `Approved ${Math.round(sinceUpdate)}m ago but never submitted to the rail.`);
  }
  if (state === "submission_pending" && sinceUpdate !== null && sinceUpdate > T.submission_to_queued) {
    return issue("submitted_no_queue", "high", task, now, `Submitting for ${Math.round(sinceUpdate)}m with no queue receipt.`);
  }
  if (state === "queued" && sinceUpdate !== null && sinceUpdate > T.queued_to_accepted) {
    return issue("queued_no_worker", "high", task, now, `Queued ${Math.round(sinceUpdate)}m ago; no worker has accepted it.`);
  }
  if (state === "running") {
    const hb = ageMin(task.heartbeat_at, now);
    if (hb !== null && hb > T.running_heartbeat) {
      return issue("running_no_heartbeat", "high", task, now, `Running but no heartbeat for ${Math.round(hb)}m.`);
    }
  }
  if (state === "retrying" && Number(task.attempt || 0) >= Number(options.maxAttempts ?? 3)) {
    return issue("repeated_retry_failure", "high", task, now, `Retried ${task.attempt} times without success.`);
  }
  return null;
}

function issue(failure_class, severity, task, now, detail) {
  const plan = REPAIR_BY_CLASS[failure_class] || { repair: "escalate", auto: false, to: "blocked" };
  return {
    task_id: task.task_id, operation_type: task.operation_type, state: task.state,
    failure_class, severity, detail, detected_at: now,
    recommended_repair: plan.repair, auto_repairable: plan.auto, repair_target_state: plan.to,
    // Proactive message the droplet MUST send without being asked.
    proactive_message: `⚠️ Task ${task.task_id} (${task.operation_type}) is not progressing: ${detail} State is "${task.state}" — NOT running/complete. Hermes is attempting: ${plan.repair}.`,
  };
}

/**
 * Run the watchdog over many tasks. Returns { alerts[], summary }. Does not mutate;
 * caller applies repairs via applySafeRepair.
 */
export function runWatchdog(tasks = [], options = {}) {
  const alerts = [];
  for (const t of asArray(tasks)) {
    const open = !["completed", "failed", "cancelled"].includes(clean(t.state)) || clean(t.state) === "completed";
    if (!open) continue;
    const found = inspectTask(t, options);
    if (found) alerts.push(found);
  }
  return {
    generated_at: options.now || new Date().toISOString(),
    alerts,
    summary: {
      tasks_scanned: asArray(tasks).length,
      alerts: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      auto_repairable: alerts.filter((a) => a.auto_repairable).length,
    },
  };
}

/**
 * Apply a SAFE, idempotent repair to a task for an alert. Only auto_repairable
 * classes are applied; others return a handoff descriptor (escalation). Pure —
 * returns { ok, task?, applied, handoff? }. Caller persists.
 */
export function applySafeRepair(task, alert, options = {}) {
  const now = options.now || new Date().toISOString();
  // Conversational mismatch is corrected by re-deriving the truthful status (no state
  // change). Handle it BEFORE the target-state guard, since it has no target state.
  if (alert.failure_class === "conversational_mismatch") {
    return { ok: true, applied: true, correction: renderStatus(task).text, task };
  }
  if (!alert.auto_repairable || !alert.repair_target_state) {
    return { ok: false, applied: false, handoff: { task_id: task.task_id, action: alert.recommended_repair, reason: alert.detail, route_to: alert.failure_class === "repeated_retry_failure" ? "Codex/Opus" : "operator" } };
  }
  const res = transition(task, alert.repair_target_state, {
    now, actor: "Hermes_watchdog",
    reason: `watchdog_repair:${alert.recommended_repair} (${alert.failure_class})`,
    next_action: alert.repair_target_state === "submission_pending" ? "re-submit to rail" : "diagnose",
    retry_eligible: true,
  });
  if (!res.ok) return { ok: false, applied: false, error: res.error };
  return { ok: true, applied: true, task: res.task, repair: alert.recommended_repair };
}
