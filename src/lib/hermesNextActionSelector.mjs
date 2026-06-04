// ─── Hermes next-action selector (autonomy v1 decision layer) ─────────────────
//
// THE GAP THIS FILLS
// Every loop stage now reads/writes real state (lead-intent pipeline + ingest
// report, approval → execution lifecycles, evidence write-back, actor evidence
// intake, implementation work orders, repair packets). But choosing WHAT TO DO
// NEXT from that state was still Jonathan's manual interpretation. This module is
// the decision layer: given the current state, it deterministically emits the
// prioritized next actions — closing detect → decide → (approve) → execute →
// evidence → status → NEXT ACTION without a human reading the document.
//
// PURE + SAFE: it RECORDS DECISIONS ONLY. It returns next-action descriptors. It
// triggers no outreach, calls, emails, payments, n8n, deploys, or client-facing
// sends. Every revenue-moving or client-facing action it proposes is marked
// required_approval:true with explicit forbidden_actions and stays in a "proposed"
// status until a human/approval gate clears it. It reuses existing systems and
// adds no parallel store.

import { canCompleteExecution, HIGH_RISK_APPROVAL_ACTIONS } from "./approvalExecutionBridge.mjs";
import { detectCallRailState, isCallTask } from "./hermesCallRail.mjs";
import { buildLeadIntentResearchTasks } from "./leadIntentResearchTasks.mjs";
import { RESEARCH_RESULTS_CONTRACT } from "./leadResearchContract.mjs";
import { detectInterestedHandoffs } from "./hermesPaidClientHandoff.mjs";
import { buildServiceDeliveryPacket } from "./hermesBuildPacket.mjs";
import { detectClientOpportunities } from "./hermesClientSuccess.mjs";

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function lower(value) {
  return clean(value).toLowerCase();
}
function slug(value) {
  return lower(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

export const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

function isWithinDays(iso, days, now) {
  const t = Date.parse(clean(iso));
  if (Number.isNaN(t)) return false;
  return Date.parse(now) - t <= days * 86_400_000;
}

function leadHasEvidence(lead) {
  return Boolean(clean(lead.source_url) || asArray(lead.intent?.source_urls).some(Boolean));
}

// Normalize one next action so every descriptor carries the full required schema.
function makeAction(a) {
  return {
    action_id: clean(a.action_id),
    source_type: clean(a.source_type),
    source_id: clean(a.source_id),
    priority: a.priority in PRIORITY_RANK ? a.priority : "medium",
    actor: clean(a.actor) || "Hermes",
    action_type: clean(a.action_type),
    reason: clean(a.reason),
    required_approval: Boolean(a.required_approval),
    required_evidence: asArray(a.required_evidence),
    risk_level: clean(a.risk_level) || "low",
    forbidden_actions: asArray(a.forbidden_actions),
    status: clean(a.status) || "proposed",
    next_step: clean(a.next_step),
    ...(a.suggested_prompt_or_packet !== undefined ? { suggested_prompt_or_packet: a.suggested_prompt_or_packet } : {}),
  };
}

// Standing guardrail lists reused so no proposed action can be read as "just send".
const OUTREACH_FORBIDDEN = [
  "Do NOT contact/call/email/DM before Jonathan approval is recorded.",
  "Do NOT contact do-not-call / blacklisted / negative-response leads.",
  "Do NOT exceed max attempts, cooldown windows, or per-alias email caps.",
];
const CLIENT_FACING_FORBIDDEN = [
  "Do NOT send client-facing deliverables, proposals, or payment links without approval.",
  "Do NOT create Stripe products/pricing or change credentials.",
];

// ─── Case handlers ────────────────────────────────────────────────────────────

// Build a compact, actor-ready Cowork research brief so dispatch_lead_research is
// executable without Jonathan composing it. Trims the full per-ICP packet to the
// top ICPs + first queries, and attaches the research-results.json contract.
function buildCoworkResearchPacket({ now, location, reason, maxIcps = 3 }) {
  const full = buildLeadIntentResearchTasks({ now, location, reason });
  const briefs = asArray(full.tasks).slice(0, maxIcps).map((t) => ({
    task_id: t.task_id,
    icp: t.icp,
    mission_title: t.mission_title,
    top_queries: asArray(t.sources).flatMap((s) => asArray(s.queries)).slice(0, 3),
    evidence_required: "Public source URL + exact quoted snippet + date_of_signal per high-intent lead.",
  }));
  return {
    kind: "cowork_research",
    run: RESEARCH_RESULTS_CONTRACT.apply_command,
    generate_full_packet: "npm run lead:research",
    output_file: RESEARCH_RESULTS_CONTRACT.output_file,
    icp_briefs: briefs,
    contract: {
      required_fields: RESEARCH_RESULTS_CONTRACT.required_fields,
      recent_intent_fields: RESEARCH_RESULTS_CONTRACT.recent_intent_fields,
      evidence_rule: RESEARCH_RESULTS_CONTRACT.evidence_rule,
      forbidden: RESEARCH_RESULTS_CONTRACT.forbidden,
    },
  };
}

// 1 + 2: lead pipeline state → research / verification.
function leadPipelineActions({ leads, pipeline, ingestReport, now }) {
  const actions = [];
  const leadList = asArray(leads);
  const fresh = leadList.filter((l) => isWithinDays(l.created_at, 2, now));
  const lowRecent = Boolean(pipeline?.summary?.low_recent_intent);
  const empty = leadList.length === 0;

  if (empty || !fresh.length || lowRecent) {
    actions.push(makeAction({
      action_id: `na-lead_pipeline-discovery-${now.slice(0, 10)}`,
      source_type: "lead_pipeline",
      source_id: "lead_discovery_rail",
      priority: empty ? "critical" : "high",
      actor: "Cowork",
      action_type: "dispatch_lead_research",
      reason: empty
        ? "Cold-lead pipeline is empty — revenue cannot move without leads."
        : lowRecent
          ? "Recent-intent lead volume is below threshold."
          : "No leads imported in the last 2 days — top of funnel going stale.",
      required_approval: false,
      required_evidence: ["Public source URL + exact snippet + date for each high-intent lead."],
      risk_level: "low",
      forbidden_actions: ["Do NOT contact any lead.", "Do NOT fabricate evidence or infer intent without a citation."],
      next_step: "Run `npm run lead:research` to get the Cowork brief, do the public research into research-results.json, then `npm run lead:intake` to refill the pipeline.",
      suggested_prompt_or_packet: buildCoworkResearchPacket({
        now,
        location: pipeline?.location || "",
        reason: empty ? "Cold-lead pipeline is empty." : lowRecent ? "Recent-intent lead volume below threshold." : "No fresh leads in the last 2 days.",
      }),
    }));
  }

  const rows = asArray(ingestReport?.rows);
  const needsWork = rows.filter((r) => ["needs_verification", "rejected"].includes(clean(r.ingest_status)));
  if (needsWork.length) {
    actions.push(makeAction({
      action_id: `na-lead_intent_ingest-verify-${now.slice(0, 10)}`,
      source_type: "lead_intent_ingest",
      source_id: "ingest_report",
      priority: "medium",
      actor: "Cowork",
      action_type: "redispatch_lead_research_with_gaps",
      reason: `${needsWork.length} researched lead(s) need verification/replacement (missing evidence, contact path, or ICP fit).`,
      required_approval: false,
      required_evidence: ["Add the specific missing fields per row, then re-run intake."],
      risk_level: "low",
      forbidden_actions: ["Do NOT contact any lead.", "Do NOT fabricate evidence."],
      next_step: "Cowork fills the listed gaps; re-run `npm run lead:intake`.",
      suggested_prompt_or_packet: {
        kind: "lead_gaps",
        rows: needsWork.slice(0, 25).map((r) => ({ ref: r.ref, status: r.ingest_status, fixes: r.fixes })),
      },
    }));
  }
  return actions;
}

// 3 + 4: tiered leads → approval-gated call / email recommendations.
function tieredLeadActions({ leads }) {
  const actions = [];
  const leadList = asArray(leads).filter((l) => clean(l.status) !== "rejected");

  const aTier = leadList
    .filter((l) => clean(l.tier) === "A-tier" && clean(l.normalized_phone) && leadHasEvidence(l))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, 5);
  for (const lead of aTier) {
    const id = clean(lead.lead_id) || slug(`${lead.company}`);
    actions.push(makeAction({
      action_id: `na-lead-${slug(id)}-call`,
      source_type: "lead",
      source_id: id,
      priority: "high",
      actor: "Morgan/Retell",
      action_type: "recommend_approved_call",
      reason: `A-tier lead (${clean(lead.company)}) with phone + public evidence (score ${lead.score}).`,
      required_approval: true,
      required_evidence: ["Retell/Morgan call id, outcome, and next action (submitted via evidence intake)."],
      risk_level: "high",
      forbidden_actions: OUTREACH_FORBIDDEN,
      next_step: "Request Jonathan approval; on approval the call task enters the execution queue. Do not dial before then.",
      suggested_prompt_or_packet: { kind: "call_packet", lead_id: id, company: clean(lead.company), angle: clean(lead.intent?.likely_ottoserv_angle) },
    }));
  }

  const bTier = leadList
    .filter((l) => clean(l.tier) === "B-tier" && clean(l.email) && leadHasEvidence(l))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, 5);
  for (const lead of bTier) {
    const id = clean(lead.lead_id) || slug(`${lead.company}`);
    actions.push(makeAction({
      action_id: `na-lead-${slug(id)}-email`,
      source_type: "lead",
      source_id: id,
      priority: "medium",
      actor: "OttoServ Outreach (email rail)",
      action_type: "recommend_approved_email",
      reason: `B-tier lead (${clean(lead.company)}) with email + public evidence (score ${lead.score}).`,
      required_approval: true,
      required_evidence: ["Sent email record: recipient, timestamp, message id, reply-tracking ref."],
      risk_level: "medium",
      forbidden_actions: OUTREACH_FORBIDDEN,
      next_step: "Request approval for an under-cap email; on approval it enters the execution queue.",
      suggested_prompt_or_packet: { kind: "email_packet", lead_id: id, company: clean(lead.company), offer: clean(lead.intent?.recommended_offer) },
    }));
  }
  return actions;
}

