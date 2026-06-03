import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyActionRisk,
  buildExecutionTaskPacket,
  buildExecutionLifecycle,
  bridgeApprovalToExecution,
  buildApprovalExecutionQueue,
  attachExecutionEvidence,
  advanceExecutionStatus,
  canCompleteExecution,
  executionTaskIdFor,
  HIGH_RISK_APPROVAL_ACTIONS,
} from "../src/lib/approvalExecutionBridge.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

function approvedDecision(overrides = {}) {
  return {
    decision_id: "dec-1",
    approval_item_id: "appr-001",
    decision: "approved",
    original_requested_action: "Send approved follow-up email to warm lead",
    risk_level: "low",
    what_approval_unlocks: "Move lead to nurturing",
    decided_by: "jonathan@ottoserv.com",
    ...overrides,
  };
}

test("only approved decisions become executable tasks", () => {
  for (const d of ["rejected", "revision_requested", "pending"]) {
    const r = buildExecutionTaskPacket(approvedDecision({ decision: d }));
    assert.equal(r.ok, false, `${d} must not produce a task`);
  }
  const ok = buildExecutionTaskPacket(approvedDecision());
  assert.equal(ok.ok, true);
});

test("low-risk approved action routes to an actor with evidence + deterministic id", () => {
  const { ok, taskPacket } = buildExecutionTaskPacket(approvedDecision(), { now: NOW });
  assert.equal(ok, true);
  assert.equal(taskPacket.execution_rail, "email");
  assert.equal(taskPacket.risk_level, "low");
  assert.equal(taskPacket.status, "queued");
  assert.ok(taskPacket.required_evidence.length >= 1);
  assert.equal(taskPacket.task_id, executionTaskIdFor({ approval_item_id: "appr-001", action: "x" }));
});

test("risk classifier flags high-risk actions even when worded variably", () => {
  assert.equal(classifyActionRisk("Create new Stripe product and pricing"), "high");
  assert.equal(classifyActionRisk("Launch new outbound campaign to a new list"), "high");
  assert.equal(classifyActionRisk("Production deploy of the API"), "high");
  assert.equal(classifyActionRisk("Rotate the credential / api key"), "high");
  assert.equal(classifyActionRisk("Send final client-facing deliverable"), "high");
  assert.equal(classifyActionRisk("Send a follow-up email"), "low");
  assert.equal(classifyActionRisk("Update CRM lead status"), "low");
  // Unknown defaults to high (fail safe).
  assert.equal(classifyActionRisk("do the thing"), "high");
});

test("high-risk approved action still produces a delegated task with hard forbidden_actions", () => {
  const { ok, taskPacket } = buildExecutionTaskPacket(
    approvedDecision({ original_requested_action: "Production deploy of revenue API", risk_level: "high" }),
    { now: NOW },
  );
  assert.equal(ok, true);
  assert.equal(taskPacket.risk_level, "high");
  assert.equal(taskPacket.priority, "high");
  // The bridge never executes; it delegates with explicit limits.
  assert.ok(taskPacket.forbidden_actions.length >= 1);
  assert.ok(HIGH_RISK_APPROVAL_ACTIONS.every((a) => taskPacket.forbidden_actions.includes(a) || taskPacket.requested_action.toLowerCase().includes(a)));
});

test("lifecycle starts queued, evidence required, nothing executed", () => {
  const { taskPacket, lifecycle } = bridgeApprovalToExecution(approvedDecision(), { now: NOW });
  assert.equal(lifecycle.execution_status, "queued");
  assert.equal(lifecycle.evidence_status, "required");
  assert.equal(lifecycle.assigned_task_id, taskPacket.task_id);
  assert.equal(lifecycle.decision, "approved");
  assert.equal(lifecycle.next_action, "execute_then_submit_evidence");
});

test("queue is idempotent and skips non-approved inputs", () => {
  const inputs = [
    approvedDecision({ approval_item_id: "a1" }),
    approvedDecision({ approval_item_id: "a1" }), // duplicate → deduped
    approvedDecision({ approval_item_id: "a2", decision: "rejected" }), // skipped
    approvedDecision({ approval_item_id: "a3", original_requested_action: "Update pipeline stage" }),
  ];
  const queue = buildApprovalExecutionQueue(inputs, { now: NOW });
  assert.equal(queue.count, 2, "a1 (deduped) + a3");
  assert.equal(queue.skipped_not_approved, 1);
  const ids = queue.items.map((i) => i.taskPacket.related_approval_item_id).sort();
  assert.deepEqual(ids, ["a1", "a3"]);
});

test("completion is gated on evidence; attach → advance enforces it", () => {
  const { lifecycle } = bridgeApprovalToExecution(approvedDecision(), { now: NOW });

  // Cannot complete without evidence.
  assert.equal(canCompleteExecution(lifecycle), false);
  const blocked = advanceExecutionStatus(lifecycle, "completed", { now: NOW });
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /evidence/i);

  // Attach evidence → can complete.
  const withEv = attachExecutionEvidence(lifecycle, {
    evidence_type: "email_sent",
    evidence_summary: "Sent to lead",
    evidence_reference: "msg-123",
    submitted_by_agent: "OttoServ Outreach",
  }, { now: NOW });
  assert.equal(withEv.execution_status, "evidence_submitted");
  assert.equal(withEv.submitted_evidence.length, 1);
  assert.equal(canCompleteExecution(withEv), true);

  const done = advanceExecutionStatus(withEv, "completed", { now: NOW });
  assert.equal(done.ok, true);
  assert.equal(done.lifecycle.execution_status, "completed");
  assert.equal(done.lifecycle.evidence_status, "accepted");
  assert.equal(done.lifecycle.hermes_review_result, "accepted");
});

test("an implementation work order (approved) can be bridged directly", () => {
  const wo = {
    id: "WO-2026-00046",
    engagement_type: "automation_implementation",
    title: "Implementation: front office automation pilot — Harbor Point PM",
    implementation_stage: "paid_awaiting_implementation",
    approvalStatus: "approved",
    recommended_actor: "Codex",
    risk_level: "high",
    required_evidence: ["Commit hash + tests"],
    success_criteria: ["Automation live"],
    next_action: "Build automations",
  };
  const { ok, taskPacket } = buildExecutionTaskPacket(wo, { now: NOW });
  assert.equal(ok, true);
  assert.equal(taskPacket.execution_rail, "codex");
  assert.deepEqual(taskPacket.required_evidence, ["Commit hash + tests"]);
});
