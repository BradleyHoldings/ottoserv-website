// ─── Phase 1 lead rail: per-lead, idempotent enrichment contract ──────────────
//
// Leads with verified contact evidence SKIP enrichment. Leads with public evidence
// but no usable contact path get a durable `enrich_lead_contact` task (one per
// lead, idempotent). Leads without public evidence are NEVER auto-enriched into
// outreach eligibility — they are quarantined upstream.
//
// Cowork remains the assigned ACTOR, but there is no automated Cowork worker in
// Phase 1, so this module is honest about it: it produces the durable queue
// contract + the result-ingestion contract + stall/retry/blocked handling, and
// reports `blocked` when the actor is unavailable/out of credits. It does NOT claim
// a worker exists or that enrichment succeeded just because a task was queued.
//
// PURE. The pipeline/store own persistence.

import { ENRICHMENT_STATUS } from "./eligibility.mjs";
import { validatePhone, validateEmail, validateWebsite } from "./validate.mjs";

export const ENRICH_TASK_TYPE = "enrich_lead_contact";
export const ENRICH_ACTOR = "Cowork";
// A queued enrichment with no actor result after this many minutes is STALLED.
export const ENRICH_STALL_MINUTES = 1440; // 24h — manual actor (Cowork) cadence
export const ENRICH_MAX_ATTEMPTS = 3;

function clean(v) {
  return String(v ?? "").trim();
}
function ageMin(iso, now) {
  const t = Date.parse(clean(iso));
  return Number.isNaN(t) ? null : (Date.parse(now) - t) / 60000;
}

/** A lead needs enrichment when it has public evidence but no usable contact path. */
export function needsEnrichment(lead = {}) {
  const cv = lead.contact_validation || {};
  const hasContact = Boolean(cv.phone?.valid || cv.email?.valid);
  const enrichable = Boolean(cv.website?.valid);
  const hasEvidence = Boolean(lead.fit_validation?.has_public_evidence ?? lead.source_url ?? lead.source_evidence);
  return hasEvidence && !hasContact && enrichable;
}

/**
 * Build (or refresh) the durable enrichment task for a lead. Idempotent: the
 * task_id is derived ONLY from the lead_id, so re-queuing the same lead returns the
 * SAME task id (no duplicate). `existing` (the lead's prior task, if any) is merged
 * so attempts/history are preserved.
 */
export function buildEnrichmentTask(lead = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const existing = options.existing || null;
  const lead_id = clean(lead.lead_id);
  const task_id = `enr-${lead_id}`;

  return {
    task_id,
    task_type: ENRICH_TASK_TYPE,
    lead_id,
    idempotency_key: lead_id,
    actor: ENRICH_ACTOR,
    status: ENRICHMENT_STATUS.QUEUED,
    objective: "Find a verified, public contact path (email or phone) for an ICP lead that has public evidence but no usable contact.",
    inputs: {
      company_name: clean(lead.company_name),
      website: clean(lead.website),
      website_host: clean(lead.contact_validation?.website?.host),
      source_url: clean(lead.source_url),
      city: clean(lead.city),
      state: clean(lead.state),
    },
    required_result_evidence: [
      "Verified contact (email and/or phone).",
      "Public source URL proving the contact belongs to this business.",
      "Validation timestamp + the actor that verified it.",
    ],
    forbidden: ["No outreach. No contact attempt. Public sources only."],
    attempt: existing ? Number(existing.attempt || 0) : 0,
    created_at: existing ? clean(existing.created_at) || now : now,
    queued_at: now,
    updated_at: now,
    history: Array.isArray(existing?.history) ? existing.history : [],
  };
}

/**
 * Reconcile desired enrichment tasks against the existing durable queue WITHOUT
 * creating duplicates. Returns { tasks, queued, refreshed, retried, unchanged }.
 * A lead already in the queue is refreshed (not re-added); a failed/blocked task is
 * retried in place (attempt+1) only when it is retry-eligible.
 */
export function reconcileEnrichmentTasks(desiredLeads = [], existingTasks = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const byLead = new Map();
  for (const t of Array.isArray(existingTasks) ? existingTasks : []) {
    if (clean(t.lead_id)) byLead.set(clean(t.lead_id), t);
  }

  const out = new Map(byLead); // start from existing, overwrite/add as needed
  let queued = 0, refreshed = 0, retried = 0, unchanged = 0;

  for (const lead of Array.isArray(desiredLeads) ? desiredLeads : []) {
    const lead_id = clean(lead.lead_id);
    if (!lead_id) continue;
    const prior = byLead.get(lead_id);
    if (!prior) {
      out.set(lead_id, buildEnrichmentTask(lead, { now }));
      queued += 1;
      continue;
    }
    // Completed enrichment is left untouched (idempotent — don't re-queue).
    if (prior.status === ENRICHMENT_STATUS.COMPLETED) { unchanged += 1; continue; }
    // Failed/blocked → retry in place if eligible (no new task id).
    if (prior.status === ENRICHMENT_STATUS.BLOCKED || prior.status === ENRICHMENT_STATUS.STALLED) {
      if (Number(prior.attempt || 0) < ENRICH_MAX_ATTEMPTS) {
        const next = buildEnrichmentTask(lead, { now, existing: prior });
        next.attempt = Number(prior.attempt || 0) + 1;
        next.status = ENRICHMENT_STATUS.QUEUED;
        next.history = [...(prior.history || []), { at: now, from: prior.status, to: "queued", note: "retry" }];
        out.set(lead_id, next);
        retried += 1;
      } else {
        unchanged += 1; // exhausted retries — leave blocked for escalation
      }
      continue;
    }
    // Still queued/in_progress → refresh timestamp only.
    out.set(lead_id, { ...prior, updated_at: now });
    refreshed += 1;
  }

  return { tasks: [...out.values()], queued, refreshed, retried, unchanged };
}

