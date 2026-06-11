import { readRetellConfig } from "./callRail/retell.mjs";

export const RETELL_VOICE_SERVICE_VERSION = "phase6e_retell_voice_service_automation_v1";

const VOICE_SERVICE_KEYS = new Set(["ai_receptionist", "missed_call_recovery"]);
const COMPLETION_EVIDENCE_TYPES = new Set([
  "agent_draft_config_created",
  "number_assigned",
  "number_needed",
  "routing_prepared",
  "test_call_completed",
  "transcript_received",
  "call_outcome_classified",
  "launch_checklist_passed",
]);

const HIGH_RISK_ACTIONS = [
  "provision_or_assign_phone_number",
  "change_live_call_routing",
  "activate_inbound_receptionist",
  "place_outbound_calls",
  "connect_production_crm_calendar",
  "send_client_facing_launch_instructions",
];

const COMMON_REQUIRED_INTAKE = [
  "business_name",
  "business_hours",
  "service_area",
  "services_offered",
  "main_phone_number",
  "escalation_contact",
  "emergency_handling_rules",
  "faqs",
  "booking_rules",
  "after_hours_behavior",
  "crm_calendar_handoff_notes",
];

const NUMBER_FIELDS = ["desired_retell_number", "number_needed"];

const TEMPLATE_REGISTRY = [
  {
    template_key: "ai_receptionist",
    name: "AI Receptionist",
    purpose: "Answer inbound calls, qualify the caller, collect service context, and route or create a callback task.",
    default_voice: "professional_service_business",
    call_handling_rules: [
      "Greet callers with the business name.",
      "Identify lead, customer, vendor, emergency, billing, and general inquiry paths.",
      "Collect caller name, callback number, service need, address or service area, urgency, and preferred time.",
      "Never quote binding prices or make promises outside approved FAQs.",
    ],
    routing_escalation_rules: [
      "Escalate emergencies to the configured escalation contact.",
      "Route booking requests to scheduling handoff.",
      "Create callback tasks for uncertain cases.",
    ],
    approval_requirements: HIGH_RISK_ACTIONS,
  },
  {
    template_key: "missed_call_recovery",
    name: "Missed Call Recovery",
    purpose: "Recover missed calls with a controlled callback or SMS handoff packet without placing live outbound calls in this phase.",
    default_voice: "concise_recovery_agent",
    call_handling_rules: [
      "Classify missed call reason from available notes or transcript.",
      "Prepare recovery script and callback task.",
      "Do not place outbound calls until Phase 6F approval and live rail checks pass.",
    ],
    routing_escalation_rules: [
      "Prioritize recent high-intent missed calls.",
      "Escalate emergency keywords immediately.",
      "Route unclassified missed calls to Hermes review.",
    ],
    approval_requirements: HIGH_RISK_ACTIONS,
  },
  {
    template_key: "after_hours_receptionist",
    name: "After-Hours Receptionist",
    purpose: "Handle inbound after-hours calls with intake, emergency triage, and next-business-day callback routing.",
    default_voice: "calm_after_hours_triage",
    call_handling_rules: [
      "State that the office is closed when appropriate.",
      "Collect urgent context and callback permission.",
      "Avoid promising same-night service unless explicitly approved.",
    ],
    routing_escalation_rules: [
      "Escalate emergency rules immediately.",
      "Queue routine requests for next business day.",
    ],
    approval_requirements: HIGH_RISK_ACTIONS,
  },
  {
    template_key: "emergency_escalation",
    name: "Emergency Escalation",
    purpose: "Detect urgent situations and route to approved escalation contacts.",
    default_voice: "direct_emergency_triage",
    call_handling_rules: [
      "Identify emergency indicators early.",
      "Collect location, callback number, and immediate safety context.",
      "Do not provide unsafe technical instructions.",
    ],
    routing_escalation_rules: [
      "Contact only approved escalation contacts.",
      "Log evidence for every escalation decision.",
    ],
    approval_requirements: HIGH_RISK_ACTIONS,
  },
  {
    template_key: "appointment_request_booking_handoff",
    name: "Appointment Request / Booking Handoff",
    purpose: "Collect appointment request details and prepare a scheduling handoff without connecting production calendars in this phase.",
    default_voice: "organized_scheduler",
    call_handling_rules: [
      "Collect preferred date windows, service type, and contact details.",
      "Explain that scheduling is confirmed after office review unless live calendar approval exists.",
    ],
    routing_escalation_rules: [
      "Route high-value or urgent booking requests to Hermes.",
      "Prepare calendar handoff notes only; no production calendar write.",
    ],
    approval_requirements: HIGH_RISK_ACTIONS,
  },
];

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function slug(value, fallback = "voice") {
  return lower(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || fallback;
}

function hasValue(input, field) {
  const value = input?.[field];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return true;
  return Boolean(clean(value));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getRetellVoiceTemplateRegistry() {
  return clone(TEMPLATE_REGISTRY);
}

export function getRetellVoiceTemplate(templateKey) {
  const key = clean(templateKey);
  const template = TEMPLATE_REGISTRY.find((item) => item.template_key === key);
  if (!template) throw new Error(`unknown_voice_template:${key}`);
  return clone(template);
}

function templateForService(serviceKey) {
  if (clean(serviceKey) === "missed_call_recovery") return "missed_call_recovery";
  return "ai_receptionist";
}

function serviceName(serviceKey) {
  return clean(serviceKey) === "missed_call_recovery" ? "Missed Call Recovery" : "AI Receptionist";
}

export function validateVoiceServiceIntake(intake = {}, options = {}) {
  const serviceKey = clean(options.service_key || intake.service_key || "ai_receptionist");
  const required = [...COMMON_REQUIRED_INTAKE];
  const missing = required.filter((field) => !hasValue(intake, field));
  if (!NUMBER_FIELDS.some((field) => hasValue(intake, field))) {
    missing.push("desired_retell_number_or_number_needed");
  }
  return {
    ok: missing.length === 0,
    service_key: serviceKey,
    missing_fields: missing,
    required_fields: [...required, "desired_retell_number_or_number_needed"],
  };
}

function intakeFromWorkOrder(workOrder = {}) {
  const explicit = workOrder.voice_intake || workOrder.intake || {};
  return {
    business_name: clean(explicit.business_name || explicit.company_name || workOrder.client),
    business_hours: clean(explicit.business_hours),
    service_area: clean(explicit.service_area),
    services_offered: asArray(explicit.services_offered),
    main_phone_number: clean(explicit.main_phone_number || explicit.phone),
    desired_retell_number: clean(explicit.desired_retell_number),
    number_needed: explicit.number_needed === true || explicit.number_needed === "true",
    escalation_contact: clean(explicit.escalation_contact),
    emergency_handling_rules: clean(explicit.emergency_handling_rules),
    faqs: asArray(explicit.faqs),
    booking_rules: clean(explicit.booking_rules),
    after_hours_behavior: clean(explicit.after_hours_behavior),
    crm_calendar_handoff_notes: clean(explicit.crm_calendar_handoff_notes),
  };
}

export function generateVoiceSetupPacket(workOrder = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const serviceKey = clean(workOrder.service_key) === "missed_call_recovery" ? "missed_call_recovery" : "ai_receptionist";
  const template = getRetellVoiceTemplate(templateForService(serviceKey));
  const intake = intakeFromWorkOrder(workOrder);
  const validation = validateVoiceServiceIntake(intake, { service_key: serviceKey });
  const approvalNeeded = true;
  return {
    packet_id: `retell_voice_${slug(workOrder.id || `${workOrder.client}_${serviceKey}`)}`,
    source: "phase6e_retell_voice_service",
    version: RETELL_VOICE_SERVICE_VERSION,
    related_work_order_id: clean(workOrder.id),
    client: clean(workOrder.client || intake.business_name),
    service_key: serviceKey,
    requested_voice_service: serviceName(serviceKey),
    agent_template: template,
    intake,
    intake_validation: validation,
    intake_fields_needed: validation.missing_fields,
    call_handling_rules: template.call_handling_rules,
    routing_escalation_rules: template.routing_escalation_rules,
    number_assignment: {
      desired_retell_number: clean(intake.desired_retell_number),
      number_needed: Boolean(intake.number_needed),
      provisioning_required: Boolean(intake.number_needed || !clean(intake.desired_retell_number)),
      automatic_provisioning_allowed: false,
    },
    test_call_plan: [
      "Create sandbox Retell agent draft/config packet.",
      "Run synthetic inbound test-call checklist only after approval.",
      "Capture transcript, call outcome, and routing evidence.",
    ],
    launch_checklist: asArray(workOrder.implementation?.launch_checklist).length
      ? asArray(workOrder.implementation.launch_checklist)
      : ["Approval recorded", "Test call accepted", "Routing checklist accepted", "Client launch instructions approved"],
    approval_requirements: HIGH_RISK_ACTIONS.map((action) => {
      if (action === "activate_inbound_receptionist") {
        return "Activating inbound receptionist requires explicit approval.";
      }
      return `${action.replace(/_/g, " ")} requires explicit approval.`;
    }),
    approval_needed: approvalNeeded,
    evidence_requirements: [...COMPLETION_EVIDENCE_TYPES],
    status: approvalNeeded ? "approval_required" : "draft_ready",
    execution_mode: "sandbox_setup_packet_only",
    forbidden_actions: [
      "Do not buy/provision Retell numbers automatically",
      "Do not change live call routing automatically",
      "Do not place outbound calls",
      "Do not connect production CRM/calendar without approval",
      "Do not send client-facing launch instructions without approval",
    ],
    monitoring_metrics: asArray(workOrder.implementation?.monitoring_metrics),
    created_at: now,
  };
}

export function generateVoiceSetupPacketsFromWorkOrders(workOrders = [], options = {}) {
  return asArray(workOrders)
    .filter((workOrder) => VOICE_SERVICE_KEYS.has(clean(workOrder.service_key)))
    .map((workOrder) => generateVoiceSetupPacket(workOrder, options));
}

export function evaluateVoiceApprovalGate(packet = {}, options = {}) {
  const approvalPresent = options.approvalPresent === true || packet.approval_status === "approved";
  if (!approvalPresent) {
    return {
      ok: false,
      status: "blocked_pending_approval",
      blocked_actions: [...HIGH_RISK_ACTIONS],
      reason: "voice_service_high_risk_actions_require_approval",
    };
  }
  return {
    ok: true,
    status: "sandbox_execution_ready",
    blocked_actions: [],
    reason: "",
  };
}

export function describeRetellVoiceExecutionMode(options = {}) {
  const env = options.env || process.env;
  const cfg = readRetellConfig(env);
  const explicitLive = clean(env.RETELL_VOICE_SERVICE_LIVE_EXECUTION) === "true";
  const approvalPresent = options.approvalPresent === true;
  if (!cfg.configured) {
    return {
      mode: "dry_run_setup_packet_only",
      retell_credentials_present: false,
      live_execution_flag: explicitLive,
      live_execution_allowed: false,
    };
  }
  if (!explicitLive) {
    return {
      mode: "sandbox_setup_packet_only",
      retell_credentials_present: true,
      live_execution_flag: false,
      live_execution_allowed: false,
    };
  }
  if (!approvalPresent) {
    return {
      mode: "blocked_pending_approval",
      retell_credentials_present: true,
      live_execution_flag: true,
      live_execution_allowed: false,
      reason: "approval_required",
    };
  }
  return {
    mode: "sandbox_execution_ready",
    retell_credentials_present: true,
    live_execution_flag: true,
    live_execution_allowed: false,
    reason: "phase6e_live_retell_activation_not_enabled",
  };
}

export function ingestVoiceServiceEvidence(packet = {}, evidence = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const status = lower(evidence.status);
  const evidenceType = clean(evidence.evidence_type);
  const summary = clean(evidence.evidence_summary);
  const reference = clean(evidence.evidence_reference);
  if (status === "completed" && (!summary || !reference || !COMPLETION_EVIDENCE_TYPES.has(evidenceType))) {
    return { ok: false, reason: "completion_requires_voice_evidence" };
  }
  const accepted = status === "completed";
  const event = {
    id: `voice_event_${slug(packet.packet_id)}_${slug(evidenceType || now)}`,
    ticket_number: clean(packet.related_work_order_id),
    event_type: accepted ? "service_delivery_voice_evidence_accepted" : "service_delivery_voice_evidence_submitted",
    actor_type: "agent",
    actor_id: clean(evidence.actor_id || "Hermes"),
    summary: summary || "Voice service evidence submitted.",
    details_json: {
      packet_id: clean(packet.packet_id),
      service_key: clean(packet.service_key),
      evidence: {
        evidence_type: evidenceType,
        evidence_summary: summary,
        evidence_reference: reference,
        review_status: accepted ? "accepted" : "submitted",
      },
      no_live_retell_execution: true,
    },
    created_at: now,
  };
  return { ok: true, status: accepted ? "completed" : "waiting_for_evidence_review", event };
}

export function buildVoiceServiceStatusRollup(packets = [], events = []) {
  const eventList = asArray(events);
  const items = asArray(packets).map((packet) => {
    const workOrderId = clean(packet.related_work_order_id);
    const related = eventList.filter((event) => (
      clean(event.details_json?.packet_id) === clean(packet.packet_id)
      || clean(event.ticket_number) === workOrderId
      || clean(event.details_json?.evidence?.work_order_id) === workOrderId
    ));
    const latest = related.find((event) => /service_delivery_retell_test_call_completed/.test(clean(event.event_type)))
      || related.find((event) => /service_delivery_retell_config_prepared/.test(clean(event.event_type)))
      || related.find((event) => /accepted/.test(clean(event.event_type)))
      || related.find((event) => event.details_json?.evidence)
      || related[0]
      || null;
    const evidence = latest?.details_json?.evidence || null;
    const evidenceType = clean(evidence?.evidence_type);
    const eventType = clean(latest?.event_type);
    const retellCompleted = evidenceType === "retell_test_call_completed" || eventType === "service_delivery_retell_test_call_completed";
    const retellConfigPrepared = evidenceType === "retell_agent_config_prepared" || eventType === "service_delivery_retell_config_prepared";
    const setupStatus = retellCompleted
      ? "test_call_completed"
      : retellConfigPrepared ? "agent_config_prepared" : clean(packet.status);
    const launchReady = evidenceType === "launch_checklist_passed"
      ? "ready_with_accepted_evidence"
      : retellCompleted ? "test_call_completed" : evidence ? "testing_evidence_received" : "not_ready";
    return {
      packet_id: clean(packet.packet_id),
      work_order_id: clean(packet.related_work_order_id),
      client: clean(packet.client),
      service_key: clean(packet.service_key),
      voice_service_setup_status: setupStatus,
      approval_needed: Boolean(packet.approval_needed),
      test_call_status: evidenceType === "test_call_completed" || retellCompleted ? "completed" : evidence ? "evidence_received" : "not_started",
      launch_readiness: launchReady,
      active_state: "inactive_sandbox_only",
      latest_voice_evidence: evidence,
    };
  });
  return {
    summary: {
      total: items.length,
      approval_needed: items.filter((item) => item.approval_needed).length,
      launch_ready: items.filter((item) => item.launch_readiness === "ready_with_accepted_evidence").length,
      test_call_completed: items.filter((item) => item.test_call_status === "completed").length,
      active: 0,
    },
    items,
  };
}
