import { buildWorkOrder } from "./workOrders.mjs";
import { inferIntegrations } from "./hermesBuildPacket.mjs";

export const SERVICE_KEYS = [
  "front_office_leak_check",
  "full_process_audit",
  "ai_receptionist",
  "missed_call_recovery",
  "lead_follow_up_automation",
  "estimate_follow_up_automation",
  "invoice_payment_follow_up_automation",
];

export const SERVICE_DELIVERY_CANONICAL_TABLES = {
  intake_and_audit: "process_scans",
  clients: "techops_clients",
  deployments: "client_deployments",
  implementation_work_orders: "techops_tickets",
  work_order_events: "techops_ticket_events",
  onboarding: "onboarding_sessions",
  hermes_actions: "hermes_opportunity_actions",
};

const COMMON_APPROVALS = [
  "Client-facing proposals, scopes, and final deliverables require Jonathan approval.",
  "Payment, pricing, and Stripe actions require Jonathan approval.",
  "Production automation activation requires Jonathan approval.",
];

const COMMON_TESTING = [
  "Run deterministic unit tests for translation, routing, and work-order generation.",
  "Run a dry-run or sandbox route check before any production activation.",
  "Attach evidence for build/test output and route checks.",
];

const COMMON_LAUNCH = [
  "Confirm client inputs and approved scope are complete.",
  "Launch in sandbox or limited pilot mode first.",
  "Record baseline metrics before launch and first monitoring checkpoint after launch.",
];

function service({
  service_key,
  name,
  problem_solved,
  required_intake_fields,
  default_deliverables,
  automation_opportunity_types,
  implementation_work_order_templates,
  required_integrations,
  monitoring_metrics,
  upsell_paths,
}) {
  return {
    service_key,
    name,
    problem_solved,
    required_intake_fields,
    default_deliverables,
    automation_opportunity_types,
    implementation_work_order_templates,
    required_integrations,
    approval_requirements: COMMON_APPROVALS,
    testing_checklist: COMMON_TESTING,
    launch_checklist: COMMON_LAUNCH,
    monitoring_metrics,
    upsell_paths,
  };
}

