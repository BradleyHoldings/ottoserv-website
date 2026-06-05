// Execution-truth contract tests. Proves Hermes cannot report intent as execution.
// Covers the 16 required proofs. Uses isolated temp stores; no real sends/dials.

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { createTask, transition, transitionAndSave, loadTask, loadAllTasks, EXECUTION_TRUTH } from "../src/lib/execution/taskLifecycle.mjs";
import { validateReceipt, isProductionReceipt, stubReceipt } from "../src/lib/execution/executionReceipt.mjs";
import { renderStatus, assertClaimConsistent, safeCompletionMessage } from "../src/lib/execution/telegramStatus.mjs";
import { recordApproval, consumeApproval, loadApproval, loadAllApprovals } from "../src/lib/execution/approvalStore.mjs";
import { runOpsRevenueNow } from "../src/lib/execution/commandRail.mjs";
import { runWatchdog, inspectTask, applySafeRepair } from "../src/lib/execution/watchdog.mjs";

const NOW = "2026-06-05T15:00:00.000Z";
function tmp() { const d = mkdtempSync(path.join(os.tmpdir(), "exec-")); return { tasksDir: path.join(d, "tasks"), approvalsDir: path.join(d, "appr") }; }
function later(min) { return new Date(Date.parse(NOW) + min * 60000).toISOString(); }

// A stub worker: returns a cycle result with execution evidence (no real sends).
function stubCycle({ emails = 0, calls = 0, queueAdded = 0, score = 100 } = {}) {
  return async () => ({ ok: true, cycle: { id: "operating_cycle_test", autonomy_score: score, execution: { queue_added: queueAdded, email: { sent: emails }, call: { dialed: calls } } } });
}

test("1. approval does NOT equal execution", async () => {
  const opts = tmp();
  let task = createTask({ operation_type: "ops_revenue_now", now: NOW });
  task = transition(task, "approved", { now: NOW, evidence_ref: "appr-1" }).task;
  assert.equal(task.state, "approved");
  assert.equal(EXECUTION_TRUTH.started.has(task.state), false, "approved is NOT started");
  assert.match(renderStatus(task).text, /not.*started|pending/i);
});

test("2. queueing does NOT equal running", async () => {
  let task = createTask({ operation_type: "x", now: NOW });
  task = transition(task, "approved", { now: NOW }).task;
  task = transition(task, "submission_pending", { now: NOW }).task;
  task = transition(task, "queued", { now: NOW, evidence: { kind: "receipt", source: "rail", queue_record_id: "q1" } }).task;
  assert.equal(task.state, "queued");
  assert.equal(renderStatus(task).started, false);
  assert.match(renderStatus(task).text, /queued|not running|not accepted/i);
});

test("3. cannot reach 'running'/'queued'/'completed' without a durable receipt", () => {
  let task = createTask({ operation_type: "x", now: NOW });
  task = transition(task, "approved", { now: NOW }).task;
  task = transition(task, "submission_pending", { now: NOW }).task;
  // queued with NO receipt → rejected
  const noReceipt = transition(task, "queued", { now: NOW });
  assert.equal(noReceipt.ok, false);
  assert.match(noReceipt.error, /receipt_required_for_queued/);
  // queued with a plan/intent → rejected (intent is not evidence)
  const intent = transition(task, "queued", { now: NOW, evidence: { kind: "plan", queue_record_id: "x" } });
  assert.equal(intent.ok, false);
});

test("4. if the rail rejects the task, the user is told it did NOT start", async () => {
  const opts = tmp();
  // No runCycle worker wired → command rail blocks, never claims running.
  const res = await runOpsRevenueNow({ correlation_id: "m4", approved_by: "Jonathan", now: NOW, mode: "dry" }, opts);
  assert.equal(res.ok, false);
  assert.equal(res.task.state, "blocked");
  assert.match(res.final_status.text, /has NOT started|blocked/i);
});

test("5. no worker acceptance → reports queued/blocked, never running", async () => {
  let task = createTask({ operation_type: "x", now: NOW });
  task = transition(task, "approved", { now: NOW }).task;
  task = transition(task, "submission_pending", { now: NOW }).task;
  task = transition(task, "queued", { now: NOW, evidence: { kind: "receipt", source: "rail", queue_record_id: "q1" } }).task;
  // Without an accepted_by_worker transition, status must not say running.
  assert.equal(renderStatus(task).started, false);
});

test("6. watchdog detects a stalled task", () => {
  let task = createTask({ operation_type: "x", now: NOW });
  task = transition(task, "approved", { now: NOW }).task; // approved, never submitted
  const wd = runWatchdog([task], { now: later(10) });
  assert.equal(wd.alerts.length, 1);
  assert.equal(wd.alerts[0].failure_class, "approved_not_submitted");
  assert.match(wd.alerts[0].proactive_message, /not progressing|NOT running/i);
});

test("7. safe autonomous retry occurs for an auto-repairable stall", () => {
  let task = createTask({ operation_type: "x", now: NOW });
  task = transition(task, "approved", { now: NOW }).task;
  const alert = inspectTask(task, { now: later(10) });
  const repair = applySafeRepair(task, alert, { now: later(10) });
  assert.equal(repair.applied, true);
  assert.equal(repair.task.state, "submission_pending", "watchdog re-submitted the task");
});

