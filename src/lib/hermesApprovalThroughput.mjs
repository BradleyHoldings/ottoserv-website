// ─── Hermes approval-to-action throughput (Autonomy v2, sprint priority 3) ────
//
// THE GAP THIS FILLS
// The selector PROPOSES next actions and the approval→execution bridge can turn a
// RECORDED approval into a task packet, but the two were never connected by a
// POLICY layer. So:
//   - every low-risk, non-approval action (Cowork research, build-on-approved
//     work-order, internal coordination) still sat as a "proposal" until someone
//     hand-built its packet; and
//   - every high-risk action (each call, each email) demanded a FRESH Jonathan
//     approval, even when he had pre-authorized a scoped batch — so throughput was
//     capped at Jonathan's click rate.
//
// This module is that policy layer. `materializeActorPackets` takes the selector's
// proposed actions + the current document and turns each into an actor-ready
// execution packet WHERE POLICY ALLOWS, leaving genuinely high-risk/uncovered
// actions gated with a ready-to-sign approval packet.
//
// SAFETY (guardrail: "high-risk actions remain approval-gated"):
//   - Low-risk standing-policy actions auto-materialize (they trigger nothing —
//     they are internal coordination / research / evidence requests).
//   - High-risk actions (call/email/payment/deploy/campaign) materialize ONLY when
//     covered by a RECORDED approval: a per-item decision OR an explicit, scoped,
//     non-expired standing GRANT with remaining uses (Jonathan pre-authorized).
//     Otherwise they are returned GATED — never executed.
//   - Idempotent: an action already represented in the execution queue is skipped,
//     so nothing is re-approved or duplicated.
//   - PURE: returns descriptors only. Reuses the existing bridge; no parallel store.

import { bridgeApprovalToExecution, classifyActionRisk, executionTaskIdFor } from "./approvalExecutionBridge.mjs";

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function lower(value) {
  return clean(value).toLowerCase();
}

// Low-risk action types Hermes may materialize into actor packets under STANDING
// POLICY (no per-item Jonathan approval). These trigger no outreach/payment/deploy
// — they are research, internal coordination, or work already gated upstream
// (e.g. create_build_packet only appears for an approved/paid work order).
export const STANDING_POLICY_ACTION_TYPES = new Set([
  "dispatch_lead_research",
  "redispatch_lead_research_with_gaps",
  "repair_call_rail",
  "create_build_packet",
  "request_actor_evidence",
  "review_and_complete_evidence",
  "request_evidence_revision",
  "select_follow_up",
  "route_blocked_task",
  "route_repair",
  "hold_for_owner_assignment",
]);

// Action types that move revenue/contact a lead and therefore stay approval-gated
// unless covered by a recorded approval or a standing grant.
export const APPROVAL_GATED_ACTION_TYPES = new Set([
  "recommend_approved_call",
  "recommend_approved_email",
  "request_approval_or_client_input",
  "request_delivery_evidence",
]);

// ─── Standing OUTBOUND policy (the bottleneck fix) ────────────────────────────
// NORMAL outbound — approved-template B-tier cold email under the send cap, and
// normal approved-policy calls under the call cap — is pre-authorized as a CLASS
// by Jonathan. So Hermes materializes these into actor/send-ready packets WITHOUT
// a per-item approval, provided each one is NORMAL (not exceptional), inside caps,
// has a contact path, and carries the outbound evidence contract. Exceptional,
// over-cap, off-segment, or guardrail-blocked actions are NEVER auto-sent.
export const STANDING_OUTBOUND_ACTION_TYPES = new Set([
  "recommend_approved_call",
  "recommend_approved_email",
]);

// The approved standing outbound policy. Raising a cap, opening a new
// campaign/segment, or any exceptional case below still requires Jonathan.
export const DEFAULT_STANDING_OUTBOUND_POLICY = {
  enabled: true,
  approved_by: "Jonathan",
  email: { enabled: true, daily_cap: 50, tiers: ["B-tier"] },
  call: { enabled: true, daily_cap: 20, tiers: ["A-tier"] },
};

// Every EXECUTED outbound action must satisfy this evidence contract before it can
// complete: a message/call id, a timestamp, a disposition/outcome, and a next
// action. Completion stays gated on this by the execution bridge.
export const OUTBOUND_EVIDENCE_CONTRACT = {
  call: ["Outbound call evidence: call id, timestamp, disposition/outcome, and next action."],
  email: ["Outbound email evidence: message id, timestamp, disposition/outcome, and next action."],
};

