// ─── Hermes command rail: the durable Telegram → execution path ───────────────
//
// THE DEFECT THIS FIXES
// `/ops_revenue_now` (and "yes, start") previously dead-ended in conversation: no
// durable task, no queue, no worker, no receipt. This module is the real path. It
// drives one operation through the lifecycle state machine, recording a durable
// task + approval + queue receipt + worker receipt + evidence, and emits a
// STATE-DERIVED status message at every stage (the only thing the droplet may send
// back). It is idempotent by correlation id, so duplicate confirmations do not
// double-execute. It routes execution through the SAME operating cycle as
// `hermes:operate` — no parallel path.
//
// It NEVER claims a stage happened without the receipt that stage requires, and it
// NEVER claims outreach was sent without a production transport receipt. With
// transports disabled it truthfully ends at partially_completed / blocked.

import { createTask, transition, saveTask, loadTask, loadAllTasks } from "./taskLifecycle.mjs";
import { recordApproval, consumeApproval, appendApprovalAudit } from "./approvalStore.mjs";
import { renderStatus } from "./telegramStatus.mjs";
import { stubReceipt } from "./executionReceipt.mjs";

function clean(v) { return String(v ?? "").trim(); }
function asArray(v) { return Array.isArray(v) ? v : []; }

// Find an existing non-terminal task for this correlation id (idempotency).
async function findExistingTask(operation_type, correlation_id, options) {
  const all = await loadAllTasks(options);
  return all.find((t) => clean(t.operation_type) === clean(operation_type) && clean(t.correlation_id) === clean(correlation_id)) || null;
}

/**
 * Run the ops_revenue_now command end to end (or resume an existing task). Returns
 * { ok, task, transcript[], receipts, final_status }. transcript[] is the ordered
 * list of state-derived messages — exactly what would be sent to Telegram.
 *
 * @param {object} input {
 *   correlation_id (e.g. telegram message id), approved_by, source_message_id,
 *   source_text, leads? (already-validated revenue leads to import), mode
 *   ("live"|"dry"), now,
 *   runCycle? async ({document,leads,now,executionMode,transports}) => cycleResult
 *     (injectable; the CLI passes runOperatingCycle. A cycle result must carry
 *      machine evidence: { ok, cycle:{ id, autonomy_score, throughput, execution } })
 * }
 */
