import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFirstClientVoiceActivationStatus,
  getFirstClientVoiceActivationPlaybook,
} from "../src/lib/retellFirstClientActivationPlaybook.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";

const NOW = "2026-06-11T23:30:00.000Z";

function workOrder(overrides = {}) {
  return {
    id: "WO-FIRST-VOICE-001",
    client: "Harbor Synthetic PM",
    service_key: "ai_receptionist",
    status: "test_call_completed",
    approvalStatus: "approved",
    implementation: {
      launch_checklist: ["Production launch approval"],
      monitoring_metrics: ["call_answered"],
    },
    voice_intake: {
      business_name: "Harbor Synthetic PM",
      business_hours: "Mon-Fri 8am-5pm",
      service_area: "Orlando, FL",
      services_offered: ["Repairs", "Maintenance"],
      main_phone_number: "+14075550199",
      desired_retell_number: "+14075550199",
      escalation_contact: "Jonathan synthetic escalation",
      emergency_handling_rules: "Escalate active leaks immediately.",
      faqs: ["Hours", "Scheduling"],
      booking_rules: "Collect service need and callback details.",
      after_hours_behavior: "Collect a message and create callback task.",
      crm_calendar_handoff_notes: "Dispatch handoff remains approval-gated.",
    },
    ...overrides,
  };
}

function approvals(overrides = {}) {
  return {
    client_approved: true,
    launch_approved: true,
    launch_approval_id: "launch-approval-first-client",
    approved_by: "Jonathan",
    ...overrides,
  };
}

function rollback(overrides = {}) {
  return {
    previous_routing_state: "Main line forwards to office.",
    previous_number_state: "Main line unchanged.",
    rollback_instructions: "Disable Retell route and restore office forwarding.",
    emergency_disable_path: "Carrier portal forwarding off switch.",
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

function testCallEvent(overrides = {}) {
  return {
    event_type: "service_delivery_retell_test_call_completed",
    details_json: {
      packet_id: "retell_voice_wo_first_voice_001",
      evidence: {
        evidence_type: "retell_test_call_completed",
        retell_call_id: "call-first-client-test",
        call_status: "ended",
        call_result: "connected_test",
        work_order_id: "WO-FIRST-VOICE-001",
        approval_id: "approval-first-client-test",
      },
    },
    ...overrides,
  };
}

test("playbook exists for AI Receptionist", () => {
  const playbook = getFirstClientVoiceActivationPlaybook("ai_receptionist");

  assert.equal(playbook.service_key, "ai_receptionist");
  assert.equal(playbook.name, "AI Receptionist");
  assert.ok(playbook.steps.includes("retell_setup_packet_generation"));
  assert.ok(playbook.required_approvals.includes("client_launch_approval"));
  assert.ok(playbook.client_facing_templates.setup_request.includes("AI Receptionist"));
});

test("playbook exists for Missed Call Recovery", () => {
  const playbook = getFirstClientVoiceActivationPlaybook("missed_call_recovery");

  assert.equal(playbook.service_key, "missed_call_recovery");
  assert.equal(playbook.name, "Missed Call Recovery");
  assert.ok(playbook.steps.includes("controlled_test_call"));
  assert.ok(playbook.client_facing_templates.approval_request.includes("Missed Call Recovery"));
});

test("missing intake blocks activation", () => {
  const status = buildFirstClientVoiceActivationStatus({
    workOrder: workOrder({ voice_intake: { business_name: "Harbor Synthetic PM" } }),
    approvals: approvals(),
    rollback: rollback(),
    confirmations: confirmations(),
    events: [testCallEvent()],
    now: NOW,
  });

  assert.equal(status.current_readiness_status, "blocked_missing_intake");
  assert.ok(status.missing_checklist_items.includes("service_intake_complete"));
  assert.equal(status.next_operator_action, "complete_voice_intake");
});

test("missing client approval blocks launch", () => {
  const status = buildFirstClientVoiceActivationStatus({
    workOrder: workOrder(),
    approvals: approvals({ client_approved: false }),
    rollback: rollback(),
    confirmations: confirmations(),
    events: [testCallEvent()],
    now: NOW,
  });

  assert.equal(status.current_readiness_status, "launch_approval_required");
  assert.ok(status.approvals_needed.includes("client_launch_approval"));
  assert.equal(status.next_operator_action, "collect_client_launch_approval");
});

test("missing rollback blocks launch", () => {
  const status = buildFirstClientVoiceActivationStatus({
    workOrder: workOrder(),
    approvals: approvals(),
    rollback: rollback({ rollback_instructions: "" }),
    confirmations: confirmations(),
    events: [testCallEvent()],
    now: NOW,
  });

  assert.equal(status.current_readiness_status, "blocked");
  assert.equal(status.rollback_readiness, "blocked");
  assert.equal(status.next_operator_action, "document_rollback_plan");
});

test("missing Retell test evidence blocks launch", () => {
  const status = buildFirstClientVoiceActivationStatus({
    workOrder: workOrder(),
    approvals: approvals(),
    rollback: rollback(),
    confirmations: confirmations(),
    events: [],
    now: NOW,
  });

  assert.equal(status.current_readiness_status, "blocked");
  assert.equal(status.test_call_status, "not_started");
  assert.equal(status.next_operator_action, "complete_controlled_retell_test_call");
});

test("completed checklist produces production_launch_ready", () => {
  const status = buildFirstClientVoiceActivationStatus({
    workOrder: workOrder(),
    approvals: approvals(),
    rollback: rollback(),
    confirmations: confirmations(),
    events: [testCallEvent()],
    now: NOW,
  });

  assert.equal(status.current_readiness_status, "production_launch_ready");
  assert.equal(status.launch_readiness, "production_launch_ready");
  assert.equal(status.rollback_readiness, "rollback_ready");
  assert.equal(status.monitoring_readiness, "monitoring_active");
  assert.equal(status.next_operator_action, "schedule_operator_controlled_production_activation");
  assert.equal(status.execution_gated.production_activation_allowed, false);
});

test("next operator action is deterministic", () => {
  const status = buildFirstClientVoiceActivationStatus({
    workOrder: workOrder({ voice_intake: { business_name: "Harbor Synthetic PM" } }),
    approvals: approvals({ client_approved: false, launch_approved: false }),
    rollback: rollback({ rollback_instructions: "" }),
    confirmations: confirmations({ monitoring_enabled: false }),
    events: [],
    now: NOW,
  });

  assert.equal(status.next_operator_action, "complete_voice_intake");
});

test("latest.json serviceDeliveryExecution exposes first-client voice activation status", async () => {
  const tmpDir = await import("node:os").then((os) => os.tmpdir());
  const path = await import("node:path");
  const fs = await import("node:fs/promises");
  const outputDir = path.join(tmpDir, `ottoserv-phase6i-${Date.now()}`);

  const result = await runRevenueDailyLoop({
    now: NOW,
    outputDir,
    persistSupabase: false,
    firstClientVoiceWorkOrders: [workOrder()],
    retellVoiceEvents: [testCallEvent()],
    voiceActivationContext: {
      approvals: approvals(),
      rollback: rollback(),
      confirmations: confirmations(),
    },
  });

  const latest = JSON.parse(await fs.readFile(result.latestPath, "utf8"));
  const activation = latest.serviceDeliveryExecution.first_client_voice_activation;

  assert.equal(activation.summary.total, 1);
  assert.equal(activation.items[0].client, "Harbor Synthetic PM");
  assert.equal(activation.items[0].current_readiness_status, "production_launch_ready");

  await fs.rm(outputDir, { recursive: true, force: true });
});
