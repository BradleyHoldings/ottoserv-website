import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  applyServiceDeliveryApprovalDecision,
  createMockServiceDeliveryLiveClient,
  createServiceDeliveryApprovalCard,
  generateMonitoringUpsellRollups,
  ingestServiceDeliveryExecutionEvidence,
  makeServiceDeliverySupabaseClient,
  persistServiceDeliveryRun,
  readLiveServiceDeliveryStatus,
} from "../src/lib/serviceDeliveryPersistence.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";

const NOW = "2026-06-11T13:00:00.000Z";

const opportunity = {
  id: "sdo-live-1",
  service_key: "front_office_leak_check",
  recommended_service_key: "missed_call_recovery",
  opportunity_type: "missed_call_recovery",
  evidence: "Missed call log summary from process_scans ps_live.",
  risk_level: "high",
  required_integrations: ["Telephony / call logs"],
  client: { company_name: "Live Harbor PM", contact_name: "Maya", email: "maya@example.com" },
  source_refs: ["process_scans"],
  default_deliverables: ["Recovery workflow"],
  approval_requirements: ["Production activation requires approval"],
  testing_checklist: ["Run sandbox route check"],
  launch_checklist: ["Confirm approval"],
  monitoring_metrics: ["recovered_leads"],
  upsell_paths: ["AI Receptionist"],
  created_at: NOW,
};

function workOrder(overrides = {}) {
  return {
    id: "WO-2026-00601",
    title: "Missed Call Recovery: Implement missed-call recovery rail",
    client: "Live Harbor PM",
    description: "Missed call log summary from process_scans ps_live.",
    priority: "high",
    status: "needs_approval",
    approvalRequired: true,
    approvalStatus: "pending",
    createdAt: NOW,
    updatedAt: NOW,
    engagement_type: "service_delivery_automation",
    service_key: "missed_call_recovery",
    source_opportunity_id: opportunity.id,
    opportunity_type: "missed_call_recovery",
    required_integrations: ["Telephony / call logs"],
    implementation: {
      assignment: { assignee: "Jonathan", requires_approval: true, reason: "High-risk action requires approval." },
      readiness: { can_queue: false, requires_approval: true, blocked_reasons: ["approval_required"] },
      testing_checklist: ["Run sandbox route check"],
      launch_checklist: ["Confirm approval"],
      monitoring_metrics: ["recovered_leads"],
      upsell_paths: ["AI Receptionist"],
      source_refs: ["process_scans"],
    },
    ...overrides,
  };
}

test("live adapter is disabled without Supabase config and uses PostgREST when configured", () => {
  assert.equal(makeServiceDeliverySupabaseClient({ config: null }), null);

  const calls = [];
  const client = makeServiceDeliverySupabaseClient({
    config: { url: "https://example.supabase.co", key: "service-key" },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, async json() { return []; }, async text() { return "[]"; } };
    },
  });

  assert.equal(client.configured, true);
  assert.equal(client.tables.tickets, "techops_tickets");
});

test("live opportunities persist idempotently with mocked Supabase client", async () => {
  const liveClient = createMockServiceDeliveryLiveClient();
  const first = await persistServiceDeliveryRun({ opportunities: [opportunity], workOrders: [] }, { liveClient, now: NOW });
  const second = await persistServiceDeliveryRun({ opportunities: [opportunity], workOrders: [] }, { liveClient, now: NOW });

  assert.equal(first.mode, "live");
  assert.equal(first.opportunities.created, 1);
  assert.equal(second.opportunities.created, 0);
  assert.equal(second.opportunities.skipped_existing, 1);
  assert.equal(liveClient.tables.hermes_opportunity_actions.size, 1);
});

test("live work orders and ticket events persist idempotently", async () => {
  const liveClient = createMockServiceDeliveryLiveClient();
  const wo = workOrder();
  const first = await persistServiceDeliveryRun({ opportunities: [opportunity], workOrders: [wo] }, { liveClient, now: NOW });
  const second = await persistServiceDeliveryRun({ opportunities: [opportunity], workOrders: [wo] }, { liveClient, now: NOW });

  assert.equal(first.work_orders.created, 1);
  assert.equal(first.ticket_events.created, 1);
  assert.equal(second.work_orders.created, 0);
  assert.equal(second.ticket_events.created, 0);
  assert.equal(liveClient.tables.techops_tickets.size, 1);
  assert.equal(liveClient.tables.techops_ticket_events.size, 1);
});

test("approval approved and rejected decisions write back status and evidence events", async () => {
  const liveClient = createMockServiceDeliveryLiveClient();
  const wo = workOrder();
  const card = createServiceDeliveryApprovalCard(wo, { opportunity, now: NOW });
  await persistServiceDeliveryRun({ opportunities: [opportunity], workOrders: [wo], approvalCards: [card] }, { liveClient, now: NOW });

  const approved = await applyServiceDeliveryApprovalDecision({
    approval_item_id: card.id,
    decision: "approved",
    decided_by: "jonathan@example.com",
    decided_at: NOW,
    reason_or_note: "Approved sandbox implementation.",
  }, { liveClient, approvalCard: card, now: NOW });

  assert.equal(approved.ok, true);
  assert.equal(liveClient.tables.techops_tickets.get(wo.id).status, "sandbox_execution_ready");
  assert.ok([...liveClient.tables.techops_ticket_events.values()].some((event) => event.event_type === "service_delivery_approval_approved"));

  const rejectedWo = workOrder({ id: "WO-2026-00602" });
  const rejectedCard = createServiceDeliveryApprovalCard(rejectedWo, { opportunity, now: NOW });
  await persistServiceDeliveryRun({ opportunities: [opportunity], workOrders: [rejectedWo], approvalCards: [rejectedCard] }, { liveClient, now: NOW });

  const rejected = await applyServiceDeliveryApprovalDecision({
    approval_item_id: rejectedCard.id,
    decision: "rejected",
    decided_by: "jonathan@example.com",
    decided_at: NOW,
    reason_or_note: "Reject until scope is clearer.",
  }, { liveClient, approvalCard: rejectedCard, now: NOW });

  assert.equal(rejected.ok, true);
  assert.equal(liveClient.tables.techops_tickets.get(rejectedWo.id).status, "blocked_rejected");
  assert.ok([...liveClient.tables.techops_ticket_events.values()].some((event) => event.event_type === "service_delivery_approval_rejected"));
});