// Signals that force a NORMAL outbound action back under Jonathan approval even
// inside the standing policy: limit increases, new campaigns/segments, custom
// offers/pricing, payment links, client-facing sends, upset customers, negative
// replies needing judgment, and high-emotion / legal / compliance-sensitive cases.
const EXCEPTIONAL_OUTBOUND_FLAGS = [
  "exceptional", "upset_customer", "negative_reply", "high_emotion", "sensitive",
  "requires_judgment", "custom_offer", "custom_pricing", "payment_link",
  "client_facing", "new_campaign", "new_segment", "new_audience", "limit_increase",
];
const EXCEPTIONAL_OUTBOUND_TEXT = [
  /\bupset\b|\bangry\b|complaint|escalat|frustrat|unhappy|\birate\b/i,
  /negative\s+repl|bad\s+repl|objection\s+needing\s+judgment/i,
  /refund|chargeback|cancellation|\blegal\b|complian/i,
  /custom\s+(pric|offer|quote|guarantee|discount)/i,
  /payment\s+link|\bstripe\b|invoice\s+link/i,
  /client[-\s]facing|\bproposal\b|\bcontract\b|deliverable/i,
  /new\s+(campaign|segment|audience|list|icp)/i,
  /(increase|raise|expand|lift)[^.]{0,24}(cap|limit|volume)/i,
];

function outboundChannel(action) {
  const type = clean(action.action_type);
  if (type === "recommend_approved_call") return "call";
  if (type === "recommend_approved_email") return "email";
  return "";
}

// Returns a non-empty reason when the action is EXCEPTIONAL (must stay gated).
function detectExceptionalOutbound(action) {
  for (const flag of EXCEPTIONAL_OUTBOUND_FLAGS) {
    if (action && action[flag] === true) return flag;
  }
  const text = lower(`${action.action_type} ${action.reason} ${action.next_step}`);
  for (const re of EXCEPTIONAL_OUTBOUND_TEXT) {
    if (re.test(text)) return "sensitive_content";
  }
  return "";
}

// Returns a non-empty reason when the action CANNOT execute now (missing
// prerequisite/guardrail) — this blocks execution; it is NOT an approval ask.
function outboundExecutionBlock(action, channel) {
  if (action.dnc === true || action.blacklisted === true) return "dnc_or_blacklist";
  if (action.in_cooldown === true) return "cooldown_window";
  if (action.outside_business_hours === true && channel === "call") return "outside_business_hours";
  if (action.contact_path === false) return "missing_contact_path";
  const packet = action.suggested_prompt_or_packet || {};
  const hasContact = action.contact_path === true || Boolean(packet.lead_id || packet.email || packet.phone);
  if (!hasContact) return "missing_contact_path";
  if (!asArray(action.required_evidence).length) return "missing_evidence_requirement";
  return "";
}

// Classify a normal-outbound action against the standing policy + running caps.
function classifyOutboundAction(action, policy, counters) {
  const channel = outboundChannel(action);
  const ch = channel && policy ? policy[channel] : null;
  if (!policy || policy.enabled === false || !ch || ch.enabled === false) {
    return { disposition: "gated", channel, reason: "Standing outbound policy not in effect for this channel — approval required." };
  }
  const exceptional = detectExceptionalOutbound(action);
  if (exceptional) {
    return { disposition: "gated", channel, reason: `Exceptional/sensitive outbound (${exceptional}) — requires Jonathan approval.` };
  }
  const tier = clean(action.tier);
  if (tier && asArray(ch.tiers).length && !ch.tiers.includes(tier)) {
    return { disposition: "gated", channel, reason: `Tier "${tier}" is outside the approved ${channel} segment — new-segment approval required.` };
  }
  const block = outboundExecutionBlock(action, channel);
  if (block) {
    return { disposition: "blocked", channel, reason: block };
  }
  const cap = Number(ch.daily_cap);
  const used = Number(counters?.[channel] || 0);
  if (Number.isFinite(cap) && used >= cap) {
    return { disposition: "gated", channel, reason: `Daily ${channel} cap (${cap}) reached — a limit increase requires Jonathan approval.` };
  }
  return { disposition: "standing", channel, reason: `Normal ${channel} inside approved standing policy (no per-item approval).` };
}

