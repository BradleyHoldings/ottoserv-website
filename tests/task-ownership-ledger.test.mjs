import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import { readAutonomousRevenueState } from "../src/lib/revenueEngineReadAdapter.mjs";
import {
  acceptHandoff,
  attachHandoffEvidence,
  buildTaskOwnershipLedger,
  completeHandoff,
  createTaskOwnershipStore,
  markBlocked,
  markStaleHandoffs,
} from "../src/lib/taskOwnershipLedger.mjs";

const NOW = "2026-06-12T15:00:00.000Z";
const OLD = "2026-06-08T15:00:00.000Z";

function revenueAction(overrides = {}) {
  return {
    action_id: "phase7b-2026-06-12-lead-1-approved-email-queued-ai-receptionist",
    lead_id: "lead-1",
    client: "Acme Plumbing",
    next_action: "approved_email_queued",
    status: "queued",
    risk_level: "low",
    offer_match: { service_key: "ai_receptionist" },
    evidence_source_reference: "public_source_url:https://example.com/acme",
    created_at: NOW,
    updated_at: NOW,
    raw_action: { email: { intent: { execution_id: "email-1" } } },
    ...overrides,
  };
}

function serviceWorkOrder(overrides = {}) {
  return {
    id: "WO-8B-001",
    title: "Configure AI receptionist test packet",
    client: "Acme Plumbing",
    service_key: "ai_receptionist",
    risk_level: "medium",
    status: "queue_ready",
    createdAt: NOW,
    implementation: {
      assignment: { assignee: "Codex", fallback: "Claude Code", requires_approval: false },
      testing_checklist: ["test_call_evidence", "ticket_event"],
    },
    ...overrides,
  };
}

test("creates handoffs from revenue queue actions and service-delivery work orders", () => {
  const ledger = buildTaskOwnershipLedger({
    now: NOW,
    durableRevenueExecutionQueue: { items: [revenueAction()] },
    serviceDeliveryExecution: { workOrders: [serviceWorkOrder()] },
  });

  assert.equal(ledger.summary.total_handoffs, 2);
  const revenue = ledger.active_handoffs.find((item) => item.source_system === "revenue");
  assert.equal(revenue.current_owner, "email_rail");
  assert.equal(revenue.source_record_id, "phase7b-2026-06-12-lead-1-approved-email-queued-ai-receptionist");
  assert.equal(revenue.execution_mode, "controlled_real");

  const service = ledger.active_handoffs.find((item) => item.source_system === "service_delivery");
  assert.equal(service.current_owner, "hermes");
  assert.equal(service.lock_conflict_key, "service_delivery:WO-8B-001");
  assert.ok(service.evidence_requirement.includes("ticket_event"));
});

test("routes owner using Phase 8A matrix and falls back when owner is exhausted", () => {
  const ledger = buildTaskOwnershipLedger({
    now: NOW,
    tasks: [{ task_id: "code-8b", task_type: "code_changes", source: "code", file_paths: ["src/lib/a.mjs"], created_at: NOW }],
    resources: { codex: { status: "exhausted", reason: "credit_cap" } },
  });

  const handoff = ledger.active_handoffs[0];
  assert.equal(handoff.current_owner, "claude_code");
  assert.equal(handoff.fallback_owner, "jonathan_operator");
  assert.equal(ledger.fallback_required[0].task_id, "code-8b");
});

test("prevents duplicate active owners for the same conflict key", () => {
  const store = createTaskOwnershipStore();
  const first = buildTaskOwnershipLedger({
    now: NOW,
    store,
    tasks: [{ task_id: "a", task_type: "code_changes", assigned_agent: "codex", file_paths: ["src/lib/shared.mjs"], created_at: NOW }],
  });
  const second = buildTaskOwnershipLedger({
    now: NOW,
    store: first.store,
    tasks: [{ task_id: "b", task_type: "code_changes", assigned_agent: "claude_code", file_paths: ["src/lib/shared.mjs"], created_at: NOW }],
  });

  assert.equal(second.summary.total_handoffs, 1);
  assert.equal(second.conflict_locks.length, 1);
  assert.equal(second.conflict_locks[0].type, "active_lock_conflict");
});

