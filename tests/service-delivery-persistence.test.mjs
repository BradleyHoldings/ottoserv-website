import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  SERVICE_DELIVERY_CANONICAL_TABLES,
  translateFindingsToOpportunities,
  generateImplementationWorkOrders,
} from "../src/lib/serviceDeliverySpine.mjs";
import {
  createMemoryServiceDeliveryStore,
  createServiceDeliveryApprovalCard,
  createServiceDeliveryExecutionPacket,
  persistServiceDeliveryRun,
  runServiceDeliveryOperatingCycle,
  serviceDeliveryDuplicateTableNames,
} from "../src/lib/serviceDeliveryPersistence.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";

const NOW = "2026-06-10T16:00:00.000Z";

function highRiskScan() {
  return {
    id: "ps_6b_high",
    status: "report_ready",
    report_status: "ready",
    company_name: "Harbor Point PM",
    contact_name: "Maya",
    email: "maya@example.com",
    main_leak: "missed_calls",
    process_name: "Inbound lead handling",
    software_used: "Jobber",
    current_process_description: "After-hours calls go to voicemail and estimates are followed up manually.",
    automation_opportunities_json: [
      { type: "missed_calls", severity: "high", evidence: "23 after-hours missed calls last month" },
    ],
    public_report_url: "https://ottoserv.com/front-office-leak-check/report/harbor",
    email_sent_at: "2026-06-10T14:00:00.000Z",
  };
}

function lowRiskAudit() {
  return {
    id: "audit_low",
    service_key: "full_process_audit",
    client: { company_name: "Quiet Ops LLC", contact_name: "Ira", email: "ira@example.com" },
    intake: { process_name: "Status review", software_used: "Internal dashboard", current_process_description: "Summaries need routing." },
    findings: [{ type: "process_handoff", severity: "low", execution_type: "analysis", evidence: "Route weekly status summary to Hermes." }],
  };
}

test("opportunities persist idempotently to hermes_opportunity_actions", async () => {
  const store = createMemoryServiceDeliveryStore();
  const opportunities = translateFindingsToOpportunities(highRiskScan(), { now: NOW });

  const first = await persistServiceDeliveryRun({ opportunities, workOrders: [] }, { store, now: NOW });
  const second = await persistServiceDeliveryRun({ opportunities, workOrders: [] }, { store, now: NOW });

  assert.equal(first.opportunities.created, 1);
  assert.equal(second.opportunities.created, 0);
  assert.equal(second.opportunities.skipped_existing, 1);
  assert.equal(store.tables.hermes_opportunity_actions.size, 1);
  const [row] = [...store.tables.hermes_opportunity_actions.values()];
  assert.equal(row.canonical_table, SERVICE_DELIVERY_CANONICAL_TABLES.hermes_actions);
  assert.equal(row.raw_intent.service_delivery.service_key, "front_office_leak_check");
});

test("work orders persist idempotently to techops_tickets and write ticket events", async () => {
  const store = createMemoryServiceDeliveryStore();
  const opportunities = translateFindingsToOpportunities(highRiskScan(), { now: NOW });
  const workOrders = generateImplementationWorkOrders(opportunities, { now: NOW, sequenceStart: 70 });

  const first = await persistServiceDeliveryRun({ opportunities, workOrders }, { store, now: NOW });
  const second = await persistServiceDeliveryRun({ opportunities, workOrders }, { store, now: NOW });

  assert.equal(first.work_orders.created, 1);
  assert.equal(second.work_orders.created, 0);
  assert.equal(second.work_orders.skipped_existing, 1);
  assert.equal(store.tables.techops_tickets.size, 1);
  assert.equal(store.tables.techops_ticket_events.size, 1);
  const [event] = [...store.tables.techops_ticket_events.values()];
  assert.equal(event.event_type, "service_delivery_work_order_generated");
  assert.equal(event.details_json.evidence.source_refs.includes("process_scans"), true);
});

test("high-risk generated work orders create approval-needed cards", () => {
  const opportunities = translateFindingsToOpportunities(highRiskScan(), { now: NOW });
  const [workOrder] = generateImplementationWorkOrders(opportunities, { now: NOW });
  const card = createServiceDeliveryApprovalCard(workOrder, { opportunity: opportunities[0], now: NOW });

  assert.equal(card.status, "pending");
  assert.equal(card.riskLevel, "high");
  assert.match(card.requestedAction, /AI Receptionist|Missed Call/i);
  assert.equal(card.payload.client, "Harbor Point PM");
  assert.equal(card.payload.canonical_ticket_table, "techops_tickets");
  assert.ok(card.payload.source_evidence.length >= 1);
  assert.ok(card.payload.expected_execution_result);
});

test("low-risk work orders become queue-ready and generate Hermes execution packets", () => {
  const opportunities = translateFindingsToOpportunities(lowRiskAudit(), { now: NOW });
  const [workOrder] = generateImplementationWorkOrders(opportunities, { now: NOW });
  const packet = createServiceDeliveryExecutionPacket(workOrder, { opportunity: opportunities[0], now: NOW });

  assert.equal(packet.status, "queue_ready");
  assert.equal(packet.assigned_agent, "Hermes");
  assert.equal(packet.execution_rail, "hermes_internal");
  assert.deepEqual(packet.forbidden_actions.includes("Activate production automation without approval"), true);
});

test("Hermes service-delivery operating cycle consumes synthetic intake and persists outputs", async () => {
  const store = createMemoryServiceDeliveryStore();
  const result = await runServiceDeliveryOperatingCycle({ records: [highRiskScan(), lowRiskAudit()], store, now: NOW });

  assert.equal(result.summary.records_seen, 2);
  assert.equal(result.summary.opportunities.total, 2);
  assert.equal(result.summary.work_orders.total, 2);
  assert.equal(result.summary.approvals.pending, 1);
  assert.equal(result.summary.execution_packets.queue_ready, 1);
  assert.equal(store.tables.hermes_opportunity_actions.size, 2);
  assert.equal(store.tables.techops_tickets.size, 2);
  assert.equal(store.tables.techops_ticket_events.size, 2);
});

test("revenue daily loop embeds persisted service-delivery execution summary", async () => {
  const src = mkdtempSync(path.join(os.tmpdir(), "sdo-src-"));
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "sdo-out-"));
  const scanPath = path.join(src, "process_scans.json");
  writeFileSync(scanPath, JSON.stringify([highRiskScan()]));

  const result = await runRevenueDailyLoop({
    now: NOW,
    outputDir,
    sourceOptions: { cwd: src, processScansPath: scanPath },
    persistSupabase: false,
  });

  assert.equal(result.summary.service_delivery_execution.opportunities.total, 1);
  assert.equal(result.summary.service_delivery_execution.approvals.pending, 1);

  const latest = JSON.parse(readFileSync(path.join(outputDir, "latest.json"), "utf8"));
  assert.equal(latest.serviceDeliveryExecution.summary.opportunities.total, 1);
  assert.equal(latest.serviceDeliveryExecution.approval_cards.length, 1);
});

test("no duplicate canonical service-delivery concepts or tables are introduced", () => {
  assert.deepEqual(serviceDeliveryDuplicateTableNames(), []);
});
