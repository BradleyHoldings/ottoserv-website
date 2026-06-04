// ─── Hermes paid-client handoff simulator (service-delivery step 5) ───────────
//
// THE GAP THIS FILLS
// The pieces exist — interest seed, durable work order, build packet — but nothing
// runs the SAFE end-to-end handoff: from an interested lead / audit signal to a
// work order + build packet + the evidence the engagement requires. This module is
// that simulator. PURE: it composes buildHandoffSeed → seedToImplementationWorkOrder
// → buildServiceDeliveryPacket and surfaces the approval gate + evidence contract.
//
// SAFETY: simulation only. It creates NO proposal, payment link, Stripe object,
// n8n activation, deploy, or client-facing deliverable. The work order opens on the
// proposal/payment gate (approval_required) and the build packet stays
// blocked_awaiting_approval until the work order is approved/paid.

import { buildHandoffSeed } from "./hermesPaidClientHandoff.mjs";
import { seedToImplementationWorkOrder } from "./implementationWorkOrders.mjs";
import { buildServiceDeliveryPacket } from "./hermesBuildPacket.mjs";

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function uniq(values) {
  return Array.from(new Set(asArray(values).map(clean).filter(Boolean)));
}

/**
 * Simulate the paid-client handoff for one interested lead / audit signal. Pure.
 *
 * @param {object} input { lead?, outcome?, audit?, kind? }
 * @param {object} options { now?, sequence? }
 * @returns {
 *   ok, handoff_seed, work_order, build_packet, evidence_requirements,
 *   approval_gate: { approval_required, reason, gated_actions },
 *   next_action
 * }
 */
export function simulatePaidHandoff(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const lead = input.lead || input.audit || {};
  if (!clean(lead.company) && !clean(lead.lead_id)) {
    return { ok: false, error: "a lead/audit with a company or lead_id is required" };
  }

  const seed = buildHandoffSeed(
    { lead, outcome: input.outcome || null, kind: clean(input.kind) || (input.outcome ? "call_outcome" : input.audit ? "audit" : "lead_status") },
    { now },
  );
  const workOrder = seedToImplementationWorkOrder(seed, { now, sequence: options.sequence || 1 });
  const buildPacket = buildServiceDeliveryPacket(workOrder, { now });

  const evidence_requirements = uniq([
    ...asArray(seed.required_evidence),
    ...asArray(workOrder.required_evidence),
    ...asArray(buildPacket.required_evidence),
  ]);

  return {
    ok: true,
    generated_at: now,
    handoff_seed: seed,
    work_order: workOrder,
    build_packet: buildPacket,
    evidence_requirements,
    approval_gate: {
      approval_required: Boolean(workOrder.approvalRequired),
      reason: clean(workOrder.approval_reason) || clean(seed.approval_reason),
      gated_actions: asArray(workOrder.gated_actions),
      build_status: buildPacket.status,
      blocking_gate: buildPacket.blocking_gate,
    },
    next_action: clean(workOrder.next_action),
  };
}
