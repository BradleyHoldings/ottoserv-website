import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildHermesTenPhaseGapClosureSprint,
  GAP_PRIORITY_ORDER,
  HERMES_TEN_PHASES,
} from "../src/lib/hermesTenPhaseGapClosure.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import { readAutonomousRevenueState } from "../src/lib/revenueEngineReadAdapter.mjs";

const NOW = "2026-06-14T15:00:00.000Z";

const REPO_EVIDENCE = {
  modules: [
    "src/lib/leadRail/pipeline.mjs",
    "src/lib/processScans.ts",
    "src/lib/hermesCommandCenter.ts",
    "src/lib/commercialRail/onboarding.mjs",
    "src/lib/serviceDeliverySpine.mjs",
    "src/lib/approvalExecutionBridge.mjs",
    "src/lib/multiAgentCommandState.mjs",
    "src/lib/dailyAutonomousOperatingCycle.mjs",
    "src/lib/autonomyGraduationFramework.mjs",
    "src/lib/autonomyGraduationReviewWorkflow.mjs",
  ],
  tests: [
    "tests/lead-rail.test.mjs",
    "tests/process-scan-diagnostics.test.mjs",
    "tests/command-center.test.mjs",
    "tests/commercial-rail-phase5.test.mjs",
    "tests/service-delivery-phase6-complete.test.mjs",
    "tests/approval-execution-bridge.test.mjs",
    "tests/multi-agent-command-state.test.mjs",
    "tests/daily-autonomous-operating-cycle.test.mjs",
    "tests/autonomy-graduation-framework.test.mjs",
    "tests/autonomy-graduation-review-workflow.test.mjs",
  ],
  dashboards: [
    "src/app/os/hermes/page.tsx",
    "src/app/os/hermes/service-delivery/page.tsx",
    "src/app/os/hermes/revenue/page.tsx",
    "src/app/os/hermes/approvals/page.tsx",
    "src/app/os/hermes/evidence/page.tsx",
  ],
};

function runtimeEvidence() {
  return {
    publicLeadDiscovery: { summary: { discovered_count: 2, accepted_count: 1, cowork_packets_created: 1 } },
    leadSupplyDailyLoop: { summary: { actions_selected: 3, emails_queued: 1, repairs_created: 1 } },
    durableRevenueExecutionQueue: { summary: { queued: 1, held: 1, blocked: 0 }, items: [{ action_id: "email-1" }] },
    controlledEmailExecution: { summary: { prepared: 1, held: 1, blocked: 0 } },
    serviceDeliveryExecution: {
      summary: {
        records_seen: 2,
        opportunities: { total: 3, persisted: 3 },
        work_orders: { total: 3, persisted: 3 },
        approvals: { pending: 1 },
        execution_packets: { queue_ready: 1 },
        delivery_packages: { total: 2, recoverable: 2 },
      },
      dashboard_export: { active_service_requests: [{}], blocked_items: [{}], next_actions: [{}] },
      voice_service_status: { summary: { total: 1, approval_needed: 1, active: 0 } },
    },
    approvalExecutionQueue: { count: 1, skipped_not_approved: 1 },
    multiAgentCommandState: { summary: { total_tasks: 4, routable: 3, blocked: 1 } },
    taskOwnershipLedger: { summary: { active_handoffs: 4, stale_handoffs: 1, blocked_handoffs: 1 } },
    dailyAutonomousOperatingCycle: {
      report_summary: { executed_safe: 1, queued: 1, held_until_window: 1, approval_required: 1, repair_required: 1, blocked: 1 },
      latest_json_read_model: { dailyAutonomousOperatingCycle: true },
    },
    autonomyGraduationState: { summary: { actions_evaluated: 2, graduation_allowed: 1, graduation_blocked: 1 } },
    autonomyGraduationReviewState: { summary: { pending_requests: 1, approved_bounded_autonomy: 1 } },
  };
}

test("ten-phase gap closure sprint report audits every phase with evidence and prioritized gaps", () => {
  const report = buildHermesTenPhaseGapClosureSprint({
    now: NOW,
    repoEvidence: REPO_EVIDENCE,
    runtimeState: runtimeEvidence(),
  });

  assert.equal(report.version, "hermes_10_phase_gap_closure_sprint_v1");
  assert.deepEqual(HERMES_TEN_PHASES.map((phase) => phase.phase), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(GAP_PRIORITY_ORDER.map((item) => item.key), ["A", "B", "C", "D", "E", "F", "G"]);

  assert.equal(report.phase_acceptance_table.length, 10);
  for (const row of report.phase_acceptance_table) {
    assert.ok(row.phase >= 1 && row.phase <= 10);
    assert.ok(row.name);
    assert.ok(["complete", "partial", "blocked"].includes(row.status_after));
    assert.ok(["production-ready", "controlled-production-ready", "not-production-ready"].includes(row.production_readiness));
    assert.ok(Array.isArray(row.existing_modules_files_routes_tests));
    assert.ok(Array.isArray(row.gaps_found));
    assert.ok(Array.isArray(row.evidence_tests));
    assert.ok(row.next_action);
  }

  const phase6 = report.phase_acceptance_table.find((row) => row.phase === 6);
  assert.equal(phase6.status_after, "complete");
  assert.equal(phase6.production_readiness, "controlled-production-ready");
  assert.ok(phase6.evidence_tests.includes("tests/service-delivery-phase6-complete.test.mjs"));

  const phase10 = report.phase_acceptance_table.find((row) => row.phase === 10);
  assert.ok(phase10.gaps_found.some((gap) => /operator review|bounded autonomy|graduation/i.test(gap)));

  assert.ok(report.gap_matrix.length >= 1);
  for (const gap of report.gap_matrix) {
    assert.ok(gap.phase >= 1 && gap.phase <= 10);
    assert.ok(["critical", "high", "medium", "low"].includes(gap.severity));
    assert.ok(gap.priority_bucket);
    assert.ok(gap.business_impact);
    assert.ok(gap.technical_impact);
    assert.ok(gap.proposed_fix);
    assert.ok(gap.acceptance_criteria.length >= 1);
    assert.equal(typeof gap.safe_to_fix_now, "boolean");
  }

  assert.ok(report.blocked_real_world_actions.some((item) => /Retell|Telnyx|n8n|Stripe|client-facing/i.test(item.action)));
  assert.equal(report.safety.no_live_retell_telnyx_n8n_stripe_or_client_facing_actions, true);
  assert.equal(report.final_recommendation.ready_for_controlled_production_operation, false);
});

test("revenue daily loop writes and read adapter exposes the ten-phase sprint report", async () => {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "hermes-ten-phase-"));
  const result = await runRevenueDailyLoop({
    outputDir,
    persistSupabase: false,
    now: NOW,
  });

  const latest = JSON.parse(readFileSync(result.latestPath, "utf8"));
  assert.ok(latest.hermesTenPhaseGapClosureSprint);
  assert.equal(latest.hermesTenPhaseGapClosureSprint.phase_acceptance_table.length, 10);
  assert.ok(
    latest.hermesTenPhaseGapClosureSprint.phase_acceptance_table
      .find((row) => row.phase === 6)
      .evidence_tests.includes("tests/service-delivery-phase6-complete.test.mjs"),
  );
  assert.equal(result.summary.hermes_10_phase_gap_closure.status, "partial");

  const readState = await readAutonomousRevenueState({ dataDir: outputDir });
  assert.ok(readState.hermesTenPhaseGapClosureSprint);
  assert.equal(readState.hermesTenPhaseGapClosureSprint.summary.phases_audited, 10);
});