test("execution packet completion requires evidence and updates ticket events", async () => {
  const liveClient = createMockServiceDeliveryLiveClient();
  const lowRisk = workOrder({
    id: "WO-2026-00603",
    status: "queue_ready",
    approvalRequired: false,
    approvalStatus: "not_required",
    implementation: {
      ...workOrder().implementation,
      assignment: { assignee: "Hermes", requires_approval: false },
      readiness: { can_queue: true, requires_approval: false, blocked_reasons: [] },
    },
  });
  await persistServiceDeliveryRun({ opportunities: [opportunity], workOrders: [lowRisk] }, { liveClient, now: NOW });

  const blocked = await ingestServiceDeliveryExecutionEvidence({
    related_ticket_number: lowRisk.id,
    task_id: "sdo_task_1",
    assigned_agent: "Hermes",
    status: "completed",
  }, { liveClient, now: NOW });
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /evidence/i);

  const accepted = await ingestServiceDeliveryExecutionEvidence({
    related_ticket_number: lowRisk.id,
    task_id: "sdo_task_1",
    assigned_agent: "Hermes",
    status: "completed",
    evidence: {
      evidence_id: "ev-1",
      evidence_type: "sandbox_route_check",
      evidence_summary: "Sandbox route check passed.",
      evidence_reference: "commit abc123 + test output",
      review_status: "accepted",
    },
  }, { liveClient, now: NOW });

  assert.equal(accepted.ok, true);
  assert.equal(liveClient.tables.techops_tickets.get(lowRisk.id).status, "completed");
  assert.ok([...liveClient.tables.techops_ticket_events.values()].some((event) => event.event_type === "service_delivery_execution_evidence_accepted"));
});

test("monitoring and upsell rollups expose service status and next service", async () => {
  const liveClient = createMockServiceDeliveryLiveClient();
  const wo = workOrder({ id: "WO-2026-00604", status: "queue_ready" });
  await persistServiceDeliveryRun({ opportunities: [opportunity], workOrders: [wo] }, { liveClient, now: NOW });
  await ingestServiceDeliveryExecutionEvidence({
    related_ticket_number: wo.id,
    task_id: "sdo_task_2",
    assigned_agent: "Codex",
    status: "completed",
    evidence: {
      evidence_id: "ev-2",
      evidence_type: "launch_test",
      evidence_summary: "Launch checklist accepted.",
      evidence_reference: "test-output-2",
      review_status: "accepted",
    },
  }, { liveClient, now: NOW });

  const rollups = await generateMonitoringUpsellRollups({ liveClient, now: NOW });
  assert.equal(rollups.length, 1);
  assert.equal(rollups[0].active_service, "missed_call_recovery");
  assert.equal(rollups[0].launch_status, "completed");
  assert.equal(rollups[0].latest_evidence.evidence_reference, "test-output-2");
  assert.equal(rollups[0].recommended_next_service, "AI Receptionist");
});

test("live status can be read back for dashboard/export use", async () => {
  const liveClient = createMockServiceDeliveryLiveClient();
  const wo = workOrder({ id: "WO-2026-00605" });
  await persistServiceDeliveryRun({ opportunities: [opportunity], workOrders: [wo] }, { liveClient, now: NOW });
  const status = await readLiveServiceDeliveryStatus({ liveClient });

  assert.equal(status.available, true);
  assert.equal(status.summary.work_orders.persisted, 1);
  assert.equal(status.delivery_status_summaries[0].work_order_id, wo.id);
});

test("revenue loop latest.json prefers live persisted serviceDeliveryExecution when provided", async () => {
  const src = mkdtempSync(path.join(os.tmpdir(), "sdo-live-src-"));
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "sdo-live-out-"));
  const scanPath = path.join(src, "process_scans.json");
  writeFileSync(scanPath, JSON.stringify([{
    id: "ps_live_loop",
    status: "report_ready",
    report_status: "ready",
    company_name: "Loop Harbor PM",
    contact_name: "Maya",
    email: "maya@example.com",
    main_leak: "missed_calls",
    process_name: "Inbound calls",
    current_process_description: "Missed calls need recovery.",
    automation_opportunities_json: [{ type: "missed_calls", severity: "high", evidence: "Missed calls." }],
    email_sent_at: NOW,
  }]));

  const liveClient = createMockServiceDeliveryLiveClient();
  const result = await runRevenueDailyLoop({
    now: NOW,
    outputDir,
    sourceOptions: { cwd: src, processScansPath: scanPath },
    persistSupabase: false,
    serviceDeliveryLiveClient: liveClient,
  });

  assert.equal(result.summary.service_delivery_execution.mode, "live");
  const latest = JSON.parse(readFileSync(path.join(outputDir, "latest.json"), "utf8"));
  assert.equal(latest.serviceDeliveryExecution.summary.mode, "live");
  assert.equal(latest.serviceDeliveryExecution.summary.work_orders.persisted, 1);
});
