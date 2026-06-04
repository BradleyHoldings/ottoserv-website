// ─── Hermes autonomy scorecard (Autonomy v2, milestone 1) ─────────────────────
//
// THE GAP THIS FILLS
// v1 closes loops and the operating ledger (v2 patch 1) now remembers them, but
// nothing MEASURES whether Hermes is actually operating OttoServ — i.e. there is
// no pass/fail read on loop closure, evidence discipline, the Jonathan
// bottleneck, actor/rail reliability, repair aging, and pipeline/delivery health.
// Without that score, Hermes can't tell "running the company" from "stuck", and
// the learning-weighted selector + goal planner (next milestones) have nothing to
// optimize against.
//
// This module computes that scorecard. It is PURE and deterministic: it reads the
// existing revenue document, the operating-ledger summary, and lead-intent
// signals, and returns per-dimension pass/fail + an overall autonomy status. It
// triggers nothing, persists nothing here (callers/orchestrator own I/O), and
// reuses existing systems (no parallel store).

import { summarizeLedger } from "./hermesOperatingLedger.mjs";
import { detectCallRailState } from "./hermesCallRail.mjs";

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function lower(value) {
  return clean(value).toLowerCase();
}
function round(n, d = 3) {
  return Number.isFinite(n) ? Number(n.toFixed(d)) : null;
}
function daysBetween(iso, now) {
  const t = Date.parse(clean(iso));
  if (Number.isNaN(t)) return null;
  return (Date.parse(now) - t) / 86_400_000;
}

// Tunable thresholds (the pass/fail lines). Conservative defaults.
export const SCORECARD_THRESHOLDS = {
  loop_closure_min: 0.5, // ≥50% of execution tasks reach completed
  evidence_rate_min: 0.8, // ≥80% of evidence-required tasks carry evidence
  bottleneck_max: 0.4, // ≤40% of open items waiting on Jonathan
  repair_age_warn_days: 3, // an open repair older than this is aging
  rail_reliability_min: 0.5, // repaired / (repaired+broken)
};

function evidencePresent(lifecycle) {
  return asArray(lifecycle.submitted_evidence).some((e) => clean(e.evidence_reference) || clean(e.evidence_summary));
}

// ─── Dimension: execution loop closure + evidence discipline ──────────────────
function executionHealth(document) {
  const items = asArray(document?.approvalExecutionQueue?.items);
  const lifecycles = items.map((i) => i.lifecycle || {});
  const total = lifecycles.length;
  const completed = lifecycles.filter((l) => clean(l.execution_status) === "completed").length;
  const requiresEvidence = lifecycles.filter((l) => asArray(l.required_evidence).length > 0);
  const withEvidence = requiresEvidence.filter(evidencePresent).length;
  const pendingEvidence = lifecycles.filter((l) =>
    ["queued", "assigned", "in_progress", "waiting_for_evidence"].includes(clean(l.execution_status)),
  ).length;
  const blocked = lifecycles.filter((l) => ["blocked", "failed"].includes(clean(l.execution_status))).length;

  return {
    total_tasks: total,
    completed,
    pending_evidence: pendingEvidence,
    blocked,
    loop_closure_rate: total ? round(completed / total) : null,
    evidence_rate: requiresEvidence.length ? round(withEvidence / requiresEvidence.length) : null,
  };
}

// ─── Dimension: Jonathan bottleneck ───────────────────────────────────────────
// Normal policy-approved outbound is NOT a bottleneck: once the throughput layer
// materializes it under standing policy it becomes an open execution task (counted
// in open_items, NOT in pending). Only GATED proposals — exceptional/over-cap/
// uncovered actions that still need Jonathan — raise the bottleneck.
function bottleneckHealth(document, ledgerSummary, throughput) {
  const items = asArray(document?.approvalExecutionQueue?.items);
  const orders = asArray(document?.implementationWorkOrders?.orders);
  const openTasks = items.filter((i) => clean(i.lifecycle?.execution_status) !== "completed");
  const openOrders = orders.filter((o) => lower(o.status) !== "completed" && lower(o.implementation_stage) !== "completed");
  const awaitingJonathan = openOrders.filter((o) => Boolean(o.approvalRequired) && lower(o.approvalStatus) !== "approved");

  const ledgerPending = Number(ledgerSummary?.approvals?.pending || 0);
  const gatedActions = asArray(throughput?.gated).length;
  const openItems = openTasks.length + openOrders.length + gatedActions;
  const pending = awaitingJonathan.length + ledgerPending + gatedActions;
  return {
    open_items: openItems,
    pending_approvals: pending,
    gated_actions: gatedActions,
    work_orders_awaiting_approval: awaitingJonathan.map((o) => clean(o.id)).filter(Boolean),
    bottleneck_rate: openItems ? round(Math.min(1, pending / openItems)) : (pending > 0 ? 1 : 0),
  };
}

