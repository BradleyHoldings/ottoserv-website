export const PRODUCTION_VOICE_LAUNCH_VERSION = "phase6h_production_voice_launch_controls_v1";

export const PRODUCTION_VOICE_LAUNCH_STAGES = [
  "launch_approval_required",
  "launch_approved",
  "production_launch_ready",
  "production_active",
  "rollback_ready",
  "rollback_triggered",
  "monitoring_active",
  "blocked",
];

const APPROVAL_GATES = [
  "activate_inbound_ai_receptionist",
  "assign_or_provision_phone_number",
  "change_live_call_routing",
  "enable_missed_call_recovery",
  "connect_crm_calendar_dispatch_handoffs",
  "send_client_facing_launch_instructions",
];

const LAUNCH_CHECKS = [
  "client_approved",
  "service_intake_complete",
  "retell_test_call_completed",
  "call_handling_rules_confirmed",
  "escalation_contact_confirmed",
  "after_hours_behavior_confirmed",
  "emergency_rules_confirmed",
  "rollback_path_documented",
  "monitoring_enabled",
  "evidence_requirements_defined",
];

const ROLLBACK_FIELDS = [
  "previous_routing_state",
  "previous_number_state",
  "rollback_instructions",
  "emergency_disable_path",
  "owner_operator_contact",
];