// 5: leads with public intent + evidence but NO usable contact path → contact
// ENRICHMENT (sprint priority 5). The seed spreadsheet supplies source URLs and
// pain, but often no email/phone. Rather than let those leads sit idle (a "healthy
// pipeline" that produces no work) or contact them with no contact path, Hermes
// proposes a low-risk enrichment task routed to Cowork (or safe self-research). It
// is NOT per-item Jonathan-gated. If the owning actor is credit/window exhausted,
// the downstream availability layer defers it (queue-until-reset), no broken rail.
function leadEnrichmentActions({ leads }) {
  const actions = [];
  const needsEnrichment = asArray(leads)
    .filter((l) => clean(l.status) !== "rejected")
    .filter((l) => !(clean(l.email) || clean(l.normalized_phone) || clean(l.phone)))
    .filter((l) => leadHasEvidence(l)) // only enrich leads that already carry public evidence
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, 5);
  for (const lead of needsEnrichment) {
    const id = clean(lead.lead_id) || slug(`${lead.company}`);
    actions.push(makeAction({
      action_id: `na-lead-${slug(id)}-enrich`,
      source_type: "lead",
      source_id: id,
      priority: "medium",
      actor: "Cowork",
      action_type: "enrich_lead_contact",
      reason: `Lead (${clean(lead.company)}) has public intent + source but no verified contact path — enrich before any outreach.`,
      required_approval: false,
      required_evidence: ["Verified decision-maker contact path (email or phone) with public source, plus updated last_validated_at."],
      risk_level: "low",
      next_step: "Cowork: find a verified decision-maker email/phone from public sources, then re-intake so the lead becomes outreach-eligible. If Cowork credits are exhausted, queue until reset (do not mark a broken rail).",
      suggested_prompt_or_packet: { kind: "lead_enrichment", lead_id: id, company: clean(lead.company), website: clean(lead.website_url), source_url: clean(lead.source_url), need: ["decision_maker_email_or_phone", "business_hours_timezone"] },
    }));
  }
  return actions;
}

