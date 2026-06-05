// ─── Hermes task lifecycle state machine (execution-truth core) ───────────────
//
// THE DEFECT THIS FIXES
// The live (droplet) Hermes told Jonathan "I am starting execution" when nothing
// had been created, queued, or run. Intent was reported as execution. The root
// cause: there was no durable task state — only LLM prose and at most an in-memory
// flag. This module is the single source of execution truth: every operation is a
// durable TASK with an explicit state, and the ONLY way the state changes is a
// recorded, evidence-checked transition.
//
// CORE INVARIANT (enforced here, not by prompt): a task may not enter a state that
// claims work happened (queued/accepted_by_worker/running/completed) without the
// evidence that state requires. Approved ≠ queued ≠ running ≠ completed.

import { promises as fs } from "node:fs";
import path from "node:path";

import { validateReceipt } from "./executionReceipt.mjs";

// The required state model. Order is roughly the happy-path progression.
export const TASK_STATES = [
  "requested",          // operation defined, not yet authorized
  "awaiting_approval",  // needs Jonathan / policy authorization
  "approved",           // authorized; NOT yet submitted to a rail
  "submission_pending", // being submitted to the execution rail
  "queued",             // durable queue/row exists (queue receipt)
  "accepted_by_worker", // a worker/runner acknowledged it (worker receipt)
  "running",            // execution in progress (heartbeat/process evidence)
  "partially_completed",// some stages done with evidence, more remain
  "blocked",            // cannot proceed (missing dep/cred/contact/etc.)
  "retrying",           // a safe, idempotent retry is in flight
  "completed",          // all success evidence validated
  "failed",             // terminal failure after attempts
  "cancelled",          // intentionally stopped
  "verification_failed",// claimed/looked done but evidence failed validation
];

// Which states REQUIRE a durable execution receipt before they can be entered.
// This is the mechanical block on "said it started but nothing exists".
export const RECEIPT_REQUIRED_STATES = {
  queued: "queue",                 // needs a queue record / db row id
  accepted_by_worker: "worker",    // needs a worker acknowledgment
  running: "running",              // needs a process/workflow/heartbeat artifact
  partially_completed: "stage",    // needs per-stage success evidence
  completed: "completion",         // needs validated completion evidence
};

// Allowed transitions. Anything not listed is rejected (no silent jumps).
const ALLOWED = {
  requested: ["awaiting_approval", "approved", "cancelled", "blocked"],
  awaiting_approval: ["approved", "cancelled", "blocked"],
  approved: ["submission_pending", "blocked", "cancelled"],
  submission_pending: ["queued", "blocked", "failed", "retrying"],
  queued: ["accepted_by_worker", "blocked", "failed", "retrying", "cancelled"],
  accepted_by_worker: ["running", "blocked", "failed", "retrying"],
  running: ["partially_completed", "completed", "blocked", "failed", "verification_failed", "retrying"],
  partially_completed: ["running", "completed", "blocked", "failed", "verification_failed", "retrying"],
  blocked: ["submission_pending", "queued", "retrying", "approved", "failed", "cancelled"],
  retrying: ["submission_pending", "queued", "accepted_by_worker", "running", "blocked", "failed"],
  completed: ["verification_failed"], // completion can be revoked if evidence later fails
  failed: ["retrying", "cancelled"],
  cancelled: [],
  verification_failed: ["retrying", "blocked", "failed", "submission_pending"],
};

// Terminal states that mean "this work is genuinely happening or happened".
export const EXECUTION_TRUTH = {
  // states where it is TRUE that execution started
  started: new Set(["accepted_by_worker", "running", "partially_completed", "completed"]),
  // states where it is TRUE that work completed
  completed: new Set(["completed"]),
  // states that mean "not started" regardless of optimistic prose
  not_started: new Set(["requested", "awaiting_approval", "approved", "submission_pending", "queued", "blocked", "cancelled"]),
};

function clean(v) { return String(v ?? "").trim(); }
function asArray(v) { return Array.isArray(v) ? v : []; }

export function canTransition(from, to) {
  return asArray(ALLOWED[clean(from)]).includes(clean(to));
}