/**
 * Classify a proposed selector action for throughput. Pure.
 * @param {object} action  selector action
 * @param {object} options { standingOutboundPolicy?, outboundCounters? }
 * @returns { disposition: 'standing' | 'gated' | 'blocked', risk, reason, channel? }
 */
export function classifyProposedAction(action = {}, options = {}) {
  const type = clean(action.action_type);
  const risk = clean(action.risk_level) || classifyActionRisk(`${type} ${action.reason || ""}`, action.risk_level);
  // Normal outbound (call/email) under Jonathan's standing policy is autonomous.
  if (STANDING_OUTBOUND_ACTION_TYPES.has(type) && options.standingOutboundPolicy) {
    const out = classifyOutboundAction(action, options.standingOutboundPolicy, options.outboundCounters);
    return { disposition: out.disposition, risk, reason: out.reason, channel: out.channel };
  }
  if (!action.required_approval && STANDING_POLICY_ACTION_TYPES.has(type) && risk !== "high") {
    return { disposition: "standing", risk, reason: "Low-risk standing-policy action (no per-item approval required)." };
  }
  return { disposition: "gated", risk, reason: "Revenue-moving / high-risk action — requires a recorded approval or standing grant." };
}

// Seed per-channel outbound counters from outbound tasks already queued TODAY so
// caps hold across runs, plus any explicit override. Pure.
function seedOutboundCounters(document, now, override) {
  const counters = { call: Number(override?.call || 0), email: Number(override?.email || 0) };
  const day = clean(now).slice(0, 10);
  for (const item of asArray(document?.approvalExecutionQueue?.items)) {
    const rail = lower(item.taskPacket?.execution_rail);
    const created = clean(item.taskPacket?.created_at).slice(0, 10);
    if (created && day && created !== day) continue;
    if (rail === "morgan") counters.call += 1;
    else if (rail === "email") counters.email += 1;
  }
  return counters;
}

// Is there an active, scoped standing GRANT covering this action? A grant is a
// recorded, pre-authorized batch (Jonathan) — one approval, many uses.
function findStandingGrant(action, grants, now) {
  const type = clean(action.action_type);
  for (const g of asArray(grants)) {
    if (clean(g.action_type) !== type) continue;
    if (!clean(g.approved_by)) continue; // a grant MUST name who authorized it
    const uses = Number(g.used || 0);
    const max = g.max_uses === undefined || g.max_uses === null ? Infinity : Number(g.max_uses);
    if (uses >= max) continue;
    if (clean(g.expires_at) && Date.parse(g.expires_at) < Date.parse(now)) continue;
    // Optional scope filter: tier / source_id substring.
    const scope = lower(g.scope);
    if (scope && !lower(`${action.source_id} ${action.reason}`).includes(scope) && !scope.includes(lower(action.source_id))) {
      // scope set but does not match → not covered by this grant
      continue;
    }
    return g;
  }
  return null;
}

// Is there a per-item recorded approval decision for this action's source?
function findRecordedApproval(action, decisions) {
  const sid = clean(action.source_id);
  for (const d of asArray(decisions)) {
    if (lower(d.decision) !== "approved") continue;
    const ref = clean(d.approval_item_id) || clean(d.related_source_id) || clean(d.source_id) || clean(d.id);
    if (ref && (ref === sid || clean(action.action_id).includes(ref) || ref.includes(sid))) return d;
  }
  return null;
}

// Build the actor-ready execution packet for an action via the existing bridge.
function buildPacketForAction(action, { decidedBy, now, requiredEvidence }) {
  const evidence = asArray(requiredEvidence).length ? asArray(requiredEvidence) : asArray(action.required_evidence);
  const bridged = bridgeApprovalToExecution(
    {
      decision: "approved",
      approval_item_id: clean(action.source_id) || clean(action.action_id),
      original_requested_action: clean(action.reason) || clean(action.action_type),
      what_approval_unlocks: clean(action.next_step),
      assigned_agent: clean(action.actor),
      recommended_actor: clean(action.actor),
      risk_level: clean(action.risk_level),
      required_evidence: evidence,
      decided_by: decidedBy,
    },
    { now },
  );
  return bridged;
}