// 3b: call rail idle/stale → propose a call-rail repair (generate packets, route
// already-approved calls, record outcomes). The per-lead dial stays approval-gated
// via recommend_approved_call; this is the rail-level "unstick it" action.
function callRailActions({ leads, document, ledger, now }) {
  const rail = detectCallRailState({ leads, document, ledger, now }, { now });
  if (rail.status !== "idle" && rail.status !== "stale") return [];
  const idle = rail.status === "idle";
  return [makeAction({
    action_id: `na-call_rail-repair-${now.slice(0, 10)}`,
    source_type: "call_rail",
    source_id: "call_rail",
    priority: idle ? "high" : "medium",
    actor: "Morgan/Retell",
    action_type: "repair_call_rail",
    reason: rail.detail,
    required_approval: false,
    required_evidence: ["Retell/Morgan call id, disposition/outcome, and next action per attempted lead (via evidence intake)."],
    risk_level: "low",
    forbidden_actions: [
      "Do NOT dial any lead before that lead's approval is recorded.",
      "Do NOT bypass do-not-call, cooldown, business-hours, or max-attempt caps.",
      "Do NOT fabricate or simulate an outcome as a real call.",
    ],
    next_step: "Generate call packets for the call-ready A-tier leads, route the approved calls to Morgan/Retell, then record each outcome via evidence intake. Run `npm run hermes:call-rail` to generate packets.",
    suggested_prompt_or_packet: {
      kind: "call_rail_repair",
      run: "npm run hermes:call-rail",
      call_ready_a_tier: rail.call_ready_a_tier,
      recorded_outcomes: rail.recorded_outcomes,
      top_call_ready: rail.top_call_ready,
    },
  })];
}

