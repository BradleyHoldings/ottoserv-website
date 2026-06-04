// ─── Hermes durable actor queue (Autonomy v2, sprint priority 3) ──────────────
//
// THE GAP THIS FILLS
// The throughput layer materializes normal outbound into actor-ready packets, but
// they only lived in console output. Actors (email/call rails) and the evidence
// closure loop need them in a DURABLE store. Rather than build a parallel store,
// this module persists materialized packets into the SAME place the rest of the
// system already reads/writes: the revenue document's approvalExecutionQueue.items
// (latest.json + Supabase). So the scorecard counts them as open execution tasks,
// the next-action selector routes them, the actor evidence intake can close them,
// and the dashboard shows them — all for free.
//
// Each persisted task packet is enriched with an `actor_packet`: the channel,
// lead/company, contact ref, public evidence/source, offer angle, policy + caps
// metadata, the required-evidence contract, and a no-send/no-call mode that is ON
// by default. This module is PURE (merge/build) — the CLI owns I/O. It triggers
// no sends/calls/payments/deploys.

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function lower(value) {
  return clean(value).toLowerCase();
}

export const ACTOR_QUEUE_STATUSES = ["queued", "executing", "evidence_submitted", "completed", "failed", "blocked"];

// Default test-safe mode: produce queue entries that may NOT be sent or dialed.
export const ACTOR_QUEUE_DEFAULT_MODE = "no_send_no_call";

// Build the rich, durable actor packet for a materialized outbound (or internal)
// action. `lead` is the matching revenue-loop lead (optional) used to attach the
// public evidence/source the actor must cite. Pure.
export function buildActorPacket(materialized, action = {}, lead = null, options = {}) {
  const mode = clean(options.mode) || ACTOR_QUEUE_DEFAULT_MODE;
  const channel = clean(materialized.channel) || clean(action.channel);
  const packet = (action.suggested_prompt_or_packet && typeof action.suggested_prompt_or_packet === "object") ? action.suggested_prompt_or_packet : {};
  const lifecycle = materialized.lifecycle || {};
  const policy = options.policy || {};
  const channelPolicy = channel && policy[channel] ? policy[channel] : null;

  return {
    task_id: clean(materialized.task_id),
    action_id: clean(materialized.action_id) || clean(action.action_id),
    channel,
    lead_id: clean(packet.lead_id) || clean(lead?.lead_id) || clean(action.source_id),
    company: clean(packet.company) || clean(lead?.company),
    contact: {
      email: lower(lead?.email) || lower(packet.email),
      phone: clean(lead?.normalized_phone) || clean(lead?.phone) || clean(packet.phone),
    },
    packet, // email_packet / call_packet shape from the selector
    evidence: {
      source_url: clean(lead?.source_url) || asArray(lead?.intent?.source_urls)[0] || "",
      snippet: clean(lead?.notes) || clean(lead?.intent_evidence_summary),
      pain_point: clean(lead?.pain_signal) || clean(lead?.pain_point),
      offer_angle: clean(packet.offer) || clean(packet.angle) || clean(lead?.intent?.recommended_offer) || clean(lead?.intent?.likely_ottoserv_angle),
    },
    policy: {
      materialized_via: clean(materialized.via),
      risk: clean(materialized.risk),
      tier: clean(lead?.tier),
      daily_cap: channelPolicy ? Number(channelPolicy.daily_cap) : null,
      approved_by: clean(policy.approved_by) || (clean(materialized.via).startsWith("standing") ? "standing_policy" : ""),
    },
    required_evidence: asArray(lifecycle.required_evidence),
    // Test-safe by default: the queue holds intent only; a later real adapter must
    // be explicitly enabled to send/dial.
    mode,
    no_send: mode !== "live",
    no_call: mode !== "live",
    status: clean(lifecycle.execution_status) || "queued",
  };
}

/**
 * Merge materialized packets into a revenue document's approvalExecutionQueue.
 * Idempotent by task_id: an entry already present keeps its existing lifecycle
 * (never regressed to queued), so re-running is safe. New entries are appended
 * with the enriched actor_packet on the taskPacket. Pure — returns a new document.
 *
 * @param {object} document   revenue document (may be {} )
 * @param {object[]} actions  selector actions (to join packet data by action_id)
 * @param {object} throughput materializeActorPackets() result
 * @param {object} options { now?, leads?, mode?, policy? }
 * @returns { document, added, skipped_existing, entries[] }
 */
export function mergeMaterializedIntoQueue(document = {}, actions = [], throughput = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const leadsById = new Map(asArray(options.leads).map((l) => [clean(l.lead_id), l]));
  const actionsById = new Map(asArray(actions).map((a) => [clean(a.action_id), a]));

  const existingItems = asArray(document?.approvalExecutionQueue?.items);
  const existingIds = new Set(
    existingItems.map((i) => clean(i.taskPacket?.task_id) || clean(i.lifecycle?.assigned_task_id)).filter(Boolean),
  );

  // Only OUTBOUND packets (email/call) become durable actor-queue entries; internal
  // coordination materializations (request_actor_evidence, select_follow_up, …) are
  // about EXISTING queue items, so persisting them would create a feedback loop.
  const outboundOnly = options.outboundOnly !== false;

  const additions = [];
  let skipped = 0;
  for (const m of asArray(throughput.materialized)) {
    const taskId = clean(m.task_id);
    if (!taskId || !m.taskPacket || !m.lifecycle) continue;
    if (outboundOnly && !clean(m.channel)) continue;
    if (existingIds.has(taskId)) { skipped += 1; continue; }
    const action = actionsById.get(clean(m.action_id)) || {};
    const lead = leadsById.get(clean(action.source_id)) || leadsById.get(clean(m.action_id)) || null;
    const actor_packet = buildActorPacket(m, action, lead, { mode: options.mode, policy: options.policy });
    additions.push({
      taskPacket: { ...m.taskPacket, actor_packet },
      lifecycle: m.lifecycle,
    });
    existingIds.add(taskId);
  }

  const items = [...existingItems, ...additions];
  const nextDocument = {
    ...document,
    approvalExecutionQueue: {
      ...(document.approvalExecutionQueue || {}),
      generated_at: now,
      count: items.length,
      items,
    },
  };
  return { document: nextDocument, added: additions.length, skipped_existing: skipped, entries: additions };
}

// Read the durable actor queue (outbound + internal) from a revenue document.
export function readActorQueue(document = {}, options = {}) {
  const items = asArray(document?.approvalExecutionQueue?.items);
  const onlyChannel = clean(options.channel);
  const onlyStatus = clean(options.status);
  return items
    .map((i) => ({ taskPacket: i.taskPacket || {}, lifecycle: i.lifecycle || {}, actor_packet: i.taskPacket?.actor_packet || null }))
    .filter((e) => (onlyChannel ? clean(e.actor_packet?.channel) === onlyChannel : true))
    .filter((e) => (onlyStatus ? clean(e.lifecycle.execution_status) === onlyStatus : true));
}
