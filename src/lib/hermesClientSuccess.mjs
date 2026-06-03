// ─── Hermes client success / opportunity loop (Autonomy v2, milestone 7) ──────
//
// THE GAP THIS FILLS
// v1 + v2 so far drive acquisition → delivery. Nothing watches EXISTING clients
// for expansion, churn risk, or optimization — so OttoServ grows only by adding
// logos, never by keeping/expanding them. This module detects post-sale
// opportunities from client/workflow signals and emits approval-gated opportunity
// packets that flow through the SAME selector/approval/evidence machinery.
//
// PURE + deterministic. It reads client success signals (a safe, fixture/store
// shape — no PII beyond business name) plus completed work orders, and proposes
// next actions. It triggers NOTHING: every client-facing move (check-in,
// expansion offer) is required_approval:true; internal optimizations route to
// Codex and stay deploy-gated. No outreach, no campaigns, no client deliverables.

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function lower(value) {
  return clean(value).toLowerCase();
}
function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function daysSince(iso, now) {
  const t = Date.parse(clean(iso));
  if (Number.isNaN(t)) return null;
  return (Date.parse(now) - t) / 86_400_000;
}
function slug(value) {
  return lower(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export const OPPORTUNITY_TYPES = ["expansion", "churn_risk", "optimization", "improvement"];

const CLIENT_FACING_FORBIDDEN = [
  "Do NOT contact the client, send an offer, or schedule outreach before Jonathan approval.",
  "Do NOT create pricing, discounts, or payment links without approval.",
];

function opportunity(o) {
  return {
    opportunity_id: clean(o.opportunity_id),
    type: OPPORTUNITY_TYPES.includes(o.type) ? o.type : "improvement",
    source_type: "client_success",
    client: clean(o.client), // business name only
    priority: o.priority || "medium",
    actor: clean(o.actor) || "Hermes",
    action_type: clean(o.action_type),
    reason: clean(o.reason),
    signal: clean(o.signal),
    required_approval: Boolean(o.required_approval),
    required_evidence: asArray(o.required_evidence),
    risk_level: clean(o.risk_level) || "medium",
    forbidden_actions: asArray(o.forbidden_actions),
    status: "proposed",
    next_step: clean(o.next_step),
  };
}

/**
 * Detect client-success opportunities from client signals + delivered work orders.
 * Pure. Client signal shape (safe/fixture):
 *   { client_id, name, status, usage_trend('growing'|'steady'|'declining'),
 *     sentiment('positive'|'neutral'|'negative'), last_contact_at,
 *     pilot_baseline, pilot_current, pilot_target, contract_value }
 */
export function detectClientOpportunities(state = {}, options = {}) {
  const now = state.now || options.now || new Date().toISOString();
  const opportunities = [];
  const clients = asArray(state.clients);

  for (const c of clients) {
    const name = clean(c.name) || clean(c.client) || clean(c.client_id) || "client";
    const key = slug(clean(c.client_id) || name);
    const trend = lower(c.usage_trend);
    const sentiment = lower(c.sentiment);
    const sinceContact = daysSince(c.last_contact_at, now);
    const baseline = num(c.pilot_baseline);
    const current = num(c.pilot_current);
    const target = num(c.pilot_target);

    // CHURN RISK — declining usage, negative sentiment, slipping metric, or gone quiet.
    const churnSignals = [];
    if (trend === "declining") churnSignals.push("usage declining");
    if (sentiment === "negative") churnSignals.push("negative sentiment");
    if (sinceContact !== null && sinceContact > 30) churnSignals.push(`no contact in ${Math.round(sinceContact)}d`);
    if (baseline !== null && current !== null && current < baseline) churnSignals.push("pilot metric below baseline");
    if (churnSignals.length) {
      opportunities.push(opportunity({
        opportunity_id: `opp-churn-${key}`,
        type: "churn_risk",
        client: name,
        priority: "high",
        actor: "Jonathan",
        action_type: "client_retention_checkin",
        reason: `Churn-risk signals for ${name}: ${churnSignals.join("; ")}.`,
        signal: churnSignals.join("; "),
        required_approval: true,
        required_evidence: ["Logged check-in outcome + agreed remediation."],
        risk_level: "high",
        forbidden_actions: CLIENT_FACING_FORBIDDEN,
        next_step: "Propose an approved retention check-in; address the cause before renewal risk grows.",
      }));
      continue; // churn risk takes precedence over expansion for the same client
    }

    // EXPANSION — pilot exceeding target and/or growing + positive sentiment.
    const exceeding = target !== null && current !== null && current >= target * 1.2;
    if (exceeding || (trend === "growing" && sentiment === "positive")) {
      opportunities.push(opportunity({
        opportunity_id: `opp-expansion-${key}`,
        type: "expansion",
        client: name,
        priority: "high",
        actor: "Jonathan",
        action_type: "propose_expansion",
        reason: `${name} is succeeding${exceeding ? ` (pilot ${current} ≥ 1.2× target ${target})` : " (growing usage + positive sentiment)"} — expansion/upsell candidate.`,
        signal: exceeding ? `pilot ${current} vs target ${target}` : "growing + positive",
        required_approval: true,
        required_evidence: ["Expansion proposal accepted (signed/paid) before delivery expands."],
        risk_level: "medium",
        forbidden_actions: CLIENT_FACING_FORBIDDEN,
        next_step: "Draft an approved expansion proposal (do not send before approval).",
      }));
    }

    // OPTIMIZATION — explicit workflow inefficiency flag → internal Codex improvement.
    for (const sig of asArray(c.workflow_signals)) {
      if (lower(sig.kind) === "inefficiency" || clean(sig.optimization)) {
        opportunities.push(opportunity({
          opportunity_id: `opp-optimize-${key}-${slug(clean(sig.id) || clean(sig.optimization) || "x")}`,
          type: "optimization",
          client: name,
          priority: "medium",
          actor: "Codex",
          action_type: "internal_optimization",
          reason: `Optimization opportunity for ${name}: ${clean(sig.optimization) || clean(sig.detail) || "workflow inefficiency"}.`,
          signal: clean(sig.detail) || clean(sig.optimization),
          required_approval: false,
          required_evidence: ["Commit + before/after metric proving the optimization."],
          risk_level: "low",
          forbidden_actions: ["Do NOT deploy to the client's production without approval."],
          next_step: "Build + verify the optimization internally; approval-gate any production change.",
        }));
      }
    }
  }

  // Delivered/completed work orders are expansion candidates too.
  for (const wo of asArray(state.document?.implementationWorkOrders?.orders)) {
    const stage = lower(wo.implementation_stage);
    if (stage === "completed" || stage === "delivered_awaiting_evidence") {
      const name = clean(wo.client) || "client";
      opportunities.push(opportunity({
        opportunity_id: `opp-expansion-wo-${slug(clean(wo.id) || name)}`,
        type: "expansion",
        client: name,
        priority: "medium",
        actor: "Jonathan",
        action_type: "propose_expansion",
        reason: `Pilot delivered for ${name} — natural point to propose ongoing/expanded scope.`,
        signal: `work order ${clean(wo.id)} ${stage}`,
        required_approval: true,
        required_evidence: ["Expansion proposal accepted before scope expands."],
        risk_level: "medium",
        forbidden_actions: CLIENT_FACING_FORBIDDEN,
        next_step: "Draft an approved expansion/retainer proposal.",
      }));
    }
  }

  const by_type = {};
  for (const o of opportunities) by_type[o.type] = (by_type[o.type] || 0) + 1;
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  opportunities.sort((a, b) => (rank[a.priority] - rank[b.priority]) || a.opportunity_id.localeCompare(b.opportunity_id));

  return { generated_at: now, count: opportunities.length, by_type, opportunities };
}
