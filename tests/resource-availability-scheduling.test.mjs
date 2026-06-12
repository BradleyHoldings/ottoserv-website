import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import { readAutonomousRevenueState } from "../src/lib/revenueEngineReadAdapter.mjs";
import {
  buildResourceAvailabilityState,
  buildSchedulingWindowState,
  evaluateTaskSchedule,
  nextEligibleWindowTime,
} from "../src/lib/resourceAvailabilityScheduling.mjs";
import { buildTaskOwnershipLedger } from "../src/lib/taskOwnershipLedger.mjs";

const INSIDE_EMAIL = "2026-06-12T14:00:00.000Z"; // Friday 10:00 AM New York
const OUTSIDE_EMAIL = "2026-06-12T21:00:00.000Z"; // Friday 5:00 PM New York
const SATURDAY = "2026-06-13T16:00:00.000Z";

function handoff(overrides = {}) {
  return {
    task_id: "task-1",
    source_system: "revenue",
    source_record_id: "source-1",
    task_type: "email_queue_execution",
    current_owner: "email_rail",
    fallback_owner: "jonathan_operator",
    escalation_owner: "jonathan_operator",
    status: "assigned",
    approval_requirement: [],
    evidence_requirement: ["policy_receipt"],
    execution_mode: "controlled_real",
    lock_conflict_key: "lead_contact:lead-1",
    closeout_evidence: [],
    ...overrides,
  };
}

test("email outside window is held and email inside window is executable", () => {
  const outside = evaluateTaskSchedule(handoff(), { now: OUTSIDE_EMAIL });
  assert.equal(outside.can_run_now, false);
  assert.equal(outside.recommended_action, "hold_until_window");
  assert.equal(outside.hold_reason, "outside_email_outreach_window");
  assert.equal(outside.next_eligible_time, "2026-06-15T13:00:00.000Z");

  const inside = evaluateTaskSchedule(handoff(), { now: INSIDE_EMAIL });
  assert.equal(inside.can_run_now, true);
  assert.equal(inside.recommended_action, "run_now");
});

test("call outside window is held while research is allowed outside outreach hours", () => {
  const call = evaluateTaskSchedule(handoff({ task_id: "call-1", task_type: "call_queue_execution", current_owner: "retell_call_rail" }), { now: "2026-06-12T13:00:00.000Z" });
  assert.equal(call.can_run_now, false);
  assert.equal(call.hold_reason, "outside_call_window");
  assert.equal(call.next_eligible_time, "2026-06-12T13:30:00.000Z");

  const research = evaluateTaskSchedule(handoff({ task_id: "research-1", task_type: "browser_manual_research", current_owner: "cowork", execution_mode: "sandbox" }), { now: OUTSIDE_EMAIL });
  assert.equal(research.can_run_now, true);
  assert.equal(research.recommended_action, "run_now");
});

test("production voice activation, deploys, and live data changes obey protected windows", () => {
  const voice = evaluateTaskSchedule(handoff({ task_id: "voice-1", task_type: "production_voice_activation", current_owner: "jonathan_operator", execution_mode: "production_gated", approval_requirement: ["jonathan_operator_approval"] }), { now: "2026-06-12T14:00:00.000Z", approvals: { "voice-1": true } });
  assert.equal(voice.can_run_now, false);
  assert.equal(voice.hold_reason, "outside_production_voice_activation_window");

  const deploy = evaluateTaskSchedule(handoff({ task_id: "deploy-1", task_type: "deployment", current_owner: "vercel_deploy_rail", execution_mode: "production_gated" }), { now: "2026-06-12T20:00:00.000Z", approvals: { "deploy-1": true } });
  assert.equal(deploy.recommended_action, "hold_until_window");
  assert.equal(deploy.hold_reason, "outside_deploy_window");

  const data = evaluateTaskSchedule(handoff({ task_id: "data-1", task_type: "database_schema_work", current_owner: "supabase_data_rail", execution_mode: "production_gated" }), { now: "2026-06-12T20:00:00.000Z", approvals: { "data-1": true } });
  assert.equal(data.can_run_now, false);
  assert.equal(data.hold_reason, "outside_data_change_window");
});

test("coding tasks are allowed anytime but production-impacting coding remains approval gated", () => {
  const code = evaluateTaskSchedule(handoff({ task_id: "code-1", task_type: "code_changes", current_owner: "codex", execution_mode: "sandbox" }), { now: SATURDAY });
  assert.equal(code.can_run_now, true);

  const prodCode = evaluateTaskSchedule(handoff({ task_id: "code-prod", task_type: "code_changes", current_owner: "codex", execution_mode: "production_gated", approval_requirement: ["production_deploy_or_flag_change"] }), { now: SATURDAY });
  assert.equal(prodCode.can_run_now, false);
  assert.equal(prodCode.recommended_action, "request_approval");
});