const SERVICES = [
  service({
    service_key: "front_office_leak_check",
    name: "Front Office Leak Check",
    problem_solved: "Finds where calls, leads, estimates, invoices, and handoffs leak revenue before selling implementation.",
    required_intake_fields: ["company_name", "contact_name", "email", "main_leak", "process_name", "current_process_description"],
    default_deliverables: ["Leak summary", "Current-state workflow map", "Recommended pilot path", "Implementation opportunity list"],
    automation_opportunity_types: ["missed_call_recovery", "lead_follow_up", "estimate_follow_up", "invoice_payment_follow_up", "crm_admin_update"],
    implementation_work_order_templates: [{ template_key: "leak_check_to_pilot", title: "Convert leak-check findings into pilot work order" }],
    required_integrations: ["process_scans", "Hermes service-delivery review", "Dashboard reporting"],
    monitoring_metrics: ["reports_ready", "reports_delivered", "pilots_scoped", "opportunities_converted"],
    upsell_paths: ["Full Process Audit", "AI Receptionist", "Lead Follow-Up Automation", "Estimate Follow-Up Automation"],
  }),
  service({
    service_key: "full_process_audit",
    name: "Full Process Audit",
    problem_solved: "Turns a broader operational process review into a prioritized automation roadmap.",
    required_intake_fields: ["company_name", "contact_name", "email", "process_name", "systems_used", "failure_impact"],
    default_deliverables: ["Current-state process map", "Future-state process map", "Automation roadmap", "Priority/risk ranking"],
    automation_opportunity_types: ["workflow_orchestration", "crm_admin_update", "handoff_routing", "reporting_dashboard"],
    implementation_work_order_templates: [{ template_key: "audit_to_roadmap", title: "Build process-audit automation roadmap packet" }],
    required_integrations: ["process_scans", "Client systems inventory", "Hermes build packets"],
    monitoring_metrics: ["audit_findings_count", "high_priority_gaps", "roadmap_items_opened", "time_to_packet"],
    upsell_paths: ["AI Receptionist", "Lead Follow-Up Automation", "Invoice/Payment Follow-Up Automation"],
  }),
  service({
    service_key: "ai_receptionist",
    name: "AI Receptionist",
    problem_solved: "Answers, qualifies, routes, and summarizes inbound calls when a human cannot catch them.",
    required_intake_fields: ["company_name", "contact_name", "phone", "business_hours", "call_handling_rules", "booking_rules"],
    default_deliverables: ["Call flow script", "Qualification rules", "Routing summary", "Pilot metric report"],
    automation_opportunity_types: ["ai_receptionist", "missed_call_recovery", "appointment_booking", "crm_call_summary"],
    implementation_work_order_templates: [{ template_key: "ai_receptionist_pilot", title: "Implement AI receptionist pilot" }],
    required_integrations: ["Telephony / AI receptionist", "Calendar / scheduling", "CRM sync"],
    monitoring_metrics: ["answered_calls", "qualified_calls", "booked_appointments", "handoff_accuracy"],
    upsell_paths: ["Missed Call Recovery", "Lead Follow-Up Automation", "Full Process Audit"],
  }),
  service({
    service_key: "missed_call_recovery",
    name: "Missed Call Recovery",
    problem_solved: "Catches missed calls and creates fast follow-up before leads go cold.",
    required_intake_fields: ["company_name", "contact_name", "phone_source", "missed_call_source", "follow_up_window"],
    default_deliverables: ["Missed-call trigger map", "Follow-up sequence", "Recovery dashboard", "Escalation rules"],
    automation_opportunity_types: ["missed_call_recovery", "sms_follow_up", "email_follow_up", "call_summary"],
    implementation_work_order_templates: [{ template_key: "missed_call_recovery", title: "Implement missed-call recovery rail" }],
    required_integrations: ["Telephony / call logs", "SMS rail", "Email rail", "CRM sync"],
    monitoring_metrics: ["missed_calls_detected", "responses_sent", "recovered_leads", "time_to_first_touch"],
    upsell_paths: ["AI Receptionist", "Lead Follow-Up Automation", "Estimate Follow-Up Automation"],
  }),
  service({
    service_key: "lead_follow_up_automation",
    name: "Lead Follow-Up Automation",
    problem_solved: "Keeps new leads moving with structured follow-up, ownership, and CRM visibility.",
    required_intake_fields: ["company_name", "contact_name", "lead_sources", "crm_name", "follow_up_rules"],
    default_deliverables: ["Lead follow-up workflow", "Owner routing rules", "Approved templates", "Follow-up metrics"],
    automation_opportunity_types: ["lead_follow_up", "crm_stage_sync", "owner_routing", "meeting_booking"],
    implementation_work_order_templates: [{ template_key: "lead_follow_up", title: "Implement lead follow-up automation" }],
    required_integrations: ["CRM sync", "Email rail", "Calendar / scheduling"],
    monitoring_metrics: ["new_leads_routed", "follow_ups_sent", "meetings_booked", "stale_leads"],
    upsell_paths: ["AI Receptionist", "Estimate Follow-Up Automation", "Full Process Audit"],
  }),
  service({
    service_key: "estimate_follow_up_automation",
    name: "Estimate Follow-Up Automation",
    problem_solved: "Prevents sent estimates from going untouched by triggering timely follow-up and owner escalation.",
    required_intake_fields: ["company_name", "contact_name", "estimate_source", "crm_name", "follow_up_cadence"],
    default_deliverables: ["Estimate status workflow", "Follow-up templates", "Escalation rules", "Win/loss reporting"],
    automation_opportunity_types: ["estimate_follow_up", "crm_stage_sync", "email_follow_up", "owner_escalation"],
    implementation_work_order_templates: [{ template_key: "estimate_follow_up", title: "Implement estimate follow-up automation" }],
    required_integrations: ["CRM sync", "Email rail", "Estimate or quoting system"],
    monitoring_metrics: ["estimates_sent", "follow_ups_completed", "estimate_response_rate", "won_estimates"],
    upsell_paths: ["Lead Follow-Up Automation", "Invoice/Payment Follow-Up Automation", "Full Process Audit"],
  }),
  service({
    service_key: "invoice_payment_follow_up_automation",
    name: "Invoice/Payment Follow-Up Automation",
    problem_solved: "Keeps invoices and payment reminders moving without unsafe payment authority automation.",
    required_intake_fields: ["company_name", "contact_name", "billing_system", "invoice_status_source", "payment_reminder_rules"],
    default_deliverables: ["Invoice follow-up workflow", "Reminder templates", "Approval-gated payment handoff", "Aging report"],
    automation_opportunity_types: ["invoice_payment_follow_up", "payment_reminder", "stripe_payment_handoff", "owner_escalation"],
    implementation_work_order_templates: [{ template_key: "invoice_payment_follow_up", title: "Implement invoice/payment follow-up automation" }],
    required_integrations: ["Payments (Stripe) - approval-gated", "Billing or accounting system", "Email rail"],
    monitoring_metrics: ["open_invoices", "reminders_sent", "payments_recovered", "aging_bucket_reduction"],
    upsell_paths: ["Full Process Audit", "Estimate Follow-Up Automation", "Client Success Reporting"],
  }),
];

