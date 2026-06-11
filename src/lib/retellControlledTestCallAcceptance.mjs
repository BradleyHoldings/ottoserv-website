import { makeRetellTransport } from "./callRail/retell.mjs";
import {
  buildRetellControlledReadinessReport,
  generateControlledRetellExecutionPacket,
  ingestControlledRetellEvidence,
  writeBackControlledRetellEvidence,
} from "./retellControlledVoiceExecution.mjs";
import { buildVoiceServiceStatusRollup, generateVoiceSetupPacket } from "./retellVoiceServiceAutomation.mjs";
import {
  makeServiceDeliverySupabaseClient,
  persistServiceDeliveryRun,
  readLiveServiceDeliveryStatus,
} from "./serviceDeliveryPersistence.mjs";
import { createHash } from "node:crypto";

const CONFIRM = "PLACE_EXACTLY_ONE_PHASE6G_RETELL_TEST_CALL";
const ENV_NAMES = [
  "RETELL_API_KEY",
  "RETELL_AGENT_ID",
  "RETELL_PHONE_NUMBER",
  "RETELL_FROM_NUMBER",
  "RETELL_PHONE_NUMBER_ID",
  "RETELL_BASE_URL",
  "RETELL_CONTROLLED_TEST_CALL_ACCEPTANCE",
  "RETELL_CONTROLLED_TEST_TO_NUMBER",
  "ADMIN_API_TOKEN",
];

function clean(value) {
  return String(value ?? "").trim();
}

function bearer(value) {
  return clean(value).replace(/^Bearer\s+/i, "");
}

function parseCookieHeader(value = "") {
  const out = new Map();
  for (const part of clean(value).split(";")) {
    const [rawName, ...rawValue] = part.split("=");
    const name = clean(rawName);
    if (!name) continue;
    out.set(name, clean(rawValue.join("=")));
  }
  return out;
}

function hasSuperAdminCookie(request) {
  const cookies = parseCookieHeader(request?.headers?.get?.("cookie"));
  if (cookies.get("ottoserv_token") !== "super_admin_token") return false;
  try {
    const userCookie = cookies.get("ottoserv_current_user") || cookies.get("ottoserv_user") || "";
    const user = JSON.parse(decodeURIComponent(userCookie));
    return user?.role === "super_admin" && user?.isOttoServEmployee === true && Boolean(clean(user?.email));
  } catch {
    return false;
  }
}

function slug(value, fallback = "phase6g") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || fallback;
}

