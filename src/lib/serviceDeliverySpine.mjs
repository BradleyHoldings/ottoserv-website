import { buildWorkOrder } from "./workOrders.mjs";
import { inferIntegrations } from "./hermesBuildPacket.mjs";

export const SERVICE_KEYS = [
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
    service_key: "internal_process_automation",
    name: "Internal Process Automation",
    problem_solved: "Turns recurring internal handoffs, task reminders, updates, and operator queues into controlled workflows.",
    required_intake_fields: ["company_name", "process_name", "current_process_description", "systems_used", "approval_owner"],
    default_deliverables: ["Internal workflow map", "Automation build plan", "Operator handoff rules", "Evidence dashboard"],
    automation_opportunity_types: ["internal_handoff", "task_reminders", "workflow_orchestration", "customer_updates"],
    implementation_work_order_templates: [{ template_key: "internal_process_automation", title: "Implement internal process automation workflow" }],
    required_integrations: ["n8n workflow request", "Hermes queue", "Dashboard reporting"],
    monitoring_metrics: ["handoffs_routed", "tasks_completed", "blocked_items", "manual_minutes_removed"],
    upsell_paths: ["Reporting/Dashboard Automation", "SOP/Process Mapping", "Full Process Audit"],
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
    service_key: "form_submission_workflow_automation",
    name: "Form Submission Workflow Automation",
    problem_solved: "Captures form submissions, validates them, routes ownership, and syncs CRM or task queues.",
    required_intake_fields: ["company_name", "form_source", "crm_name", "routing_rules", "owner"],
    default_deliverables: ["Form intake map", "Validation and routing workflow", "CRM/task sync plan", "Submission dashboard"],
    automation_opportunity_types: ["form_intake", "crm_stage_sync", "owner_routing", "customer_updates"],
    implementation_work_order_templates: [{ template_key: "form_submission_workflow", title: "Implement form submission workflow automation" }],
    required_integrations: ["Website/forms", "CRM sync", "n8n workflow request", "Dashboard reporting"],
    monitoring_metrics: ["forms_received", "forms_routed", "crm_records_created", "stale_submissions"],
    upsell_paths: ["Lead Follow-Up Automation", "Scheduling Request Automation", "Reporting/Dashboard Automation"],
  }),
  service({
    service_key: "scheduling_request_automation",
    name: "Scheduling Request Automation",
    problem_solved: "Routes scheduling requests into calendar-ready handoffs without unsafe calendar writes.",
    required_intake_fields: ["company_name", "calendar_system", "booking_rules", "service_area", "approval_owner"],
    default_deliverables: ["Scheduling request workflow", "Booking handoff rules", "Calendar approval gate", "Scheduling status dashboard"],
    automation_opportunity_types: ["scheduling", "appointment_scheduler", "meeting_booking", "owner_routing"],
    implementation_work_order_templates: [{ template_key: "scheduling_request_workflow", title: "Implement scheduling request automation" }],
    required_integrations: ["Calendar / scheduling", "CRM sync", "Email rail", "Dashboard reporting"],
    monitoring_metrics: ["requests_routed", "appointments_ready_for_confirmation", "scheduling_backlog", "time_to_scheduling_handoff"],
    upsell_paths: ["AI Receptionist", "Lead Follow-Up Automation", "Internal Process Automation"],
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
    service_key: "crm_pipeline_cleanup_automation",
    name: "CRM/Pipeline Cleanup or Automation",
    problem_solved: "Finds stale CRM records, routes cleanup, and automates pipeline stage hygiene.",
    required_intake_fields: ["company_name", "crm_name", "pipeline_stages", "cleanup_rules", "owner"],
    default_deliverables: ["CRM hygiene rules", "Pipeline cleanup work queue", "Stage movement automation plan", "Exception report"],
    automation_opportunity_types: ["crm_hygiene", "pipeline_stage_movement", "task_reminders", "reporting_visibility"],
    implementation_work_order_templates: [{ template_key: "crm_pipeline_cleanup", title: "Implement CRM/pipeline cleanup automation" }],
    required_integrations: ["CRM sync", "Supabase schema/update", "Hermes queue", "Dashboard reporting"],
    monitoring_metrics: ["stale_records_found", "records_cleaned", "stage_updates", "owner_exceptions"],
    upsell_paths: ["Reporting/Dashboard Automation", "Lead Follow-Up Automation", "Full Process Audit"],
  }),
  service({
    service_key: "sop_process_mapping",
    name: "SOP/Process Mapping",
    problem_solved: "Documents current and future-state processes so automation work has clear ownership and acceptance criteria.",
    required_intake_fields: ["company_name", "process_name", "current_process_description", "owners", "exceptions"],
    default_deliverables: ["Current-state SOP", "Future-state process map", "Exception and escalation rules", "Automation readiness checklist"],
    automation_opportunity_types: ["sop_process_documentation", "internal_handoff", "human_operator_escalation"],
    implementation_work_order_templates: [{ template_key: "sop_process_mapping", title: "Create SOP/process map and automation handoff" }],
    required_integrations: ["Documentation", "Hermes review", "Dashboard reporting"],
    monitoring_metrics: ["sops_created", "handoffs_documented", "automation_ready_steps", "exceptions_open"],
    upsell_paths: ["Internal Process Automation", "Full Process Audit", "Reporting/Dashboard Automation"],
  }),
  service({
    service_key: "reporting_dashboard_automation",
    name: "Reporting/Dashboard Automation",
    problem_solved: "Turns process and automation status into dashboard-visible metrics, blockers, and next actions.",
    required_intake_fields: ["company_name", "metrics_needed", "data_sources", "audience", "refresh_cadence"],
    default_deliverables: ["Dashboard data contract", "Status rollup", "Blocked/completed item views", "Metric acceptance checklist"],
    automation_opportunity_types: ["reporting_visibility", "dashboard_reporting", "customer_updates"],
    implementation_work_order_templates: [{ template_key: "reporting_dashboard", title: "Implement reporting/dashboard automation" }],
    required_integrations: ["Dashboard update", "Supabase schema/update", "Hermes command center"],
    monitoring_metrics: ["status_rows_visible", "blocked_items_visible", "completed_items_visible", "metric_refreshes"],
    upsell_paths: ["Existing Client Expansion/Optimization", "Internal Process Automation", "Client Success Reporting"],
  }),
  service({
    service_key: "existing_client_expansion_optimization",
    name: "Existing-Client Expansion or Optimization Requests",
    problem_solved: "Converts optimization requests from existing clients into scoped expansion packages and work orders.",
    required_intake_fields: ["client_id", "company_name", "request_summary", "current_service", "desired_outcome"],
    default_deliverables: ["Optimization summary", "Expansion scope", "Backlog and dependency review", "Evidence-backed next step"],
    automation_opportunity_types: ["existing_client_optimization", "reporting_visibility", "workflow_orchestration"],
    implementation_work_order_templates: [{ template_key: "existing_client_expansion", title: "Scope existing-client optimization request" }],
    required_integrations: ["Client deployments", "Hermes client success", "Dashboard reporting"],
    monitoring_metrics: ["optimization_requests", "expansion_scopes_created", "approved_changes", "client_success_followups"],
    upsell_paths: ["Reporting/Dashboard Automation", "Full Process Audit", "Internal Process Automation"],
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
  { re: /voice.?receptionist|ai.?receptionist|receptionist|answering/i, opportunity_type: "voice_receptionist", service_key: "ai_receptionist", execution_type: "production_change" },
  { re: /missed.?call|after.?hours|voicemail|phone/i, opportunity_type: "missed_call_recovery", service_key: "missed_call_recovery", execution_type: "workflow_change" },
  { re: /form|submission|intake/i, opportunity_type: "form_intake", service_key: "form_submission_workflow_automation", execution_type: "workflow_change" },
  { re: /schedul|booking|appointment/i, opportunity_type: "scheduling", service_key: "scheduling_request_automation", execution_type: "workflow_change" },
  { re: /lead.*follow|speed.?to.?lead|slow.?follow|new.?lead|lead/i, opportunity_type: "speed_to_lead", service_key: "lead_follow_up_automation", execution_type: "workflow_change" },
  { re: /estimate|quote|proposal/i, opportunity_type: "estimate_follow_up", service_key: "estimate_follow_up_automation", execution_type: "workflow_change" },
  { re: /invoice|payment|billing|stripe/i, opportunity_type: "invoice_payment_follow_up", service_key: "invoice_payment_follow_up_automation", execution_type: "production_change" },
  { re: /crm|pipeline|stage|hygiene|cleanup/i, opportunity_type: "crm_hygiene", service_key: "crm_pipeline_cleanup_automation", execution_type: "workflow_change" },
  { re: /task.?reminder|reminder/i, opportunity_type: "task_reminders", service_key: "internal_process_automation", execution_type: "workflow_change" },
  { re: /customer.?update|status.?update/i, opportunity_type: "customer_updates", service_key: "internal_process_automation", execution_type: "workflow_change" },
  { re: /process_handoff/i, opportunity_type: "workflow_orchestration", service_key: "full_process_audit", execution_type: "analysis" },
  { re: /report|dashboard|visibility|metric/i, opportunity_type: "reporting_visibility", service_key: "reporting_dashboard_automation", execution_type: "code_change" },
  { re: /sop|documentation|process.?map|mapping/i, opportunity_type: "sop_process_documentation", service_key: "sop_process_mapping", execution_type: "analysis" },
  { re: /handoff|internal.?handoff/i, opportunity_type: "internal_handoff", service_key: "internal_process_automation", execution_type: "workflow_change" },
  { re: /outbound.?call/i, opportunity_type: "outbound_call_support", service_key: "ai_receptionist", execution_type: "analysis" },
  { re: /human|operator|escalat/i, opportunity_type: "human_operator_escalation", service_key: "sop_process_mapping", execution_type: "manual_action" },
  { re: /optimization|expansion|existing.?client/i, opportunity_type: "existing_client_optimization", service_key: "existing_client_expansion_optimization", execution_type: "analysis" },
  { re: /audit|process|workflow|automation/i, opportunity_type: "workflow_orchestration", service_key: "full_process_audit", execution_type: "analysis" },
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
  const exact = clean(type);
  const direct = FINDING_TYPE_MAP.find((rule) => rule.opportunity_type === exact);
  if (direct) return direct;
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
  if (source.onboarding_id || source.source_signal?.onboarding_id) refs.push(SERVICE_DELIVERY_CANONICAL_TABLES.onboarding);
  return unique(refs);
}

function inferServiceKey(input = {}) {
  const explicit = clean(input.service_key || input.requested_service_key || input.selected_service);
  if (SERVICE_BY_KEY.has(explicit)) return explicit;
  const selected = asArray(input.selected_services)[0];
  if (SERVICE_BY_KEY.has(clean(selected))) return clean(selected);
  const requested = lower(input.requested_service || input.instruction || input.request_summary);
  if (/invoice|payment|billing/.test(requested)) return "invoice_payment_follow_up_automation";
  if (/internal process automation|internal workflow|internal handoff/.test(requested)) return "internal_process_automation";
  if (/reporting dashboard|dashboard automation|reporting automation/.test(requested)) return "reporting_dashboard_automation";
  if (/receptionist|voice agent|\bvoice\b|retell/.test(requested)) return "ai_receptionist";
  if (/missed.?call/.test(requested)) return "missed_call_recovery";
  if (/form submission|form intake/.test(requested)) return "form_submission_workflow_automation";
  if (/scheduling request|appointment|booking/.test(requested)) return "scheduling_request_automation";
  if (/crm|pipeline/.test(requested)) return "crm_pipeline_cleanup_automation";
  if (/sop|process mapping|process map/.test(requested)) return "sop_process_mapping";
  if (/existing.?client|expansion|optimization/.test(requested)) return "existing_client_expansion_optimization";
  const text = [
    input.source_type,
    input.requested_service,
    input.instruction,
    input.request_summary,
    input.summary,
    input.main_leak,
    input.current_process_description,
    input.intake?.current_process_description,
    asArray(input.automation_opportunities_json).map((item) => typeof item === "object" ? JSON.stringify(item) : item).join(" "),
    asArray(input.findings).map((item) => typeof item === "object" ? `${item.type} ${item.evidence} ${item.description}` : item).join(" "),
  ].join(" ");
  if (/front.?office|leak.?check/i.test(text)) return "front_office_leak_check";
  if (/full.?process.?audit|audit/i.test(text)) return "full_process_audit";
  if (/missed.?call|voicemail/i.test(text)) return "missed_call_recovery";
  if (/form|submission|intake/i.test(text)) return "form_submission_workflow_automation";
  if (/schedul|appointment|booking/i.test(text)) return "scheduling_request_automation";
  if (/lead|speed.?to.?lead/i.test(text)) return "lead_follow_up_automation";
  if (/invoice|payment|billing/i.test(text)) return "invoice_payment_follow_up_automation";
  if (/receptionist|\bvoice\b|retell|answering/i.test(text)) return "ai_receptionist";
  if (/crm|pipeline|cleanup|stage/i.test(text)) return "crm_pipeline_cleanup_automation";
  if (/sop|process.?map|documentation/i.test(text)) return "sop_process_mapping";
  if (/report|dashboard|visibility/i.test(text)) return "reporting_dashboard_automation";
  if (/existing.?client|expansion|optimization/i.test(text)) return "existing_client_expansion_optimization";
  if (/estimate|quote|proposal/i.test(text)) return "estimate_follow_up_automation";
  if (/internal|handoff|task.?reminder|customer.?update|workflow/i.test(text)) return "internal_process_automation";
  return "front_office_leak_check";
}

function priorityFor(input = {}, serviceKey = "") {
  const text = lower(`${input.urgency} ${input.severity} ${input.main_leak} ${input.instruction} ${input.request_summary}`);
  if (/critical|urgent|high|missed.?call|payment|voice|retell|production/.test(text) || ["ai_receptionist", "missed_call_recovery", "invoice_payment_follow_up_automation"].includes(serviceKey)) return "high";
  if (/low|later|backlog/.test(text)) return "low";
  return "medium";
}

function sourceTypeFor(input = {}) {
  if (input.source_type) return clean(input.source_type);
  if (input.onboarding_id || input.paid || input.payment_id) return "paid_onboarding";
  if (input.audit_id) return "full_process_audit";
  if (input.scan_id || input.main_leak || input.automation_opportunities_json) return "front_office_leak_check";
  if (input.dashboard_request_id) return "dashboard_request";
  if (input.conversation_id || input.summary) return "conversation_summary";
  return "manual_hermes_instruction";
}

function normalizedFindings(input = {}, serviceKey = "") {
  const findings = asArray(input.findings).length ? asArray(input.findings) : asArray(input.automation_opportunities_json);
  if (findings.length) {
    return findings.map((item) => {
      if (item && typeof item === "object") return item;
      return { type: clean(item), evidence: clean(item), severity: priorityFor(input, serviceKey) };
    });
  }
  const text = clean(input.instruction || input.request_summary || input.summary || input.current_process_description || input.main_leak || getServiceDefinition(serviceKey).problem_solved);
  const inferred = [];
  if (/handoff/i.test(text)) inferred.push({ type: "internal_handoff", evidence: text, severity: priorityFor(input, serviceKey) });
  if (/customer.?update|status.?update/i.test(text)) inferred.push({ type: "customer_updates", evidence: text, severity: priorityFor(input, serviceKey) });
  if (/task.?reminder|reminder/i.test(text)) inferred.push({ type: "task_reminders", evidence: text, severity: priorityFor(input, serviceKey) });
  if (/dashboard|report|visibility/i.test(text)) inferred.push({ type: "reporting", evidence: text, severity: priorityFor(input, serviceKey) });
  return inferred.length ? inferred : [{ type: serviceKey, evidence: text, severity: priorityFor(input, serviceKey) }];
}

function requiredHumanApprovalFor(input = {}, serviceKey = "") {
  const text = `${serviceKey} ${asArray(input.required_integrations).join(" ")} ${input.instruction || ""}`;
  const approvals = [];
  if (/stripe|payment|billing|pricing/i.test(text)) approvals.push("Payment, billing, and pricing actions require Jonathan approval.");
  if (/retell|telnyx|voice|number|call routing/i.test(text)) approvals.push("Retell/Telnyx number provisioning and live call routing require approval and credentials.");
  if (/n8n|production|deploy|external/i.test(text)) approvals.push("Production workflow deployment requires approval.");
  return unique([...approvals, ...COMMON_APPROVALS]);
}

function expectedBlockedItems(input = {}, serviceKey = "") {
  const integrations = unique([...(asArray(input.required_integrations)), ...getServiceDefinition(serviceKey).required_integrations]);
  const blocked = [];
  if (integrations.some((item) => /retell|telnyx|telephony|phone/i.test(item))) blocked.push("Retell/Telnyx credentials, number assignment, or live routing approval needed before provisioning.");
  if (integrations.some((item) => /stripe|payment|billing/i.test(item))) blocked.push("Payment/billing changes need approval and payment-system evidence.");
  if (integrations.some((item) => /n8n|production/i.test(item))) blocked.push("Production n8n activation is blocked until approval and workflow evidence exist.");
  return unique(blocked);
}

export function normalizeServiceDeliverySignal(signal = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const serviceKey = inferServiceKey(signal);
  const serviceDef = getServiceDefinition(serviceKey);
  const sourceType = sourceTypeFor(signal);
  const client = signal.client || {};
  const company = clean(client.company_name || signal.company_name || signal.company || "Unknown company");
  const requestId = clean(signal.request_id || signal.id || signal.scan_id || signal.audit_id || signal.onboarding_id || `${sourceType}:${company}:${serviceKey}`);
  const integrations = unique([...(asArray(signal.required_integrations)), ...inferIntegrations([
    signal.software_used,
    signal.current_process_description,
    signal.instruction,
    signal.request_summary,
    signal.summary,
    asArray(signal.selected_services).join(" "),
  ]), ...serviceDef.required_integrations]);

  return {
    ...signal,
    request_id: requestId,
    id: clean(signal.id || signal.scan_id || signal.audit_id || signal.onboarding_id || requestId),
    service_key: serviceKey,
    urgency: priorityFor(signal, serviceKey),
    client: {
      client_id: clean(client.client_id || signal.client_id),
      company_name: company,
      contact_name: clean(client.contact_name || signal.contact_name || signal.contact),
      email: clean(client.email || signal.email).toLowerCase(),
    },
    source_signal: {
      source_type: sourceType,
      source_id: requestId,
      scan_id: clean(signal.scan_id),
      audit_id: clean(signal.audit_id),
      onboarding_id: clean(signal.onboarding_id),
      dashboard_request_id: clean(signal.dashboard_request_id),
      conversation_id: clean(signal.conversation_id),
    },
    affected_business_process: clean(signal.process_name || signal.intake?.process_name || signal.requested_service || serviceDef.name),
    current_pain_or_waste: clean(signal.current_pain_or_waste || signal.main_leak || signal.current_process_description || signal.instruction || signal.request_summary || signal.summary || serviceDef.problem_solved),
    recommended_ottoserv_service: serviceDef.name,
    required_integrations: integrations,
    required_human_approval: requiredHumanApprovalFor(signal, serviceKey),
    safe_autonomous_next_actions: [
      "Generate service delivery plan.",
      "Create implementation work orders and evidence requirements.",
      "Prepare internal handoff packets without live external changes.",
    ],
    blocked_items: expectedBlockedItems(signal, serviceKey),
    expected_deliverables: serviceDef.default_deliverables,
    findings: normalizedFindings(signal, serviceKey),
    intake: {
      ...(signal.intake || {}),
      process_name: clean(signal.process_name || signal.intake?.process_name || serviceDef.name),
      software_used: clean(signal.software_used || signal.intake?.software_used || integrations.join(", ")),
      current_process_description: clean(signal.current_process_description || signal.intake?.current_process_description || signal.current_pain_or_waste || serviceDef.problem_solved),
    },
    created_at: now,
  };
}

function opportunityProfile(opportunityType, serviceDef) {
  const title = clean(opportunityType).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title,
    business_problem: `${title} gap creates delays, lost revenue, or unclear ownership.`,
    recommended_solution: `Use OttoServ ${serviceDef.name} to create an approval-aware workflow, handoff, and evidence trail.`,
    estimated_impact: "Reduces manual follow-up, improves response speed, and makes status visible.",
    complexity: /voice|payment|crm|n8n|retell|stripe/i.test(`${opportunityType} ${serviceDef.required_integrations.join(" ")}`) ? "medium" : "low",
    dependencies: serviceDef.required_integrations,
    implementation_steps: [
      "Confirm inputs, systems, owners, and approval boundaries.",
      "Prepare workflow/configuration packet and route to the assigned implementation owner.",
      "Verify with test output, dashboard status, and completion evidence before closeout.",
    ],
    required_systems: serviceDef.required_integrations,
    owner_agent: /voice|retell/i.test(opportunityType) ? "Retell" : /dashboard|report/i.test(opportunityType) ? "Codex" : "Hermes",
    evidence_required_for_completion: [
      "Work-order event showing implementation packet created.",
      "Test, configuration, or dashboard evidence accepted before completion.",
    ],
  };
}

