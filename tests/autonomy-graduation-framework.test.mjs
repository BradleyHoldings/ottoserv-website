import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ACTION_RISK_LEVELS,
  AUTONOMY_LEVELS,
  buildAutonomyGraduationState,
  classifyActionRisk,
  evaluateAutonomyGraduation,
  getCapabilityAuthorityMapping,
} from "../src/lib/autonomyGraduationFramework.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import { readAutonomousRevenueState } from "../src/lib/revenueEngineReadAdapter.mjs";

const NOW = "2026-06-12T14:00:00.000Z";

function action(overrides = {}) {
  return {
    action_id: "approved-email-1",
    category: "controlled_email_execution",
    requested_autonomy_level: "L2",
    current_autonomy_level: "L1",
    risk_level: "medium",
    controlled_real_acceptance_evidence: "evidence://phase9b/email/acceptance",
    sandbox_tests_passed: true,
    idempotency_protection: true,
    duplicate_prevention: true,
    rollback_or_fail_closed: true,
    monitoring: true,
    evidence_requirements: ["policy_receipt", "message_id"],
    caps_limits: { per_run: 3, window: "business_hours" },
    owner_approval: true,
    unresolved_safety_incidents: [],
    ...overrides,
  };
}

test("autonomy levels define allowed and blocked actions, approvals, evidence, limits, rollback, monitoring, and escalation", () => {
  assert.deepEqual(Object.keys(AUTONOMY_LEVELS), ["L0", "L1", "L2", "L3", "L4", "L5"]);
  assert.equal(AUTONOMY_LEVELS.L0.id, "advisory_only");
  assert.ok(AUTONOMY_LEVELS.L3.allowed_actions.includes("controlled real execution within caps"));
  for (const level of Object.values(AUTONOMY_LEVELS)) {
    assert.ok(level.allowed_actions.length >= 1, `${level.level} allowed`);
    assert.ok(level.blocked_actions.length >= 1, `${level.level} blocked`);
    assert.ok(level.required_evidence.length >= 1, `${level.level} evidence`);
    assert.ok(level.caps_limits.length >= 1, `${level.level} caps`);
    assert.ok(level.rollback_requirements.length >= 1, `${level.level} rollback`);
    assert.ok(level.monitoring_requirements.length >= 1, `${level.level} monitoring`);
    assert.ok(level.escalation_rules.length >= 1, `${level.level} escalation`);
  }
});

test("action-risk classifier covers low, medium, high, and critical examples", () => {
  assert.deepEqual(ACTION_RISK_LEVELS, ["low", "medium", "high", "critical"]);
  assert.equal(classifyActionRisk({ action: "read report state" }).risk_level, "low");
  assert.equal(classifyActionRisk({ action: "send approved email within cap window" }).risk_level, "medium");
  assert.equal(classifyActionRisk({ action: "place live call" }).risk_level, "high");
  assert.equal(classifyActionRisk({ action: "charge money" }).risk_level, "critical");
});

test("graduation requires controlled-real evidence, idempotency, duplicate prevention, rollback, monitoring, caps, and approval", () => {
  const approved = evaluateAutonomyGraduation(action());
  assert.equal(approved.allowed_to_graduate, true);
  assert.equal(approved.next_autonomy_level, "L2");

  const blocked = evaluateAutonomyGraduation(action({
    action_id: "launch-no-evidence",
    category: "production_voice_activation",
    requested_autonomy_level: "L4",
    risk_level: "high",
    controlled_real_acceptance_evidence: "",
    rollback_or_fail_closed: false,
  }));
  assert.equal(blocked.allowed_to_graduate, false);
  assert.ok(blocked.blocked_reasons.includes("missing_controlled_real_acceptance_evidence"));
  assert.ok(blocked.blocked_reasons.includes("missing_rollback_or_fail_closed_behavior"));
  assert.ok(blocked.required_before_graduation.includes("controlled_real_acceptance_evidence"));
});

test("critical actions always require explicit Jonathan/operator approval", () => {
  const result = evaluateAutonomyGraduation(action({
    action_id: "charge-card",
    category: "payment_charge",
    requested_autonomy_level: "L5",
    risk_level: "critical",
    owner_approval: true,
    jonathan_operator_approval: false,
  }));

  assert.equal(result.allowed_to_graduate, false);
  assert.equal(result.approval_requirement, "explicit_jonathan_operator_approval");
  assert.ok(result.blocked_reasons.includes("critical_requires_explicit_jonathan_operator_approval"));
});

test("capability authority mapping limits active resources and keeps planned agents plus Jarvis non-routable", () => {
  const mapping = getCapabilityAuthorityMapping();

  assert.equal(mapping.hermes.max_autonomy_level, "L2");
  assert.equal(mapping.email_rail.allowed_risk_level, "medium");
  assert.ok(mapping.retell_call_rail.forbidden_actions.includes("production voice launch"));
  assert.equal(mapping.jarvis.routable, false);
  assert.equal(mapping.jarvis.authority_source, "reserved_alias_for_hermes");
  for (const key of ["nova", "dash", "atlas", "sentinel"]) {
    assert.equal(mapping[key].routable, false);
    assert.equal(mapping[key].max_autonomy_level, "L0");
  }
});

test("state report exposes blocked graduation items, incidents, requirements, security guardrails, and next operator action", () => {
  const state = buildAutonomyGraduationState({
    now: NOW,
    actionCandidates: [
      action(),
      action({
        action_id: "prod-route-change",
        category: "routing_change",
        requested_autonomy_level: "L4",
        risk_level: "high",
        owner_approval: false,
        controlled_real_acceptance_evidence: "",
        unresolved_safety_incidents: ["missing_acceptance_run"],
      }),
    ],
  });

  assert.equal(state.summary.actions_evaluated, 2);
  assert.equal(state.summary.graduation_allowed, 1);
  assert.equal(state.blocked_graduation_items.length, 1);
  assert.equal(state.security_guardrails.no_secrets_in_logs_or_reports, true);
  assert.equal(state.security_guardrails.fail_closed_when_flags_disabled, true);
  assert.ok(state.safety_incidents.some((item) => item.incident === "missing_acceptance_run"));
  assert.equal(state.next_operator_action, "review_blocked_autonomy_graduation_items");
});

test("latest.json and read adapter expose autonomyGraduationState without raising live autonomy", async () => {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "phase10a-autonomy-"));
  const result = await runRevenueDailyLoop({
    outputDir,
    persistSupabase: false,
    now: NOW,
    commandTasks: [
      {
        task_id: "phase10a-controlled-email",
        task_type: "controlled_email_execution",
        risk_level: "medium",
        status: "queued",
        required_evidence: ["policy_receipt", "message_id"],
        evidence_path: "evidence://phase9b/email/acceptance",
        created_at: NOW,
      },
    ],
    autonomyGraduationActions: [action()],
  });

  const latest = JSON.parse(readFileSync(result.latestPath, "utf8"));
  assert.ok(latest.autonomyGraduationState);
  assert.equal(latest.autonomyGraduationState.safety.no_live_execution_expanded, true);
  assert.equal(latest.autonomyGraduationState.authority_mapping.jarvis.routable, false);

  const readState = await readAutonomousRevenueState({ dataDir: outputDir });
  assert.ok(readState.autonomyGraduationState);
  assert.equal(readState.autonomyGraduationState.summary.graduation_allowed, 1);
  assert.equal(result.summary.autonomy_graduation_state.graduation_allowed, 1);
});