// 4b: interested lead / qualified call outcome → open an implementation work order
// (lands on the proposal/payment gate). Opening the WO is internal; the proposal,
// payment link, and build stay gated by the work order's stage ladder.
function paidClientHandoffActions({ leads, document, now }) {
  // Derive interested call outcomes from the document's call tasks (heuristic over
  // the recorded outcome evidence: booked/callback dispositions).
  const callOutcomes = asArray(document?.approvalExecutionQueue?.items)
    .filter(isCallTask)
    .flatMap((item) => {
      const lc = item.lifecycle || {};
      const text = asArray(lc.submitted_evidence).map((e) => `${e.evidence_summary} ${e.evidence_reference}`).join(" ");
      const dispo = clean(lc.disposition) || (/\bbooked\b|booked[_\s]demo/i.test(text) ? "booked_demo" : /callback/i.test(text) ? "callback_scheduled" : "");
      if (!dispo) return [];
      return [{
        lead_id: clean(lc.lead_id) || clean(item.taskPacket?.related_approval_item_id) || clean(item.taskPacket?.lead_id),
        company: clean(item.taskPacket?.company),
        disposition: dispo,
        call_id: asArray(lc.submitted_evidence)[0]?.evidence_reference || "",
        summary: asArray(lc.submitted_evidence)[0]?.evidence_summary || "",
        recorded_at: clean(lc.last_status_update_at) || now,
      }];
    });

  const existingWorkOrders = asArray(document?.implementationWorkOrders?.orders);
  const detected = detectInterestedHandoffs({ leads, callOutcomes, existingWorkOrders, now });
  return detected.seeds.map((seed) => makeAction({
    action_id: `na-handoff-${slug(seed.lead_id)}`,
    source_type: "paid_client_handoff",
    source_id: seed.id,
    priority: "high",
    actor: "Hermes/Codex",
    action_type: "open_implementation_work_order",
    reason: `Interested signal (${seed.interest_signal.kind}${seed.interest_signal.disposition ? `: ${seed.interest_signal.disposition}` : ""}) for ${seed.company} — open the implementation work order on the proposal/payment gate.`,
    required_approval: false,
    required_evidence: seed.required_evidence,
    risk_level: "low",
    forbidden_actions: CLIENT_FACING_FORBIDDEN,
    next_step: seed.next_action,
    suggested_prompt_or_packet: {
      kind: "implementation_work_order_seed",
      seed,
      gate: "awaiting_pilot_scope_or_proposal (proposal/pricing/payment-link stay approval-gated)",
      promote: "promoteSeedsToWorkOrders([seed])",
    },
  }));
}