// The approval packet Jonathan signs for a still-gated action (ready-to-sign).
export function buildApprovalPacket(action = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  return {
    kind: "approval_packet",
    approval_item_id: clean(action.source_id) || clean(action.action_id),
    action_type: clean(action.action_type),
    actor: clean(action.actor),
    risk_level: clean(action.risk_level) || "high",
    what_it_unlocks: clean(action.next_step),
    reason: clean(action.reason),
    required_evidence: asArray(action.required_evidence),
    forbidden_actions: asArray(action.forbidden_actions),
    decision_options: ["approved", "rejected", "revision_requested"],
    // How to remove the REPEATED-approval bottleneck for this class:
    standing_grant_hint: {
      action_type: clean(action.action_type),
      grant_shape: { action_type: clean(action.action_type), scope: "e.g. A-tier", max_uses: 10, expires_at: "ISO date", approved_by: "Jonathan" },
      note: "Approve a scoped standing grant once to let Hermes materialize this class of action without re-approving each item.",
    },
    created_at: now,
  };
}

/**
 * Materialize proposed selector actions into actor-ready execution packets where
 * policy allows. Pure + deterministic.
 *
 * @param {object[]} nextActions  selector actions (selectNextActions().actions)
 * @param {object} options {
 *   now?, document?,                       // existing queue + recorded approvals/grants
 *   standingApprovals?, approvalDecisions? // override document sources
 * }
 * @returns { generated_at, materialized[], gated[], already_enqueued[], summary }
 */
export function materializeActorPackets(nextActions = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const document = options.document || {};
  const grants = options.standingApprovals || asArray(document.standingApprovals);
  const decisions = options.approvalDecisions || asArray(document.approvalDecisions);
  const standingOutboundPolicy = options.standingOutboundPolicy ?? document.standingOutboundPolicy ?? null;

  // Existing execution task ids → idempotency (don't re-materialize / re-approve).
  const existing = new Set(
    asArray(document?.approvalExecutionQueue?.items)
      .map((i) => clean(i.taskPacket?.task_id) || clean(i.lifecycle?.assigned_task_id))
      .filter(Boolean),
  );

  // Running per-channel outbound counters → caps hold within AND across runs.
  const counters = seedOutboundCounters(document, now, options.outboundCountsToday);

  const materialized = [];
  const gated = [];
  const blocked = [];
  const already_enqueued = [];

  for (const action of asArray(nextActions)) {
    const taskId = executionTaskIdFor({ approval_item_id: clean(action.source_id) || clean(action.action_id), action: clean(action.reason) });
    if (existing.has(taskId)) {
      already_enqueued.push({ action_id: clean(action.action_id), task_id: taskId });
      continue;
    }

    const { disposition, risk, channel } = classifyProposedAction(action, { standingOutboundPolicy, outboundCounters: counters });
    const isOutbound = STANDING_OUTBOUND_ACTION_TYPES.has(clean(action.action_type));

    // Blocked: a prerequisite/guardrail (DNC, cooldown, hours, contact path, or
    // evidence requirement) is missing — execution cannot proceed. Not an approval.
    if (disposition === "blocked") {
      blocked.push({ action_id: clean(action.action_id), risk, channel, reason: clean(action.reason) || channel, block_reason: clean(classifyOutboundAction(action, standingOutboundPolicy, counters).reason) });
      continue;
    }

    if (disposition === "standing") {
      const requiredEvidence = isOutbound && channel ? OUTBOUND_EVIDENCE_CONTRACT[channel] : undefined;
      const via = isOutbound ? "standing_outbound_policy" : "standing_policy";
      const bridged = buildPacketForAction(action, { decidedBy: via, now, requiredEvidence });
      if (bridged.ok) {
        materialized.push({ action_id: clean(action.action_id), task_id: bridged.taskPacket.task_id, via, risk, channel, taskPacket: bridged.taskPacket, lifecycle: bridged.lifecycle });
        existing.add(bridged.taskPacket.task_id);
        if (isOutbound && channel) counters[channel] = Number(counters[channel] || 0) + 1;
      }
      continue;
    }

    // Gated: materialize ONLY if covered by a recorded approval or a standing grant.
    const grant = findStandingGrant(action, grants, now);
    const decision = findRecordedApproval(action, decisions);
    if (grant || decision) {
      const decidedBy = grant ? `standing_grant:${clean(grant.grant_id) || clean(grant.approved_by)}` : `recorded_approval:${clean(decision.decided_by) || "approved"}`;
      const requiredEvidence = isOutbound && channel ? OUTBOUND_EVIDENCE_CONTRACT[channel] : undefined;
      const bridged = buildPacketForAction(action, { decidedBy, now, requiredEvidence });
      if (bridged.ok) {
        materialized.push({
          action_id: clean(action.action_id),
          task_id: bridged.taskPacket.task_id,
          via: grant ? "standing_grant" : "recorded_approval",
          grant_id: grant ? clean(grant.grant_id) : undefined,
          risk,
          channel,
          taskPacket: bridged.taskPacket,
          lifecycle: bridged.lifecycle,
        });
        existing.add(bridged.taskPacket.task_id);
        if (isOutbound && channel) counters[channel] = Number(counters[channel] || 0) + 1;
        continue;
      }
    }
    const gateReason = isOutbound && standingOutboundPolicy
      ? clean(classifyOutboundAction(action, standingOutboundPolicy, counters).reason)
      : "Revenue-moving / high-risk action — requires a recorded approval or standing grant.";
    gated.push({ action_id: clean(action.action_id), risk, channel, reason: gateReason, approval_packet: buildApprovalPacket(action, { now }) });
  }

  return {
    generated_at: now,
    materialized,
    gated,
    blocked,
    already_enqueued,
    outbound_counters: counters,
    summary: {
      proposed: asArray(nextActions).length,
      materialized: materialized.length,
      materialized_standing: materialized.filter((m) => m.via === "standing_policy").length,
      materialized_standing_outbound: materialized.filter((m) => m.via === "standing_outbound_policy").length,
      materialized_via_grant: materialized.filter((m) => m.via === "standing_grant").length,
      materialized_via_approval: materialized.filter((m) => m.via === "recorded_approval").length,
      gated: gated.length,
      blocked: blocked.length,
      already_enqueued: already_enqueued.length,
    },
  };
}

