import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import { readAutonomousRevenueState } from "../src/lib/revenueEngineReadAdapter.mjs";
import {
  buildDispatchControlState,
  decideTaskDispatch,
  repairRecommendationFor,
} from "../src/lib/dispatchControlState.mjs";
import { buildResourceAvailabilityState, buildSchedulingWindowState } from "../src/lib/resourceAvailabilityScheduling.mjs";

const INSIDE = "2026-06-12T14:00:00.000Z"; // Friday 10:00 AM New York
const OUTSIDE = "2026-06-12T21:00:00.000Z"; // Friday 5:00 PM New York

function handoff(overrides = {}) {
  return {
    task_id: "dispatch-email-1",
    source_system: "revenue",
    source_record_id: "action-1",
    task_type: "email_queue_execution",
    current_owner: "email_rail",
    fallback_owner: "jonathan_operator",
    escalation_owner: "jonathan_operator",
    status: "assigned",
    approval_requirement: [],
    evidence_requirement: ["policy_receipt"],
    execution_mode: "controlled_real",
    lock_conflict_key: "lead_contact:lead-1",
    duplicate_prevention_key: "revenue:lead-1:email",
    closeout_evidence: [],
    ...overrides,
  };
}

function stateFor(handoffs, options = {}) {
  const taskOwnershipLedger = {
    active_handoffs: handoffs,
    conflict_locks: options.conflictLocks || [],
  };
  const resourceAvailabilityState = buildResourceAvailabilityState({ now: options.now || INSIDE, resources: options.resources || {} });
  const schedulingWindowState = buildSchedulingWindowState({
    now: options.now || INSIDE,
    resources: options.resources || {},
    approvals: options.approvals || {},
    taskOwnershipLedger,
    resourceAvailabilityState,
  });
  return { taskOwnershipLedger, resourceAvailabilityState, schedulingWindowState };
}

test("dispatch-ready task when all gates pass", () => {
  const surfaces = stateFor([handoff()], { approvals: { "dispatch-email-1": true } });
  const state = buildDispatchControlState(surfaces);
  const decision = state.dispatch_ready_tasks[0];

  assert.equal(decision.dispatch_decision, "dispatch_ready");
  assert.equal(decision.target_assignee_resource, "email_rail");
  assert.equal(decision.recommended_next_operator_action, "dispatch_under_existing_rail");
  assert.equal(state.summary.dispatch_ready, 1);
  assert.equal(state.safety.no_live_execution_triggered, true);
});

test("email outside window becomes held with next eligible action", () => {
  const surfaces = stateFor([handoff()], { now: OUTSIDE, approvals: { "dispatch-email-1": true } });
  const state = buildDispatchControlState(surfaces);
  const held = state.held_tasks[0];

  assert.equal(held.dispatch_decision, "hold_until_window");
  assert.equal(held.reason, "outside_email_outreach_window");
  assert.equal(held.next_eligible_time, "2026-06-15T13:00:00.000Z");
  assert.equal(held.recommended_next_operator_action, "hold_until_window_opens");
});

test("approval-required task requests approval and production task without approval blocks policy", () => {
  const approval = decideTaskDispatch(handoff({
    task_id: "approval-1",
    task_type: "service_delivery_work_order",
    current_owner: "hermes",
    approval_requirement: ["high_risk_work_order"],
    execution_mode: "controlled_real",
  }), { can_run_now: false, recommended_action: "request_approval", hold_reason: "approval_required" }, {});

  assert.equal(approval.dispatch_decision, "request_approval");
  assert.equal(approval.required_approval.includes("high_risk_work_order"), true);

  const production = decideTaskDispatch(handoff({
    task_id: "prod-1",
    task_type: "production_voice_activation",
    current_owner: "jonathan_operator",
    approval_requirement: ["jonathan_operator_approval"],
    execution_mode: "production_gated",
  }), { can_run_now: false, recommended_action: "request_approval", hold_reason: "approval_required" }, {});

  assert.equal(production.dispatch_decision, "blocked_policy");
  assert.equal(production.reason, "production_gated_without_approval");
});