// 5 + 6 + 7: approval-execution lifecycles → evidence / review / follow-up.
function executionActions({ document }) {
  const actions = [];
  const items = asArray(document?.approvalExecutionQueue?.items);
  for (const item of items) {
    const lc = item.lifecycle || {};
    const tp = item.taskPacket || {};
    const taskId = clean(lc.assigned_task_id) || clean(tp.task_id);
    if (!taskId) continue;
    const status = clean(lc.execution_status);
    const actor = clean(lc.assigned_agent) || "actor";
    const base = { source_type: "execution_task", source_id: taskId, risk_level: clean(tp.risk_level) || "medium", forbidden_actions: asArray(tp.forbidden_actions) };

    if (status === "completed") {
      actions.push(makeAction({
        ...base,
        action_id: `na-task-${slug(taskId)}-follow_up`,
        priority: "high",
        actor: "Hermes",
        action_type: "select_follow_up",
        reason: "Task completed with accepted evidence — select the follow-up (next-touch, hand-off, or open the next work order).",
        required_approval: false,
        required_evidence: [],
        next_step: clean(lc.next_action) || "Monitor result and choose the next-touch or service-delivery hand-off.",
      }));
      continue;
    }
    if (status === "evidence_submitted") {
      if (canCompleteExecution(lc)) {
        actions.push(makeAction({
          ...base,
          action_id: `na-task-${slug(taskId)}-review`,
          priority: "high",
          actor: "Hermes",
          action_type: "review_and_complete_evidence",
          reason: "Evidence submitted and sufficient — Hermes can accept it and advance the task to completed.",
          required_approval: false,
          required_evidence: asArray(tp.required_evidence),
          next_step: "Accept evidence and advance to completed via the evidence write-back, then select the follow-up.",
        }));
      } else {
        actions.push(makeAction({
          ...base,
          action_id: `na-task-${slug(taskId)}-revision`,
          priority: "medium",
          actor,
          action_type: "request_evidence_revision",
          reason: "Evidence was submitted but is insufficient (no usable reference/summary).",
          required_approval: false,
          required_evidence: asArray(tp.required_evidence),
          next_step: "Ask the actor to resubmit with a concrete reference (id/URL) and summary.",
        }));
      }
      continue;
    }
    if (["blocked", "failed"].includes(status)) {
      actions.push(makeAction({
        ...base,
        action_id: `na-task-${slug(taskId)}-unblock`,
        priority: "high",
        actor: "Codex",
        action_type: "route_blocked_task",
        reason: `Execution task is ${status}${clean(lc.blocker_reason) ? `: ${clean(lc.blocker_reason)}` : ""}.`,
        required_approval: false,
        next_step: "Diagnose and clear the blocker, or escalate to Jonathan if it needs a decision.",
      }));
      continue;
    }
    // queued / assigned / in_progress / waiting_for_evidence → request actor evidence.
    if (["queued", "assigned", "in_progress", "waiting_for_evidence"].includes(status)) {
      actions.push(makeAction({
        ...base,
        action_id: `na-task-${slug(taskId)}-evidence`,
        priority: clean(tp.priority) === "high" ? "high" : "medium",
        actor,
        action_type: "request_actor_evidence",
        reason: `Approved task is ${status} and awaiting evidence from ${actor}.`,
        required_approval: false,
        required_evidence: asArray(tp.required_evidence).length ? asArray(tp.required_evidence) : asArray(lc.required_evidence),
        next_step: "Actor executes the approved action within limits, then submits evidence via the actor evidence intake.",
        suggested_prompt_or_packet: { kind: "execution_task", task_id: taskId, requested_action: clean(tp.requested_action), allowed_scope: clean(tp.allowed_scope) },
      }));
    }
  }
  return actions;
}