const SERVICE_BY_KEY = new Map(SERVICES.map((item) => [item.service_key, item]));

const FINDING_TYPE_MAP = [
  { re: /ai.?receptionist|receptionist|answering/i, opportunity_type: "ai_receptionist", service_key: "ai_receptionist", execution_type: "production_change" },
  { re: /missed.?call|after.?hours|voicemail|phone/i, opportunity_type: "missed_call_recovery", service_key: "missed_call_recovery", execution_type: "workflow_change" },
  { re: /lead.*follow|slow.?follow|new.?lead|lead/i, opportunity_type: "lead_follow_up", service_key: "lead_follow_up_automation", execution_type: "workflow_change" },
  { re: /estimate|quote|proposal/i, opportunity_type: "estimate_follow_up", service_key: "estimate_follow_up_automation", execution_type: "workflow_change" },
  { re: /invoice|payment|billing|stripe/i, opportunity_type: "invoice_payment_follow_up", service_key: "invoice_payment_follow_up_automation", execution_type: "production_change" },
  { re: /audit|process|handoff|workflow/i, opportunity_type: "workflow_orchestration", service_key: "full_process_audit", execution_type: "analysis" },
];

const HIGH_RISK_INTEGRATION_RE = /stripe|payment|billing|production|n8n|telephony|retell|voice|external/i;
const MEDIUM_RISK_INTEGRATION_RE = /crm|email|sms|calendar|scheduling/i;

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return Array.from(new Set(asArray(values).map(clean).filter(Boolean)));
}

function normalizeRisk(value, integrations = [], executionType = "") {
  const risk = lower(value);
  if (risk === "critical" || risk === "high") return "high";
  if (risk === "medium") return "medium";
  const blob = `${integrations.join(" ")} ${executionType}`;
  if (HIGH_RISK_INTEGRATION_RE.test(blob)) return "high";
  if (MEDIUM_RISK_INTEGRATION_RE.test(blob)) return "medium";
  return "low";
}

function matchFindingType(type, text = "") {
  const blob = `${type} ${text}`;
  return FINDING_TYPE_MAP.find((rule) => rule.re.test(blob)) || FINDING_TYPE_MAP[FINDING_TYPE_MAP.length - 1];
}

function templateFor(serviceDef, opportunityType) {
  const templates = asArray(serviceDef.implementation_work_order_templates);
  return templates.find((template) => clean(template.template_key).includes(opportunityType)) || templates[0] || { template_key: "service_delivery", title: "Implement service-delivery automation" };
}

