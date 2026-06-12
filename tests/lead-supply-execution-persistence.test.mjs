import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runLeadSupplyDailyLoop } from "../src/lib/leadSupplyDailyLoop.mjs";
import {
  completeRevenueExecutionAction,
  createMemoryRevenueExecutionStore,
  persistLeadSupplyExecution,
  readDurableRevenueExecutionQueue,
} from "../src/lib/leadSupplyExecutionPersistence.mjs";
import { readAutonomousRevenueState } from "../src/lib/revenueEngineReadAdapter.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";

const NOW = "2026-06-12T18:00:00.000Z";

function lead(overrides = {}) {
  return {
    lead_id: "lead-alpha",
    company_name: "Alpha Plumbing",
    contact_name: "Alex Owner",
    website: "https://alphaplumbing.example",
    email: "alex@alphaplumbing.example",
    normalized_phone: "+14075550123",
    phone_verified: true,
    industry: "plumbing",
    niche: "plumbing",
    source_type: "manual_imported_leads",
    source_evidence: "Operator imported lead with public website evidence.",
    pain_notes: "Reviews mention no answer and no callback.",
    score: 82,
    tier: "A-tier",
    eligibility: "email_eligible",
    record_status: "accepted",
    pipeline_stage: "contact_ready",
    version: 1,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function reportFor(records, options = {}) {
  return runLeadSupplyDailyLoop({
    sources: [{ source_type: "manual_imported_leads", records }],
    now: NOW,
    approvals: { approvalPresent: true, approvedSenders: ["ottoserv.com"], localHour: 14, ...options.approvals },
    doNotContact: options.doNotContact,
    existingTasks: options.existingTasks,
    failures: options.failures,
  });
}

test("durable selected lead, readiness, buying stage, offer match, and next action are written", async () => {
  const store = createMemoryRevenueExecutionStore();
  const report = reportFor([lead({ tier: "B-tier", normalized_phone: "", phone_verified: false })]);

  const persisted = await persistLeadSupplyExecution(report, { store, now: NOW });
  const queue = readDurableRevenueExecutionQueue({ store });
  const item = queue.items[0];

  assert.equal(persisted.summary.selected_leads.persisted, 1);
  assert.equal(item.lead.company_name, "Alpha Plumbing");
  assert.equal(item.readiness_state, "pain_signal_detected");
  assert.equal(item.buying_stage, "problem_aware");
  assert.equal(item.icp_fit, "qualified_fit");
  assert.equal(item.offer_match.service_key, "missed_call_recovery");
  assert.equal(item.next_action, "approved_cold_email");
  assert.equal(item.status, "queued");
});

test("rerunning persistence is idempotent and does not recreate actions", async () => {
  const store = createMemoryRevenueExecutionStore();
  const report = reportFor([lead({ tier: "B-tier", normalized_phone: "", phone_verified: false })]);

  await persistLeadSupplyExecution(report, { store, now: NOW });
  await persistLeadSupplyExecution(report, { store, now: NOW });
  const queue = readDurableRevenueExecutionQueue({ store });

  assert.equal(queue.summary.total_actions, 1);
  assert.equal(queue.summary.email_intents, 1);
});

test("duplicate outreach and do-not-contact decisions are durable", async () => {
  const store = createMemoryRevenueExecutionStore();
  const duplicateReport = reportFor([
    lead({ lead_id: "a" }),
    lead({ lead_id: "b", email: "alex@alphaplumbing.example" }),
  ]);
  const dncReport = reportFor([lead({ lead_id: "dnc" })], { doNotContact: ["alphaplumbing.example"] });

  await persistLeadSupplyExecution(duplicateReport, { store, now: NOW });
  await persistLeadSupplyExecution(dncReport, { store, now: NOW });
  const queue = readDurableRevenueExecutionQueue({ store });

  assert.equal(queue.contact_safety.duplicate_conflicts.length, 1);
  assert.equal(queue.contact_safety.do_not_contact_skipped, 1);
  assert.equal(queue.summary.blocked_actions >= 1, true);
});

test("email and call intents are persisted into canonical-shaped execution rails", async () => {
  const store = createMemoryRevenueExecutionStore();
  const emailReport = reportFor([lead({ lead_id: "email-lead", tier: "B-tier", normalized_phone: "", phone_verified: false })]);
  const callReport = reportFor([lead({ lead_id: "call-lead", email: "", eligibility: "call_eligible" })]);

  await persistLeadSupplyExecution(emailReport, { store, now: NOW });
  await persistLeadSupplyExecution(callReport, { store, now: NOW });
  const queue = readDurableRevenueExecutionQueue({ store });

  assert.equal(queue.summary.email_intents, 1);
  assert.equal(queue.summary.call_intents, 1);
  assert.equal([...store.tables.email_intents.values()][0].state, "proposed");
  assert.equal([...store.tables.call_intents.values()][0].state, "proposed");
});

test("approval, Cowork, Codex/Claude, manual review, and repair tasks persist", async () => {
  const store = createMemoryRevenueExecutionStore();
  const report = reportFor([
    lead({ lead_id: "approval", company_name: "Approval HVAC", website: "https://approval.example", email: "owner@approval.example", normalized_phone: "+14075550130", requested_action: "launch new outbound campaign" }),
    lead({ lead_id: "cowork", company_name: "Cowork Roofing", website: "https://cowork.example", email: "", normalized_phone: "", phone_verified: false }),
    lead({ lead_id: "codex", company_name: "Codex Electric", website: "https://codex.example", email: "owner@codex.example", normalized_phone: "+14075550131", pipeline_stage: "stuck_needs_build", notes: "missing automation workflow build" }),
    lead({ lead_id: "manual", company_name: "Manual Review", website: "", email: "", normalized_phone: "", source_evidence: "" }),
  ], {
    approvals: { approvalPresent: false },
    existingTasks: [{ task_id: "cowork-old", task_type: "cowork", status: "queued", created_at: "2026-06-01T00:00:00.000Z" }],
  });

  await persistLeadSupplyExecution(report, { store, now: NOW });
  const queue = readDurableRevenueExecutionQueue({ store });

  assert.equal(queue.summary.approval_cards, 1);
  assert.equal(queue.summary.cowork_packets >= 1, true);
  assert.equal(queue.summary.codex_packets >= 1, true);
  assert.equal(queue.summary.manual_review_actions >= 1, true);
  assert.equal(queue.summary.repair_tasks >= 1, true);
});

test("completion requires evidence and writes completed_with_evidence", async () => {
  const store = createMemoryRevenueExecutionStore();
  const report = reportFor([lead({ tier: "B-tier", normalized_phone: "", phone_verified: false })]);
  await persistLeadSupplyExecution(report, { store, now: NOW });
  const actionId = readDurableRevenueExecutionQueue({ store }).items[0].action_id;

  const refused = completeRevenueExecutionAction(actionId, {}, { store, now: NOW });
  const completed = completeRevenueExecutionAction(actionId, {
    evidence_type: "email_sent",
    evidence_reference: "message-id-123",
    evidence_summary: "Queued approved email evidence accepted by existing rail.",
  }, { store, now: NOW });
  const item = readDurableRevenueExecutionQueue({ store }).items[0];

  assert.equal(refused.ok, false);
  assert.equal(refused.reason, "completion_requires_evidence");
  assert.equal(completed.ok, true);
  assert.equal(item.status, "completed_with_evidence");
  assert.equal(store.tables.evidence_events.size, 1);
});

test("latest.json exports durable revenue execution queue", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "phase7b-latest-"));
  const store = createMemoryRevenueExecutionStore();

  const result = await runRevenueDailyLoop({
    now: NOW,
    outputDir,
    persistSupabase: false,
    sourceOptions: { cwd: outputDir },
    leadSupplySources: [{ source_type: "manual_imported_leads", records: [lead({ tier: "B-tier", normalized_phone: "", phone_verified: false })] }],
    leadSupplyOptions: { approvalPresent: true, approvedSenders: ["ottoserv.com"] },
    leadSupplyExecutionStore: store,
  });
  const latest = JSON.parse(await readFile(result.latestPath, "utf8"));

  assert.equal(latest.durableRevenueExecutionQueue.summary.total_actions, 1);
  assert.equal(latest.durableRevenueExecutionQueue.summary.queued_actions, 1);
  assert.equal(result.summary.durable_revenue_execution_queue.total_actions, 1);

  const readState = await readAutonomousRevenueState({ dataDir: outputDir });
  assert.equal(readState.durableRevenueExecutionQueue.summary.total_actions, 1);
  assert.equal(readState.leadSupplyDailyLoop.summary.actions_selected, 1);

  await rm(outputDir, { recursive: true, force: true });
});
