import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadAllApprovals } from "../src/lib/execution/approvalStore.mjs";
import { buildAutonomyGraduationState } from "../src/lib/autonomyGraduationFramework.mjs";
import {
  buildAutonomyGraduationReviewState,
  createGraduationRequest,
  decideGraduationRequest,
  OPERATOR_DECISIONS,
} from "../src/lib/autonomyGraduationReviewWorkflow.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import { readAutonomousRevenueState } from "../src/lib/revenueEngineReadAdapter.mjs";

const NOW = "2026-06-12T14:00:00.000Z";

function blockedAction(overrides = {}) {
  return {
    action_id: "phase10b-email-l3",
    category: "controlled_email_execution",
    current_autonomy_level: "L1",
    requested_autonomy_level: "L3",
    risk_level: "medium",
    controlled_real_acceptance_evidence: "",
    sandbox_tests_passed: true,
    idempotency_protection: true,
    duplicate_prevention: true,
    rollback_or_fail_closed: true,
    monitoring: true,
    evidence_requirements: ["policy_receipt", "provider_message_id"],
    caps_limits: { per_run: 3, window: "business_hours" },
    owner_approval: false,
    unresolved_safety_incidents: [],
    ...overrides,
  };
}

function reviewStateFor(actions, decisions = []) {
  const autonomyGraduationState = buildAutonomyGraduationState({ now: NOW, actionCandidates: actions });
  return buildAutonomyGraduationReviewState({ now: NOW, autonomyGraduationState, decisions });
}

test("creates graduation request from blocked autonomy item with levels and risk", () => {
  const state = reviewStateFor([blockedAction()]);
  const request = state.pending_graduation_requests[0];

  assert.equal(request.request_id, "agr-phase10b-email-l3");
  assert.equal(request.action_category, "controlled_email_execution");
  assert.equal(request.current_autonomy_level, "L1");
  assert.equal(request.requested_autonomy_level, "L3");
  assert.equal(request.risk_class, "medium");
  assert.ok(request.missing_evidence.includes("controlled_real_acceptance_evidence"));
  assert.equal(request.current_status, "pending_operator_review");
});

test("request model includes evidence, caps, windows, rollback, monitoring, incidents, agents, and rails", () => {
  const request = createGraduationRequest({
    action_id: "retell-prod",
    category: "production_voice_activation",
    risk_level: "high",
    current_autonomy_level: "L1",
    requested_autonomy_level: "L4",
    blocked_reasons: ["missing_controlled_real_acceptance_evidence"],
    required_before_graduation: ["controlled_real_acceptance_evidence"],
    evidence_requirement: ["retell_readiness", "test_call_evidence"],
    caps_limits: { calls_per_day: 1, window: "Mon-Thu 10:00-15:00" },
    rollback_requirement: "fail_closed_present",
    monitoring_requirement: "watchdog_present",
    unresolved_safety_incidents: ["missing_acceptance_run"],
  }, { now: NOW, requestedBy: "Hermes", affectedAgents: ["retell_call_rail"], affectedRails: ["Retell/call rail"] });

  assert.deepEqual(request.supporting_evidence, ["retell_readiness", "test_call_evidence"]);
  assert.equal(request.caps_limits.calls_per_day, 1);
  assert.equal(request.time_window_constraints, "Mon-Thu 10:00-15:00");
  assert.equal(request.rollback_fail_closed_status, "fail_closed_present");
  assert.equal(request.monitoring_status, "watchdog_present");
  assert.deepEqual(request.safety_incidents_exceptions, ["missing_acceptance_run"]);
  assert.deepEqual(request.affected_agents_resources, ["retell_call_rail"]);
  assert.deepEqual(request.affected_rails, ["Retell/call rail"]);
});