// ─── Dimension: rail reliability + repair aging / MTTR ────────────────────────
function repairHealth(document, ledgerEntries, now) {
  const packets = asArray(document?.repairPackets);
  const openRepairs = packets.filter((p) => !["verified", "repaired", "closed"].includes(lower(p.status)));
  const ages = openRepairs
    .map((p) => daysBetween(p.created_at, now))
    .filter((n) => n !== null);
  const oldest = ages.length ? round(Math.max(...ages), 2) : null;
  const aging = openRepairs.filter((p) => {
    const a = daysBetween(p.created_at, now);
    return a !== null && a > SCORECARD_THRESHOLDS.repair_age_warn_days;
  }).length;

  // MTTR from the ledger: pair rail_broken → rail_repaired by source_id.
  const brokenAt = new Map();
  const durations = [];
  let repaired = 0;
  let broken = 0;
  for (const e of asArray(ledgerEntries)) {
    if (e.event_type === "rail_broken") { broken += 1; if (!brokenAt.has(e.source_id)) brokenAt.set(e.source_id, e.ts); }
    if (e.event_type === "rail_repaired") {
      repaired += 1;
      const start = brokenAt.get(e.source_id);
      if (start) { const d = daysBetween(start, e.ts); if (d !== null && d >= 0) durations.push(d); brokenAt.delete(e.source_id); }
    }
  }
  // Of the rails that broke, how many got repaired (capped at 1). No breaks → n/a.
  const rail_reliability = broken ? round(Math.min(1, repaired / broken)) : (repaired ? 1 : null);
  return {
    open_repairs: openRepairs.length,
    aging_repairs: aging,
    oldest_open_repair_days: oldest,
    rails_broken: broken,
    rails_repaired: repaired,
    rail_reliability,
    mttr_days: durations.length ? round(durations.reduce((a, b) => a + b, 0) / durations.length, 2) : null,
  };
}

// ─── Dimension: lead pipeline health ──────────────────────────────────────────
function pipelineHealth({ leads, pipeline, ingestReport, now }) {
  const leadList = asArray(leads);
  const fresh = leadList.filter((l) => {
    const a = daysBetween(l.created_at, now);
    return a !== null && a <= 2;
  }).length;
  const aTier = leadList.filter((l) => clean(l.tier) === "A-tier").length;
  const lowRecent = Boolean(pipeline?.summary?.low_recent_intent);
  const needsVerification = asArray(ingestReport?.rows).filter((r) => clean(r.ingest_status) === "needs_verification").length;

  let status = "healthy";
  if (!leadList.length) status = "empty";
  else if (lowRecent || !fresh) status = "degraded";

  return {
    total_leads: leadList.length,
    fresh_leads: fresh,
    a_tier: aTier,
    low_recent_intent: lowRecent,
    needs_verification_rows: needsVerification,
    status,
  };
}

// ─── Dimension: service-delivery health ───────────────────────────────────────
function serviceDeliveryHealth(document) {
  const orders = asArray(document?.implementationWorkOrders?.orders);
  const byStage = {};
  let readyForBuild = 0;
  let awaitingApproval = 0;
  let stalledDelivery = 0;
  for (const o of orders) {
    const stage = clean(o.implementation_stage) || clean(o.stage) || "unknown";
    byStage[stage] = (byStage[stage] || 0) + 1;
    if (lower(o.approvalStatus) === "approved" || ["paid_awaiting_implementation", "implementation_in_progress"].includes(stage)) readyForBuild += 1;
    else if (Boolean(o.approvalRequired) && lower(o.approvalStatus) !== "approved") awaitingApproval += 1;
    if (stage === "report_ready_awaiting_delivery") stalledDelivery += 1;
  }
  return {
    total_work_orders: orders.length,
    ready_for_build: readyForBuild,
    awaiting_approval: awaitingApproval,
    stalled_delivery: stalledDelivery,
    by_stage: byStage,
  };
}

// ─── Top blockers (ranked) ────────────────────────────────────────────────────
function topBlockers({ execution, bottleneck, repair, pipeline, callRail, service, document, now }) {
  const blockers = [];
  for (const p of asArray(document?.repairPackets)) {
    if (["verified", "repaired", "closed"].includes(lower(p.status))) continue;
    const age = daysBetween(p.created_at, now);
    blockers.push({ type: "broken_rail", id: clean(p.id) || clean(p.what_failed), priority: "critical", age_days: age === null ? null : round(age, 2), detail: clean(p.actual_behavior) || clean(p.category) });
  }
  if (pipeline.status === "empty") blockers.push({ type: "empty_pipeline", id: "lead_discovery_rail", priority: "critical", detail: "No leads — revenue cannot move." });
  else if (pipeline.status === "degraded") blockers.push({ type: "stale_pipeline", id: "lead_discovery_rail", priority: "high", detail: "Low recent-intent / no fresh leads." });
  if (callRail?.status === "idle") blockers.push({ type: "call_rail_idle", id: "call_rail", priority: "high", detail: callRail.detail });
  else if (callRail?.status === "stale") blockers.push({ type: "call_rail_stale", id: "call_rail", priority: "medium", detail: callRail.detail });
  if (bottleneck.pending_approvals > 0) blockers.push({ type: "jonathan_approval", id: "approval_queue", priority: "high", detail: `${bottleneck.pending_approvals} item(s) awaiting Jonathan.` });
  if (execution.blocked > 0) blockers.push({ type: "blocked_tasks", id: "execution_queue", priority: "high", detail: `${execution.blocked} execution task(s) blocked/failed.` });
  if (service.stalled_delivery > 0) blockers.push({ type: "stalled_delivery", id: "service_delivery", priority: "medium", detail: `${service.stalled_delivery} report(s) ready but undelivered.` });
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  return blockers.sort((a, b) => (rank[a.priority] - rank[b.priority]) || (Number(b.age_days || 0) - Number(a.age_days || 0))).slice(0, 10);
}

