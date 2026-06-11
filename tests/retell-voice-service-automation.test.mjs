import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  getRetellVoiceTemplateRegistry,
  generateVoiceSetupPacket,
  generateVoiceSetupPacketsFromWorkOrders,
  validateVoiceServiceIntake,
  evaluateVoiceApprovalGate,
  describeRetellVoiceExecutionMode,
  ingestVoiceServiceEvidence,
  buildVoiceServiceStatusRollup,
} from "../src/lib/retellVoiceServiceAutomation.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";

const NOW = "2026-06-11T18:00:00.000Z";

function voiceIntake(overrides = {}) {
  return {
    business_name: "Synthetic Harbor Services",
    business_hours: "Mon-Fri 8am-5pm",
    service_area: "Orlando, FL",
    services_offered: ["Repairs", "Maintenance"],
    main_phone_number: "+14075550199",
    number_needed: true,
    escalation_contact: "Jonathan - internal synthetic escalation",
    emergency_handling_rules: "Escalate active leaks immediately.",
    faqs: ["Hours", "Pricing", "Scheduling"],
    booking_rules: "Collect name, address, service need, urgency.",
    after_hours_behavior: "Qualify and create callback task.",
    crm_calendar_handoff_notes: "Sandbox handoff only; no production CRM connection.",
    ...overrides,
  };
}

function workOrder(overrides = {}) {
  return {
    id: "WO-VOICE-001",
    client: "Synthetic Harbor Services",
    service_key: "ai_receptionist",
    title: "AI Receptionist: setup voice intake",
    implementation: {
      assignment: { assignee: "Jonathan", requires_approval: true },
      approval_requirements: ["Production activation requires approval"],
      testing_checklist: ["Complete synthetic test call"],
      launch_checklist: ["Confirm routing approval"],
      monitoring_metrics: ["answered_calls", "qualified_calls"],
      upsell_paths: ["Missed Call Recovery"],
    },
    voice_intake: voiceIntake(),
    ...overrides,
  };
}

test("voice template registry includes the required Retell templates", () => {
  const registry = getRetellVoiceTemplateRegistry();
  assert.deepEqual(registry.map((template) => template.template_key), [
    "ai_receptionist",
    "missed_call_recovery",
    "after_hours_receptionist",
    "emergency_escalation",
    "appointment_request_booking_handoff",
  ]);
  assert.ok(registry.every((template) => template.approval_requirements.length > 0));
});

test("AI receptionist setup packet includes approval gates and launch evidence requirements", () => {
  const packet = generateVoiceSetupPacket(workOrder(), { now: NOW });

  assert.equal(packet.service_key, "ai_receptionist");
  assert.equal(packet.requested_voice_service, "AI Receptionist");
  assert.equal(packet.agent_template.template_key, "ai_receptionist");
  assert.equal(packet.status, "approval_required");
  assert.equal(packet.number_assignment.provisioning_required, true);
  assert.ok(packet.approval_requirements.some((item) => /activating inbound receptionist/i.test(item)));
  assert.ok(packet.evidence_requirements.includes("test_call_completed"));
});

test("missed-call recovery setup packet uses missed-call template and recovery rules", () => {
  const packet = generateVoiceSetupPacket(workOrder({
    id: "WO-VOICE-002",
    service_key: "missed_call_recovery",
    voice_intake: voiceIntake({ number_needed: false, desired_retell_number: "+14075550199" }),
  }), { now: NOW });

  assert.equal(packet.service_key, "missed_call_recovery");
  assert.equal(packet.agent_template.template_key, "missed_call_recovery");
  assert.equal(packet.requested_voice_service, "Missed Call Recovery");
  assert.match(packet.call_handling_rules.join(" "), /missed/i);
  assert.equal(packet.number_assignment.provisioning_required, false);
});

test("voice intake validation identifies missing setup fields", () => {
  const result = validateVoiceServiceIntake({ business_name: "Only Name" }, { service_key: "ai_receptionist" });

  assert.equal(result.ok, false);
  assert.ok(result.missing_fields.includes("business_hours"));
  assert.ok(result.missing_fields.includes("main_phone_number"));
  assert.ok(result.missing_fields.includes("escalation_contact"));
});