test("approval requires evidence and critical action requires Jonathan/operator decision", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "phase10b-approval-"));
  const request = createGraduationRequest({
    action_id: "charge-card",
    category: "payment_charge",
    risk_level: "critical",
    current_autonomy_level: "L1",
    requested_autonomy_level: "L5",
    evidence_requirement: ["payment_policy"],
    caps_limits: { charges: 0 },
  }, { now: NOW });

  const missingEvidence = await decideGraduationRequest(request, {
    decision: "approve_bounded_autonomy",
    operator: "Jonathan/operator",
    reason: "Approve once evidence is attached.",
    max_autonomy_level_allowed: "L3",
  }, { now: NOW, approvalsDir: dir });
  assert.equal(missingEvidence.ok, false);
  assert.equal(missingEvidence.reason, "approval_requires_evidence_references");

  const wrongOperator = await decideGraduationRequest(request, {
    decision: "approve_bounded_autonomy",
    operator: "Codex",
    reason: "Not enough authority.",
    evidence_references: ["evidence://manual"],
    max_autonomy_level_allowed: "L3",
  }, { now: NOW, approvalsDir: dir });
  assert.equal(wrongOperator.ok, false);
  assert.equal(wrongOperator.reason, "critical_requires_jonathan_operator_decision");
});

test("approve_bounded_autonomy records durable decision without live execution", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "phase10b-approve-"));
  const request = reviewStateFor([blockedAction()]).pending_graduation_requests[0];
  const result = await decideGraduationRequest(request, {
    decision: "approve_bounded_autonomy",
    operator: "Jonathan/operator",
    reason: "Bounded email autonomy approved after evidence review.",
    decision_scope: "controlled_email_execution:business_hours",
    max_autonomy_level_allowed: "L3",
    caps_limits: { per_run: 3, window: "business_hours" },
    expires_at: "2026-07-12T14:00:00.000Z",
    evidence_references: ["evidence://phase9b/synthetic-acceptance"],
    rollback_requirements: ["fail_closed_on_policy_failure"],
    monitoring_requirements: ["provider_message_readback", "watchdog"],
  }, { now: NOW, approvalsDir: dir });

  assert.equal(result.ok, true);
  assert.equal(result.decision.decision, "approve_bounded_autonomy");
  assert.equal(result.bounded_policy.enabled_for_future_gated_execution, true);
  assert.equal(result.safety.no_live_execution_triggered, true);

  const approvals = await loadAllApprovals({ approvalsDir: dir });
  assert.equal(approvals.length, 1);
  assert.equal(approvals[0].operation_type, "autonomy_graduation");
  assert.equal(approvals[0].decision, "approve_bounded_autonomy");
  assert.equal(approvals[0].scope, "controlled_email_execution:business_hours");
});

test("reject and defer decisions record reason and block graduation", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "phase10b-reject-"));
  const request = reviewStateFor([blockedAction()]).pending_graduation_requests[0];
  const rejected = await decideGraduationRequest(request, {
    decision: "reject_graduation",
    operator: "Jonathan/operator",
    reason: "Live business-hours acceptance is still pending.",
    evidence_references: ["evidence://phase9b/synthetic-only"],
  }, { now: NOW, approvalsDir: dir });
  const deferred = await decideGraduationRequest({ ...request, request_id: "agr-defer" }, {
    decision: "defer_until_evidence",
    operator: "Jonathan/operator",
    reason: "Wait for controlled-real evidence.",
    evidence_references: ["evidence://missing-list"],
  }, { now: NOW, approvalsDir: dir });

  assert.equal(rejected.ok, true);
  assert.equal(rejected.bounded_policy.enabled_for_future_gated_execution, false);
  assert.equal(rejected.decision.reason, "Live business-hours acceptance is still pending.");
  assert.equal(deferred.ok, true);
  assert.equal(deferred.decision.current_status, "deferred");

  const state = reviewStateFor([blockedAction()], [rejected.decision, deferred.decision]);
  assert.equal(state.rejected_deferred_requests.length, 2);
  assert.equal(state.next_operator_action, "collect_required_evidence_for_deferred_autonomy");
});