// 8 + 9: implementation work orders → approval/client-input requests or build packets.
function workOrderActions({ document, now }) {
  const actions = [];
  const orders = asArray(document?.implementationWorkOrders?.orders);
  for (const wo of orders) {
    const id = clean(wo.id);
    if (!id) continue;
    const stage = clean(wo.implementation_stage) || clean(wo.stage);
    const approved = lower(wo.approvalStatus) === "approved";
    const base = {
      source_type: "implementation_work_order",
      source_id: id,
      risk_level: clean(wo.risk_level) || "medium",
      required_evidence: asArray(wo.required_evidence),
    };

    // 9: ready for build (only reachable after recorded approval).
    if (approved || ["paid_awaiting_implementation", "implementation_in_progress"].includes(stage)) {
      actions.push(makeAction({
        ...base,
        action_id: `na-wo-${slug(id)}-build`,
        priority: "high",
        actor: "Codex",
        action_type: "create_build_packet",
        reason: `Work order ${id} is approved/paid and ready for implementation build.`,
        required_approval: false,
        forbidden_actions: ["Do NOT activate production n8n / deploy without a separate recorded approval.", "Do NOT send client-facing deliverables without approval."],
        next_step: "Build automations, verify with tests/build/route checks, attach Codex evidence, then advance the stage.",
        // Hand Codex the FULL buildable spec (integrations, client inputs, OttoServ
        // steps, test plan, evidence gates, visual deliverable requirements) — not a
        // stub — so service delivery is actor-ready straight from the cycle.
        suggested_prompt_or_packet: buildServiceDeliveryPacket(wo, { now }),
      }));
      continue;
    }

    // 8: waiting on approval / payment / client input / delivery.
    const needsApproval = Boolean(wo.approvalRequired) && !approved;
    const requestActor =
      stage === "report_ready_awaiting_delivery" ? "Cowork" :
      stage === "delivered_awaiting_evidence" ? "Cowork/Codex" : "Jonathan";
    actions.push(makeAction({
      ...base,
      action_id: `na-wo-${slug(id)}-${slug(stage || "advance")}`,
      priority: needsApproval ? "high" : "medium",
      actor: requestActor,
      action_type: stage === "delivered_awaiting_evidence" ? "request_delivery_evidence" : "request_approval_or_client_input",
      reason: clean(wo.approval_reason) || `Work order ${id} is at stage "${stage}" and needs approval/payment/client input before it can advance.`,
      required_approval: needsApproval,
      forbidden_actions: CLIENT_FACING_FORBIDDEN,
      next_step: clean(wo.next_action) || "Gather the required approval/payment/client input, then advance the implementation stage.",
    }));
  }
  return actions;
}

// 11: client success — delivered work / client signals → expansion / churn-risk /
// optimization opportunities as next actions (client-facing moves stay approval-
// gated; internal optimizations route to Codex and stay deploy-gated).
function clientSuccessActions({ clients, document, now }) {
  const detected = detectClientOpportunities({ clients, document, now }, { now });
  return asArray(detected.opportunities).map((o) => makeAction({
    action_id: clean(o.opportunity_id),
    source_type: "client_success",
    source_id: clean(o.opportunity_id),
    priority: o.priority,
    actor: o.actor,
    action_type: o.action_type,
    reason: o.reason,
    required_approval: Boolean(o.required_approval),
    required_evidence: asArray(o.required_evidence),
    risk_level: o.risk_level,
    forbidden_actions: asArray(o.forbidden_actions),
    next_step: o.next_step,
    suggested_prompt_or_packet: { kind: "client_success_opportunity", opportunity_type: o.type, client: o.client, signal: o.signal },
  }));
}

