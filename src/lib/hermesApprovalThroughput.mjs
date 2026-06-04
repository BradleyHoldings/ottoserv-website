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

/**
 * Classify a proposed selector action for throughput. Pure.
 * @returns { disposition: 'standing' | 'gated', risk, reason }
 */
export function classifyProposedAction(action = {}) {
  const type = clean(action.action_type);
  const risk = clean(action.risk_level) || classifyActionRisk(`${type} ${action.reason || ""}`, action.risk_level);
  if (!action.required_approval && STANDING_POLICY_ACTION_TYPES.has(type) && risk !== "high") {
    return { disposition: "standing", risk, reason: "Low-risk standing-policy action (no per-item approval required)." };
  }
  return { disposition: "gated", risk, reason: "Revenue-moving / high-risk action — requires a recorded approval or standing grant." };
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
function buildPacketForAction(action, { decidedBy, now }) {
  const bridged = bridgeApprovalToExecution(
    {
      decision: "approved",
      approval_item_id: clean(action.source_id) || clean(action.action_id),
      original_requested_action: clean(action.reason) || clean(action.action_type),
      what_approval_unlocks: clean(action.next_step),
      assigned_agent: clean(action.actor),
      recommended_actor: clean(action.actor),
      risk_level: clean(action.risk_level),
      required_evidence: asArray(action.required_evidence),
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

  // Existing execution task ids → idempotency (don't re-materialize / re-approve).
  const existing = new Set(
    asArray(document?.approvalExecutionQueue?.items)
      .map((i) => clean(i.taskPacket?.task_id) || clean(i.lifecycle?.assigned_task_id))
      .filter(Boolean),
  );

  const materialized = [];
  const gated = [];
  const already_enqueued = [];

  for (const action of asArray(nextActions)) {
    const taskId = executionTaskIdFor({ approval_item_id: clean(action.source_id) || clean(action.action_id), action: clean(action.reason) });
    if (existing.has(taskId)) {
      already_enqueued.push({ action_id: clean(action.action_id), task_id: taskId });
      continue;
    }

    const { disposition, risk } = classifyProposedAction(action);

    if (disposition === "standing") {
      const bridged = buildPacketForAction(action, { decidedBy: "standing_policy", now });
      if (bridged.ok) {
        materialized.push({ action_id: clean(action.action_id), task_id: bridged.taskPacket.task_id, via: "standing_policy", risk, taskPacket: bridged.taskPacket, lifecycle: bridged.lifecycle });
        existing.add(bridged.taskPacket.task_id);
      }
      continue;
    }

    // Gated: materialize ONLY if covered by a recorded approval or a standing grant.
    const grant = findStandingGrant(action, grants, now);
    const decision = findRecordedApproval(action, decisions);
    if (grant || decision) {
      const decidedBy = grant ? `standing_grant:${clean(grant.grant_id) || clean(grant.approved_by)}` : `recorded_approval:${clean(decision.decided_by) || "approved"}`;
      const bridged = buildPacketForAction(action, { decidedBy, now });
      if (bridged.ok) {
        materialized.push({
          action_id: clean(action.action_id),
          task_id: bridged.taskPacket.task_id,
          via: grant ? "standing_grant" : "recorded_approval",
          grant_id: grant ? clean(grant.grant_id) : undefined,
          risk,
          taskPacket: bridged.taskPacket,
          lifecycle: bridged.lifecycle,
        });
        existing.add(bridged.taskPacket.task_id);
        continue;
      }
    }
    gated.push({ action_id: clean(action.action_id), risk, approval_packet: buildApprovalPacket(action, { now }) });
  }

  return {
    generated_at: now,
    materialized,
    gated,
    already_enqueued,
    summary: {
      proposed: asArray(nextActions).length,
      materialized: materialized.length,
      materialized_standing: materialized.filter((m) => m.via === "standing_policy").length,
      materialized_via_grant: materialized.filter((m) => m.via === "standing_grant").length,
      materialized_via_approval: materialized.filter((m) => m.via === "recorded_approval").length,
      gated: gated.length,
      already_enqueued: already_enqueued.length,
    },
  };
}