test("exhausted owner triggers fallback and stale task escalates", () => {
  const fallbackSurfaces = stateFor([handoff({
    task_id: "cowork-1",
    task_type: "browser_manual_research",
    current_owner: "cowork",
    fallback_owner: "hermes",
    execution_mode: "sandbox",
  })], { resources: { cowork: { status: "exhausted", reason: "manual_credit_status" } } });
  const fallback = buildDispatchControlState(fallbackSurfaces).fallback_required_tasks[0];
  assert.equal(fallback.dispatch_decision, "fallback_required");
  assert.equal(fallback.fallback_owner, "hermes");

  const stale = decideTaskDispatch(handoff({
    task_id: "stale-1",
    status: "fallback_required",
    current_owner: "codex",
    fallback_owner: "claude_code",
  }), { can_run_now: false, recommended_action: "queue_only", hold_reason: "stale_threshold_exceeded" }, {});
  assert.equal(stale.dispatch_decision, "escalate_to_operator");
  assert.equal(stale.recommended_next_operator_action, "review_stale_or_escalated_task");
});

test("failed task triggers repair recommendation", () => {
  const failed = decideTaskDispatch(handoff({
    task_id: "failed-code",
    task_type: "code_changes",
    source_system: "code",
    status: "failed",
    current_owner: "codex",
  }), { can_run_now: false, recommended_action: "queue_only", hold_reason: "failed" }, {});

  assert.equal(failed.dispatch_decision, "repair_required");
  assert.equal(failed.repair_recommendation, "create_codex_repair_packet");
  assert.equal(repairRecommendationFor(handoff({ task_type: "browser_manual_research", status: "failed" })), "create_cowork_research_packet");
});

test("missing evidence, conflict locks, and completed tasks do not dispatch", () => {
  const missingEvidence = decideTaskDispatch(handoff({ task_id: "missing-evidence", evidence_requirement: [] }), {
    can_run_now: false,
    recommended_action: "queue_only",
    hold_reason: "missing_evidence_path",
  }, {});
  assert.equal(missingEvidence.dispatch_decision, "blocked_missing_evidence_path");

  const conflict = decideTaskDispatch(handoff({ task_id: "conflict-a" }), {
    can_run_now: false,
    recommended_action: "cancel_or_review",
    hold_reason: "conflict_lock_active",
  }, {});
  assert.equal(conflict.dispatch_decision, "blocked_conflict");

  const completed = decideTaskDispatch(handoff({ task_id: "done", status: "completed_with_evidence" }), {
    can_run_now: true,
    recommended_action: "run_now",
  }, {});
  assert.equal(completed.dispatch_decision, "no_action");
});

test("dispatch state summarizes held, escalations, repairs, blocked, and next operator action", () => {
  const surfaces = stateFor([
    handoff({ task_id: "ready", current_owner: "email_rail" }),
    handoff({ task_id: "failed", status: "failed", task_type: "code_changes", current_owner: "codex" }),
    handoff({ task_id: "blocked", evidence_requirement: [] }),
  ], { approvals: { ready: true } });
  const state = buildDispatchControlState(surfaces);

  assert.equal(state.summary.dispatch_ready, 1);
  assert.equal(state.summary.repair_required, 1);
  assert.equal(state.summary.blocked_tasks, 1);
  assert.equal(state.next_operator_action, "repair_failed_dispatch_tasks");
});

test("latest.json and read adapter expose dispatchControlState", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "phase8d-dispatch-"));
  const result = await runRevenueDailyLoop({
    outputDir: dir,
    persistSupabase: false,
    now: INSIDE,
    commandTasks: [
      { task_id: "phase8d-ready", task_type: "code_changes", assigned_agent: "codex", source: "code", required_evidence: ["tests_run"], evidence_path: "test output", created_at: INSIDE },
    ],
    commandResources: { codex: { status: "available" } },
  });

  const latest = JSON.parse(readFileSync(result.latestPath, "utf8"));
  assert.equal(latest.dispatchControlState.summary.dispatch_ready >= 1, true);
  assert.equal(latest.dispatchControlState.dispatch_ready_tasks.some((item) => item.task_id === "phase8d-ready"), true);

  const readState = await readAutonomousRevenueState({ dataDir: dir, useSupabaseFallback: false });
  assert.equal(readState.dispatchControlState.summary.dispatch_ready >= 1, true);
});