// 10: repair packets / broken rails → route to the right actor or hold.
function repairActions({ document }) {
  const actions = [];
  const packets = asArray(document?.repairPackets);
  for (const p of packets) {
    const id = clean(p.id) || clean(p.what_failed) || "repair";
    const owner = clean(p.owner);
    const ownerLc = lower(owner);
    const actor =
      ownerLc.includes("codex") ? "Codex" :
      ownerLc.includes("cowork") ? "Cowork" :
      ownerLc.includes("jonathan") ? "Jonathan" :
      owner || "Hermes";
    actions.push(makeAction({
      action_id: `na-repair-${slug(id)}`,
      source_type: "repair_packet",
      source_id: id,
      priority: "critical",
      actor,
      action_type: actor === "Hermes" || !owner ? "hold_for_owner_assignment" : "route_repair",
      reason: clean(p.actual_behavior) || clean(p.category) || "A revenue rail is broken and needs repair before scaling volume.",
      required_approval: false,
      required_evidence: ["Repair evidence: logs/commit/route-check proving the rail works again."],
      risk_level: "medium",
      forbidden_actions: ["Do NOT scale volume on a broken rail.", "Do NOT mark repaired without evidence."],
      next_step: asArray(p.verification_steps)[0] || "Diagnose, fix, and verify the broken rail.",
    }));
  }

  // Plan-level broken execution rails (engine) without a packet → route to Codex.
  for (const rail of asArray(document?.plan?.broken_execution_rails)) {
    const id = clean(rail);
    if (!id) continue;
    if (packets.some((p) => lower(p.what_failed) === lower(id) || lower(p.id).includes(slug(id)))) continue;
    actions.push(makeAction({
      action_id: `na-rail-${slug(id)}`,
      source_type: "broken_rail",
      source_id: id,
      priority: "critical",
      actor: "Codex",
      action_type: "route_repair",
      reason: `Broken execution rail "${id}" is blocking the loop.`,
      required_approval: false,
      required_evidence: ["Route-check / test output proving the rail is restored."],
      risk_level: "medium",
      forbidden_actions: ["Do NOT scale volume on a broken rail."],
      next_step: "Repair the rail and attach verification evidence.",
    }));
  }
  return actions;
}

/**
 * Select Hermes's next actions from current state. Pure + deterministic.
 *
 * @param {object} state { document?, leads?, ingestReport?, pipeline?, now? }
 *   - document:    revenue latest.json shape (approvalExecutionQueue,
 *                  implementationWorkOrders.orders, repairPackets, plan, health)
 *   - leads:       NormalizedLead-compatible array (revenue-loop leads)
 *   - ingestReport:lead-intent ingest report (rows[])
 *   - pipeline:    lead-intent pipeline.json (summary.low_recent_intent)
 * @returns { generated_at, count, by_priority, by_actor, actions[] }
 */
export function selectNextActions(state = {}, options = {}) {
  const now = state.now || options.now || new Date().toISOString();
  const document = state.document || {};

  const actions = [
    ...repairActions({ document }),
    ...leadPipelineActions({ leads: state.leads, pipeline: state.pipeline, ingestReport: state.ingestReport, now }),
    ...callRailActions({ leads: state.leads, document, ledger: state.ledger, now }),
    ...paidClientHandoffActions({ leads: state.leads, document, now }),
    ...executionActions({ document }),
    ...workOrderActions({ document, now }),
    ...tieredLeadActions({ leads: state.leads }),
    ...leadEnrichmentActions({ leads: state.leads }),
    ...clientSuccessActions({ clients: state.clients, document, now }),
  ];

  // Deterministic ordering: priority, then source_type, then action_id. Dedupe by id.
  const seen = new Set();
  const deduped = [];
  for (const a of actions) {
    if (seen.has(a.action_id)) continue;
    seen.add(a.action_id);
    deduped.push(a);
  }
  deduped.sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    if (a.source_type !== b.source_type) return a.source_type.localeCompare(b.source_type);
    return a.action_id.localeCompare(b.action_id);
  });

  const by_priority = {};
  const by_actor = {};
  for (const a of deduped) {
    by_priority[a.priority] = (by_priority[a.priority] || 0) + 1;
    by_actor[a.actor] = (by_actor[a.actor] || 0) + 1;
  }

  return { generated_at: now, count: deduped.length, by_priority, by_actor, actions: deduped };
}

// Re-export for callers that want to reference the standing high-risk list.
export { HIGH_RISK_APPROVAL_ACTIONS };
