import assert from "node:assert/strict";
import test from "node:test";

import {
  SERVICE_KEYS,
  SERVICE_DELIVERY_CANONICAL_TABLES,
  getServiceCatalog,
  getServiceDefinition,
  translateFindingsToOpportunities,
  generateImplementationWorkOrders,
  generateServiceDeliveryPackage,
  matchImplementationTemplate,
  normalizeServiceDeliverySignal,
  buildServiceDeliveryDashboardExport,
  routeAssignment,
  evaluateExecutionReadiness,
} from "../src/lib/serviceDeliverySpine.mjs";

const NOW = "2026-06-10T14:00:00.000Z";

test("registers every Phase 6 OttoServ service type", () => {
  assert.deepEqual(SERVICE_KEYS, [
    "front_office_leak_check",
    "full_process_audit",
    "internal_process_automation",
    "ai_receptionist",
    "missed_call_recovery",
    "form_submission_workflow_automation",
    "scheduling_request_automation",
    "lead_follow_up_automation",
    "crm_pipeline_cleanup_automation",
    "sop_process_mapping",
    "reporting_dashboard_automation",
    "existing_client_expansion_optimization",
    "estimate_follow_up_automation",
    "invoice_payment_follow_up_automation",
  ]);

  const catalog = getServiceCatalog();
  assert.equal(catalog.length, 14);
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

test("normalizes every supported service-delivery signal into one canonical request", () => {
  const signals = [
    { source_type: "paid_onboarding", client_id: "client_1", onboarding_id: "onb_1", paid: true, selected_services: ["missed_call_recovery"], company_name: "Paid Co", required_integrations: ["Jobber"] },
    { source_type: "front_office_leak_check", scan_id: "ps_1", company_name: "Leak Co", main_leak: "missed calls", automation_opportunities_json: ["missed call recovery"] },
    { source_type: "full_process_audit", audit_id: "audit_1", client: { company_name: "Audit Co" }, findings: [{ type: "handoff", evidence: "Manual handoffs stall" }] },
    { source_type: "manual_hermes_instruction", client: { company_name: "Manual Co" }, instruction: "Build invoice follow-up and dashboard status." },
    { source_type: "dashboard_request", client: { company_name: "Dash Co" }, requested_service: "reporting dashboard automation" },
    { source_type: "existing_client_request", client: { company_name: "Expansion Co" }, request_summary: "Optimize lead follow-up workflow." },
    { source_type: "process_scan_json", id: "scan_json_1", company_name: "Scan Co", current_process_description: "Forms get copied manually into CRM." },
    { source_type: "conversation_summary", company_name: "Talk Co", summary: "Caller needs scheduling request automation." },
  ];

  const normalized = signals.map((signal) => normalizeServiceDeliverySignal(signal, { now: NOW }));

  assert.equal(normalized.length, 8);
  for (const item of normalized) {
    assert.ok(item.request_id);
    assert.ok(item.client.company_name);
    assert.ok(item.source_signal.source_type);
    assert.ok(item.service_key);
    assert.ok(item.affected_business_process);
    assert.ok(item.current_pain_or_waste);
    assert.ok(item.recommended_ottoserv_service);
    assert.ok(Array.isArray(item.safe_autonomous_next_actions));
    assert.ok(Array.isArray(item.blocked_items));
    assert.ok(Array.isArray(item.expected_deliverables));
  }

  assert.equal(normalized[0].client.client_id, "client_1");
  assert.equal(normalized[0].source_signal.onboarding_id, "onb_1");
  assert.equal(normalized[0].service_key, "missed_call_recovery");
  assert.equal(normalized[3].service_key, "invoice_payment_follow_up_automation");
  assert.equal(normalized[4].service_key, "reporting_dashboard_automation");
  assert.equal(normalized[6].service_key, "form_submission_workflow_automation");
  assert.equal(normalized[7].service_key, "scheduling_request_automation");
});

test("translator classifies full audit opportunities beyond voice-agent work", () => {
  const opportunities = translateFindingsToOpportunities(
    normalizeServiceDeliverySignal({
      source_type: "full_process_audit",
      client: { company_name: "Northwind Trades", contact_name: "Nia", email: "nia@example.com" },
      findings: [
        { type: "form_intake", evidence: "Website forms are retyped into ServiceTitan." },
        { type: "scheduling", evidence: "Scheduling requests sit in inbox for a day." },
        { type: "crm_cleanup", evidence: "Pipeline stages are stale." },
        { type: "reporting", evidence: "Managers cannot see follow-up status." },
        { type: "sop_mapping", evidence: "No documented handoff SOP." },
        { type: "human_escalation", evidence: "Edge cases need operator escalation." },
      ],
    }, { now: NOW }),
    { now: NOW },
  );

  const types = opportunities.map((item) => item.opportunity_type);
  for (const required of ["form_intake", "scheduling", "crm_hygiene", "reporting_visibility", "sop_process_documentation", "human_operator_escalation"]) {
    assert.ok(types.includes(required), `missing opportunity ${required}`);
  }
  assert.ok(opportunities.every((item) => item.title && item.business_problem && item.recommended_solution));
  assert.ok(opportunities.every((item) => item.implementation_steps.length >= 2));
  assert.ok(opportunities.every((item) => item.evidence_required_for_completion.length >= 1));
});

test("delivery package includes implementation scope, acceptance, evidence, and expansion paths", () => {
  const normalized = normalizeServiceDeliverySignal({
    source_type: "dashboard_request",
    client: { company_name: "Package Co", contact_name: "Pat", email: "pat@example.com" },
    requested_service: "internal process automation",
    current_process_description: "Dispatch handoffs are manual.",
    required_integrations: ["n8n", "Slack", "CRM"],
  }, { now: NOW });
  const opportunities = translateFindingsToOpportunities(normalized, { now: NOW });
  const pkg = generateServiceDeliveryPackage(normalized, opportunities, { now: NOW });

  assert.equal(pkg.client.company_name, "Package Co");
  assert.equal(pkg.source_request_id, normalized.request_id);
  assert.equal(pkg.service_key, "internal_process_automation");
  assert.ok(pkg.summary);
  assert.ok(pkg.recommended_service_tier);
  assert.ok(pkg.scope_of_work.length >= 2);
  assert.ok(pkg.deliverables.length >= 2);
  assert.ok(pkg.implementation_plan.length >= 2);
  assert.ok(pkg.client_inputs_needed.length >= 1);
  assert.ok(pkg.automations_to_build_or_configure.length >= 1);
  assert.ok(pkg.internal_workflows_to_configure.length >= 1);
  assert.ok(pkg.dashboard_reporting_changes.length >= 1);
  assert.ok(pkg.acceptance_criteria.length >= 1);
  assert.ok(pkg.completion_evidence_requirements.length >= 1);
  assert.ok(pkg.follow_up_expansion_opportunities.length >= 1);
});

test("template matcher returns reuse, modify, build, voice, dashboard, docs, and human routing decisions", () => {
  const cases = [
    ["missed_call_recovery", "existing_n8n_workflow"],
    ["form_intake", "modified_n8n_workflow"],
    ["customer_updates", "new_n8n_workflow_request"],
    ["voice_receptionist", "existing_retell_agent_template"],
    ["appointment_scheduler", "new_retell_agent_configuration"],
    ["reporting_visibility", "dashboard_update"],
    ["crm_hygiene", "supabase_schema_or_update"],
    ["sop_process_documentation", "sop_documentation"],
    ["internal_handoff", "codex_implementation"],
    ["outbound_call_support", "claude_or_opus_implementation"],
    ["human_operator_escalation", "human_action"],
  ];

  for (const [opportunityType, expectedFulfillment] of cases) {
    const match = matchImplementationTemplate({ opportunity_type: opportunityType, required_integrations: [] });
    assert.equal(match.fulfillment, expectedFulfillment, opportunityType);
    assert.ok(match.work_order_route);
    assert.ok(match.decision !== "needs implementation");
  }
});

test("work orders from a package expose canonical Phase 6 fields and blocked credential items", () => {
  const normalized = normalizeServiceDeliverySignal({
    source_type: "manual_hermes_instruction",
    client: { client_id: "client_voice", company_name: "Voice Co", contact_name: "Vi", email: "vi@example.com" },
    requested_service: "receptionist voice agent setup",
    instruction: "Set up receptionist, number assignment, missed-call recovery, and test call evidence.",
    required_integrations: ["Retell", "Telnyx", "CRM"],
  }, { now: NOW });
  const opportunities = translateFindingsToOpportunities(normalized, { now: NOW });
  const pkg = generateServiceDeliveryPackage(normalized, opportunities, { now: NOW });
  const workOrders = generateImplementationWorkOrders(pkg, { now: NOW, sequenceStart: 200 });

  assert.ok(workOrders.length >= 1);
  const wo = workOrders[0];
  assert.equal(wo.client_id, "client_voice");
  assert.equal(wo.source_request_id, normalized.request_id);
  assert.equal(wo.service_type, "ai_receptionist");
  assert.ok(wo.task_title);
  assert.ok(wo.task_description);
  assert.ok(wo.implementation_steps.length >= 2);
  assert.ok(["Hermes", "Codex", "Claude/Opus", "Cowork", "human", "n8n", "Retell", "Supabase", "Vercel", "Jonathan"].includes(wo.owner_route));
  assert.ok(["planned", "queued", "in_progress", "blocked", "completed", "failed", "needs_approval"].includes(wo.delivery_status));
  assert.ok(wo.blocker_reason.includes("Retell") || wo.blocker_reason.includes("Telnyx"));
  assert.ok(wo.evidence_requirements.includes("Retell agent config evidence"));
  assert.equal(wo.dashboard_visibility, true);
  assert.ok(wo.created_at);
  assert.ok(wo.updated_at);
});

test("dashboard export surfaces active blocked completed next-action owner and evidence state", () => {
  const dashboard = buildServiceDeliveryDashboardExport({
    service_requests: [
      { request_id: "req_active", client: { company_name: "A" }, service_key: "lead_follow_up_automation", status: "active" },
    ],
    delivery_packages: [
      { package_id: "pkg_1", source_request_id: "req_active", service_key: "lead_follow_up_automation", summary: "Lead follow-up package" },
    ],
    work_orders: [
      { id: "WO-active", delivery_status: "queued", owner_route: "Codex", next_action: "Build workflow", evidence_requirements: ["test output"], evidence: [] },
      { id: "WO-blocked", delivery_status: "blocked", owner_route: "Retell", blocker_reason: "Retell credentials missing", next_action: "Collect credentials", evidence_requirements: ["number evidence"], evidence: [] },
      { id: "WO-done", delivery_status: "completed", owner_route: "Hermes", next_action: "Monitor", evidence_requirements: ["accepted evidence"], evidence: [{ reference: "event_1" }] },
    ],
  }, { now: NOW });

  assert.equal(dashboard.active_service_requests.length, 1);
  assert.equal(dashboard.delivery_packages.length, 1);
  assert.equal(dashboard.implementation_work_orders.length, 3);
  assert.equal(dashboard.blocked_items.length, 1);
  assert.equal(dashboard.completed_items.length, 1);
  assert.equal(dashboard.next_actions.length, 3);
  assert.equal(dashboard.evidence_records.length, 1);
  assert.equal(dashboard.client_facing_status.length, 1);
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
