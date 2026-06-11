import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildRetellControlledReadinessReport,
  generateControlledRetellExecutionPacket,
  evaluateControlledRetellAction,
  ingestControlledRetellEvidence,
  writeBackControlledRetellEvidence,
} from "../src/lib/retellControlledVoiceExecution.mjs";
import { generateVoiceSetupPacket } from "../src/lib/retellVoiceServiceAutomation.mjs";
import { createMockServiceDeliveryLiveClient, persistServiceDeliveryRun } from "../src/lib/serviceDeliveryPersistence.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";

const NOW = "2026-06-11T20:00:00.000Z";

function voiceWorkOrder(overrides = {}) {
  return {
    id: "WO-RETELL-6F-001",
    title: "AI Receptionist: controlled Retell test",
    client: "Synthetic Harbor Services",
    service_key: "ai_receptionist",
    status: "sandbox_execution_ready",
    approvalStatus: "approved",
    implementation: {
      assignment: { assignee: "Jonathan", requires_approval: true },
      readiness: { can_queue: false, requires_approval: true, blocked_reasons: ["approval_required"] },
      testing_checklist: ["Run approved synthetic Retell test call"],
      launch_checklist: ["Confirm test call evidence"],
      monitoring_metrics: ["answered_calls", "qualified_calls"],
      upsell_paths: ["Missed Call Recovery"],
    },
    voice_intake: {
      business_name: "Synthetic Harbor Services",
      business_hours: "Mon-Fri 8am-5pm",
      service_area: "Orlando, FL",
      services_offered: ["Repairs"],
      main_phone_number: "+14075550199",
      desired_retell_number: "+14075550199",
      escalation_contact: "Jonathan synthetic escalation",
      emergency_handling_rules: "Escalate active leaks immediately.",
      faqs: ["Hours", "Scheduling"],
      booking_rules: "Collect name, service need, urgency.",
      after_hours_behavior: "Create callback task.",
      crm_calendar_handoff_notes: "No production CRM write.",
    },
    ...overrides,
  };
}

function approvedPacket(overrides = {}) {
  const packet = generateVoiceSetupPacket(voiceWorkOrder(), { now: NOW });
  return {
    ...packet,
    approval_status: "approved",
    approval_id: "approval-retell-6f-001",
    ...overrides,
  };
}

test("controlled Retell readiness fails closed without credentials and reports env names only", async () => {
  const report = await buildRetellControlledReadinessReport({ env: {}, fetchImpl: async () => {
    throw new Error("network should not be called");
  } });

  assert.equal(report.ok, false);
  assert.equal(report.status, "blocked_missing_retell_config");
  assert.deepEqual(report.required_env_names, [
    "RETELL_API_KEY",
    "RETELL_AGENT_ID",
    "RETELL_PHONE_NUMBER or RETELL_FROM_NUMBER or RETELL_PHONE_NUMBER_ID",
  ]);
  assert.equal(JSON.stringify(report).includes("secret"), false);
});

test("controlled Retell readiness with credentials reports presence names only", async () => {
  const seen = [];
  const report = await buildRetellControlledReadinessReport({
    env: {
      RETELL_API_KEY: "secret-api-key",
      RETELL_AGENT_ID: "agent_phase6f_acceptance",
      RETELL_PHONE_NUMBER_ID: "phone_phase6f",
      RETELL_BASE_URL: "https://api.retellai.test",
    },
    fetchImpl: async (url) => {
      seen.push(String(url));
      if (String(url).includes("phone-numbers")) {
        return {
          ok: true,
          async json() {
            return { phone_numbers: [{ phone_number_id: "phone_phase6f", phone_number: "+14075550199", allowed_outbound_country_list: ["US"], outbound_agents: ["agent_phase6f_acceptance"] }] };
          },
          async text() { return "{}"; },
        };
      }
      return {
        ok: true,
        async json() {
          return { agent_id: "agent_phase6f_acceptance", agent_name: "Morgan Phase 6F", response_engine: { type: "retell-llm" } };
        },
        async text() { return "{}"; },
      };
    },
  });

  assert.equal(report.ok, true);
  assert.equal(report.env_present.RETELL_API_KEY, true);
  assert.equal(report.env_present.RETELL_AGENT_ID, true);
  assert.equal(report.env_present.RETELL_PHONE_NUMBER_ID, true);
  assert.equal(JSON.stringify(report).includes("secret-api-key"), false);
  assert.ok(seen.some((url) => url.includes("/v2/list-phone-numbers")));
});

test("approved voice work order can generate controlled Retell test-call packet", () => {
  const packet = generateControlledRetellExecutionPacket(approvedPacket(), { now: NOW });

  assert.equal(packet.ok, true);
  assert.equal(packet.execution_packet.status, "test_call_queued");
  assert.equal(packet.execution_packet.actions.agent_config_preparation.allowed, true);
  assert.equal(packet.execution_packet.actions.sandbox_test_call.allowed, true);
  assert.equal(packet.execution_packet.actions.production_activation.allowed, false);
  assert.equal(packet.execution_packet.actions.number_provisioning.allowed, false);
  assert.equal(packet.execution_packet.actions.live_routing_change.allowed, false);
  assert.equal(packet.execution_packet.related_approval_id, "approval-retell-6f-001");
});

