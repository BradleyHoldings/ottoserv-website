import {
  buildProductionVoiceLaunchPacket,
  evaluateProductionVoiceLaunchReadiness,
} from "./retellProductionVoiceLaunchControls.mjs";
import { generateVoiceSetupPacket } from "./retellVoiceServiceAutomation.mjs";

export const FIRST_CLIENT_VOICE_ACTIVATION_VERSION = "phase6i_first_client_voice_activation_playbook_v1";

const SERVICE_NAMES = {
  ai_receptionist: "AI Receptionist",
  missed_call_recovery: "Missed Call Recovery",
};

const CLIENT_QUALIFICATION_CHECKLIST = [
  "client_has_real_inbound_call_volume",
  "client_has_clear_escalation_owner",
  "client_can_review_test_call_evidence",
  "client_accepts_rollback_plan_before_launch",
  "client_understands_launch_is_approval_gated",
];

const PLAYBOOK_STEPS = [
  "client_qualification",
  "voice_intake_collection",
  "client_setup_approval",
  "retell_setup_packet_generation",
  "controlled_test_call",
  "launch_approval",
  "number_routing_decision",
  "rollback_plan",
  "production_monitoring",
  "post_launch_evidence_report",
];

const REQUIRED_APPROVALS = [
  "client_setup_approval",
  "controlled_test_call_approval",
  "client_launch_approval",
  "operator_launch_approval",
  "number_or_routing_change_approval",
  "client_facing_message_approval",
];

const REQUIRED_INTAKE_FIELDS = [
  "business_name",
  "business_hours",
  "service_area",
  "services_offered",
  "main_phone_number",
  "desired_retell_number_or_number_needed",
  "escalation_contact",
  "emergency_handling_rules",
  "faqs",
  "booking_rules",
  "after_hours_behavior",
  "crm_calendar_handoff_notes",
];

