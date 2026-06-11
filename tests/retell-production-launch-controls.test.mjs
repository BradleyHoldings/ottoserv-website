import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCTION_VOICE_LAUNCH_STAGES,
  buildProductionVoiceLaunchPacket,
  evaluateProductionVoiceLaunchReadiness,
  getProductionVoiceLaunchControlRegistry,
} from "../src/lib/retellProductionVoiceLaunchControls.mjs";
import { generateVoiceSetupPacket } from "../src/lib/retellVoiceServiceAutomation.mjs";

const NOW = "2026-06-11T23:00:00.000Z";

function workOrder(overrides = {}) {
  return {
    id: "WO-PROD-VOICE-001",
    client: "Harbor Synthetic PM",
    service_key: "ai_receptionist",
    status: "test_call_completed",
    approvalStatus: "approved",
    implementation: {
      testing_checklist: ["Retell test call completed"],
      launch_checklist: ["Production launch approval"],
      monitoring_metrics: ["call_answered"],
      upsell_paths: ["Missed Call Recovery"],
    },
    voice_intake: {
      business_name: "Harbor Synthetic PM",
      business_hours: "Mon-Fri 8am-5pm",
      service_area: "Orlando, FL",
      services_offered: ["Repairs"],
      main_phone_number: "+14075550199",
      desired_retell_number: "+14075550199",
      escalation_contact: "Jonathan synthetic escalation",
      emergency_handling_rules: "Escalate active leaks immediately.",
      faqs: ["Hours", "Scheduling"],
      booking_rules: "Collect service need and callback details.",
      after_hours_behavior: "Collect message and create callback task.",
      crm_calendar_handoff_notes: "Dispatch handoff remains approval-gated.",
    },
    ...overrides,
  };
}

function voicePacket(overrides = {}) {
  return {
    ...generateVoiceSetupPacket(workOrder(), { now: NOW }),
    approval_status: "approved",
    approval_id: "approval-prod-voice-001",
    ...overrides,
  };
}

function completedTestCallEvent(overrides = {}) {
  return {
    event_type: "service_delivery_retell_test_call_completed",
    details_json: {
      packet_id: "retell_voice_wo_prod_voice_001",
      evidence: {
        evidence_type: "retell_test_call_completed",
        retell_call_id: "call-prod-test-1",
        call_status: "ended",
        call_result: "connected_test",
        work_order_id: "WO-PROD-VOICE-001",
        approval_id: "approval-prod-voice-001",
      },
    },
    ...overrides,
  };
}

function approvals(overrides = {}) {
  return {
    client_approved: true,
    launch_approved: true,
    launch_approval_id: "launch-approval-001",
    approved_by: "Jonathan",
    ...overrides,
  };
}

function rollback(overrides = {}) {
  return {
    previous_routing_state: "Existing phone routes to office line.",
    previous_number_state: "Existing main line unchanged.",
    rollback_instructions: "Restore forwarding to office line in carrier portal.",
    emergency_disable_path: "Disable Retell route and revert forwarding.",
    owner_operator_contact: "Jonathan / operations",
    ...overrides,
  };
}

function confirmations(overrides = {}) {
  return {
    call_handling_rules_confirmed: true,
    escalation_contact_confirmed: true,
    after_hours_behavior_confirmed: true,
    emergency_rules_confirmed: true,
    monitoring_enabled: true,
    evidence_requirements_defined: true,
    crm_calendar_dispatch_handoffs_confirmed: true,
    ...overrides,
  };
}

test("production voice launch registry declares approval gates and monitoring requirements", () => {
  const registry = getProductionVoiceLaunchControlRegistry();

  assert.ok(registry.approval_gates.includes("activate_inbound_ai_receptionist"));
  assert.ok(registry.approval_gates.includes("assign_or_provision_phone_number"));
  assert.ok(registry.approval_gates.includes("change_live_call_routing"));
  assert.ok(registry.approval_gates.includes("enable_missed_call_recovery"));
  assert.ok(registry.approval_gates.includes("connect_crm_calendar_dispatch_handoffs"));
  assert.ok(registry.approval_gates.includes("send_client_facing_launch_instructions"));
  assert.ok(registry.monitoring_requirements.includes("call_answered"));
  assert.ok(registry.monitoring_requirements.includes("issue_detected"));
  assert.ok(PRODUCTION_VOICE_LAUNCH_STAGES.includes("production_launch_ready"));
});

test("launch is blocked without approval", () => {
  const packet = buildProductionVoiceLaunchPacket(voicePacket(), { now: NOW });
  const result = evaluateProductionVoiceLaunchReadiness(packet, {
    approvals: approvals({ launch_approved: false }),
    rollback: rollback(),
    confirmations: confirmations(),
    events: [completedTestCallEvent()],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "launch_approval_required");
  assert.ok(result.blocked_reasons.includes("launch_approval_required"));
});

test("launch is blocked without completed Retell test-call evidence", () => {
  const packet = buildProductionVoiceLaunchPacket(voicePacket(), { now: NOW });
  const result = evaluateProductionVoiceLaunchReadiness(packet, {
    approvals: approvals(),
    rollback: rollback(),
    confirmations: confirmations(),
    events: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.ok(result.blocked_reasons.includes("retell_test_call_completed_required"));
});

test("launch is blocked without rollback plan", () => {
  const packet = buildProductionVoiceLaunchPacket(voicePacket(), { now: NOW });
  const result = evaluateProductionVoiceLaunchReadiness(packet, {
    approvals: approvals(),
    rollback: rollback({ rollback_instructions: "" }),
    confirmations: confirmations(),
    events: [completedTestCallEvent()],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.ok(result.blocked_reasons.includes("rollback_plan_required"));
});

test("launch is blocked without client approval", () => {
  const packet = buildProductionVoiceLaunchPacket(voicePacket(), { now: NOW });
  const result = evaluateProductionVoiceLaunchReadiness(packet, {
    approvals: approvals({ client_approved: false }),
    rollback: rollback(),
    confirmations: confirmations(),
    events: [completedTestCallEvent()],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "launch_approval_required");
  assert.ok(result.blocked_reasons.includes("client_approval_required"));
});

test("launch-ready status only appears when all checklist items pass", () => {
  const packet = buildProductionVoiceLaunchPacket(voicePacket(), { now: NOW });
  const result = evaluateProductionVoiceLaunchReadiness(packet, {
    approvals: approvals(),
    rollback: rollback(),
    confirmations: confirmations(),
    events: [completedTestCallEvent()],
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "production_launch_ready");
  assert.equal(result.launch_checklist.every((item) => item.passed), true);
  assert.equal(result.execution_gated.production_activation_allowed, false);
});

test("rollback-ready status and monitoring requirements are attached", () => {
  const packet = buildProductionVoiceLaunchPacket(voicePacket(), { now: NOW });
  const result = evaluateProductionVoiceLaunchReadiness(packet, {
    approvals: approvals(),
    rollback: rollback(),
    confirmations: confirmations(),
    events: [completedTestCallEvent()],
  });

  assert.equal(result.rollback.status, "rollback_ready");
  assert.ok(result.rollback.controls.includes("previous_routing_number_state_recorded"));
  assert.ok(result.monitoring.requirements.includes("transfer_failed"));
  assert.ok(result.monitoring.requirements.includes("client_notification_sent"));
  assert.equal(result.monitoring.status, "monitoring_active");
});