test("approval gates block high-risk voice actions", () => {
  const packet = generateVoiceSetupPacket(workOrder(), { now: NOW });
  const gate = evaluateVoiceApprovalGate(packet, { approvalPresent: false });

  assert.equal(gate.ok, false);
  assert.equal(gate.status, "blocked_pending_approval");
  assert.ok(gate.blocked_actions.includes("provision_or_assign_phone_number"));
  assert.ok(gate.blocked_actions.includes("activate_inbound_receptionist"));
});

test("dry-run mode is used without Retell credentials and live flag cannot bypass approval", () => {
  const dry = describeRetellVoiceExecutionMode({ env: {} });
  assert.equal(dry.mode, "dry_run_setup_packet_only");
  assert.equal(dry.retell_credentials_present, false);

  const liveNoApproval = describeRetellVoiceExecutionMode({
    env: { RETELL_API_KEY: "secret", RETELL_AGENT_ID: "agent", RETELL_PHONE_NUMBER_ID: "phone", RETELL_VOICE_SERVICE_LIVE_EXECUTION: "true" },
    approvalPresent: false,
  });
  assert.equal(liveNoApproval.mode, "blocked_pending_approval");
  assert.equal(liveNoApproval.live_execution_allowed, false);
});

test("voice evidence ingestion refuses completion without proof", () => {
  const packet = generateVoiceSetupPacket(workOrder(), { now: NOW });
  const refused = ingestVoiceServiceEvidence(packet, { status: "completed" }, { now: NOW });
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, "completion_requires_voice_evidence");

  const accepted = ingestVoiceServiceEvidence(packet, {
    status: "completed",
    evidence_type: "test_call_completed",
    evidence_summary: "Synthetic test call transcript received.",
    evidence_reference: "retell-sandbox-test-call-1",
  }, { now: NOW });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.event.event_type, "service_delivery_voice_evidence_accepted");
});

test("voice setup status appears in revenue loop latest.json", async () => {
  const src = mkdtempSync(path.join(os.tmpdir(), "voice-loop-src-"));
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "voice-loop-out-"));
  const scanPath = path.join(src, "process_scans.json");
  writeFileSync(scanPath, JSON.stringify([{
    id: "voice_scan_1",
    status: "report_ready",
    report_status: "ready",
    service_key: "front_office_leak_check",
    company_name: "Voice Harbor PM",
    contact_name: "Maya",
    email: "maya@example.com",
    main_leak: "missed_calls",
    process_name: "Inbound calls",
    current_process_description: "Missed calls need AI receptionist coverage.",
    automation_opportunities_json: [{ type: "missed_calls", severity: "high", evidence: "After-hours missed calls." }],
    email_sent_at: NOW,
  }]));

  await runRevenueDailyLoop({
    now: NOW,
    outputDir,
    sourceOptions: { cwd: src, processScansPath: scanPath },
    persistSupabase: false,
  });
  const latest = JSON.parse(readFileSync(path.join(outputDir, "latest.json"), "utf8"));

  assert.ok(latest.serviceDeliveryExecution.voice_service_status.summary.total >= 1);
  assert.ok(latest.serviceDeliveryExecution.voice_service_status.packets[0].approval_needed);
});

test("voice status rollup summarizes readiness and latest accepted evidence", () => {
  const packet = generateVoiceSetupPacket(workOrder(), { now: NOW });
  const evidence = ingestVoiceServiceEvidence(packet, {
    status: "completed",
    evidence_type: "launch_checklist_passed",
    evidence_summary: "Launch checklist passed in sandbox.",
    evidence_reference: "launch-checklist-1",
  }, { now: NOW });
  const rollup = buildVoiceServiceStatusRollup([packet], [evidence.event]);

  assert.equal(rollup.summary.total, 1);
  assert.equal(rollup.items[0].launch_readiness, "ready_with_accepted_evidence");
  assert.equal(rollup.items[0].latest_voice_evidence.evidence_reference, "launch-checklist-1");
});

test("voice setup packets can be generated from Phase 6 work orders", () => {
  const packets = generateVoiceSetupPacketsFromWorkOrders([
    workOrder({ service_key: "ai_receptionist" }),
    workOrder({ id: "WO-VOICE-003", service_key: "lead_follow_up_automation" }),
  ], { now: NOW });

  assert.equal(packets.length, 1);
  assert.equal(packets[0].related_work_order_id, "WO-VOICE-001");
});
