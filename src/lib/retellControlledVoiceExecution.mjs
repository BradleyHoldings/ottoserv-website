import { buildRetellReadinessReport } from "./callRail/retellReadiness.mjs";
import { createHash } from "node:crypto";

export const RETELL_CONTROLLED_EXECUTION_VERSION = "phase6f_controlled_retell_voice_execution_v1";

const ENV_NAMES = [
  "RETELL_API_KEY",
  "RETELL_AGENT_ID",
  "RETELL_PHONE_NUMBER or RETELL_FROM_NUMBER or RETELL_PHONE_NUMBER_ID",
];

const ENV_FLAGS = [
  "RETELL_API_KEY",
  "RETELL_AGENT_ID",
  "RETELL_PHONE_NUMBER",
  "RETELL_FROM_NUMBER",
  "RETELL_PHONE_NUMBER_ID",
  "RETELL_BASE_URL",
  "RETELL_VOICE_SERVICE_LIVE_EXECUTION",
];

const REQUIRED_EVIDENCE_FIELDS = [
  "retell_agent_config_id",
  "retell_call_id",
  "call_status",
  "call_result",
  "occurred_at",
  "work_order_id",
  "approval_id",
];

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function slug(value, fallback = "retell") {
  return lower(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || fallback;
}

function stableUuid(prefix, value) {
  const hex = createHash("sha1").update(`${prefix}:${clean(value)}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

function envPresence(env = {}) {
  return Object.fromEntries(ENV_FLAGS.map((name) => [name, Boolean(clean(env[name]))]));
}

function approved(packet = {}) {
  return packet.approval_status === "approved" || packet.approvalStatus === "approved" || packet.approved === true;
}

function ticketId(packet = {}) {
  return clean(packet.related_work_order_id || packet.work_order_id || packet.ticket_number);
}

function approvalId(packet = {}) {
  return clean(packet.approval_id || packet.related_approval_id);
}

export async function buildRetellControlledReadinessReport(options = {}) {
  const env = options.env || process.env;
  const env_present = envPresence(env);
  if (!env_present.RETELL_API_KEY || !env_present.RETELL_AGENT_ID || !(env_present.RETELL_PHONE_NUMBER || env_present.RETELL_FROM_NUMBER || env_present.RETELL_PHONE_NUMBER_ID)) {
    return {
      ok: false,
      status: "blocked_missing_retell_config",
      required_env_names: [...ENV_NAMES],
      env_present,
      readiness: null,
    };
  }
  const readiness = await buildRetellReadinessReport(options);
  return {
    ok: Boolean(readiness.ok),
    status: readiness.ok ? "retell_ready" : "blocked_retell_readiness",
    required_env_names: [...ENV_NAMES],
    env_present,
    readiness,
  };
}

export function generateControlledRetellExecutionPacket(voicePacket = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  if (!approved(voicePacket) || !approvalId(voicePacket) || !ticketId(voicePacket)) {
    return {
      ok: false,
      reason: "approved_voice_work_order_required",
      status: "blocked_pending_approval",
    };
  }

  const packet = {
    packet_id: `retell_controlled_${slug(voicePacket.packet_id || ticketId(voicePacket))}`,
    source: "phase6f_controlled_retell_voice_execution",
    version: RETELL_CONTROLLED_EXECUTION_VERSION,
    related_voice_packet_id: clean(voicePacket.packet_id),
    related_work_order_id: ticketId(voicePacket),
    related_approval_id: approvalId(voicePacket),
    client: clean(voicePacket.client),
    service_key: clean(voicePacket.service_key),
    status: "test_call_queued",
    execution_mode: "controlled_sandbox_retell_test_only",
    actions: {
      agent_config_preparation: { allowed: true, status: "agent_config_prepared" },
      sandbox_test_call: { allowed: true, status: "test_call_queued" },
      transcript_result_ingestion: { allowed: true, status: "test_call_completed" },
      production_activation: { allowed: false, blocked_reason: "phase6f_production_activation_blocked" },
      number_provisioning: { allowed: false, blocked_reason: "phase6f_number_provisioning_blocked" },
      live_routing_change: { allowed: false, blocked_reason: "phase6f_live_routing_change_blocked" },
      outbound_customer_call: { allowed: false, blocked_reason: "phase6f_outbound_customer_calls_blocked" },
    },
    required_evidence: [...REQUIRED_EVIDENCE_FIELDS, "transcript_or_transcript_unavailable_reason"],
    forbidden_actions: [
      "Do not buy or provision Retell numbers",
      "Do not change production call routing",
      "Do not activate inbound receptionist for a real client",
      "Do not place outbound sales or customer calls",
      "Do not trigger Stripe, email, or n8n",
    ],
    created_at: now,
  };
  return { ok: true, execution_packet: packet };
}

export function evaluateControlledRetellAction(packet = {}, action = "") {
  const entry = packet.actions?.[clean(action)];
  if (!entry) return { ok: false, status: "blocked", reason: "unknown_or_unapproved_retell_action" };
  if (!entry.allowed) return { ok: false, status: "blocked", reason: entry.blocked_reason || "retell_action_blocked" };
  return { ok: true, status: entry.status || "allowed" };
}

function missingEvidenceFields(evidence = {}) {
  const missing = REQUIRED_EVIDENCE_FIELDS.filter((field) => !clean(evidence[field]));
  if (!clean(evidence.transcript) && !clean(evidence.transcript_unavailable_reason)) {
    missing.push("transcript_or_transcript_unavailable_reason");
  }
  return missing;
}

function activationApprovalAccepted(approval = {}) {
  const decisionApproved = lower(approval.decision) === "approved" || lower(approval.decision) === "approve_bounded_autonomy";
  return (approved(approval) || decisionApproved)
    && /jonathan|operator/i.test(clean(approval.operator || approval.decided_by || approval.approved_by))
    && /production_activation|live_activation|voice_launch/i.test(clean(approval.scope || approval.action || approval.approved_scope));
}

function activationEvidenceBlockers(evidence = {}) {
  const blockers = [];
  if (missingEvidenceFields(evidence).length || lower(evidence.status) !== "completed") {
    blockers.push("accepted_test_call_evidence_missing");
  }
  if (!clean(evidence.rollback_plan_id || evidence.rollback_evidence_id)) {
    blockers.push("rollback_plan_missing");
  }
  if (!clean(evidence.monitoring_plan_id || evidence.monitoring_evidence_id)) {
    blockers.push("monitoring_plan_missing");
  }
  if (!clean(evidence.client_launch_approval_id || evidence.client_approval_id)) {
    blockers.push("client_launch_approval_missing");
  }
  return blockers;
}

export async function evaluateControlledRetellProductionActivationGate(packet = {}, options = {}) {
  const env = options.env || process.env;
  const env_present = envPresence(env);
  const blockers = [];

  if (!env_present.RETELL_API_KEY || !env_present.RETELL_AGENT_ID || !(env_present.RETELL_PHONE_NUMBER || env_present.RETELL_FROM_NUMBER || env_present.RETELL_PHONE_NUMBER_ID)) {
    blockers.push("retell_credentials_missing");
  }
  if (clean(env.RETELL_VOICE_SERVICE_LIVE_EXECUTION) !== "approved") {
    blockers.push("live_execution_env_flag_not_approved");
  }
  if (!activationApprovalAccepted(options.approval || {})) {
    blockers.push("explicit_operator_activation_approval_missing");
  }
  if (evaluateControlledRetellAction(packet, "production_activation").ok) {
    blockers.push("production_activation_packet_must_remain_blocked_until_separate_live_runner");
  }
  blockers.push(...activationEvidenceBlockers(options.evidence || {}));

  const safePacket = {
    packet_id: clean(packet.packet_id),
    related_work_order_id: clean(packet.related_work_order_id),
    related_approval_id: clean(packet.related_approval_id),
    service_key: clean(packet.service_key),
  };
  const report = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "ready_for_operator_controlled_activation" : "blocked_production_activation",
    packet: safePacket,
    env_present,
    blockers: [...new Set(blockers)],
    required_evidence: [
      ...REQUIRED_EVIDENCE_FIELDS,
      "transcript_or_transcript_unavailable_reason",
      "rollback_plan_id",
      "monitoring_plan_id",
      "client_launch_approval_id",
      "explicit_operator_activation_approval",
      "RETELL_VOICE_SERVICE_LIVE_EXECUTION=approved",
    ],
    allowed_actions: {
      agent_config_preparation: false,
      sandbox_test_call: false,
      production_activation: false,
      number_provisioning: false,
      live_routing_change: false,
      outbound_customer_call: false,
    },
    next_action: blockers.length === 0
      ? "operator_may_run_separate_controlled_activation_after_final_live_review"
      : "collect_missing_activation_evidence_and_operator_approval",
    safety: {
      no_live_action_executed: true,
      no_number_provisioning: true,
      no_live_routing_change: true,
      no_outbound_customer_call: true,
      no_stripe_email_n8n: true,
    },
  };
  return report;
}

export function ingestControlledRetellEvidence(packet = {}, evidence = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  if (lower(evidence.status) === "completed") {
    const missing = missingEvidenceFields(evidence);
    if (missing.length) {
      return { ok: false, reason: "retell_completion_requires_evidence", missing_fields: missing };
    }
  }

  const workOrderId = clean(evidence.work_order_id || packet.related_work_order_id);
  const approval = clean(evidence.approval_id || packet.related_approval_id);
  const retellCallId = clean(evidence.retell_call_id);
  const accepted = lower(evidence.status) === "completed";
  const stage = accepted ? "test_call_completed" : "agent_config_prepared";
  const event = {
    id: stableUuid("event", `${workOrderId}:retell:${retellCallId || evidence.retell_agent_config_id || stage}`),
    ticket_id: stableUuid("ticket", workOrderId),
    event_type: accepted ? "service_delivery_retell_test_call_completed" : "service_delivery_retell_config_prepared",
    actor_type: "agent",
    actor_id: clean(evidence.actor_id || "Morgan/Retell"),
    summary: accepted
      ? `Controlled Retell test call ${clean(evidence.call_status)}: ${clean(evidence.call_result)}`
      : "Controlled Retell agent/config evidence submitted.",
    details_json: {
      packet_id: clean(packet.related_voice_packet_id || packet.packet_id),
      controlled_execution_packet_id: clean(packet.packet_id),
      service_key: clean(packet.service_key),
      approval_id: approval,
      evidence: {
        evidence_type: accepted ? "retell_test_call_completed" : "retell_agent_config_prepared",
        retell_agent_config_id: clean(evidence.retell_agent_config_id),
        retell_call_id: retellCallId,
        call_status: clean(evidence.call_status),
        call_result: clean(evidence.call_result),
        transcript: clean(evidence.transcript),
        transcript_unavailable_reason: clean(evidence.transcript_unavailable_reason),
        occurred_at: clean(evidence.occurred_at),
        work_order_id: workOrderId,
        approval_id: approval,
        review_status: accepted ? "accepted" : "submitted",
      },
      no_production_activation: true,
      no_number_provisioning: true,
      no_live_routing_change: true,
      no_outbound_customer_call: true,
      no_stripe_email_n8n: true,
    },
    created_at: now,
  };
  return { ok: true, status: stage, event };
}

export async function writeBackControlledRetellEvidence(ingested = {}, options = {}) {
  const liveClient = options.liveClient;
  if (!liveClient) return { ok: false, reason: "live_client_required" };
  if (!ingested?.ok || !ingested.event) return { ok: false, reason: ingested?.reason || "retell_evidence_not_accepted" };

  const wrote = await liveClient.upsertTicketEvent(ingested.event);
  if (!wrote?.ok) return { ok: false, reason: wrote?.error || "retell_ticket_event_write_failed" };
  const ticketNumber = clean(ingested.event.details_json?.evidence?.work_order_id || ingested.event.ticket_number);
  const patched = await liveClient.patchTicket(ticketNumber, {
    status: ingested.status,
    updated_at: options.now || new Date().toISOString(),
  });
  if (!patched?.ok) return { ok: false, reason: patched?.error || "retell_ticket_status_patch_failed" };
  return { ok: true, status: ingested.status, event: ingested.event, created: wrote.created === true };
}