function clean(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function serviceKey(value) {
  return clean(value) === "missed_call_recovery" ? "missed_call_recovery" : "ai_receptionist";
}

function serviceName(key) {
  return SERVICE_NAMES[serviceKey(key)];
}

function playbookTemplates(key) {
  const name = serviceName(key);
  return {
    setup_request: `${name} setup request: please confirm business hours, service area, services offered, escalation contact, emergency rules, after-hours behavior, FAQs, booking rules, and number/routing preference. No production activation occurs until written approval is recorded.`,
    approval_request: `${name} launch approval request: please review the accepted Retell test-call evidence, call handling rules, rollback path, monitoring plan, and number/routing decision. Approval authorizes operator-controlled launch preparation only; it does not authorize automatic activation by this message.`,
    launch_instructions_draft: `${name} launch instructions draft: after operator approval, OttoServ will follow the approved number/routing plan, monitor calls, capture evidence, and use the documented rollback path if an issue is detected. This template is not sent automatically.`,
  };
}

export function getFirstClientVoiceActivationPlaybook(key = "ai_receptionist") {
  const resolved = serviceKey(key);
  return clone({
    version: FIRST_CLIENT_VOICE_ACTIVATION_VERSION,
    service_key: resolved,
    name: serviceName(resolved),
    client_qualification_checklist: CLIENT_QUALIFICATION_CHECKLIST,
    required_intake_fields: REQUIRED_INTAKE_FIELDS,
    required_approvals: REQUIRED_APPROVALS,
    steps: PLAYBOOK_STEPS,
    step_details: {
      client_qualification: "Confirm the client is suitable for a first controlled production voice activation.",
      voice_intake_collection: "Collect all required voice intake fields before setup packets are considered launchable.",
      client_setup_approval: "Record client approval for setup and controlled test-call preparation.",
      retell_setup_packet_generation: "Generate the accepted Phase 6E voice setup packet from the service-delivery work order.",
      controlled_test_call: "Use the accepted Phase 6F/6G controlled Retell test-call path and ingest real evidence.",
      launch_approval: "Evaluate Phase 6H launch controls and require explicit operator/client approval.",
      number_routing_decision: "Record whether an existing number is assigned or whether provisioning/routing approval is required.",
      rollback_plan: "Store prior routing/number state, rollback instructions, emergency disable path, and owner contact.",
      production_monitoring: "Attach the production monitoring requirements before launch readiness is allowed.",
      post_launch_evidence_report: "After a real launch, report only evidence-backed status and monitoring outcomes.",
    },
    client_facing_templates: playbookTemplates(resolved),
    execution_constraints: {
      production_retell_activation_allowed: false,
      number_provisioning_allowed: false,
      routing_change_allowed: false,
      outbound_calls_allowed: false,
      client_messages_sent_automatically: false,
      stripe_email_n8n_side_effects_allowed: false,
    },
  });
}

function hasCompletedTestCall(events = [], workOrderId = "", packetId = "") {
  return asArray(events).some((event) => {
    const evidence = event.details_json?.evidence || {};
    return (
      clean(event.event_type) === "service_delivery_retell_test_call_completed"
      || clean(evidence.evidence_type) === "retell_test_call_completed"
    ) && (
      !clean(workOrderId)
      || clean(evidence.work_order_id || event.ticket_number) === clean(workOrderId)
      || clean(event.details_json?.packet_id) === clean(packetId)
    );
  });
}

function nextOperatorAction({ voicePacket, launchReadiness, completedTest }) {
  if (voicePacket.intake_validation?.ok === false) return "complete_voice_intake";
  if (launchReadiness.blocked_reasons.includes("client_approval_required")) return "collect_client_launch_approval";
  if (!completedTest || launchReadiness.blocked_reasons.includes("retell_test_call_completed_required")) {
    return "complete_controlled_retell_test_call";
  }
  if (launchReadiness.blocked_reasons.includes("rollback_plan_required")) return "document_rollback_plan";
  const confirmationGap = launchReadiness.blocked_reasons.find((reason) => /confirmation_required|required$/.test(reason));
  if (confirmationGap && confirmationGap !== "launch_approval_required") return "confirm_launch_checklist";
  if (launchReadiness.blocked_reasons.includes("launch_approval_required")) return "collect_operator_launch_approval";
  if (launchReadiness.status === "production_launch_ready") return "schedule_operator_controlled_production_activation";
  return "review_voice_activation_status";
}

function approvalsNeeded(readiness = {}) {
  const reasons = asArray(readiness.blocked_reasons);
  const needed = [];
  if (reasons.includes("client_approval_required")) needed.push("client_launch_approval");
  if (reasons.includes("launch_approval_required")) needed.push("operator_launch_approval");
  for (const gate of asArray(readiness.approval_gates)) {
    if (gate.approval_required && !gate.approval_present) needed.push(gate.gate);
  }
  return [...new Set(needed)];
}

export function buildFirstClientVoiceActivationStatus(input = {}) {
  const workOrder = input.workOrder || {};
  const now = input.now || new Date().toISOString();
  const resolvedServiceKey = serviceKey(workOrder.service_key);
  const playbook = getFirstClientVoiceActivationPlaybook(resolvedServiceKey);
  const voicePacket = generateVoiceSetupPacket({ ...workOrder, service_key: resolvedServiceKey }, { now });
  const launchPacket = buildProductionVoiceLaunchPacket(voicePacket, { now });
  const launchReadiness = evaluateProductionVoiceLaunchReadiness(launchPacket, {
    approvals: input.approvals || {},
    rollback: input.rollback || {},
    confirmations: input.confirmations || {},
    events: input.events || [],
  });
  const completedTest = hasCompletedTestCall(input.events, voicePacket.related_work_order_id, voicePacket.packet_id);
  const missingChecklistItems = asArray(launchReadiness.launch_checklist)
    .filter((item) => !item.passed)
    .map((item) => item.name);
  const status = voicePacket.intake_validation?.ok === false ? "blocked_missing_intake" : launchReadiness.status;

  return {
    version: FIRST_CLIENT_VOICE_ACTIVATION_VERSION,
    client: clean(workOrder.client || voicePacket.client),
    selected_voice_service: playbook.name,
    service_key: resolvedServiceKey,
    current_readiness_status: status,
    missing_checklist_items: missingChecklistItems,
    missing_intake_fields: asArray(voicePacket.intake_validation?.missing_fields),
    approvals_needed: approvalsNeeded(launchReadiness),
    test_call_status: completedTest ? "completed" : "not_started",
    launch_readiness: launchReadiness.status,
    rollback_readiness: launchReadiness.rollback?.status || "blocked",
    monitoring_readiness: launchReadiness.monitoring?.status || "blocked",
    next_operator_action: nextOperatorAction({ voicePacket, launchReadiness, completedTest }),
    playbook,
    retell_setup_packet: voicePacket,
    launch_packet: launchPacket,
    launch_controls: launchReadiness,
    client_facing_templates: playbook.client_facing_templates,
    execution_gated: launchReadiness.execution_gated,
    generated_at: now,
  };
}

export function buildFirstClientVoiceActivationStatuses(workOrders = [], context = {}) {
  const items = asArray(workOrders)
    .filter((workOrder) => ["ai_receptionist", "missed_call_recovery"].includes(serviceKey(workOrder.service_key)))
    .map((workOrder) => buildFirstClientVoiceActivationStatus({
      workOrder,
      approvals: context.approvals,
      rollback: context.rollback,
      confirmations: context.confirmations,
      events: context.events,
      now: context.now,
    }));

  return {
    version: FIRST_CLIENT_VOICE_ACTIVATION_VERSION,
    summary: {
      total: items.length,
      production_launch_ready: items.filter((item) => item.current_readiness_status === "production_launch_ready").length,
      blocked: items.filter((item) => item.current_readiness_status !== "production_launch_ready").length,
      needs_approval: items.filter((item) => item.approvals_needed.length > 0).length,
    },
    items,
  };
}