export function matchImplementationTemplate(input = {}) {
  const type = clean(input.opportunity_type || input.type);
  const integrations = asArray(input.required_integrations);
  const blob = `${type} ${integrations.join(" ")}`;
  const decision = { decision: "route_work_order", matched_template: type || "service_delivery", work_order_route: "Hermes" };
  if (/missed_call_recovery/.test(blob)) return { ...decision, fulfillment: "existing_n8n_workflow", work_order_route: "n8n", capability: "missed-call recovery workflow template" };
  if (/form_intake/.test(blob)) return { ...decision, fulfillment: "modified_n8n_workflow", work_order_route: "n8n", capability: "form-intake workflow template" };
  if (/customer_updates/.test(blob)) return { ...decision, fulfillment: "new_n8n_workflow_request", work_order_route: "n8n", capability: "customer update workflow request" };
  if (/voice_receptionist/.test(blob)) return { ...decision, fulfillment: "existing_retell_agent_template", work_order_route: "Retell", capability: "receptionist Retell template" };
  if (/appointment_scheduler/.test(blob)) return { ...decision, fulfillment: "new_retell_agent_configuration", work_order_route: "Retell", capability: "scheduler voice configuration" };
  if (/reporting_visibility|dashboard_reporting/.test(blob)) return { ...decision, fulfillment: "dashboard_update", work_order_route: "Codex", capability: "Hermes dashboard export/update" };
  if (/crm_hygiene|pipeline_stage_movement/.test(blob)) return { ...decision, fulfillment: "supabase_schema_or_update", work_order_route: "Supabase", capability: "canonical CRM/pipeline records" };
  if (/sop_process_documentation/.test(blob)) return { ...decision, fulfillment: "sop_documentation", work_order_route: "Hermes", capability: "SOP/process map packet" };
  if (/internal_handoff/.test(blob)) return { ...decision, fulfillment: "codex_implementation", work_order_route: "Codex", capability: "implementation handoff packet" };
  if (/outbound_call_support/.test(blob)) return { ...decision, fulfillment: "claude_or_opus_implementation", work_order_route: "Claude/Opus", capability: "call-support script/config implementation" };
  if (/human_operator_escalation/.test(blob)) return { ...decision, fulfillment: "human_action", work_order_route: "human", capability: "human approval/escalation queue" };
  if (/retell|voice/i.test(blob)) return { ...decision, fulfillment: "new_retell_agent_configuration", work_order_route: "Retell", capability: "voice-agent configuration" };
  if (/n8n|workflow/i.test(blob)) return { ...decision, fulfillment: "new_n8n_workflow_request", work_order_route: "n8n", capability: "workflow request" };
  return { ...decision, fulfillment: "codex_implementation", work_order_route: "Codex", capability: "implementation package" };
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
    const profile = opportunityProfile(matched.opportunity_type, serviceDef);
    const templateMatch = matchImplementationTemplate({ opportunity_type: matched.opportunity_type, required_integrations: integrations });

    return {
      id: clean(finding.id) || `sdo-${clean(source.scan_id || source.id || "source")}-${index + 1}`,
      request_id: clean(source.request_id || source.id || source.scan_id || source.audit_id),
      service_key: sourceServiceKey,
      recommended_service_key: serviceDef.service_key,
      service_name: serviceDef.name,
      client: {
        client_id: clean(client.client_id || source.client_id),
        company_name: clean(client.company_name || source.company_name || source.company || "Unknown company"),
        contact_name: clean(client.contact_name || source.contact_name || source.contact),
        email: clean(client.email || source.email).toLowerCase(),
      },
      opportunity_type: matched.opportunity_type,
      title: clean(finding.title) || profile.title,
      business_problem: clean(finding.business_problem) || profile.business_problem,
      recommended_solution: clean(finding.recommended_solution) || profile.recommended_solution,
      estimated_impact: clean(finding.estimated_impact) || profile.estimated_impact,
      complexity: clean(finding.complexity) || profile.complexity,
      dependencies: unique([...(asArray(finding.dependencies)), ...profile.dependencies]),
      implementation_steps: asArray(finding.implementation_steps).length ? asArray(finding.implementation_steps) : profile.implementation_steps,
      required_systems: unique([...(asArray(finding.required_systems)), ...profile.required_systems]),
      owner_agent: clean(finding.owner_agent) || clean(templateMatch.work_order_route || profile.owner_agent),
      evidence_required_for_completion: asArray(finding.evidence_required_for_completion).length ? asArray(finding.evidence_required_for_completion) : profile.evidence_required_for_completion,
      template_match: templateMatch,
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
      blocked_items: asArray(source.blocked_items),
      safe_autonomous_next_actions: asArray(source.safe_autonomous_next_actions),
      created_at: now,
    };
  });
}

