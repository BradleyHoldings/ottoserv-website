// ─── Phase 1 lead rail: Cowork enrichment handoff ────────────────────────────
//
// Connects the canonical enrichment queue to the existing Cowork handoff mechanism
// WITHOUT claiming an automated browser worker exists. Cowork is a MANUAL actor.
//
// Each handoff packet carries a deterministic task_id (enr-<lead_id>) so the same
// lead never spawns a duplicate task. The packet includes:
//   - actor (Cowork)
//   - objective
//   - evidence schema (what Cowork must return)
//   - timeout
//   - retry policy
//   - blocked state when Cowork is unavailable or out of credits
//
// Result ingestion writes back to the canonical lead and triggers revalidation
// before eligibility changes. No duplicate task, no external outreach.

import { reconcileEnrichmentTasks, ingestEnrichmentResult, detectStalledEnrichment, ENRICH_STALL_MINUTES, ENRICH_MAX_ATTEMPTS } from "./enrichment.mjs";
import { ENRICHMENT_STATUS } from "./eligibility.mjs";

export const HANDOFF_SCHEMA_VERSION = "cowork.v1";
export const COWORK_TIMEOUT_MINUTES = ENRICH_STALL_MINUTES; // 24h for manual actor
export const COWORK_MAX_RETRIES = ENRICH_MAX_ATTEMPTS;

export const HANDOFF_STATE = {
  QUEUED: "queued",
  BLOCKED: "blocked",
  COMPLETED: "completed",
  STALLED: "stalled",
};

function clean(v) {
  return String(v ?? "").trim();
}

/**
 * Build the actor packet Cowork receives for a single enrichment task. This is the
 * canonical handoff shape — deterministic, idempotent (same lead_id → same task_id).
 */
export function buildCoworkPacket(enrichTask, options = {}) {
  const now = options.now || new Date().toISOString();
  return {
    schema_version: HANDOFF_SCHEMA_VERSION,
    task_id: enrichTask.task_id,
    lead_id: enrichTask.lead_id,
    actor: "Cowork",
    operation: "enrich_lead_contact",
    issued_at: now,
    timeout_minutes: COWORK_TIMEOUT_MINUTES,
    max_retries: COWORK_MAX_RETRIES,
    attempt: enrichTask.attempt || 0,

    objective: enrichTask.objective || "Find a verified, public contact path (email or phone) for an ICP lead that has public evidence but no usable contact.",

    inputs: enrichTask.inputs || {},

    required_result_evidence: enrichTask.required_result_evidence || [
      "Verified contact (email and/or phone).",
      "Public source URL proving the contact belongs to this business.",
      "Validation timestamp + the actor that verified it.",
    ],

    result_schema: {
      phone: "string | null — E.164 or standard US format",
      email: "string | null",
      website: "string | null",
      source_url: "string REQUIRED — public URL proving contact",
      actor: "string — 'Cowork' or sub-actor name",
      confidence: "string — 'verified' | 'probable' | 'unconfirmed'",
      method: "string — how the contact was found",
      reference: "string | null — internal reference",
      blocked: "boolean — true when actor unavailable or out of credits",
      out_of_credits: "boolean — true when credit balance insufficient",
      reason: "string | null — detail when blocked",
    },

    forbidden: enrichTask.forbidden || [
      "No outreach. No contact attempt. Public sources only.",
      "Do not fabricate contacts or evidence URLs.",
      "Do not mark complete without a real, public source URL.",
    ],

    no_outreach: true,
  };
}

/**
 * Reconcile desired enrichment tasks against the existing queue and produce
 * Cowork handoff packets for any new or retry-eligible tasks. Returns:
 *   { tasks, packets, queued, refreshed, retried, blocked, stalled_alerts }
 *
 * `coworkAvailable` = false → all queued tasks immediately enter BLOCKED state.
 * No duplicate packets are produced — same lead_id always yields same task_id.
 */
export function reconcileCoworkHandoff(desiredLeads = [], existingTasks = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const coworkAvailable = options.coworkAvailable !== false; // default: assume available

  // Track which lead_ids already have tasks (and their prior status) so we only
  // emit packets for newly-queued or retry-eligible tasks, not for refreshed ones.
  const priorByLead = new Map();
  for (const t of Array.isArray(existingTasks) ? existingTasks : []) {
    if (clean(t.lead_id)) priorByLead.set(clean(t.lead_id), t);
  }

  const { tasks, queued, refreshed, retried } = reconcileEnrichmentTasks(desiredLeads, existingTasks, { now });

  const packets = [];
  const blockedTasks = [];

  for (const task of tasks) {
    if (task.status !== ENRICHMENT_STATUS.QUEUED) continue;

    const prior = priorByLead.get(clean(task.lead_id));
    // Only emit a handoff packet for newly-queued tasks or retry-eligible tasks.
    // Refreshed tasks (prior status was already QUEUED/IN_PROGRESS) do not need
    // a new packet — the existing packet is still in flight.
    const isNew = !prior;
    const isRetry = prior && (prior.status === ENRICHMENT_STATUS.BLOCKED || prior.status === ENRICHMENT_STATUS.STALLED);
    if (!isNew && !isRetry) continue; // refreshed — no new packet

    const packet = buildCoworkPacket(task, { now });

    if (!coworkAvailable || options.outOfCredits) {
      // Blocked state — record it, don't queue externally.
      blockedTasks.push({
        ...task,
        status: ENRICHMENT_STATUS.BLOCKED,
        blocked_reason: options.outOfCredits ? "cowork_out_of_credits" : "cowork_unavailable",
        updated_at: now,
      });
      continue;
    }
    packets.push(packet);
  }

  const finalTasks = tasks.map((t) => {
    const blocked = blockedTasks.find((b) => b.task_id === t.task_id);
    return blocked || t;
  });

  const stalled = detectStalledEnrichment(finalTasks, { now, stallMinutes: COWORK_TIMEOUT_MINUTES });

  return {
    tasks: finalTasks,
    packets,
    queued: packets.length,
    refreshed,
    retried,
    blocked: blockedTasks.length,
    stalled_alerts: stalled.alerts,
    cowork_available: coworkAvailable,
  };
}

/**
 * Ingest a Cowork result for one lead, re-validate the contact, and write back
 * to the canonical lead. Revalidation runs through the SAME validator (not a
 * shortcut), so a fake result cannot be promoted to `completed`.
 *
 * Returns { ok, lead?, task, reason? }. Caller is responsible for persisting
 * the updated lead and task via the canonical store.
 */
export function ingestCoworkResult(lead, task, result, options = {}) {
  const now = options.now || new Date().toISOString();

  // Blocked / unavailable actor.
  if (result.blocked || result.actor_unavailable || result.out_of_credits) {
    return ingestEnrichmentResult(lead, task, { ...result, blocked: true }, { now });
  }

  // Missing evidence URL → cannot promote to completed.
  if (!clean(result.source_url || result.evidence_url)) {
    return {
      ok: false,
      reason: "missing_evidence_url",
      task: { ...task, status: ENRICHMENT_STATUS.IN_PROGRESS, updated_at: now },
    };
  }

  return ingestEnrichmentResult(lead, task, result, { now });
}

/**
 * Produce a watchdog report for stalled enrichment tasks. Does not mutate state.
 * Call this on a schedule (e.g. during pipeline runs) to surface operator alerts.
 */
export function watchdogCoworkEnrichment(tasks = [], options = {}) {
  return detectStalledEnrichment(tasks, options);
}