test("caps expiration and decision history are enforced in bounded policy output", async () => {
  const request = reviewStateFor([blockedAction()]).pending_graduation_requests[0];
  const approved = (await decideGraduationRequest(request, {
    decision: "approve_bounded_autonomy",
    operator: "Jonathan/operator",
    reason: "Bounded only.",
    max_autonomy_level_allowed: "L3",
    caps_limits: { per_run: 2 },
    expires_at: "2026-06-20T14:00:00.000Z",
    review_at: "2026-06-19T14:00:00.000Z",
    evidence_references: ["evidence://acceptance"],
  }, { now: NOW, approvalsDir: mkdtempSync(path.join(os.tmpdir(), "phase10b-policy-")) })).decision;

  const state = reviewStateFor([blockedAction()], [approved]);
  assert.equal(state.approved_bounded_autonomy.length, 1);
  assert.equal(state.active_autonomy_caps[0].caps_limits.per_run, 2);
  assert.equal(state.expiration_review_requirements[0].expires_at, "2026-06-20T14:00:00.000Z");
  assert.equal(state.operator_decision_history.length, 1);
});

test("planned agents and Jarvis cannot be granted live authority", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "phase10b-planned-"));
  const plannedRequest = createGraduationRequest({
    action_id: "nova-live",
    category: "growth_campaign",
    risk_level: "medium",
    current_autonomy_level: "L0",
    requested_autonomy_level: "L3",
    evidence_requirement: ["plan"],
  }, { affectedAgents: ["nova"], now: NOW });
  const jarvisRequest = createGraduationRequest({
    action_id: "jarvis-dupe",
    category: "command_authority",
    risk_level: "medium",
    current_autonomy_level: "L0",
    requested_autonomy_level: "L3",
    evidence_requirement: ["alias plan"],
  }, { affectedAgents: ["jarvis"], now: NOW });

  const planned = await decideGraduationRequest(plannedRequest, {
    decision: "approve_bounded_autonomy",
    operator: "Jonathan/operator",
    reason: "No live planned agent authority.",
    evidence_references: ["evidence://plan"],
    max_autonomy_level_allowed: "L3",
  }, { now: NOW, approvalsDir: dir });
  const jarvis = await decideGraduationRequest(jarvisRequest, {
    decision: "approve_bounded_autonomy",
    operator: "Jonathan/operator",
    reason: "No duplicate Hermes authority.",
    evidence_references: ["evidence://alias"],
    max_autonomy_level_allowed: "L3",
  }, { now: NOW, approvalsDir: dir });

  assert.equal(planned.ok, false);
  assert.equal(planned.reason, "planned_agents_not_routable");
  assert.equal(jarvis.ok, false);
  assert.equal(jarvis.reason, "jarvis_cannot_duplicate_hermes_authority");
});

test("latest.json and read adapter expose autonomyGraduationReviewState", async () => {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "phase10b-latest-"));
  const result = await runRevenueDailyLoop({
    outputDir,
    persistSupabase: false,
    now: NOW,
    autonomyGraduationActions: [blockedAction()],
  });

  const latest = JSON.parse(readFileSync(result.latestPath, "utf8"));
  assert.ok(latest.autonomyGraduationReviewState);
  assert.equal(latest.autonomyGraduationReviewState.pending_graduation_requests.length, 1);
  assert.equal(latest.autonomyGraduationReviewState.safety.no_live_execution_enabled_from_approval, true);

  const readState = await readAutonomousRevenueState({ dataDir: outputDir });
  assert.ok(readState.autonomyGraduationReviewState);
  assert.equal(readState.autonomyGraduationReviewState.summary.pending_requests, 1);
  assert.equal(result.summary.autonomy_graduation_review_state.pending_requests, 1);
});

test("operator decision model supports every required decision value", () => {
  assert.deepEqual(OPERATOR_DECISIONS, [
    "approve_bounded_autonomy",
    "reject_graduation",
    "defer_until_evidence",
    "require_manual_only",
    "reduce_autonomy",
    "suspend_autonomy",
    "request_retest",
    "request_operator_review",
  ]);
});
