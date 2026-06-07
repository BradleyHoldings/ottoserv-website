// ─── Phase 1 lead rail: policy eligibility classification ──────────────────────
//
// Maps a validated + scored lead to ONE policy eligibility. During Phase 1,
// `email_eligible` / `call_eligible` mean ONLY that an outreach packet MAY be
// prepared — they never trigger a transport. PURE.
//
// eligibility ∈ enrich | email_eligible | call_eligible | manual_review | gated | rejected

import { RECORD_STATUS } from "./validate.mjs";

export const ELIGIBILITY = {
  ENRICH: "enrich",
  EMAIL: "email_eligible",
  CALL: "call_eligible",
  MANUAL_REVIEW: "manual_review",
  GATED: "gated",
  REJECTED: "rejected",
};

export const ENRICHMENT_STATUS = {
  NOT_REQUIRED: "not_required",
  QUEUED: "queued",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  BLOCKED: "blocked",
  STALLED: "stalled",
};

const NEXT_ACTION = {
  [ELIGIBILITY.ENRICH]: "enrich_lead_contact",
  [ELIGIBILITY.EMAIL]: "prepare_email_packet",
  [ELIGIBILITY.CALL]: "prepare_call_packet",
  [ELIGIBILITY.MANUAL_REVIEW]: "manual_review",
  [ELIGIBILITY.GATED]: "hold_gated",
  [ELIGIBILITY.REJECTED]: "none",
};

function lower(v) {
  return String(v ?? "").trim().toLowerCase();
}

/**
 * Classify eligibility. Returns { eligibility, next_action, enrichment_status,
 * pipeline_stage, reasons[] }.
 *
 * @param {object} ctx { record_status, contact_validation, fit_validation, score }
 *   score = { tier, evidence_backed, reachable }
 * @param {object} options { dnc?:Set|string[], blacklist?:Set|string[] }
 */
export function classifyEligibility(ctx = {}, options = {}) {
  const reasons = [];
  const cv = ctx.contact_validation || {};
  const fv = ctx.fit_validation || {};
  const score = ctx.score || {};
  const phoneOk = Boolean(cv.phone?.valid);
  const emailOk = Boolean(cv.email?.valid);
  const websiteOk = Boolean(cv.website?.valid);

  // Hard rejects / quarantines never reach a transport-eligible state.
  if (ctx.record_status === RECORD_STATUS.REJECTED) {
    reasons.push("rejected record — not eligible for any outreach.");
    return result(ELIGIBILITY.REJECTED, ENRICHMENT_STATUS.NOT_REQUIRED, "rejected", reasons);
  }
  if (ctx.record_status === RECORD_STATUS.QUARANTINED) {
    reasons.push("quarantined record — held for manual review, not auto-enriched into outreach.");
    return result(ELIGIBILITY.MANUAL_REVIEW, ENRICHMENT_STATUS.NOT_REQUIRED, "quarantined", reasons);
  }

  // Do-not-contact / blacklist gating (domain/email/phone).
  const dnc = toSet(options.dnc);
  const blacklist = toSet(options.blacklist);
  const gateHit =
    (emailOk && dnc.has(lower(cv.email.normalized))) ||
    (phoneOk && dnc.has(cv.phone.normalized)) ||
    (cv.website?.host && blacklist.has(lower(cv.website.host)));
  if (gateHit) {
    reasons.push("on DNC/blacklist — gated.");
    return result(ELIGIBILITY.GATED, ENRICHMENT_STATUS.NOT_REQUIRED, "gated", reasons);
  }

  // Accepted record: decide reach.
  const hasContact = phoneOk || emailOk;
  if (!hasContact) {
    // Accepted ⇒ public evidence exists; an enrichable website but no contact path
    // ⇒ queue enrichment (never auto-promote to outreach without a contact).
    if (websiteOk) {
      reasons.push("public evidence + enrichable website but no usable contact path — queue enrichment.");
      return result(ELIGIBILITY.ENRICH, ENRICHMENT_STATUS.QUEUED, "enrichment_queued", reasons);
    }
    reasons.push("no contact path and no enrichable website — manual review.");
    return result(ELIGIBILITY.MANUAL_REVIEW, ENRICHMENT_STATUS.NOT_REQUIRED, "manual_review", reasons);
  }

  // Verified contact present ⇒ enrichment not required.
  if (score.tier === "A-tier" && phoneOk && score.evidence_backed) {
    reasons.push("A-tier, evidence-backed, callable — call packet may be prepared.");
    return result(ELIGIBILITY.CALL, ENRICHMENT_STATUS.NOT_REQUIRED, "eligible", reasons);
  }
  if (emailOk) {
    reasons.push("verified email + public evidence — email packet may be prepared.");
    return result(ELIGIBILITY.EMAIL, ENRICHMENT_STATUS.NOT_REQUIRED, "eligible", reasons);
  }
  if (phoneOk) {
    reasons.push("verified phone — call packet may be prepared (non-A-tier).");
    return result(ELIGIBILITY.CALL, ENRICHMENT_STATUS.NOT_REQUIRED, "eligible", reasons);
  }
  reasons.push("reachable but weak fit/score — manual review.");
  return result(ELIGIBILITY.MANUAL_REVIEW, ENRICHMENT_STATUS.NOT_REQUIRED, "manual_review", reasons);
}

function result(eligibility, enrichment_status, pipeline_stage, reasons) {
  return { eligibility, enrichment_status, pipeline_stage, next_action: NEXT_ACTION[eligibility], reasons };
}

function toSet(v) {
  if (v instanceof Set) return new Set([...v].map((x) => lower(x)));
  return new Set((Array.isArray(v) ? v : []).map((x) => lower(x)));
}