test("approval-required task cannot execute directly and escalates to operator", () => {
  const ledger = buildTaskOwnershipLedger({
    now: NOW,
    tasks: [{ task_id: "prod-voice", task_type: "production_voice_activation", risk_level: "high", approval_required: true, created_at: NOW }],
  });

  const handoff = ledger.active_handoffs[0];
  assert.equal(handoff.status, "approval_required");
  assert.equal(handoff.current_owner, "jonathan_operator");
  assert.equal(handoff.execution_mode, "production_gated");
  assert.equal(ledger.escalations_required[0].escalation_owner, "jonathan_operator");
});

test("handoff lifecycle preserves history and completion requires evidence", () => {
  const store = createTaskOwnershipStore();
  const ledger = buildTaskOwnershipLedger({
    now: NOW,
    store,
    tasks: [{ task_id: "rev-1", task_type: "revenue_queue_task", source: "revenue", required_evidence: ["policy_receipt"], evidence_path: "source:lead", created_at: NOW }],
  });

  const accepted = acceptHandoff(ledger.store, "rev-1", { actor: "hermes", now: "2026-06-12T15:05:00.000Z" });
  assert.equal(accepted.handoff.status, "accepted");

  const blocked = markBlocked(accepted.store, "rev-1", "waiting_on_copy_review", { actor: "hermes", now: "2026-06-12T15:10:00.000Z" });
  assert.equal(blocked.handoff.status, "blocked");

  const refused = completeHandoff(blocked.store, "rev-1", {}, { actor: "hermes", now: "2026-06-12T15:15:00.000Z" });
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, "completion_requires_evidence");

  const withEvidence = attachHandoffEvidence(blocked.store, "rev-1", {
    evidence_reference: "queue://rev-1/evidence",
    evidence_summary: "Policy receipt and queue evidence accepted.",
    evidence_type: "policy_receipt",
  }, { actor: "hermes", now: "2026-06-12T15:20:00.000Z" });
  const completed = completeHandoff(withEvidence.store, "rev-1", {}, { actor: "hermes", now: "2026-06-12T15:25:00.000Z" });

  assert.equal(completed.ok, true);
  assert.equal(completed.handoff.status, "completed_with_evidence");
  assert.equal(completed.handoff.handoff_history.map((event) => event.event_type).join(","), "created,accepted,blocked,evidence_attached,completed_with_evidence");
});

test("stale task detection marks fallback and next operator action", () => {
  const ledger = buildTaskOwnershipLedger({
    now: NOW,
    tasks: [{ task_id: "old-cowork", task_type: "browser_manual_research", assigned_agent: "cowork", status: "assigned", created_at: OLD, last_updated_at: OLD, required_evidence: ["source_url"], evidence_path: "research notes" }],
    resources: { cowork: { status: "blocked", reason: "manual_worker_unavailable" } },
  });
  const stale = markStaleHandoffs(ledger.store, { now: NOW });

  assert.equal(stale.summary.stale_handoffs, 1);
  assert.equal(stale.stale_handoffs[0].status, "fallback_required");
  assert.equal(stale.next_operator_action, "route_fallback_or_escalate_stale_handoffs");
});

test("latest.json and read adapter expose taskOwnershipLedger", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "phase8b-ledger-"));
  const result = await runRevenueDailyLoop({
    outputDir: dir,
    persistSupabase: false,
    now: NOW,
    commandTasks: [
      { task_id: "phase8b-command", task_type: "code_changes", source: "code", file_paths: ["src/lib/taskOwnershipLedger.mjs"], required_evidence: ["tests_run"], evidence_path: "test output", created_at: NOW },
    ],
    commandResources: { codex: { status: "available" } },
  });

  const latest = JSON.parse(readFileSync(result.latestPath, "utf8"));
  assert.equal(latest.taskOwnershipLedger.summary.total_handoffs >= 1, true);
  assert.equal(latest.taskOwnershipLedger.active_handoffs.some((item) => item.task_id === "phase8b-command"), true);

  const readState = await readAutonomousRevenueState({ dataDir: dir, useSupabaseFallback: false });
  assert.equal(readState.taskOwnershipLedger.summary.total_handoffs >= 1, true);
});
