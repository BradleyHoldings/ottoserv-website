// ─── Telegram status → language mapper (execution-truth enforcement) ──────────
//
// THE DEFECT THIS FIXES
// The droplet Hermes generated free prose ("I am starting now", "Starting
// execution") that contradicted reality. This module makes user-facing wording a
// pure FUNCTION of durable task state + validated evidence. The droplet MUST render
// status through here; it may add context, but it may NOT override the state-derived
// truth sentence. A verifier (assertClaimConsistent) catches contradictory prose.

import { EXECUTION_TRUTH } from "./taskLifecycle.mjs";
import { isProductionReceipt } from "./executionReceipt.mjs";

function clean(v) { return String(v ?? "").trim(); }

// The single allowed truth sentence per state. No state may borrow a "started" or
// "completed" sentence it has not earned.
const STATE_LANGUAGE = {
  requested: (t) => `Request received (task ${t.task_id}). It is not authorized or started yet.`,
  awaiting_approval: (t) => `Task ${t.task_id} is awaiting approval. Nothing has started.`,
  approved: (t) => `Your approval is recorded for task ${t.task_id}. Submission to the execution rail is pending — it has NOT started yet.`,
  submission_pending: (t) => `Task ${t.task_id} is being submitted to the execution rail. No queue receipt yet; it has not started.`,
  queued: (t) => `The job is queued under task ${t.task_id}. A worker has not accepted it yet — it is not running.`,
  accepted_by_worker: (t) => `Execution has started. Task ${t.task_id} was accepted by a worker (${clean(t.last_transition?.actor) || "worker"}). Current stage: ${stage(t)}.`,
  running: (t) => `Execution is running. Task ${t.task_id}. Current stage: ${stage(t)}.`,
  partially_completed: (t) => `Task ${t.task_id} is partially complete (${stage(t)}). Remaining work is still in progress.`,
  blocked: (t) => `The job has NOT started. Task ${t.task_id} is blocked by: ${clean(t.last_transition?.reason) || "an unmet prerequisite"}. Hermes is attempting: ${clean(t.last_transition?.next_action) || "diagnosis/repair"}.`,
  retrying: (t) => `Task ${t.task_id} hit an issue and Hermes is retrying (attempt ${t.attempt}). It is not confirmed running yet.`,
  completed: (t) => `Task ${t.task_id} is complete. Validated evidence: ${clean(t.last_evidence_ref) || "on file"}.`,
  failed: (t) => `Task ${t.task_id} FAILED after ${t.attempt} attempt(s): ${clean(t.last_transition?.reason) || "see logs"}. It did not complete.`,
  cancelled: (t) => `Task ${t.task_id} was cancelled. Nothing further will run.`,
  verification_failed: (t) => `Task ${t.task_id} could not be verified — a completion claim did NOT pass evidence validation. Treating it as NOT done; Hermes is correcting.`,
};

function stage(t) {
  return clean(t.payload?.current_stage) || clean(t.last_transition?.next_action) || "in progress";
}

/**
 * Render the authoritative, state-derived status line for a task. Returns
 * { text, state, started, completed, evidence_ref }. This is the sentence the
 * droplet must show; it cannot be overridden by model prose.
 */
export function renderStatus(task = {}) {
  const state = clean(task.state) || "requested";
  const fn = STATE_LANGUAGE[state] || ((t) => `Task ${t.task_id} is in state ${state}.`);
  return {
    text: fn(task),
    state,
    started: EXECUTION_TRUTH.started.has(state),
    completed: EXECUTION_TRUTH.completed.has(state),
    evidence_ref: clean(task.last_evidence_ref),
  };
}

// Words that assert work happened. If prose contains these but the state does not
// support them, it is a false claim.
const STARTED_CLAIM = /\b(starting|started|executing|running now|kicking off|under way|in progress|i am (starting|running|executing))\b/i;
const COMPLETED_CLAIM = /\b(completed|done|finished|sent|delivered|imported|enriched|published|called them|assigned)\b/i;

/**
 * Mechanically check a candidate user-facing message against the task's real state.
 * Returns { ok, violations[] }. Used to BLOCK the droplet from sending prose that
 * contradicts execution truth (and to drive a verification_failed correction).
 */
export function assertClaimConsistent(message, task = {}) {
  const state = clean(task.state) || "requested";
  const started = EXECUTION_TRUTH.started.has(state);
  const completed = EXECUTION_TRUTH.completed.has(state);
  const violations = [];
  const text = clean(message);
  if (STARTED_CLAIM.test(text) && !started) {
    violations.push({ claim: "started/running", state, detail: `Message claims execution but task is "${state}" (not started).` });
  }
  if (COMPLETED_CLAIM.test(text) && !completed) {
    // "sent/imported/etc." require completion-level truth.
    violations.push({ claim: "completed/performed", state, detail: `Message claims work performed but task is "${state}" (not completed).` });
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Guard a completion message: even in `completed` state, the wording is only
 * allowed if the completion evidence is PRODUCTION (not stub). Returns the safe
 * message to actually send.
 */
export function safeCompletionMessage(task = {}, completionReceipt = null) {
  const state = clean(task.state);
  if (state !== "completed") {
    return { allowed: false, text: renderStatus(task).text, reason: `not_completed_state:${state}` };
  }
  if (completionReceipt && !isProductionReceipt(completionReceipt, "completion")) {
    return { allowed: false, text: `Task ${task.task_id} ran in test/stub mode — this is NOT a production completion and will not be reported as done.`, reason: "stub_completion" };
  }
  return { allowed: true, text: renderStatus(task).text, reason: "ok" };
}
