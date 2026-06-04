// ─── Hermes self-repair loop (Autonomy v2, sprint priority 7) ─────────────────
//
// THE GAP THIS FILLS
// The scorecard now DETECTS broken rails (call_rail_idle, empty/stale pipeline,
// stalled delivery, blocked tasks) and the selector ROUTES repair packets that
// already exist — but nothing CONVERTED a freshly detected broken rail into an
// owned, evidence-tracked repair packet. So detection did not become self-repair:
// a rail could read "broken" cycle after cycle with no packet, no owner, no
// verification, and no MTTR/learning in the ledger.
//
// This module closes that loop. It turns the scorecard's broken-rail blockers into
// repair packets using the EXISTING engine builder (revenueEngine.createRepairPacket
// + classifyFailure) — no parallel repair system — assigns the owner, carries the
// required evidence + verification steps, and provides an evidence-gated close that
// emits the ledger `rail_repaired` event so MTTR/learning completes.
//
// SAFETY: PURE. Generates packets/descriptors only; fixes nothing, deploys nothing.
// Closing a packet is gated on real verification evidence.

import { createRepairPacket } from "./revenueEngine.mjs";

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function lower(value) {
  return clean(value).toLowerCase();
}

// Scorecard blocker types that represent a broken RAIL (a system to repair), as
// opposed to a human-approval bottleneck (jonathan_approval) which is not a defect.
export const REPAIRABLE_BLOCKER_TYPES = new Set([
  "empty_pipeline",
  "stale_pipeline",
  "call_rail_idle",
  "call_rail_stale",
  "stalled_delivery",
  "blocked_tasks",
]);

// Map a scorecard blocker → a `failure` object compatible with createRepairPacket.
// Channels mirror revenueLoopSources.detectFailures so classifyFailure routes the
// same owner the revenue loop would assign.
const BLOCKER_FAILURE_TEMPLATES = {
  empty_pipeline: {
    channel: "lead_discovery missing data",
    expected_behavior: "Cold-lead pipeline has fresh imported leads daily so outreach and calls can run.",
  },
  stale_pipeline: {
    channel: "lead_discovery missing data",
    expected_behavior: "Recent-intent lead volume stays above threshold with fresh leads.",
  },
  call_rail_idle: {
    channel: "phone_call_retell_morgan",
    expected_behavior: "Approved A-tier leads produce logged call outcomes (call id + result).",
  },
  call_rail_stale: {
    channel: "phone_call_retell_morgan",
    expected_behavior: "The call rail produces recent call outcomes for ready A-tier leads.",
  },
  stalled_delivery: {
    channel: "service_delivery workflow",
    expected_behavior: "Report-ready engagements are delivered and advance toward implementation.",
  },
  blocked_tasks: {
    channel: "execution blocked",
    expected_behavior: "Approved execution tasks progress to completion with evidence.",
  },
};

export function blockerToFailure(blocker = {}) {
  const type = clean(blocker.type);
  const tpl = BLOCKER_FAILURE_TEMPLATES[type] || { channel: clean(blocker.id) || "revenue_rail", expected_behavior: "Rail completes with evidence." };
  return {
    item_id: clean(blocker.id) || type || "revenue_rail",
    channel: tpl.channel,
    expected_behavior: tpl.expected_behavior,
    actual_behavior: clean(blocker.detail) || `Detected ${type} on rail ${clean(blocker.id)}.`,
    evidence_logs: [],
  };
}

// What identifies a packet as "for the same rail" (idempotency / dedupe).
function repairKey(packet) {
  return lower(packet.what_failed) || lower(packet.id) || lower(packet.category);
}

/**
 * Generate repair packets for the scorecard's currently-detected broken rails that
 * do NOT already have an open repair packet. Pure. Reuses createRepairPacket.
 *
 * @param {object} input { scorecard, document?, now? }
 * @returns { generated_at, new_packets[], skipped_existing, summary }
 */
export function generateRepairPackets(input = {}) {
  const now = input.now || new Date().toISOString();
  const scorecard = input.scorecard || {};
  const existing = asArray(input.document?.repairPackets);
  const existingKeys = new Set(existing.map(repairKey).filter(Boolean));

  const blockers = asArray(scorecard.top_blockers).filter((b) => REPAIRABLE_BLOCKER_TYPES.has(clean(b.type)));

  const new_packets = [];
  let skipped_existing = 0;
  const seen = new Set();
  for (const blocker of blockers) {
    const failure = blockerToFailure(blocker);
    const packet = createRepairPacket(failure);
    packet.created_at = now; // deterministic timestamp for the cycle
    packet.detected_by = "hermes_self_repair";
    packet.required_evidence = packet.required_evidence || ["Repair evidence: logs/commit/route-check/test output proving the rail works again."];
    const key = repairKey(packet);
    if (existingKeys.has(key) || seen.has(key)) { skipped_existing += 1; continue; }
    seen.add(key);
    new_packets.push(packet);
  }

  const by_owner = {};
  for (const p of new_packets) by_owner[p.owner] = (by_owner[p.owner] || 0) + 1;

  return {
    generated_at: now,
    new_packets,
    skipped_existing,
    summary: {
      detected_broken_rails: blockers.length,
      new_repair_packets: new_packets.length,
      skipped_existing,
      by_owner,
    },
  };
}

/**
 * Close a repair packet with verification evidence. Pure + evidence-gated. Returns
 * the updated packet plus a ledger `rail_repaired` event descriptor so MTTR and
 * actor learning complete. Without usable evidence it refuses to close.
 *
 * @param {object} packet  a repair packet
 * @param {object} evidence { evidence_summary?, evidence_reference?, submitted_by_agent? }
 * @param {object} options { now? }
 */
export function closeRepairPacketWithEvidence(packet = {}, evidence = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const ref = clean(evidence.evidence_reference);
  const summary = clean(evidence.evidence_summary);
  if (!ref && !summary) {
    return { ok: false, error: "Cannot close repair: verification evidence (reference or summary) is required." };
  }
  const actor = clean(evidence.submitted_by_agent) || clean(packet.owner) || "actor";
  const closed = {
    ...packet,
    status: "verified",
    verified_at: now,
    verification_evidence: { evidence_summary: summary, evidence_reference: ref, submitted_by_agent: actor, submitted_at: now },
  };
  const ledger_event = {
    event_type: "rail_repaired",
    source_type: "repair_packet",
    source_id: clean(packet.id) || clean(packet.what_failed),
    actor,
    to_status: "verified",
    outcome: "success",
    detail: `Repair verified: ${summary || ref}`,
    dedupe_key: `${clean(packet.id) || clean(packet.what_failed)}|rail_repaired`,
    ts: now,
  };
  return { ok: true, packet: closed, ledger_event };
}