test("manual resource status drives fallback decisions without scraping private billing", () => {
  const ledger = buildTaskOwnershipLedger({
    now: INSIDE_EMAIL,
    tasks: [{ task_id: "code-exhausted", task_type: "code_changes", source: "code", created_at: INSIDE_EMAIL, required_evidence: ["tests_run"], evidence_path: "test output" }],
    resources: { codex: { status: "exhausted", reason: "manual_credit_status", resets_at: "2026-06-13T13:00:00.000Z" }, claude_code: { status: "available" } },
  });
  const state = buildResourceAvailabilityState({
    now: INSIDE_EMAIL,
    taskOwnershipLedger: ledger,
    resources: { codex: { status: "exhausted", reason: "manual_credit_status", resets_at: "2026-06-13T13:00:00.000Z" }, claude_code: { status: "available" } },
  });
  assert.equal(state.resources.codex.status, "exhausted");
  assert.equal(ledger.active_handoffs[0].current_owner, "claude_code");
  assert.equal(state.safety.no_private_billing_scrape, true);

  const cowork = evaluateTaskSchedule(handoff({ task_id: "cowork-off", task_type: "browser_manual_research", current_owner: "cowork", fallback_owner: "hermes" }), {
    now: INSIDE_EMAIL,
    resources: { cowork: { status: "exhausted", reason: "manual_credit_status" }, hermes: { status: "available" } },
  });
  assert.equal(cowork.can_run_now, false);
  assert.equal(cowork.recommended_action, "fallback_to_other_agent");
});

test("missing approval and missing evidence path block execution", () => {
  const missingApproval = evaluateTaskSchedule(handoff({ task_id: "approval-missing", execution_mode: "production_gated", approval_requirement: ["operator_approval"] }), { now: INSIDE_EMAIL });
  assert.equal(missingApproval.can_run_now, false);
  assert.equal(missingApproval.recommended_action, "request_approval");

  const missingEvidence = evaluateTaskSchedule(handoff({ task_id: "evidence-missing", evidence_requirement: [] }), { now: INSIDE_EMAIL });
  assert.equal(missingEvidence.can_run_now, false);
  assert.equal(missingEvidence.recommended_action, "queue_only");
  assert.equal(missingEvidence.hold_reason, "missing_evidence_path");
});

test("scheduling state summarizes held, executable, blocked resources, and next actions", () => {
  const ledger = {
    active_handoffs: [
      handoff({ task_id: "email-held" }),
      handoff({ task_id: "research-run", task_type: "browser_manual_research", current_owner: "cowork", execution_mode: "sandbox" }),
    ],
    conflict_locks: [],
  };
  const state = buildSchedulingWindowState({ now: OUTSIDE_EMAIL, taskOwnershipLedger: ledger });
  assert.equal(state.summary.held_tasks, 1);
  assert.equal(state.summary.executable_tasks, 1);
  assert.equal(state.held_tasks[0].recommended_action, "hold_until_window");
  assert.equal(state.next_operator_action, "wait_for_next_eligible_scheduling_window");
  assert.equal(nextEligibleWindowTime("deployment", "2026-06-12T20:00:00.000Z"), "2026-06-15T13:00:00.000Z");
});

test("latest.json and read adapter expose resourceAvailabilityState and schedulingWindowState", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "phase8c-scheduling-"));
  const result = await runRevenueDailyLoop({
    outputDir: dir,
    persistSupabase: false,
    now: OUTSIDE_EMAIL,
    commandTasks: [
      { task_id: "phase8c-email", task_type: "email_queue_execution", assigned_agent: "email_rail", source: "revenue", required_evidence: ["policy_receipt"], evidence_path: "queue://phase8c-email", created_at: OUTSIDE_EMAIL },
    ],
    commandResources: { email_rail: { status: "available" } },
    commandApprovals: { "phase8c-email": true },
  });

  const latest = JSON.parse(readFileSync(result.latestPath, "utf8"));
  assert.equal(latest.resourceAvailabilityState.resources.email_rail.status, "available");
  assert.equal(latest.schedulingWindowState.summary.held_tasks >= 1, true);
  assert.equal(latest.schedulingWindowState.held_tasks.some((item) => item.task_id === "phase8c-email"), true);

  const readState = await readAutonomousRevenueState({ dataDir: dir, useSupabaseFallback: false });
  assert.equal(readState.resourceAvailabilityState.resources.email_rail.status, "available");
  assert.equal(readState.schedulingWindowState.summary.held_tasks >= 1, true);
});
