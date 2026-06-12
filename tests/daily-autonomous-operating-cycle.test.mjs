import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildDailyAutonomousOperatingCycle } from "../src/lib/dailyAutonomousOperatingCycle.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import { readAutonomousRevenueState } from "../src/lib/revenueEngineReadAdapter.mjs";

const OUTSIDE_EMAIL = "2026-06-12T21:00:00.000Z"; // Friday 5:00 PM New York
const OLD = "2026-06-08T12:00:00.000Z";

function commandTasks() {
  return [
    {
      task_id: "safe-research",
      source: "publicLeadDiscovery",
      task_type: "lead_research_enrichment",
      assigned_agent: "cowork",
      status: "queued",
      required_evidence: ["public source URL"],
      evidence_path: "queue://safe-research",
      created_at: OUTSIDE_EMAIL,
    },
    {
      task_id: "email-held",
      source: "durableRevenueExecutionQueue",
      task_type: "email_queue_execution",
      assigned_agent: "email_rail",
      status: "queued",
      required_evidence: ["policy_receipt"],
      evidence_path: "queue://email-held",
      created_at: OUTSIDE_EMAIL,
    },
    {
      task_id: "approval-needed",
      source: "serviceDeliveryExecution",
      task_type: "service_delivery_work_order",
      assigned_agent: "jonathan_operator",
      status: "approval_required",
      approval_required: true,
      required_evidence: ["approval receipt"],
      evidence_path: "approval://approval-needed",
      created_at: OUTSIDE_EMAIL,
    },
    {
      task_id: "stale-code",
      source: "repair",
      task_type: "code_changes",
      assigned_agent: "codex",
      status: "assigned",
      required_evidence: ["tests run"],
      evidence_path: "queue://stale-code",
      stale_threshold_hours: 24,
      created_at: OLD,
      updated_at: OLD,
    },
  ];
}

function state() {
  return {
    leadSupplyDailyLoop: {
      summary: { actions_selected: 2, emails_queued: 1, approval_cards_created: 1, repairs_created: 1 },
      approval_cards: [{ id: "lead-approval", status: "approval_needed" }],
      cowork_packets: [{ packet_id: "cowork-1" }],
      repairs_created: [{ id: "lead-repair", failure_class: "missing_lead_enrichment" }],
      safety: { no_live_email_sent: true, no_live_call_placed: true },
    },
    publicLeadDiscovery: {
      summary: { discovered_count: 2, accepted_count: 1, cowork_packets_created: 1 },
      cowork_packets: [{ packet_id: "public-cowork-1" }],
      safety: { no_live_email_sent: true, no_live_call_placed: true },
    },
    durableRevenueExecutionQueue: {
      summary: { queued: 1, held: 0 },
      items: [{ action_id: "email-held", status: "queued" }],
    },
    controlledEmailExecution: {
      summary: { prepared: 0, held: 1, blocked: 0 },
    },
    serviceDeliveryExecution: {
      summary: {
        records_seen: 1,
        work_orders: { total: 1, persisted: 1 },
        approvals: { pending: 1 },
        execution_packets: { queue_ready: 1 },
      },
      approval_cards: [{ id: "service-approval", status: "pending" }],
      execution_packets: [],
      workOrders: [{ id: "WO-1", status: "queue_ready", updatedAt: OLD }],
    },
  };
}

test("daily cycle runs major components in order and classifies safe posture buckets", () => {
  const cycle = buildDailyAutonomousOperatingCycle({
    now: OUTSIDE_EMAIL,
    mode: "queue_only",
    state: state(),
    commandTasks: commandTasks(),
    resources: { codex: { status: "exhausted", reason: "manual_credit_status" }, claude_code: { status: "blocked" } },
    approvals: { "email-held": true },
  });

  assert.deepEqual(cycle.cycle_order, [
    "collect_current_state",
    "run_public_lead_discovery_where_safe",
    "run_lead_supply_daily_loop",
    "update_durable_revenue_queue",
    "evaluate_service_delivery_work",
    "evaluate_task_ownership_ledger",
    "evaluate_resource_availability_and_scheduling_windows",
    "evaluate_dispatch_decisions",
    "identify_safe_actions_that_can_run_now",
    "identify_held_actions_and_next_eligible_times",
    "identify_approval_needed_actions",
    "identify_stale_failed_blocked_tasks",
    "create_repair_recommendations",
    "create_delegation_packets_where_safe",
    "compile_daily_evidence_report",
    "produce_next_operator_action",
  ]);
  assert.equal(cycle.mode, "queue_only");
  assert.ok(cycle.executed_safe.some((item) => item.task_id === "safe-research"));
  assert.ok(cycle.held_actions.some((item) => item.task_id === "email-held"));
  assert.ok(cycle.approval_needed_actions.some((item) => item.task_id === "approval-needed"));
  assert.ok(cycle.blocked_actions.some((item) => /stale-code/.test(item.task_id)));
  assert.ok(cycle.repair_recommendations.some((item) => item.reason === "blocked_or_exhausted_resource"));
  assert.ok(cycle.repair_recommendations.some((item) => item.reason === "stale_task"));
  assert.equal(cycle.safety_confirmations.no_live_email_sent, true);
  assert.equal(cycle.safety_confirmations.no_stripe_n8n_browser_or_deploy_triggered, true);
});

test("approval-required and outside-window outreach are never executed by Phase 9A", () => {
  const cycle = buildDailyAutonomousOperatingCycle({
    now: OUTSIDE_EMAIL,
    state: state(),
    commandTasks: commandTasks(),
    approvals: { "email-held": true },
  });

  assert.equal(cycle.executed_safe.some((item) => item.task_id === "email-held"), false);
  assert.equal(cycle.executed_safe.some((item) => item.task_id === "approval-needed"), false);
  assert.ok(cycle.action_posture.held_until_window.some((item) => item.task_id === "email-held"));
  assert.ok(cycle.action_posture.approval_required.some((item) => item.task_id === "approval-needed"));
});

test("runner writes dailyAutonomousOperatingCycle to latest.json and read adapter exposes it", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "phase9a-cycle-"));
  const result = await runRevenueDailyLoop({
    outputDir: dir,
    persistSupabase: false,
    now: OUTSIDE_EMAIL,
    commandTasks: commandTasks(),
    commandResources: { codex: { status: "blocked", reason: "manual_resource_status" } },
    commandApprovals: {},
  });

  const latest = JSON.parse(readFileSync(result.latestPath, "utf8"));
  assert.ok(latest.dailyAutonomousOperatingCycle);
  assert.ok(latest.dailyAutonomousOperatingCycle.report_summary);
  assert.equal(latest.dailyAutonomousOperatingCycle.safety_confirmations.no_live_calls_placed, true);

  const readState = await readAutonomousRevenueState({ dataDir: dir });
  assert.ok(readState.dailyAutonomousOperatingCycle);
  assert.equal(readState.dailyAutonomousOperatingCycle.mode, "queue_only");
});