test("unapproved Retell test-call packet is blocked", () => {
  const result = generateControlledRetellExecutionPacket(approvedPacket({ approval_status: "pending" }), { now: NOW });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "approved_voice_work_order_required");
});

test("production activation, number provisioning, and live routing stay blocked", () => {
  const packet = generateControlledRetellExecutionPacket(approvedPacket(), { now: NOW }).execution_packet;

  assert.equal(evaluateControlledRetellAction(packet, "production_activation").ok, false);
  assert.equal(evaluateControlledRetellAction(packet, "number_provisioning").ok, false);
  assert.equal(evaluateControlledRetellAction(packet, "live_routing_change").ok, false);
  assert.equal(evaluateControlledRetellAction(packet, "outbound_customer_call").ok, false);
});

test("controlled Retell evidence ingestion requires real proof", () => {
  const packet = generateControlledRetellExecutionPacket(approvedPacket(), { now: NOW }).execution_packet;
  const missing = ingestControlledRetellEvidence(packet, { status: "completed" }, { now: NOW });

  assert.equal(missing.ok, false);
  assert.equal(missing.reason, "retell_completion_requires_evidence");

  const accepted = ingestControlledRetellEvidence(packet, {
    status: "completed",
    retell_agent_config_id: "agent_config_phase6f",
    retell_call_id: "call_phase6f_001",
    call_status: "ended",
    call_result: "connected_test",
    transcript: "Synthetic caller asked for service availability.",
    occurred_at: NOW,
    approval_id: "approval-retell-6f-001",
    work_order_id: "WO-RETELL-6F-001",
  }, { now: NOW });

  assert.equal(accepted.ok, true);
  assert.equal(accepted.status, "test_call_completed");
  assert.equal(accepted.event.event_type, "service_delivery_retell_test_call_completed");
  assert.equal(accepted.event.details_json.evidence.retell_call_id, "call_phase6f_001");
});

test("controlled Retell evidence writes back to techops ticket events idempotently", async () => {
  const liveClient = createMockServiceDeliveryLiveClient();
  const wo = voiceWorkOrder();
  await persistServiceDeliveryRun({ opportunities: [], workOrders: [wo] }, { liveClient, now: NOW });
  const packet = generateControlledRetellExecutionPacket(approvedPacket(), { now: NOW }).execution_packet;
  const evidence = ingestControlledRetellEvidence(packet, {
    status: "completed",
    retell_agent_config_id: "agent_config_phase6f",
    retell_call_id: "call_phase6f_001",
    call_status: "ended",
    call_result: "connected_test",
    transcript_unavailable_reason: "synthetic fixture omitted full transcript",
    occurred_at: NOW,
    approval_id: "approval-retell-6f-001",
    work_order_id: wo.id,
  }, { now: NOW });

  const first = await writeBackControlledRetellEvidence(evidence, { liveClient, now: NOW });
  const second = await writeBackControlledRetellEvidence(evidence, { liveClient, now: NOW });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(liveClient.tables.techops_ticket_events.size, 2);
  assert.equal(liveClient.tables.techops_tickets.get(wo.id).status, "test_call_completed");
});

test("latest.json voice_service_status reflects controlled Retell evidence", async () => {
  const src = mkdtempSync(path.join(os.tmpdir(), "retell-6f-src-"));
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "retell-6f-out-"));
  const scanPath = path.join(src, "process_scans.json");
  writeFileSync(scanPath, JSON.stringify([{
    id: "retell_6f_scan",
    status: "report_ready",
    report_status: "ready",
    company_name: "Retell Harbor PM",
    contact_name: "Maya",
    email: "maya@example.com",
    main_leak: "missed_calls",
    process_name: "Inbound calls",
    current_process_description: "Missed calls need controlled AI receptionist testing.",
    automation_opportunities_json: [{ type: "missed_calls", severity: "high", evidence: "After-hours missed calls." }],
    email_sent_at: NOW,
  }]));

  await runRevenueDailyLoop({
    now: NOW,
    outputDir,
    sourceOptions: { cwd: src, processScansPath: scanPath },
    persistSupabase: false,
    retellVoiceEvents: [{
      ticket_number: "WO-2026-00901",
      event_type: "service_delivery_retell_test_call_completed",
      details_json: {
        packet_id: "retell_voice_wo_2026_00901",
        evidence: {
          evidence_type: "retell_test_call_completed",
          retell_call_id: "call_phase6f_latest",
          call_status: "ended",
          call_result: "connected_test",
          occurred_at: NOW,
          work_order_id: "WO-2026-00901",
        },
      },
    }],
  });

  const latest = JSON.parse(readFileSync(path.join(outputDir, "latest.json"), "utf8"));
  const voice = latest.serviceDeliveryExecution.voice_service_status;
  assert.equal(voice.summary.test_call_completed, 1);
  assert.equal(voice.items[0].voice_service_setup_status, "test_call_completed");
  assert.equal(voice.items[0].latest_voice_evidence.retell_call_id, "call_phase6f_latest");
});