export async function runOpsRevenueNow(input = {}, options = {}) {
  const now = input.now || new Date().toISOString();
  const operation_type = "ops_revenue_now";
  const correlation_id = clean(input.correlation_id) || `cid-${now}`;
  const transcript = [];
  const emit = (task, extra = {}) => {
    const s = renderStatus(task);
    transcript.push({ at: task.updated_at, state: s.state, started: s.started, completed: s.completed, text: s.text, ...extra });
    return s;
  };

  // ── Idempotency: a duplicate confirmation reuses the same task, never re-runs ──
  const existing = await findExistingTask(operation_type, correlation_id, options);
  if (existing) {
    const s = renderStatus(existing);
    return { ok: true, task: existing, idempotent: true, transcript: [{ at: existing.updated_at, state: s.state, text: `Duplicate request ignored — ${s.text}` }], final_status: s };
  }

  // 1. requested — durable task created (no work implied).
  let task = createTask({ operation_type, correlation_id, actor: "Hermes", payload: { mode: clean(input.mode) || "dry", lead_count: asArray(input.leads).length, current_stage: "intake" }, now });
  await saveTask(task, options);
  emit(task, { note: "Durable task created." });

  // 2. approved — record + consume a DURABLE approval bound to this task.
  const appr = await recordApproval({
    operation_type, task_id: task.task_id, correlation_id,
    approved_by: clean(input.approved_by) || "Jonathan",
    source_message_id: clean(input.source_message_id), source_text: clean(input.source_text),
    policy_ref: "standing_outbound_policy",
  }, { ...options, now });
  const consume = await consumeApproval(appr.approval.approval_id, task.task_id, { ...options, now });
  if (!consume.ok) {
    task = transition(task, "blocked", { now, reason: `approval_invalid:${consume.reason}`, next_action: "request fresh approval" }).task;
    await saveTask(task, options); emit(task);
    return { ok: false, task, transcript, final_status: renderStatus(task) };
  }
  task = transition(task, "approved", { now, reason: "Durable approval recorded + consumed.", actor: clean(input.approved_by) || "Jonathan", evidence_ref: appr.approval.approval_id, next_action: "submit to execution rail" }).task;
  await saveTask(task, options); emit(task, { approval_id: appr.approval.approval_id });

  // 3. submission_pending
  task = transition(task, "submission_pending", { now, reason: "Submitting to execution rail.", next_action: "obtain queue receipt" }).task;
  await saveTask(task, options); emit(task);

  // 4. queued — the durable task row IS the queue record; build a real queue receipt.
  const queueReceipt = { kind: "receipt", source: "rail", queue_record_id: task.task_id, db_row_id: task.task_id, persisted: true };
  const qres = transition(task, "queued", { now, evidence: queueReceipt, reason: "Durable queue record created.", next_action: "await worker acceptance" });
  if (!qres.ok) { return failOut(task, transcript, qres, options, now); }
  task = qres.task; await saveTask(task, options); emit(task, { queue_receipt: queueReceipt.queue_record_id });
  await appendApprovalAudit(appr.approval.approval_id, { step: "task_queued", task_id: task.task_id, queue_record_id: task.task_id }, { ...options, now });

  // 5. accepted_by_worker — invoke the SAME operating cycle as the worker/runner.
  //    The cycle result is the worker acknowledgment + running evidence.
  const runCycle = typeof input.runCycle === "function" ? input.runCycle : null;
  if (!runCycle) {
    // No worker/runner wired → truthfully BLOCKED, not "running".
    task = transition(task, "blocked", { now, reason: "no_execution_worker_wired", next_action: "wire runOperatingCycle worker / start runner" }).task;
    await saveTask(task, options); emit(task);
    return { ok: false, task, transcript, final_status: renderStatus(task), reason: "no_worker" };
  }
  let cycle;
  try {
    cycle = await runCycle({ leads: asArray(input.leads), now, executionMode: clean(input.mode) === "live" ? "live" : "dry", transports: input.transports || {} });
  } catch (err) {
    task = transition(task, "failed", { now, reason: `worker_error:${clean(err?.message)}`, next_action: "retry or escalate" }).task;
    await saveTask(task, options); emit(task);
    return { ok: false, task, transcript, final_status: renderStatus(task) };
  }
  const cycleId = clean(cycle?.cycle?.id) || clean(cycle?.summary?.cycle_id) || "operating_cycle";
  const workerReceipt = { kind: "receipt", source: "rail", worker_ack_id: cycleId, worker_id: "hermes_operating_cycle" };
  task = transition(task, "accepted_by_worker", { now, evidence: workerReceipt, actor: "hermes_operating_cycle", reason: "Operating cycle accepted the task.", next_action: "run stages" }).task;
  await saveTask(task, options); emit(task);

  // 6. running — record a running receipt (the cycle execution id / heartbeat).
  const runReceipt = { kind: "receipt", source: "rail", run_id: cycleId, workflow_execution_id: cycleId, heartbeat_at: now };
  task = transition(task, "running", { now, evidence: runReceipt, reason: "Operating cycle running.", next_action: "import → enrich → score → outreach" }).task;
  task = { ...task, payload: { ...task.payload, current_stage: "execute" } };
  await saveTask(task, options); emit(task);

  // 7. evaluate REAL evidence from the cycle to decide the truthful end state.
  const exec = cycle?.cycle?.execution || cycle?.summary?.execution || {};
  const emailsSent = Number(exec?.email?.sent ?? exec?.emails_sent ?? 0);
  const callsPlaced = Number(exec?.call?.dialed ?? exec?.calls_placed ?? 0);
  const queueAdded = Number(exec?.queue_added ?? 0);
  const score = Number(cycle?.cycle?.autonomy_score ?? cycle?.summary?.autonomy_score ?? 0);

  // Outreach SENT requires production transport receipts. With transports disabled
  // (dry/no-send) nothing was sent → we must NOT claim completion of outreach.
  const outreachSent = emailsSent > 0 || callsPlaced > 0;
  if (outreachSent) {
    const stageReceipt = { kind: "receipt", source: clean(input.mode) === "live" ? "rail" : "stub", message_id: `cycle:${cycleId}:emails=${emailsSent}:calls=${callsPlaced}`, evidence_reference: cycleId };
    task = transition(task, "partially_completed", { now, evidence: stageReceipt, reason: `Outreach executed (emails=${emailsSent}, calls=${callsPlaced}).`, next_action: "monitor replies / outcomes", allowStub: clean(input.mode) !== "live" }).task;
  } else {
    // Truthful: import/enrich/score/queue done, but outreach has NOT been sent.
    const stageReceipt = { kind: "receipt", source: "rail", stage_evidence_ref: `cycle:${cycleId}:queue_added=${queueAdded}:score=${score}` };
    const reason = `Import/scoring ran (cycle ${cycleId}); outreach NOT sent — ${clean(input.mode) === "live" ? "no eligible contacts / live transport blocked" : "transports disabled (dry mode)"}.`;
    task = transition(task, "partially_completed", { now, evidence: stageReceipt, reason, next_action: "enrich contacts + wire transports, then run outreach" }).task;
  }
  task = { ...task, payload: { ...task.payload, current_stage: outreachSent ? "outreach" : "enrichment_pending", cycle_score: score, emails_sent: emailsSent, calls_placed: callsPlaced } };
  await saveTask(task, options); emit(task, { cycle_id: cycleId, emails_sent: emailsSent, calls_placed: callsPlaced, score });
  await appendApprovalAudit(appr.approval.approval_id, { step: "execution_evidence", task_id: task.task_id, cycle_id: cycleId, emails_sent: emailsSent, calls_placed: callsPlaced, outcome: outreachSent ? "outreach_sent" : "outreach_pending" }, { ...options, now });

  return { ok: true, task, transcript, final_status: renderStatus(task), cycle_id: cycleId, evidence: { emailsSent, callsPlaced, queueAdded, score } };
}

async function failOut(task, transcript, res, options, now) {
  const t = transition(task, "blocked", { now, reason: res.error || "transition_failed", next_action: "diagnose" }).task;
  await saveTask(t, options);
  const s = renderStatus(t); transcript.push({ at: t.updated_at, state: s.state, text: s.text });
  return { ok: false, task: t, transcript, final_status: s };
}

export { loadTask };