const MONITORING_REQUIREMENTS = [
  "call_answered",
  "call_failed",
  "transfer_attempted",
  "transfer_failed",
  "transcript_available",
  "transcript_unavailable",
  "lead_captured",
  "escalation_triggered",
  "client_notification_sent",
  "issue_detected",
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

function has(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value === true;
  return Boolean(clean(value));
}

function testCallCompleted(events = [], packet = {}) {
  const workOrderId = clean(packet.related_work_order_id);
  const packetId = clean(packet.related_voice_packet_id || packet.packet_id);
  return asArray(events).some((event) => {
    const type = clean(event.event_type);
    const evidence = event.details_json?.evidence || {};
    return (
      (type === "service_delivery_retell_test_call_completed" || clean(evidence.evidence_type) === "retell_test_call_completed")
      && (!workOrderId || clean(evidence.work_order_id || event.ticket_number) === workOrderId || clean(event.details_json?.packet_id) === packetId)
    );
  });
}

function check(name, passed, reason, evidence = {}) {
  return { name, passed: Boolean(passed), blocked_reason: passed ? "" : reason, evidence };
}

function rollbackReady(rollback = {}) {
  return ROLLBACK_FIELDS.every((field) => has(rollback[field]));
}

function launchStatus(blockedReasons, approvals = {}) {
  if (blockedReasons.includes("launch_approval_required") || blockedReasons.includes("client_approval_required")) {
    return "launch_approval_required";
  }
  return blockedReasons.length ? "blocked" : (approvals.launch_approved ? "production_launch_ready" : "launch_approval_required");
}

export function getProductionVoiceLaunchControlRegistry() {
  return clone({
    version: PRODUCTION_VOICE_LAUNCH_VERSION,
    approval_gates: APPROVAL_GATES,
    launch_checklist_requirements: LAUNCH_CHECKS,
    rollback_fields: ROLLBACK_FIELDS,
    monitoring_requirements: MONITORING_REQUIREMENTS,
    stages: PRODUCTION_VOICE_LAUNCH_STAGES,
    execution_constraints: {
      automatic_production_activation_allowed: false,
      number_purchase_or_provisioning_allowed_without_approval: false,
      routing_change_allowed_without_approval: false,
      outbound_customer_or_prospect_calls_allowed: false,
      stripe_email_n8n_side_effects_allowed_without_existing_rail: false,
    },
  });
}

export function buildProductionVoiceLaunchPacket(voicePacket = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const registry = getProductionVoiceLaunchControlRegistry();
  return {
    packet_id: `production_launch_${clean(voicePacket.packet_id || voicePacket.related_work_order_id)}`,
    source: "phase6h_production_voice_launch_controls",
    version: PRODUCTION_VOICE_LAUNCH_VERSION,
    related_voice_packet_id: clean(voicePacket.packet_id),
    related_work_order_id: clean(voicePacket.related_work_order_id),
    related_approval_id: clean(voicePacket.approval_id || voicePacket.related_approval_id),
    client: clean(voicePacket.client),
    service_key: clean(voicePacket.service_key),
    status: "launch_approval_required",
    approval_gates: registry.approval_gates,
    launch_checklist_requirements: registry.launch_checklist_requirements,
    rollback_fields: registry.rollback_fields,
    monitoring_requirements: registry.monitoring_requirements,
    execution_gated: registry.execution_constraints,
    intake_validation: voicePacket.intake_validation || null,
    call_handling_rules: asArray(voicePacket.call_handling_rules),
    routing_escalation_rules: asArray(voicePacket.routing_escalation_rules),
    created_at: now,
  };
}

export function evaluateProductionVoiceLaunchReadiness(packet = {}, context = {}) {
  const approvals = context.approvals || {};
  const rollback = context.rollback || {};
  const confirmations = context.confirmations || {};
  const events = asArray(context.events);
  const completedTest = testCallCompleted(events, packet);
  const serviceIntakeComplete = packet.intake_validation?.ok !== false;
  const rollbackPlanReady = rollbackReady(rollback);

  const launchChecklist = [
    check("client_approved", approvals.client_approved, "client_approval_required"),
    check("service_intake_complete", serviceIntakeComplete, "service_intake_incomplete"),
    check("retell_test_call_completed", completedTest, "retell_test_call_completed_required"),
    check("call_handling_rules_confirmed", confirmations.call_handling_rules_confirmed, "call_handling_rules_confirmation_required"),
    check("escalation_contact_confirmed", confirmations.escalation_contact_confirmed, "escalation_contact_confirmation_required"),
    check("after_hours_behavior_confirmed", confirmations.after_hours_behavior_confirmed, "after_hours_behavior_confirmation_required"),
    check("emergency_rules_confirmed", confirmations.emergency_rules_confirmed, "emergency_rules_confirmation_required"),
    check("rollback_path_documented", rollbackPlanReady, "rollback_plan_required"),
    check("monitoring_enabled", confirmations.monitoring_enabled, "monitoring_enabled_required"),
    check("evidence_requirements_defined", confirmations.evidence_requirements_defined, "evidence_requirements_required"),
  ];
  const handoffConfirmed = check(
    "crm_calendar_dispatch_handoffs_confirmed",
    confirmations.crm_calendar_dispatch_handoffs_confirmed,
    "crm_calendar_dispatch_handoff_confirmation_required",
  );
  launchChecklist.push(handoffConfirmed);

  if (!approvals.launch_approved) {
    launchChecklist.push(check("launch_approved", false, "launch_approval_required"));
  } else {
    launchChecklist.push(check("launch_approved", true, ""));
  }

  const blockedReasons = [...new Set(launchChecklist.filter((item) => !item.passed).map((item) => item.blocked_reason).filter(Boolean))];
  const status = launchStatus(blockedReasons, approvals);
  return {
    ok: blockedReasons.length === 0,
    status,
    stage: status,
    blocked_reasons: blockedReasons,
    approval_gates: APPROVAL_GATES.map((gate) => ({
      gate,
      approval_required: true,
      approval_present: approvals.launch_approved === true,
      execution_allowed: false,
    })),
    launch_checklist: launchChecklist,
    rollback: {
      status: rollbackPlanReady ? "rollback_ready" : "blocked",
      required_fields: ROLLBACK_FIELDS,
      controls: [
        "previous_routing_number_state_recorded",
        "rollback_instructions_stored",
        "emergency_disable_path_defined",
        "owner_operator_contact_listed",
      ],
      plan: rollback,
    },
    monitoring: {
      status: confirmations.monitoring_enabled ? "monitoring_active" : "blocked",
      requirements: MONITORING_REQUIREMENTS,
    },
    execution_gated: {
      production_activation_allowed: false,
      number_purchase_or_provisioning_allowed: false,
      routing_change_allowed: false,
      outbound_customer_or_prospect_calls_allowed: false,
      stripe_email_n8n_side_effects_allowed: false,
    },
  };
}