export function generateServiceDeliveryPackage(normalizedRequest = {}, opportunities = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const serviceKey = clean(normalizedRequest.service_key) || "front_office_leak_check";
  const serviceDef = getServiceDefinition(serviceKey);
  const opps = asArray(opportunities);
  const voiceNeeded = opps.some((opportunity) => /voice|receptionist|missed_call/i.test(`${opportunity.opportunity_type} ${opportunity.recommended_service_key}`));
  return {
    package_id: `sdp_${clean(normalizedRequest.request_id || normalizedRequest.id || serviceKey).replace(/[^a-zA-Z0-9_:-]+/g, "_")}`,
    source_request_id: clean(normalizedRequest.request_id || normalizedRequest.id),
    generated_at: now,
    client: normalizedRequest.client || {},
    service_key: serviceKey,
    service_type: serviceKey,
    summary: `${serviceDef.name} package for ${clean(normalizedRequest.client?.company_name) || "client"}: ${clean(normalizedRequest.current_pain_or_waste) || serviceDef.problem_solved}`,
    recommended_service_tier: serviceKey === "front_office_leak_check" ? "diagnostic_to_pilot" : voiceNeeded ? "implementation_with_voice_provisioning_gate" : "implementation",
    scope_of_work: unique([
      serviceDef.problem_solved,
      "Normalize intake, translate opportunities, create implementation work orders, and require evidence before completion.",
      ...opps.map((opportunity) => opportunity.business_problem),
    ]),
    deliverables: unique([...(asArray(normalizedRequest.expected_deliverables)), ...serviceDef.default_deliverables]),
    implementation_plan: unique(opps.flatMap((opportunity) => asArray(opportunity.implementation_steps))).length
      ? unique(opps.flatMap((opportunity) => asArray(opportunity.implementation_steps)))
      : ["Confirm scope and dependencies.", "Create routed work orders.", "Verify evidence and dashboard status."],
    client_inputs_needed: unique([...(serviceDef.required_intake_fields), ...(asArray(normalizedRequest.blocked_items))]),
    automations_to_build_or_configure: unique(opps.map((opportunity) => opportunity.recommended_solution)),
    voice_agents_to_configure: voiceNeeded ? ["Retell/Telnyx voice setup packet, number assignment work order, test-call evidence requirement"] : [],
    internal_workflows_to_configure: unique(opps.filter((opportunity) => /workflow|handoff|task|customer|crm|pipeline|form|schedul/i.test(opportunity.opportunity_type)).map((opportunity) => opportunity.title)),
    dashboard_reporting_changes: ["Expose service request, package, work-order, blocker, evidence, owner, and next-action status."],
    acceptance_criteria: [
      "All generated work orders have an owner route, status, blocker state, and evidence requirements.",
      "Blocked external actions remain blocked until approval/credentials evidence exists.",
      "Dashboard export includes active, blocked, completed, owner, next action, and evidence records.",
    ],
    completion_evidence_requirements: unique([
      ...opps.flatMap((opportunity) => asArray(opportunity.evidence_required_for_completion)),
      "Dashboard-readable status export created.",
    ]),
    follow_up_expansion_opportunities: serviceDef.upsell_paths,
    required_integrations: unique([...(asArray(normalizedRequest.required_integrations)), ...opps.flatMap((opportunity) => asArray(opportunity.required_integrations))]),
    required_human_approval: unique([...(asArray(normalizedRequest.required_human_approval)), ...opps.flatMap((opportunity) => asArray(opportunity.approval_requirements))]),
    blocked_items: unique([...(asArray(normalizedRequest.blocked_items)), ...opps.flatMap((opportunity) => asArray(opportunity.blocked_items))]),
    opportunities: opps,
  };
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

function deliveryStatusFor(readiness, blockerReason = "") {
  if (blockerReason) return "blocked";
  if (readiness?.requires_approval) return "needs_approval";
  if (readiness?.can_queue) return "queued";
  return "planned";
}

function blockerReasonFor(opportunity = {}, deliveryPackage = {}) {
  const pkg = deliveryPackage || {};
  const blocked = unique([...(asArray(pkg.blocked_items)), ...(asArray(opportunity.blocked_items))]);
  const blob = `${asArray(opportunity.required_integrations).join(" ")} ${asArray(pkg.required_integrations).join(" ")}`;
  if (/retell|telnyx|telephony|phone/i.test(blob)) return blocked.find((item) => /retell|telnyx|phone|routing/i.test(item)) || "Retell/Telnyx credentials, number assignment, or live routing approval needed before provisioning.";
  if (/stripe|payment|billing/i.test(blob)) return blocked.find((item) => /payment|billing|stripe/i.test(item)) || "Payment/billing changes require approval and payment-system evidence.";
  if (/production.*n8n|n8n.*production/i.test(blob)) return blocked.find((item) => /n8n|production/i.test(item)) || "Production n8n activation requires approval and workflow evidence.";
  return blocked[0] || "";
}

function workOrderInputList(input) {
  if (Array.isArray(input)) return { opportunities: input, deliveryPackage: null };
  if (input && typeof input === "object" && Array.isArray(input.opportunities)) return { opportunities: input.opportunities, deliveryPackage: input };
  return { opportunities: [], deliveryPackage: null };
}

export function generateImplementationWorkOrders(opportunities = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const sequenceStart = Number(options.sequenceStart || 0);
  const { opportunities: list, deliveryPackage } = workOrderInputList(opportunities);
  return asArray(list).map((opportunity, index) => {
    const serviceDef = getServiceDefinition(opportunity.recommended_service_key || opportunity.service_key);
    const template = templateFor(serviceDef, opportunity.opportunity_type);
    const route = routeAssignment(opportunity);
    const readiness = evaluateExecutionReadiness(opportunity);
    const company = clean(opportunity.client?.company_name || opportunity.company || "Unknown company");
    const approvalRequired = readiness.requires_approval || asArray(opportunity.approval_requirements).length > 0;
    const templateMatch = opportunity.template_match || matchImplementationTemplate(opportunity);
    const blockerReason = blockerReasonFor(opportunity, deliveryPackage);
    const deliveryStatus = deliveryStatusFor(readiness, blockerReason);
    const ownerRoute = clean(templateMatch.work_order_route) || clean(route.assignee) || "Hermes";
    const taskTitle = `${serviceDef.name}: ${clean(template.title)}`;
    const taskDescription = clean(opportunity.recommended_solution || opportunity.evidence) || serviceDef.problem_solved;
    const workOrder = buildWorkOrder(
      {
        title: taskTitle,
        client: company,
        property: company,
        description: taskDescription,
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
      work_order_id: workOrder.id,
      client_id: clean(opportunity.client?.client_id || deliveryPackage?.client?.client_id),
      source_request_id: clean(deliveryPackage?.source_request_id || opportunity.request_id || opportunity.source_opportunity_id || opportunity.id),
      service_type: serviceDef.service_key,
      task_title: taskTitle,
      task_description: taskDescription,
      implementation_steps: asArray(opportunity.implementation_steps),
      owner_route: ownerRoute,
      delivery_status: deliveryStatus,
      blocker_reason: blockerReason,
      evidence_requirements: unique([
        ...asArray(opportunity.evidence_required_for_completion),
        ...(serviceDef.service_key === "ai_receptionist" || /voice|retell/i.test(opportunity.opportunity_type) ? ["Retell agent config evidence", "Number assignment or number-needed evidence", "Test call evidence", "Dashboard status evidence"] : []),
      ]),
      dashboard_visibility: true,
      next_action: blockerReason ? `Resolve blocker: ${blockerReason}` : clean(opportunity.implementation_steps?.[0] || route.reason),
      created_at: clean(workOrder.createdAt) || now,
      updated_at: now,
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
        template_match: templateMatch,
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

export function buildServiceDeliveryDashboardExport(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const serviceRequests = asArray(input.service_requests);
  const deliveryPackages = asArray(input.delivery_packages);
  const workOrders = asArray(input.work_orders || input.workOrders);
  const blocked = workOrders.filter((workOrder) => clean(workOrder.delivery_status || workOrder.status) === "blocked" || Boolean(clean(workOrder.blocker_reason)));
  const completed = workOrders.filter((workOrder) => clean(workOrder.delivery_status || workOrder.status) === "completed");
  const evidenceRecords = workOrders.flatMap((workOrder) => asArray(workOrder.evidence).map((evidence) => ({
    work_order_id: clean(workOrder.id || workOrder.work_order_id),
    owner_route: clean(workOrder.owner_route),
    evidence,
  })));
  const nextActions = workOrders.map((workOrder) => ({
    work_order_id: clean(workOrder.id || workOrder.work_order_id),
    owner_route: clean(workOrder.owner_route || workOrder.implementation?.assignment?.assignee),
    status: clean(workOrder.delivery_status || workOrder.status),
    next_action: clean(workOrder.next_action || workOrder.implementation?.readiness?.route?.reason),
  })).filter((item) => item.work_order_id || item.next_action);

  return {
    generated_at: now,
    active_service_requests: serviceRequests.filter((request) => !["completed", "cancelled", "closed"].includes(lower(request.status))),
    delivery_packages: deliveryPackages,
    implementation_work_orders: workOrders,
    blocked_items: blocked.map((workOrder) => ({
      work_order_id: clean(workOrder.id || workOrder.work_order_id),
      blocker_reason: clean(workOrder.blocker_reason || workOrder.escalation_reason),
      owner_route: clean(workOrder.owner_route || workOrder.implementation?.assignment?.assignee),
      next_action: clean(workOrder.next_action),
    })),
    completed_items: completed,
    evidence_records: evidenceRecords,
    next_actions: nextActions,
    owner_routes: unique(workOrders.map((workOrder) => clean(workOrder.owner_route || workOrder.implementation?.assignment?.assignee))),
    client_facing_status: serviceRequests.map((request) => ({
      request_id: clean(request.request_id || request.id),
      client: clean(request.client?.company_name || request.company_name),
      service_key: clean(request.service_key),
      status: clean(request.status || "active"),
    })),
  };
}
