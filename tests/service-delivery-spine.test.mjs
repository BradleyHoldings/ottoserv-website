import assert from "node:assert/strict";
import test from "node:test";

import {
  SERVICE_KEYS,
  SERVICE_DELIVERY_CANONICAL_TABLES,
  getServiceCatalog,
  getServiceDefinition,
  translateFindingsToOpportunities,
  generateImplementationWorkOrders,
  routeAssignment,
  evaluateExecutionReadiness,
} from "../src/lib/serviceDeliverySpine.mjs";

const NOW = "2026-06-10T14:00:00.000Z";

test("registers the seven initial OttoServ services", () => {
  assert.deepEqual(SERVICE_KEYS, [
    "front_office_leak_check",
    "full_process_audit",
    "ai_receptionist",
    "missed_call_recovery",
    "lead_follow_up_automation",
    "estimate_follow_up_automation",
    "invoice_payment_follow_up_automation",
  ]);

  const catalog = getServiceCatalog();
  assert.equal(catalog.length, 7);
  for (const key of SERVICE_KEYS) {
    const service = getServiceDefinition(key);
    assert.equal(service.service_key, key);
    assert.ok(service.name);
    assert.ok(service.problem_solved);
    assert.ok(service.required_intake_fields.length >= 3);
    assert.ok(service.default_deliverables.length >= 2);
    assert.ok(service.automation_opportunity_types.length >= 1);
    assert.ok(service.implementation_work_order_templates.length >= 1);
    assert.ok(service.required_integrations.length >= 1);
    assert.ok(service.approval_requirements.length >= 1);
    assert.ok(service.testing_checklist.length >= 2);
    assert.ok(service.launch_checklist.length >= 2);
    assert.ok(service.monitoring_metrics.length >= 2);
    assert.ok(service.upsell_paths.length >= 1);
  }
});

test("declares canonical Supabase reuse instead of duplicate service-delivery tables", () => {
  assert.deepEqual(SERVICE_DELIVERY_CANONICAL_TABLES, {
    intake_and_audit: "process_scans",
    clients: "techops_clients",
    deployments: "client_deployments",
    implementation_work_orders: "techops_tickets",
    work_order_events: "techops_ticket_events",
    onboarding: "onboarding_sessions",
    hermes_actions: "hermes_opportunity_actions",
  });
});

test("translates leak-check, audit, and intake findings into structured opportunities", () => {
  const opportunities = translateFindingsToOpportunities(
    {
      service_key: "front_office_leak_check",
      client: { company_name: "Harbor Point PM", contact_name: "Maya", email: "maya@example.com" },
      findings: [
        { type: "missed_calls", severity: "high", evidence: "23 after-hours missed calls last month" },
        { type: "estimate_follow_up", severity: "medium", evidence: "Estimates wait 5 days before second touch" },
      ],
      intake: {
        software_used: "Jobber",
        current_process_description: "Calls, estimates, and invoices are tracked manually.",
      },
    },
    { now: NOW },
  );

  assert.equal(opportunities.length, 2);
  assert.equal(opportunities[0].service_key, "front_office_leak_check");
  assert.equal(opportunities[0].opportunity_type, "missed_call_recovery");
  assert.equal(opportunities[0].risk_level, "high");
  assert.ok(opportunities[0].required_integrations.some((item) => /telephony/i.test(item)));
  assert.ok(opportunities[0].source_refs.includes("process_scans"));
  assert.equal(opportunities[1].opportunity_type, "estimate_follow_up");
});

test("generates implementation work orders from opportunities", () => {
  const opportunities = translateFindingsToOpportunities(
    {
      service_key: "ai_receptionist",
      client: { company_name: "Bolt HVAC", contact_name: "Rin", email: "rin@example.com" },
      findings: [{ type: "ai_receptionist", severity: "high", evidence: "Inbound calls need qualification and booking." }],
    },
    { now: NOW },
  );

  const workOrders = generateImplementationWorkOrders(opportunities, { now: NOW, sequenceStart: 30 });

  assert.equal(workOrders.length, 1);
  assert.match(workOrders[0].id, /^WO-2026-/);
  assert.equal(workOrders[0].client, "Bolt HVAC");
  assert.equal(workOrders[0].canonical_table, "techops_tickets");
  assert.equal(workOrders[0].engagement_type, "service_delivery_automation");
  assert.equal(workOrders[0].approvalRequired, true);
  assert.ok(workOrders[0].implementation.template_key);
  assert.ok(workOrders[0].implementation.testing_checklist.length >= 2);
  assert.ok(workOrders[0].implementation.launch_checklist.length >= 2);
});

test("assignment routing is deterministic by risk, integration, and execution type", () => {
  const low = routeAssignment({
    risk_level: "low",
    required_integrations: ["Internal dashboard"],
    execution_type: "analysis",
  });
  assert.equal(low.assignee, "Hermes");
  assert.equal(low.queue, "hermes_actions");

  const code = routeAssignment({
    risk_level: "medium",
    required_integrations: ["Email rail (approved templates)"],
    execution_type: "code_change",
  });
  assert.equal(code.assignee, "Codex/Claude Code");
  assert.equal(code.queue, "implementation_work_orders");

  const browser = routeAssignment({
    risk_level: "medium",
    required_integrations: ["CRM sync"],
    execution_type: "browser_research",
  });
  assert.equal(browser.assignee, "Cowork");

  const high = routeAssignment({
    risk_level: "high",
    required_integrations: ["Payments (Stripe) - approval-gated"],
    execution_type: "production_change",
  });
  assert.equal(high.assignee, "Jonathan");
  assert.equal(high.requires_approval, true);
});

test("high-risk actions require approval and low-risk actions can queue safely", () => {
  const high = evaluateExecutionReadiness({
    risk_level: "high",
    execution_type: "production_change",
    required_integrations: ["n8n workflow activation", "Stripe"],
  });
  assert.equal(high.can_queue, false);
  assert.equal(high.requires_approval, true);
  assert.ok(high.blocked_reasons.includes("approval_required"));

  const low = evaluateExecutionReadiness({
    risk_level: "low",
    execution_type: "analysis",
    required_integrations: ["Internal dashboard"],
  });
  assert.equal(low.can_queue, true);
  assert.equal(low.requires_approval, false);
  assert.deepEqual(low.blocked_reasons, []);
});
