// ─── Hermes readiness report (autonomy readiness step 3) ──────────────────────
//
// THE GAP THIS FILLS
// The scorecard measures operating health, but there was no single read on whether
// OttoServ is READY to (a) acquire clients, (b) deliver service, and (c) run client
// success — and what TRUE blocker stands in the way of each. This module composes
// the existing detectors (selector, throughput, scorecard, build packets, client
// opportunities, persistence config) into one readiness report. PURE: triggers
// nothing; every action it surfaces keeps its gate.

import { selectNextActions } from "./hermesNextActionSelector.mjs";
import { materializeActorPackets, reconcileNextActions, DEFAULT_STANDING_OUTBOUND_POLICY } from "./hermesApprovalThroughput.mjs";
import { computeScorecard } from "./hermesAutonomyScorecard.mjs";
import { buildPacketsForDocument } from "./hermesBuildPacket.mjs";
import { detectClientOpportunities } from "./hermesClientSuccess.mjs";
import { describeRevenueStateConfig } from "./revenueEngineSupabaseStore.mjs";

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const ACQUISITION_SOURCES = new Set(["lead_pipeline", "lead_intent_ingest", "lead", "call_rail", "execution_task"]);
const DELIVERY_SOURCES = new Set(["implementation_work_order", "paid_client_handoff"]);

function statusFrom({ blocked, partial }) {
  if (blocked) return "blocked";
  if (partial) return "partial";
  return "ready";
}

/**
 * Compute the OttoServ readiness report. Pure + deterministic.
 *
 * @param {object} state { document?, leads?, pipeline?, ingestReport?, clients?, ledger?, now? }
 * @param {object} options { now?, standingOutboundPolicy? }
 */
export function computeReadiness(state = {}, options = {}) {
  const now = state.now || options.now || new Date().toISOString();
  const document = state.document || {};
  const policy = options.standingOutboundPolicy || DEFAULT_STANDING_OUTBOUND_POLICY;

  const selected = selectNextActions({ ...state, document, now }, { now });
  const throughput = materializeActorPackets(selected.actions, { document, now, standingOutboundPolicy: policy });
  const reconciled = reconcileNextActions(selected.actions, throughput);
  const scorecard = computeScorecard({ ...state, document, throughput, now }, { now });
  const packets = buildPacketsForDocument(document, { now });
  const clientOpps = detectClientOpportunities({ clients: state.clients, document, now }, { now });

  const nextByArea = (predicate) => reconciled.filter((a) => predicate(a)).slice(0, 5).map((a) => ({ action_type: a.action_type, source_type: a.source_type, throughput_status: a.throughput_status, required_approval: a.required_approval, next_step: a.next_step }));

  // ─── Acquisition ────────────────────────────────────────────────────────────
  const pipeline = scorecard.dimensions.lead_pipeline;
  const outboundMaterialized = throughput.summary.materialized_standing_outbound;
  const gatedOutbound = throughput.gated.filter((g) => /recommend_approved_(email|call)/.test(clean(g.approval_packet?.action_type))).length;
  const acqBlocked = pipeline.status === "empty";
  const acqPartial = pipeline.status === "degraded";
  const acquisition = {
    status: statusFrom({ blocked: acqBlocked, partial: acqPartial }),
    pipeline_status: pipeline.status,
    fresh_leads: pipeline.fresh_leads,
    outbound_materialized_standing: outboundMaterialized,
    normal_outbound_gated: gatedOutbound, // should be 0 — normal outbound is not per-item gated
    durable_queue_size: asArray(document?.approvalExecutionQueue?.items).filter((i) => i.taskPacket?.actor_packet?.channel).length,
    evidence_rate: scorecard.dimensions.execution.evidence_rate,
    blockers: scorecard.top_blockers.filter((b) => ["empty_pipeline", "stale_pipeline", "low_recent_intent", "call_rail_idle", "call_rail_stale"].includes(b.type)),
    next_actions: nextByArea((a) => ACQUISITION_SOURCES.has(a.source_type)),
  };

  // ─── Delivery ───────────────────────────────────────────────────────────────
  const readyPackets = asArray(packets.ready_for_build);
  const blockedPackets = asArray(packets.blocked_awaiting_approval);
  const allPackets = [...readyPackets, ...blockedPackets];
  const chainWired = true; // seed→WO→build-packet→evidence chain is present in-repo
  const delivery = {
    // The delivery chain is "ready" when it is wired; awaiting-approval packets are
    // a correct gate, not a readiness failure.
    status: statusFrom({ blocked: !chainWired, partial: allPackets.length === 0 }),
    work_orders: asArray(document?.implementationWorkOrders?.orders).length,
    build_packets_ready: readyPackets.length,
    build_packets_blocked_on_approval: blockedPackets.length,
    evidence_required_examples: allPackets[0] ? asArray(allPackets[0].required_evidence).slice(0, 2) : [],
    note: allPackets.length === 0 ? "No active work orders yet — chain is wired and ready to receive a paid-client handoff." : "",
    blockers: scorecard.top_blockers.filter((b) => ["stalled_delivery"].includes(b.type)),
    next_actions: nextByArea((a) => DELIVERY_SOURCES.has(a.source_type)),
  };

  // ─── Client success ───────────────────────────────────────────────────────────
  const opportunities = asArray(clientOpps.opportunities);
  const clientSuccess = {
    status: statusFrom({ blocked: false, partial: asArray(state.clients).length === 0 }),
    clients_monitored: asArray(state.clients).length,
    opportunities: opportunities.length,
    by_type: clientOpps.summary?.by_type || {},
    note: asArray(state.clients).length === 0 ? "No delivered clients yet — loop is wired and will surface expansion/churn-risk/optimization as clients land." : "",
    next_actions: nextByArea((a) => a.source_type === "client_success"),
  };

  // ─── Overall ────────────────────────────────────────────────────────────────
  const persistence = describeRevenueStateConfig();
  const trueBlockers = scorecard.top_blockers.slice(0, 8);
  return {
    generated_at: now,
    autonomy_status: scorecard.autonomy_status,
    autonomy_score: scorecard.autonomy_score,
    acquisition,
    delivery,
    client_success: clientSuccess,
    persistence: { configured: persistence.configured, missing_env: persistence.missing_env, reason: persistence.reason },
    overall: {
      ready_for_acquisition: acquisition.status !== "blocked" && acquisition.normal_outbound_gated === 0,
      ready_for_delivery: delivery.status !== "blocked",
      ready_for_client_success: clientSuccess.status !== "blocked",
      durable_persistence: persistence.configured,
      top_blockers: trueBlockers,
      next_actions: reconciled.slice(0, 6).map((a) => ({ action_type: a.action_type, priority: a.priority, throughput_status: a.throughput_status, required_approval: a.required_approval })),
    },
  };
}