/**
 * Ingest a Cowork enrichment RESULT and write the verified contact back onto the
 * lead. Requires real evidence — a queued task is NOT proof of success. Returns
 * { ok, lead?, task, reason? }. The contact is re-validated through the SAME
 * validator, so a mock/test result cannot pass as verified.
 */
export function ingestEnrichmentResult(lead = {}, task = {}, result = {}, options = {}) {
  const now = options.now || new Date().toISOString();

  // Actor truthfully unavailable / out of credits → blocked, not "completed".
  if (result.blocked || result.actor_unavailable || result.out_of_credits) {
    const blocked = { ...task, status: ENRICHMENT_STATUS.BLOCKED, updated_at: now, blocked_reason: clean(result.reason) || "actor_unavailable" };
    return { ok: false, reason: "actor_blocked", task: blocked, lead: { ...lead, enrichment_status: ENRICHMENT_STATUS.BLOCKED } };
  }

  const phone = validatePhone(result.phone);
  const email = validateEmail(result.email);
  const evidenceUrl = clean(result.source_url || result.evidence_url);
  if (!phone.valid && !email.valid) {
    return { ok: false, reason: "no_verified_contact", task: { ...task, status: ENRICHMENT_STATUS.IN_PROGRESS, updated_at: now } };
  }
  if (!evidenceUrl) {
    return { ok: false, reason: "missing_contact_evidence", task: { ...task, status: ENRICHMENT_STATUS.IN_PROGRESS, updated_at: now } };
  }

  const website = validateWebsite(result.website || lead.website);
  const enrichedLead = {
    ...lead,
    normalized_phone: phone.valid ? phone.normalized : lead.normalized_phone,
    phone: phone.valid ? phone.normalized : lead.phone,
    email: email.valid ? email.normalized : lead.email,
    website: website.valid ? `https://${website.host}` : lead.website,
    enrichment_status: ENRICHMENT_STATUS.COMPLETED,
    last_validated_at: now,
    contact_validation: {
      ...(lead.contact_validation || {}),
      phone, email,
      website: website.valid ? website : (lead.contact_validation?.website || website),
      has_contact_path: phone.valid || email.valid,
      validated_at: now,
      method: clean(result.method) || "cowork_enrichment",
      provider: clean(result.actor) || ENRICH_ACTOR,
    },
    enrichment_evidence: {
      source_url: evidenceUrl,
      actor: clean(result.actor) || ENRICH_ACTOR,
      confidence: clean(result.confidence) || "verified",
      validated_at: now,
      reference: clean(result.reference) || clean(task.task_id),
    },
  };
  const completedTask = {
    ...task,
    status: ENRICHMENT_STATUS.COMPLETED,
    completed_at: now,
    updated_at: now,
    result_evidence: enrichedLead.enrichment_evidence,
    history: [...(task.history || []), { at: now, from: task.status, to: ENRICHMENT_STATUS.COMPLETED, note: "result ingested" }],
  };
  return { ok: true, lead: enrichedLead, task: completedTask };
}

/**
 * Detect stalled enrichment tasks (watchdog signal). Returns alerts the operator/
 * watchdog must surface. Does not mutate. A stalled task is retry-eligible until
 * ENRICH_MAX_ATTEMPTS.
 */
export function detectStalledEnrichment(tasks = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const threshold = Number(options.stallMinutes ?? ENRICH_STALL_MINUTES);
  const alerts = [];
  for (const t of Array.isArray(tasks) ? tasks : []) {
    if (t.status !== ENRICHMENT_STATUS.QUEUED && t.status !== ENRICHMENT_STATUS.IN_PROGRESS) continue;
    const age = ageMin(t.queued_at || t.updated_at, now);
    if (age !== null && age > threshold) {
      alerts.push({
        task_id: t.task_id,
        lead_id: t.lead_id,
        failure_class: "enrichment_stalled",
        severity: "high",
        detail: `Enrichment queued ${Math.round(age)}m ago with no actor result (> ${threshold}m).`,
        retry_eligible: Number(t.attempt || 0) < ENRICH_MAX_ATTEMPTS,
        recommended_action: Number(t.attempt || 0) < ENRICH_MAX_ATTEMPTS ? "re-queue to Cowork (no duplicate task)" : "escalate: Cowork unavailable / out of credits",
        detected_at: now,
      });
    }
  }
  return { generated_at: now, alerts, summary: { scanned: (tasks || []).length, stalled: alerts.length } };
}