// Build a fully-specified transition record (all required fields present).
export function buildTransition(task, to, ctx = {}) {
  const now = ctx.now || new Date().toISOString();
  const from = clean(task.state);
  const attempt = to === "retrying" ? Number(task.attempt || 0) + 1 : Number(task.attempt || 0);
  return {
    task_id: clean(task.task_id),
    operation_type: clean(task.operation_type),
    previous_state: from,
    new_state: clean(to),
    timestamp: now,
    actor: clean(ctx.actor) || clean(task.actor) || "Hermes",
    reason: clean(ctx.reason) || "",
    evidence_ref: clean(ctx.evidence?.reference) || clean(ctx.evidence_ref) || "",
    attempt,
    correlation_id: clean(task.correlation_id),
    next_action: clean(ctx.next_action) || "",
    retry_eligible: ctx.retry_eligible !== undefined ? Boolean(ctx.retry_eligible) : !["completed", "cancelled"].includes(to),
    user_status_text: clean(ctx.user_status_text) || "",
  };
}

/**
 * Apply a state transition with full enforcement. Returns { ok, task?, error?,
 * transition? }. Pure — caller persists. A receipt-required target state is
 * REJECTED unless ctx.evidence validates as a durable receipt for that rail.
 */
export function transition(task, to, ctx = {}) {
  const from = clean(task.state);
  to = clean(to);
  if (!TASK_STATES.includes(to)) return { ok: false, error: `unknown_state:${to}` };
  if (from === to) return { ok: true, task, transition: null, noop: true };
  if (!canTransition(from, to)) return { ok: false, error: `illegal_transition:${from}->${to}` };

  // Receipt gate: states that claim work happened need a validated durable receipt.
  let validatedRef = "";
  const requiredRail = RECEIPT_REQUIRED_STATES[to];
  if (requiredRail) {
    const check = validateReceipt(ctx.evidence, { expectedRail: requiredRail, allowStub: ctx.allowStub });
    if (!check.ok) {
      return { ok: false, error: `receipt_required_for_${to}:${check.reason}`, receipt_check: check };
    }
    validatedRef = check.reference; // capture the durable id into the audit record
  }

  // The transition's evidence reference: explicit ref, else the validated receipt id.
  const rec = buildTransition(task, to, { ...ctx, evidence_ref: clean(ctx.evidence?.reference) || clean(ctx.evidence_ref) || validatedRef });
  const nextTask = {
    ...task,
    state: to,
    attempt: rec.attempt,
    updated_at: rec.timestamp,
    last_transition: rec,
    last_evidence_ref: rec.evidence_ref || task.last_evidence_ref || "",
    heartbeat_at: to === "running" ? rec.timestamp : task.heartbeat_at,
    history: [...asArray(task.history), rec],
  };
  return { ok: true, task: nextTask, transition: rec };
}

// Create a brand-new task in `requested` (no work implied).
export function createTask({ operation_type, correlation_id, actor = "Hermes", payload = {}, now } = {}) {
  const ts = now || new Date().toISOString();
  const task_id = `task-${clean(operation_type) || "op"}-${ts.replace(/[^0-9]/g, "").slice(0, 14)}-${Math.random().toString(16).slice(2, 8)}`;
  return {
    task_id,
    operation_type: clean(operation_type),
    correlation_id: clean(correlation_id) || task_id,
    actor,
    state: "requested",
    attempt: 0,
    payload,
    created_at: ts,
    updated_at: ts,
    heartbeat_at: "",
    last_evidence_ref: "",
    last_transition: null,
    history: [],
  };
}

// ─── Durable store (file-backed; injectable for tests) ────────────────────────
export function tasksDir(options = {}) {
  return options.tasksDir || process.env.HERMES_TASKS_DIR || path.join(process.cwd(), "data", "revenue-engine", "tasks");
}
function taskFile(task_id, options) { return path.join(tasksDir(options), `${task_id}.json`); }

export async function saveTask(task, options = {}) {
  const file = taskFile(task.task_id, options);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(task, null, 2)}\n`, "utf8");
  return file;
}
export async function loadTask(task_id, options = {}) {
  try { return JSON.parse(await fs.readFile(taskFile(task_id, options), "utf8")); }
  catch { return null; }
}
export async function loadAllTasks(options = {}) {
  try {
    const dir = tasksDir(options);
    const names = await fs.readdir(dir);
    const out = [];
    for (const n of names) {
      if (!n.endsWith(".json")) continue;
      try { out.push(JSON.parse(await fs.readFile(path.join(dir, n), "utf8"))); } catch { /* skip */ }
    }
    return out;
  } catch { return []; }
}

// Convenience: transition + persist in one call.
export async function transitionAndSave(task, to, ctx = {}, options = {}) {
  const res = transition(task, to, ctx);
  if (!res.ok) return res;
  if (res.noop) return res;
  await saveTask(res.task, options);
  return res;
}