function sourceRefsFor(source = {}) {
  const refs = [SERVICE_DELIVERY_CANONICAL_TABLES.intake_and_audit, SERVICE_DELIVERY_CANONICAL_TABLES.hermes_actions];
  if (source.client?.canonical_table) refs.push(source.client.canonical_table);
  return unique(refs);
}

export function getServiceCatalog() {
  return SERVICES.map((serviceDef) => ({
    ...serviceDef,
    required_intake_fields: [...serviceDef.required_intake_fields],
    default_deliverables: [...serviceDef.default_deliverables],
    automation_opportunity_types: [...serviceDef.automation_opportunity_types],
    implementation_work_order_templates: serviceDef.implementation_work_order_templates.map((template) => ({ ...template })),
    required_integrations: [...serviceDef.required_integrations],
    approval_requirements: [...serviceDef.approval_requirements],
    testing_checklist: [...serviceDef.testing_checklist],
    launch_checklist: [...serviceDef.launch_checklist],
    monitoring_metrics: [...serviceDef.monitoring_metrics],
    upsell_paths: [...serviceDef.upsell_paths],
  }));
}

export function getServiceDefinition(serviceKey) {
  const found = SERVICE_BY_KEY.get(clean(serviceKey));
  if (!found) throw new Error(`Unknown OttoServ service: ${serviceKey}`);
  return getServiceCatalog().find((item) => item.service_key === found.service_key);
}

export function translateFindingsToOpportunities(source = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const client = source.client || {};
  const intake = source.intake || {};
  const sourceServiceKey = clean(source.service_key) || "front_office_leak_check";
  const findings = asArray(source.findings).length
    ? asArray(source.findings)
    : asArray(source.automation_opportunities_json).map((item) => {
        if (item && typeof item === "object") return item;
        return { type: item, evidence: item, severity: "medium" };
      });

  return findings.map((finding, index) => {
    const type = clean(finding.type || finding.opportunity_type || finding.kind);
    const evidence = clean(finding.evidence || finding.summary || finding.description || type);
    const matched = matchFindingType(type, evidence);
    const serviceDef = getServiceDefinition(matched.service_key || sourceServiceKey);
    const integrations = unique([
      ...inferIntegrations([type, evidence, intake.software_used, intake.current_process_description]),
      ...serviceDef.required_integrations,
    ]);
    const executionType = clean(finding.execution_type || matched.execution_type || "workflow_change");
    const risk = normalizeRisk(finding.severity || finding.risk_level, integrations, executionType);

    return {
      id: clean(finding.id) || `sdo-${clean(source.scan_id || source.id || "source")}-${index + 1}`,
      service_key: sourceServiceKey,
      recommended_service_key: serviceDef.service_key,
      service_name: serviceDef.name,
      client: {
        company_name: clean(client.company_name || source.company_name || source.company || "Unknown company"),
        contact_name: clean(client.contact_name || source.contact_name || source.contact),
        email: clean(client.email || source.email).toLowerCase(),
      },
      opportunity_type: matched.opportunity_type,
      problem_solved: serviceDef.problem_solved,
      evidence,
      severity: clean(finding.severity || "medium"),
      risk_level: risk,
      execution_type: executionType,
      required_integrations: integrations,
      default_deliverables: serviceDef.default_deliverables,
      approval_requirements: serviceDef.approval_requirements,
      testing_checklist: serviceDef.testing_checklist,
      launch_checklist: serviceDef.launch_checklist,
      monitoring_metrics: serviceDef.monitoring_metrics,
      upsell_paths: serviceDef.upsell_paths,
      source_refs: sourceRefsFor(source),
      intake_snapshot: {
        process_name: clean(intake.process_name || source.process_name),
        software_used: clean(intake.software_used || source.software_used),
        current_process_description: clean(intake.current_process_description || source.current_process_description),
      },
      created_at: now,
    };
  });
}

