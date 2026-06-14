import assert from "node:assert/strict";
import test from "node:test";

import {
  createMemoryServiceDeliveryStore,
  runServiceDeliveryOperatingCycle,
} from "../src/lib/serviceDeliveryPersistence.mjs";

const NOW = "2026-06-14T13:00:00.000Z";

function phase6Signals() {
  return [
    {
      source_type: "front_office_leak_check",
      scan_id: "phase6_leak_check",
      company_name: "Leak Check Co",
      contact_name: "Lena",
      email: "lena@example.com",
      main_leak: "missed calls and slow estimate follow-up",
      automation_opportunities_json: [
        { type: "missed_calls", severity: "high", evidence: "17 missed calls after hours." },
        { type: "estimate_follow_up", severity: "medium", evidence: "Open estimates wait four days." },
      ],
    },
    {
      source_type: "full_process_audit",
      audit_id: "phase6_audit",
      client: { company_name: "Audit Co", contact_name: "Ari", email: "ari@example.com" },
      findings: [
        { type: "form_intake", evidence: "Forms are copied into CRM manually." },
        { type: "crm_cleanup", evidence: "Pipeline stages are stale." },
        { type: "reporting", evidence: "Managers cannot see blockers." },
      ],
    },
    {
      source_type: "paid_onboarding",
      onboarding_id: "onb_phase6_paid",
      payment_id: "pay_phase6",
      paid: true,
      client_id: "client_paid_phase6",
      company_name: "Paid Co",
      contact_name: "Pia",
      email: "pia@example.com",
      selected_services: ["lead_follow_up_automation"],
      required_integrations: ["CRM", "Email rail"],
    },
    {
      source_type: "manual_hermes_instruction",
      client: { client_id: "client_voice_phase6", company_name: "Voice Co", contact_name: "Vic", email: "vic@example.com" },
      requested_service: "receptionist voice agent setup",
      instruction: "Prepare receptionist, appointment scheduler, number assignment, and test call evidence.",
      required_integrations: ["Retell", "Telnyx", "CRM"],
    },
    {
      source_type: "dashboard_request",
      client: { company_name: "Internal Ops Co", contact_name: "Ina", email: "ina@example.com" },
      requested_service: "internal process automation",
      current_process_description: "Dispatch handoffs and customer updates are manual.",
      required_integrations: ["n8n", "Slack", "Dashboard reporting"],
    },
  ];
}

test("Phase 6 operating cycle creates normalized requests, packages, routed work orders, evidence, dashboard export, and no duplicates", async () => {
  const store = createMemoryServiceDeliveryStore();

  const first = await runServiceDeliveryOperatingCycle({ records: phase6Signals(), store, now: NOW, sequenceStart: 600 });
  const second = await runServiceDeliveryOperatingCycle({ records: phase6Signals(), store, now: NOW, sequenceStart: 600 });

  assert.equal(first.ok, true);
  assert.equal(first.normalized_requests.length, 5);
  assert.equal(first.delivery_packages.length, 5);
  assert.ok(first.opportunities.length >= 8);
  assert.ok(first.workOrders.length >= 8);

  const opportunityTypes = new Set(first.opportunities.map((item) => item.opportunity_type));
  for (const required of ["missed_call_recovery", "estimate_follow_up", "form_intake", "crm_hygiene", "reporting_visibility", "speed_to_lead", "voice_receptionist", "internal_handoff"]) {
    assert.ok(opportunityTypes.has(required), `missing ${required}`);
  }

  const paidWorkOrder = first.workOrders.find((workOrder) => workOrder.client_id === "client_paid_phase6");
  assert.ok(paidWorkOrder);
  assert.equal(paidWorkOrder.source_request_id, "onb_phase6_paid");
  assert.equal(paidWorkOrder.service_type, "lead_follow_up_automation");

  const voiceWorkOrder = first.workOrders.find((workOrder) => workOrder.service_type === "ai_receptionist");
  assert.ok(voiceWorkOrder);
  assert.equal(voiceWorkOrder.delivery_status, "blocked");
  assert.match(voiceWorkOrder.blocker_reason, /Retell|Telnyx/);
  assert.ok(voiceWorkOrder.evidence_requirements.includes("Retell agent config evidence"));

  assert.ok(first.workOrders.some((workOrder) => workOrder.implementation.template_match.fulfillment === "existing_n8n_workflow"));
  assert.ok(first.workOrders.some((workOrder) => workOrder.implementation.template_match.fulfillment === "modified_n8n_workflow"));
  assert.ok(first.workOrders.some((workOrder) => workOrder.implementation.template_match.fulfillment === "dashboard_update"));

  assert.ok(first.dashboard_export.active_service_requests.length >= 5);
  assert.ok(first.dashboard_export.delivery_packages.length >= 5);
  assert.ok(first.dashboard_export.implementation_work_orders.length >= 8);
  assert.ok(first.dashboard_export.blocked_items.length >= 1);
  assert.ok(first.dashboard_export.next_actions.length >= 8);

  assert.equal(second.persistence.opportunities.created, 0);
  assert.equal(second.persistence.work_orders.created, 0);
  assert.equal(store.tables.hermes_opportunity_actions.size, first.opportunities.length);
  assert.equal(store.tables.techops_tickets.size, first.workOrders.length);
});