function dashed(value) {
  return clean(value).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function boolEnv(env = {}) {
  return Object.fromEntries(ENV_NAMES.map((name) => [name, Boolean(clean(env[name]))]));
}

function phoneLast4(value) {
  const digits = clean(value).replace(/\D/g, "");
  return digits ? `***${digits.slice(-4)}` : "";
}

function eventId(runId, suffix) {
  return stableUuid("event", `phase6g_retell:${runId}:${suffix}`);
}

function stableUuid(prefix, value) {
  const hex = createHash("sha1").update(`${prefix}:${clean(value)}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

function ticketEventSummary(event = {}) {
  const evidence = event.details_json?.evidence || {};
  return {
    id: clean(event.id),
    ticket_id: clean(event.ticket_id),
    ticket_number: clean(evidence.work_order_id || event.ticket_number),
    event_type: clean(event.event_type),
    retell_call_id: clean(evidence.retell_call_id),
    call_status: clean(evidence.call_status),
    call_result: clean(evidence.call_result),
  };
}

export function authorizePhase6GAcceptanceRequest(request, env = process.env) {
  if (hasSuperAdminCookie(request)) return { ok: true, auth_method: "ottoserv_super_admin_cookie" };
  const expected = clean(env.ADMIN_API_TOKEN);
  if (!expected) return { ok: false, status: 503, reason: "admin_token_not_configured" };
  const provided = clean(request?.headers?.get?.("x-admin-token")) || bearer(request?.headers?.get?.("authorization"));
  if (provided !== expected) return { ok: false, status: 401, reason: "unauthorized" };
  return { ok: true, auth_method: "admin_api_token" };
}

export async function buildPhase6GAcceptanceOptions(body = {}, env = process.env) {
  const envSeen = boolEnv(env);
  if (clean(env.RETELL_CONTROLLED_TEST_CALL_ACCEPTANCE) !== "true") {
    return { ok: false, status: 423, reason: "retell_controlled_test_call_acceptance_disabled", env: envSeen };
  }
  const runId = clean(body.run_id || body.runId);
  if (!/^PHASE6G_RETELL_TEST_[A-Z0-9_]+CLEANME$/.test(runId)) {
    return { ok: false, status: 400, reason: "synthetic_run_id_required", env: envSeen };
  }
  if (clean(body.confirm || body.confirmation) !== CONFIRM) {
    return { ok: false, status: 400, reason: "explicit_retell_test_call_confirmation_required", env: envSeen };
  }
  if (!clean(env.RETELL_CONTROLLED_TEST_TO_NUMBER)) {
    return { ok: false, status: 424, reason: "controlled_test_recipient_env_missing", env: envSeen };
  }
  return {
    ok: true,
    env: envSeen,
    options: {
      runId,
      now: clean(body.now) || undefined,
      retellEvidence: body.retell_evidence || body.retellEvidence || undefined,
    },
  };
}

export function createPhase6GAcceptanceFixture(options = {}) {
  const now = options.now || new Date().toISOString();
  const runId = clean(options.runId);
  const base = dashed(runId).toUpperCase();
  const workOrderId = `${base}-WO`;
  const approvalId = `${base}-APPROVAL`;
  return {
    run_id: runId,
    work_order: {
      id: workOrderId,
      title: "AI Receptionist: controlled Phase 6G Retell test call",
      client: `SYNTHETIC Phase 6G Retell ${runId}`,
      service_key: "ai_receptionist",
      status: "sandbox_execution_ready",
      approvalRequired: true,
      approvalStatus: clean(options.approvalStatus) || "approved",
      createdAt: now,
      updatedAt: now,
      engagement_type: "service_delivery_automation",
      required_integrations: ["Retell"],
      implementation: {
        assignment: { assignee: "Jonathan", requires_approval: true, reason: "Controlled Phase 6G test call approval." },
        readiness: { can_queue: false, requires_approval: true, blocked_reasons: [] },
        testing_checklist: ["Run exactly one controlled Retell test call."],
        launch_checklist: ["Do not launch production voice service."],
        monitoring_metrics: ["test_call_completed"],
        upsell_paths: ["Missed Call Recovery"],
      },
      voice_intake: {
        business_name: `SYNTHETIC Phase 6G Retell ${runId}`,
        business_hours: "Mon-Fri 8am-5pm",
        service_area: "Synthetic controlled acceptance",
        services_offered: ["Synthetic service"],
        main_phone_number: "+14075550199",
        desired_retell_number: "+14075550199",
        escalation_contact: "Synthetic Phase 6G operator",
        emergency_handling_rules: "No real emergency routing.",
        faqs: ["Synthetic test only"],
        booking_rules: "Do not book real appointments.",
        after_hours_behavior: "Synthetic callback note only.",
        crm_calendar_handoff_notes: "No production CRM/calendar write.",
      },
    },
    approval_id: approvalId,
  };
}

async function listEvents(liveClient) {
  const status = await readLiveServiceDeliveryStatus({ liveClient });
  return status.raw?.events || [];
}

async function reserveRun(liveClient, fixture, now) {
  const reservation = {
    id: eventId(fixture.run_id, "reservation"),
    ticket_id: stableUuid("ticket", fixture.work_order.id),
    event_type: "service_delivery_retell_test_call_reserved",
    actor_type: "system",
    actor_id: "Phase6GAcceptance",
    summary: "Reserved controlled Phase 6G Retell test call run. Repeat runs must not place another call.",
    details_json: {
      run_id: fixture.run_id,
      approval_id: fixture.approval_id,
      evidence: {
        work_order_id: fixture.work_order.id,
        evidence_type: "retell_test_call_reserved",
      },
      no_production_activation: true,
      no_number_provisioning: true,
      no_live_routing_change: true,
      no_stripe_email_n8n: true,
    },
    created_at: now,
  };
  return liveClient.upsertTicketEvent(reservation);
}

function existingCompletion(events, fixture) {
  return events.find((event) => (
    (clean(event.details_json?.evidence?.work_order_id) === fixture.work_order.id || clean(event.ticket_number) === fixture.work_order.id)
    && clean(event.event_type) === "service_delivery_retell_test_call_completed"
  )) || null;
}

function existingReservation(events, fixture) {
  return events.find((event) => (
    clean(event.id) === eventId(fixture.run_id, "reservation")
    || (clean(event.event_type) === "service_delivery_retell_test_call_reserved" && clean(event.details_json?.run_id) === fixture.run_id)
  )) || null;
}

function evidenceFromRetell(provider, packet, fixture, env, now) {
  const status = clean(provider.status || provider.provider_status || "unknown");
  const result = clean(provider.outcome || provider.provider_outcome || provider.call_result || "unknown");
  return {
    status: "completed",
    retell_agent_config_id: clean(env.RETELL_AGENT_ID),
    retell_call_id: clean(provider.provider_call_id || provider.call_id),
    call_status: status,
    call_result: result,
    transcript: clean(provider.summary),
    transcript_unavailable_reason: clean(provider.summary) ? "" : "retell_transcript_not_available_at_acceptance_time",
    occurred_at: clean(provider.ended_at || provider.started_at || now),
    approval_id: fixture.approval_id,
    work_order_id: packet.related_work_order_id,
  };
}

function latestExport(voicePacket, events) {
  const voiceStatus = buildVoiceServiceStatusRollup([voicePacket], events);
  return {
    serviceDeliveryExecution: {
      voice_service_status: {
        ...voiceStatus,
        packets: [voicePacket],
      },
    },
    voice_service_status: voiceStatus.summary,
  };
}

export async function runRetellControlledTestCallAcceptance(options = {}) {
  const now = options.now || new Date().toISOString();
  const env = options.env || process.env;
  const fixture = options.fixture || createPhase6GAcceptanceFixture({ runId: options.runId, now });
  const envSeen = boolEnv(env);
  const liveClient = options.liveClient || makeServiceDeliverySupabaseClient(options);
  if (!liveClient) return { ok: false, reason: "service_delivery_live_client_unavailable", env: envSeen };

  const readiness = options.readinessReport || await buildRetellControlledReadinessReport(options);
  if (!readiness.ok) {
    return { ok: false, accepted: false, reason: "retell_readiness_failed", env: envSeen, readiness };
  }

  await persistServiceDeliveryRun({ opportunities: [], workOrders: [fixture.work_order] }, { liveClient, now });
  const voicePacket = {
    ...generateVoiceSetupPacket(fixture.work_order, { now }),
    approval_status: fixture.work_order.approvalStatus,
    approval_id: fixture.approval_id,
  };
  const controlledPacket = generateControlledRetellExecutionPacket(voicePacket, { now });
  if (!controlledPacket.ok) return { ok: false, accepted: false, reason: controlledPacket.reason, env: envSeen };

  const beforeEvents = await listEvents(liveClient);
  const completed = existingCompletion(beforeEvents, fixture);
  if (completed) {
    let exportEvents = beforeEvents;
    if (!existingReservation(beforeEvents, fixture)) {
      await reserveRun(liveClient, fixture, now);
      exportEvents = await listEvents(liveClient);
    }
    const exportDoc = latestExport(voicePacket, exportEvents);
    return {
      ok: true,
      accepted: true,
      duplicate_prevented: true,
      reason: "existing_retell_test_call_evidence_found",
      env: envSeen,
      synthetic_ids: { run_id: fixture.run_id, work_order_id: fixture.work_order.id, approval_id: fixture.approval_id },
      retell_evidence: completed.details_json?.evidence || {},
      ticket_event_writeback: ticketEventSummary(completed),
      latest_json_export: exportDoc.serviceDeliveryExecution,
      safety: safetySummary(),
    };
  }
  const reservation = existingReservation(beforeEvents, fixture);
  if (options.retellEvidence) {
    const evidence = {
      status: "completed",
      retell_agent_config_id: clean(options.retellEvidence.retell_agent_config_id || env.RETELL_AGENT_ID),
      retell_call_id: clean(options.retellEvidence.retell_call_id),
      call_status: clean(options.retellEvidence.call_status),
      call_result: clean(options.retellEvidence.call_result),
      transcript: clean(options.retellEvidence.transcript),
      transcript_unavailable_reason: clean(options.retellEvidence.transcript_unavailable_reason) || (clean(options.retellEvidence.transcript) ? "" : "retell_transcript_not_available_at_acceptance_time"),
      occurred_at: clean(options.retellEvidence.occurred_at) || now,
      approval_id: fixture.approval_id,
      work_order_id: controlledPacket.execution_packet.related_work_order_id,
    };
    const ingested = ingestControlledRetellEvidence(controlledPacket.execution_packet, evidence, { now });
    if (!ingested.ok) return { ok: false, accepted: false, duplicate_prevented: true, reason: ingested.reason, env: envSeen, retell_evidence: evidence };
    const writeback = await writeBackControlledRetellEvidence(ingested, { liveClient, now });
    if (!writeback.ok) return { ok: false, accepted: false, duplicate_prevented: true, reason: writeback.reason, env: envSeen, retell_evidence: evidence };
    const afterEvents = await listEvents(liveClient);
    const exportDoc = latestExport(voicePacket, afterEvents);
    return {
      ok: true,
      accepted: true,
      duplicate_prevented: true,
      reason: reservation
        ? "reserved_retell_test_call_completed_from_supplied_evidence"
        : "retell_test_call_completed_from_supplied_evidence_without_new_call",
      env: envSeen,
      synthetic_ids: { run_id: fixture.run_id, work_order_id: fixture.work_order.id, approval_id: fixture.approval_id },
      retell_evidence: evidence,
      writeback,
      ticket_event_writeback: ticketEventSummary(ingested.event),
      latest_json_export: exportDoc.serviceDeliveryExecution,
      safety: safetySummary(),
    };
  }
  if (reservation) {
    return {
      ok: true,
      accepted: false,
      duplicate_prevented: true,
      reason: "existing_retell_test_call_reservation_found_new_run_id_required",
      env: envSeen,
      synthetic_ids: { run_id: fixture.run_id, work_order_id: fixture.work_order.id, approval_id: fixture.approval_id },
      safety: safetySummary(),
    };
  }

  const reserved = await reserveRun(liveClient, fixture, now);
  if (!reserved?.ok) return { ok: false, accepted: false, reason: reserved?.error || "retell_reservation_write_failed", env: envSeen };
  const transport = options.transport || makeRetellTransport(options);
  if (!transport?.placeCall) return { ok: false, accepted: false, reason: "retell_transport_not_configured", env: envSeen };

  const toNumber = clean(options.toNumber || env.RETELL_CONTROLLED_TEST_TO_NUMBER);
  const placed = await transport.placeCall({
    execution_id: controlledPacket.execution_packet.packet_id,
    lead_id: `phase6g_retell_${slug(fixture.run_id)}`,
    phone: toNumber,
    idempotency_key: `phase6g-retell-test:${fixture.run_id}`,
    approved_script_ref: "phase6g-controlled-retell-test-call",
    approved_angle: "AI Receptionist controlled sandbox test",
  });
  const provider = placed.provider_call_id && transport.lookupCall
    ? await transport.lookupCall(placed.provider_call_id).catch(() => placed)
    : placed;
  const evidence = evidenceFromRetell(provider, controlledPacket.execution_packet, fixture, env, now);
  const ingested = ingestControlledRetellEvidence(controlledPacket.execution_packet, evidence, { now });
  if (!ingested.ok) return { ok: false, accepted: false, reason: ingested.reason, env: envSeen, retell_evidence: evidence };
  const writeback = await writeBackControlledRetellEvidence(ingested, { liveClient, now });
  if (!writeback.ok) return { ok: false, accepted: false, reason: writeback.reason, env: envSeen, retell_evidence: evidence };

  const afterEvents = await listEvents(liveClient);
  const exportDoc = latestExport(voicePacket, afterEvents);
  return {
    ok: true,
    accepted: true,
    duplicate_prevented: false,
    reason: "phase6g_controlled_retell_test_call_complete",
    env: envSeen,
    synthetic_ids: { run_id: fixture.run_id, work_order_id: fixture.work_order.id, approval_id: fixture.approval_id },
    controlled_recipient: phoneLast4(toNumber),
    readiness,
    retell_evidence: evidence,
    writeback,
    ticket_event_writeback: ticketEventSummary(ingested.event),
    latest_json_export: exportDoc.serviceDeliveryExecution,
    safety: safetySummary(),
  };
}

function safetySummary() {
  return {
    no_production_activation: true,
    no_number_provisioning: true,
    no_live_routing_change: true,
    no_inbound_receptionist_activation: true,
    no_outbound_customer_or_prospect_call: true,
    no_stripe_email_n8n: true,
    no_duplicate_tables: true,
  };
}

export function sanitizePhase6GAcceptanceReport(report = {}) {
  const sanitized = JSON.parse(JSON.stringify(report));
  return {
    ...sanitized,
    safety: safetySummary(),
  };
}