export function routeAssignment(input = {}) {
  const integrations = asArray(input.required_integrations);
  const executionType = lower(input.execution_type);
  const risk = normalizeRisk(input.risk_level, integrations, executionType);
  const blob = `${integrations.join(" ")} ${executionType}`;

  if (risk === "high" || /stripe|payment|pricing|production|external_send|client_facing/.test(blob)) {
    return {
      assignee: "Jonathan",
      queue: "approval_required",
      requires_approval: true,
      reason: "High-risk or authority-bearing action requires Jonathan before execution.",
    };
  }
  if (/browser|research|outreach|manual_web/.test(executionType)) {
    return {
      assignee: "Cowork",
      queue: "cowork_queue",
      requires_approval: false,
      reason: "Browser/manual execution is routed to Cowork for controlled handling.",
    };
  }
  if (/code|workflow|implementation|dry_run|n8n/.test(`${executionType} ${blob}`)) {
    return {
      assignee: "Codex/Claude Code",
      queue: "implementation_work_orders",
      requires_approval: false,
      reason: "Build or workflow-spec work belongs to Codex/Claude Code before approval-gated launch.",
    };
  }
  return {
    assignee: "Hermes",
    queue: "hermes_actions",
    requires_approval: false,
    reason: "Low-risk internal analysis and orchestration can be queued by Hermes.",
  };
}

export function evaluateExecutionReadiness(input = {}) {
  const route = routeAssignment(input);
  const blocked = [];
  const requiresApproval = route.requires_approval || normalizeRisk(input.risk_level, input.required_integrations, input.execution_type) === "high";
  if (requiresApproval && !input.approval_id) blocked.push("approval_required");
  return {
    can_queue: blocked.length === 0,
    requires_approval: requiresApproval,
    blocked_reasons: blocked,
    route,
  };
}

export function generateImplementationWorkOrders(opportunities = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const sequenceStart = Number(options.sequenceStart || 0);
  return asArray(opportunities).map((opportunity, index) => {
    const serviceDef = getServiceDefinition(opportunity.recommended_service_key || opportunity.service_key);
    const template = templateFor(serviceDef, opportunity.opportunity_type);
    const route = routeAssignment(opportunity);
    const readiness = evaluateExecutionReadiness(opportunity);
    const company = clean(opportunity.client?.company_name || opportunity.company || "Unknown company");
    const approvalRequired = readiness.requires_approval || asArray(opportunity.approval_requirements).length > 0;
    const workOrder = buildWorkOrder(
      {
        title: `${serviceDef.name}: ${clean(template.title)}`,
        client: company,
        property: company,
        description: clean(opportunity.evidence) || serviceDef.problem_solved,
        category: "Other",
        priority: opportunity.risk_level === "high" ? "high" : "medium",
        source: "ai_created",
        contactName: clean(opportunity.client?.contact_name),
        contactEmail: clean(opportunity.client?.email),
        approvalRequired,
        approvalStatus: approvalRequired ? "pending" : "not_required",
        automationOptions: { aiSummary: true, followUpReminder: true, requireCloseout: true },
      },
      { now, sequence: sequenceStart + index + 1, actor: options.actor || "ServiceDeliverySpine" },
    );

    return {
      ...workOrder,
      canonical_table: SERVICE_DELIVERY_CANONICAL_TABLES.implementation_work_orders,
      canonical_event_table: SERVICE_DELIVERY_CANONICAL_TABLES.work_order_events,
      engagement_type: "service_delivery_automation",
      service_key: serviceDef.service_key,
      source_opportunity_id: clean(opportunity.id),
      opportunity_type: clean(opportunity.opportunity_type),
      required_integrations: asArray(opportunity.required_integrations),
      implementation: {
        template_key: clean(template.template_key),
        template_title: clean(template.title),
        assignment: route,
        readiness,
        default_deliverables: asArray(opportunity.default_deliverables),
        approval_requirements: asArray(opportunity.approval_requirements),
        testing_checklist: asArray(opportunity.testing_checklist),
        launch_checklist: asArray(opportunity.launch_checklist),
        monitoring_metrics: asArray(opportunity.monitoring_metrics),
        upsell_paths: asArray(opportunity.upsell_paths),
        source_refs: asArray(opportunity.source_refs),
      },
    };
  });
}