/**
 * Compute the Hermes autonomy scorecard. Pure + deterministic.
 *
 * @param {object} state { document?, ledger? (entries[] or summary), leads?,
 *   pipeline?, ingestReport?, now? }
 * @returns scorecard with per-dimension metrics, pass/fail grades, ranked
 *   blockers, an autonomy_score (0-100), and autonomy_status.
 */
export function computeScorecard(state = {}, options = {}) {
  const now = state.now || options.now || new Date().toISOString();
  const document = state.document || {};
  // Accept raw ledger entries OR a precomputed summary.
  const ledgerEntries = Array.isArray(state.ledger) ? state.ledger : asArray(state.ledgerEntries);
  const ledgerSummary = state.ledgerSummary || (Array.isArray(state.ledger) ? summarizeLedger(state.ledger) : state.ledger?.actors ? state.ledger : summarizeLedger(ledgerEntries));

  const execution = executionHealth(document);
  const bottleneck = bottleneckHealth(document, ledgerSummary, state.throughput);
  const repair = repairHealth(document, ledgerEntries, now);
  const pipeline = pipelineHealth({ leads: state.leads, pipeline: state.pipeline, ingestReport: state.ingestReport, now });
  const callRail = detectCallRailState({ leads: state.leads, document, ledger: ledgerEntries, now });
  const service = serviceDeliveryHealth(document);
  const blockers = topBlockers({ execution, bottleneck, repair, pipeline, callRail, service, document, now });

  const T = SCORECARD_THRESHOLDS;
  // Per-dimension pass/fail (null metric = not-applicable → not failing).
  const grades = {
    loop_closure: execution.loop_closure_rate === null ? "n/a" : execution.loop_closure_rate >= T.loop_closure_min ? "pass" : "fail",
    evidence_discipline: execution.evidence_rate === null ? "n/a" : execution.evidence_rate >= T.evidence_rate_min ? "pass" : "fail",
    jonathan_bottleneck: bottleneck.bottleneck_rate <= T.bottleneck_max ? "pass" : "fail",
    rail_reliability: repair.rail_reliability === null ? "n/a" : repair.rail_reliability >= T.rail_reliability_min ? "pass" : "fail",
    repair_aging: repair.aging_repairs === 0 ? "pass" : "fail",
    lead_pipeline: pipeline.status === "empty" ? "fail" : pipeline.status === "degraded" ? "warn" : "pass",
    call_rail: callRail.status === "no_demand" ? "n/a" : callRail.status === "idle" ? "fail" : callRail.status === "stale" ? "warn" : "pass",
  };

  // Weighted 0-100 score over APPLICABLE dimensions.
  const parts = [];
  if (execution.loop_closure_rate !== null) parts.push([25, execution.loop_closure_rate]);
  if (execution.evidence_rate !== null) parts.push([25, execution.evidence_rate]);
  parts.push([20, 1 - bottleneck.bottleneck_rate]);
  if (repair.rail_reliability !== null) parts.push([15, repair.rail_reliability]);
  parts.push([15, pipeline.status === "healthy" ? 1 : pipeline.status === "degraded" ? 0.5 : 0]);
  // Call rail counts only when there is call demand (n/a → not weighted).
  if (callRail.status !== "no_demand") parts.push([15, callRail.status === "healthy" ? 1 : callRail.status === "stale" ? 0.5 : 0]);
  const weightSum = parts.reduce((s, [w]) => s + w, 0);
  const autonomy_score = weightSum ? Math.round(parts.reduce((s, [w, v]) => s + w * Math.max(0, Math.min(1, v)), 0) / weightSum * 100) : 0;

  const criticalBlocker = blockers.some((b) => b.priority === "critical");
  const autonomy_status = criticalBlocker || autonomy_score < 40 ? "blocked" : autonomy_score < 70 ? "degraded" : "operating";

  return {
    generated_at: now,
    autonomy_status,
    autonomy_score,
    grades,
    dimensions: {
      execution,
      jonathan_bottleneck: bottleneck,
      repair,
      lead_pipeline: pipeline,
      call_rail: callRail,
      service_delivery: service,
    },
    actor_reliability: ledgerSummary?.actors || {},
    top_blockers: blockers,
    thresholds: T,
  };
}