/**
 * Reconcile published next_actions with a throughput result so the operating
 * cycle reflects what ACTUALLY happened to each proposal. A normal outbound
 * action that materialized under standing policy must no longer be advertised as
 * "required_approval: true / request Jonathan approval" — it is queued for
 * execution + evidence. Only genuinely GATED proposals stay Jonathan blockers.
 * Pure — returns new action objects.
 *
 * @returns actions[] each annotated with throughput_status and, where relevant,
 *   materialized_via / task_id / execution_status / gate_reason / block_reason.
 */
export function reconcileNextActions(actions = [], throughput = {}) {
  const materializedByAction = new Map(asArray(throughput.materialized).map((m) => [clean(m.action_id), m]));
  const gatedByAction = new Map(asArray(throughput.gated).map((g) => [clean(g.action_id), g]));
  const blockedByAction = new Map(asArray(throughput.blocked).map((b) => [clean(b.action_id), b]));
  const enqueuedByAction = new Map(asArray(throughput.already_enqueued).map((e) => [clean(e.action_id), e]));

  return asArray(actions).map((a) => {
    const id = clean(a.action_id);

    const m = materializedByAction.get(id);
    if (m) {
      const evidence = asArray(m.lifecycle?.required_evidence).length ? asArray(m.lifecycle.required_evidence) : asArray(a.required_evidence);
      return {
        ...a,
        required_approval: false,
        throughput_status: "queued",
        materialized: true,
        materialized_via: clean(m.via),
        task_id: clean(m.task_id),
        execution_status: clean(m.lifecycle?.execution_status) || "queued",
        next_step: `Queued for execution under ${clean(m.via)} (no Jonathan approval needed). Execute within policy/caps, then submit evidence: ${evidence.join("; ")}`,
      };
    }

    const enq = enqueuedByAction.get(id);
    if (enq) {
      return { ...a, required_approval: false, throughput_status: "queued", task_id: clean(enq.task_id), next_step: clean(a.next_step) || "Already queued for execution; awaiting evidence." };
    }

    const b = blockedByAction.get(id);
    if (b) {
      const reason = clean(b.block_reason) || clean(b.reason);
      return { ...a, required_approval: false, throughput_status: "blocked", block_reason: reason, next_step: `Blocked before execution (${reason}). Resolve the prerequisite — nothing is sent or dialed.` };
    }

    const g = gatedByAction.get(id);
    if (g) {
      return { ...a, required_approval: true, throughput_status: "gated", gate_reason: clean(g.reason) };
    }

    // Not outbound/standing-classified (e.g. internal coordination proposal).
    return { ...a, throughput_status: a.required_approval ? "needs_approval" : "proposed" };
  });
}