test("8. duplicate Telegram confirmations do NOT duplicate execution", async () => {
  const opts = tmp();
  const r1 = await runOpsRevenueNow({ correlation_id: "dup-1", approved_by: "Jonathan", now: NOW, mode: "dry", runCycle: stubCycle({ queueAdded: 1 }) }, opts);
  const r2 = await runOpsRevenueNow({ correlation_id: "dup-1", approved_by: "Jonathan", now: later(1), mode: "dry", runCycle: stubCycle({ queueAdded: 1 }) }, opts);
  assert.equal(r2.idempotent, true, "second confirmation is idempotent");
  const all = await loadAllTasks(opts);
  assert.equal(all.filter((t) => t.correlation_id === "dup-1").length, 1, "exactly one task");
});

test("9. restart does NOT lose approval or task state (durable on disk)", async () => {
  const opts = tmp();
  const r = await runOpsRevenueNow({ correlation_id: "persist-1", approved_by: "Jonathan", now: NOW, mode: "dry", runCycle: stubCycle({ queueAdded: 1 }) }, opts);
  // Simulate a fresh process: read purely from disk.
  const reloaded = await loadTask(r.task.task_id, opts);
  assert.ok(reloaded, "task survived 'restart'");
  assert.equal(reloaded.state, r.task.state);
  const apprs = await loadAllApprovals(opts);
  assert.ok(apprs.some((a) => a.consumed && a.correlation_id === "persist-1"), "approval durable + consumed");
});

test("10. partial spreadsheet progress is represented (resumable), not faked complete", async () => {
  const opts = tmp();
  // dry run → no sends → must end partially_completed, NOT completed.
  const r = await runOpsRevenueNow({ correlation_id: "partial-1", approved_by: "Jonathan", now: NOW, mode: "dry", leads: [{ lead_id: "l1" }], runCycle: stubCycle({ queueAdded: 1, emails: 0, calls: 0 }) }, opts);
  assert.equal(r.task.state, "partially_completed");
  assert.notEqual(r.task.state, "completed");
  assert.match(r.final_status.text, /partially complete|remaining/i);
});

test("11. external sends require REAL transport evidence (stub blocked in production)", () => {
  const email = { kind: "receipt", source: "stub", message_id: "m1" };
  assert.equal(validateReceipt(email, { expectedRail: "email", allowStub: false }).ok, false, "stub rejected in production");
  assert.equal(validateReceipt(email, { expectedRail: "email", allowStub: true }).production, false, "stub flagged non-production");
  const real = { kind: "receipt", source: "gmail_api", message_id: "CAExyz@mail" };
  assert.equal(isProductionReceipt(real, "email"), true);
});

test("12. mock/stub evidence cannot be presented as production", () => {
  assert.equal(isProductionReceipt(stubReceipt("call", "c1"), "call"), false);
  assert.equal(validateReceipt({ kind: "in_memory_flag", message_id: "x" }, { expectedRail: "email", allowStub: true }).ok, false);
});

test("13. completion language is blocked when evidence validation fails", () => {
  let task = createTask({ operation_type: "x", now: NOW });
  // Force a 'completed' state object but with no/stub evidence.
  task = { ...task, state: "completed", last_evidence_ref: "" };
  const msg = safeCompletionMessage(task, { kind: "receipt", source: "stub", completion_evidence_ref: "x" });
  assert.equal(msg.allowed, false, "stub completion not allowed");
  assert.match(msg.text, /NOT a production completion|test\/stub/i);
});

test("14. command rail routes through the SAME operating cycle worker (shared lifecycle)", async () => {
  const opts = tmp();
  let receivedExecutionMode = null;
  const runCycle = async (args) => { receivedExecutionMode = args.executionMode; return { ok: true, cycle: { id: "operating_cycle", autonomy_score: 100, execution: { queue_added: 2, email: { sent: 0 }, call: { dialed: 0 } } } }; };
  const r = await runOpsRevenueNow({ correlation_id: "shared-1", approved_by: "Jonathan", now: NOW, mode: "dry", runCycle }, opts);
  assert.equal(receivedExecutionMode, "dry", "command rail invoked the operating cycle worker");
  assert.equal(r.cycle_id, "operating_cycle");
  // The lifecycle state is persisted in the SAME durable task store the watchdog reads.
  const all = await loadAllTasks(opts);
  assert.ok(all.some((t) => t.task_id === r.task.task_id));
});

test("15. a contradictory conversational claim → verification failure + correction", () => {
  let task = createTask({ operation_type: "x", now: NOW });
  task = transition(task, "approved", { now: NOW }).task; // NOT started
  const check = assertClaimConsistent("Starting execution now. The import is running.", task);
  assert.equal(check.ok, false);
  const alert = inspectTask(task, { now: NOW, conversationalClaim: "Starting execution now." });
  assert.equal(alert.failure_class, "conversational_mismatch");
  const repair = applySafeRepair(task, alert, { now: NOW });
  assert.equal(repair.applied, true);
  assert.match(repair.correction, /pending|not.*started/i);
});

test("16. watchdog proactively reports without being asked", () => {
  // Build a legitimately-queued task that no worker ever accepts.
  let task = createTask({ operation_type: "x", now: NOW });
  task = transition(task, "approved", { now: NOW }).task;
  task = transition(task, "submission_pending", { now: NOW }).task;
  task = transition(task, "queued", { now: NOW, evidence: { kind: "receipt", source: "rail", queue_record_id: "q1" } }).task;
  assert.equal(task.state, "queued");
  const wd = runWatchdog([task], { now: later(30) }); // 30m later, still no worker
  assert.ok(wd.alerts.length >= 1);
  assert.equal(wd.alerts[0].failure_class, "queued_no_worker");
  assert.ok(wd.alerts.every((a) => a.proactive_message), "every alert carries a proactive message");
});
