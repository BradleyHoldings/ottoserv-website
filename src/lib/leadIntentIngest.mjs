// ─── Lead-intent ingest adapter ───────────────────────────────────────────────
//
// THE GAP THIS FILLS
// `scripts/lead-intent-pipeline.mjs` (npm run lead:intake) turns researched leads
// into the revenue-loop input, but the Cowork/Hermes → research-results.json →
// lead:intake hand-off was not RELIABLE:
//   - the CLI did a bare JSON.parse and silently fell back to [] on any malformed
//     JSON or unexpected wrapper shape (e.g. Cowork returns { "leads": [...] } or
//     a single object), so real research silently became "no research yet";
//   - there was no machine-readable feedback telling Cowork/Hermes which rows were
//     accepted, rejected (and why), or downgraded for missing evidence — so the
//     loop could not be closed without a human eyeballing the file.
//
// This module is the missing read/write contract. It is PURE and deterministic —
// it triggers NOTHING (no outreach, no network, no writes; the CLI owns I/O). It:
//   1. coerceResearchRows(): tolerantly accepts the shapes Cowork realistically
//      produces and normalizes them to the canonical row array;
//   2. ingestResearchResults(): scores each row through the EXISTING leadIntent
//      normalizer (no parallel scoring) and returns a per-row ingest report with
//      status + reasons + actionable fixes, preserving evidence requirements,
//      30/90-day signal windows, dedupe, A/B/C/reject tiering, and next action.

import {
  normalizeEnrichedLead,
  dedupeEnrichedLeads,
} from "./leadIntent.mjs";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clean(value) {
  return String(value ?? "").trim();
}

// Keys Cowork/Hermes might reasonably wrap the lead array in. Checked in order.
const ARRAY_WRAPPER_KEYS = ["leads", "results", "research_results", "data", "items", "rows"];

/**
 * Coerce whatever Cowork/Hermes produced into a canonical array of lead rows.
 * Accepts: a JSON array; an object wrapping the array under a known key; or a
 * single lead object. Returns { rows, shape, skipped_non_objects }.
 * Never throws.
 */
export function coerceResearchRows(input) {
  if (Array.isArray(input)) {
    const rows = input.filter(isPlainObject);
    return { rows, shape: "array", skipped_non_objects: input.length - rows.length };
  }
  if (isPlainObject(input)) {
    for (const key of ARRAY_WRAPPER_KEYS) {
      if (Array.isArray(input[key])) {
        const rows = input[key].filter(isPlainObject);
        return { rows, shape: `object.${key}`, skipped_non_objects: input[key].length - rows.length };
      }
    }
    // A single lead object (has a business identity field) is a valid 1-row input.
    if (clean(input.business_name) || clean(input.company)) {
      return { rows: [input], shape: "single_object", skipped_non_objects: 0 };
    }
    return { rows: [], shape: "object_unrecognized", skipped_non_objects: 0 };
  }
  return { rows: [], shape: input == null ? "empty" : "invalid", skipped_non_objects: 0 };
}

// High-intent claim types that REQUIRE public evidence before we treat the signal
// as recent. Mirrors the gate in leadIntent.scoreIntentLead.
const EVIDENCE_REQUIRED_INTENTS = new Set([
  "explicit_buying_intent",
  "operational_pain",
  "missed_call_or_response_issue",
  "software_or_integration_need",
  "process_bottleneck",
]);

function hasEvidence(raw) {
  return Boolean(
    clean(raw.evidence_snippet) ||
      clean(raw.source_url) ||
      (Array.isArray(raw.source_urls) && raw.source_urls.some((u) => clean(u))),
  );
}

/**
 * Diagnose one normalized lead against its raw row. Returns
 * { status, reasons, fixes } where status is accepted | needs_verification |
 * rejected. Pure.
 */
function diagnoseRow(raw, lead) {
  const reasons = [];
  const fixes = [];

  if (lead.tier === "Reject") {
    if (!clean(lead.normalized_phone) && !clean(lead.email) && !clean(lead.website)) {
      reasons.push("No reachable contact path (phone / email / website).");
      fixes.push("Capture a phone, email, or website so the lead is contactable.");
    }
    if (/vendor|agency|mlm|spam/i.test(`${raw.business_name} ${raw.industry} ${raw.intent_evidence_summary}`)) {
      reasons.push("Looks like a vendor/agency, not an ICP service business.");
      fixes.push("Confirm this is a property manager or home-service business in our ICP, or drop it.");
    }
    if (!reasons.length) {
      reasons.push(`Score ${lead.score} below acceptance floor / weak fit.`);
      fixes.push("Add ICP fit, recent intent evidence, and a contact path.");
    }
    return { status: "rejected", reasons, fixes };
  }

  // High-intent claim that lost its recent window for lack of public evidence.
  const claimedHighIntent = EVIDENCE_REQUIRED_INTENTS.has(clean(raw.intent_type));
  if (claimedHighIntent && !hasEvidence(raw)) {
    reasons.push(`Claimed "${clean(raw.intent_type)}" but no public evidence → downgraded to ${lead.signal_window}.`);
    fixes.push("Add a public source_url + exact quoted snippet + date_of_signal to qualify as recent intent.");
    return { status: "needs_verification", reasons, fixes };
  }

  if (lead.recommended_next_action === "cowork_research") {
    reasons.push("Routed to Cowork research before outreach (verify intent/contact).");
    fixes.push("Verify the public signal and contact details, then re-run intake.");
    return { status: "needs_verification", reasons, fixes };
  }

  if (!clean(raw.date_of_signal) && lead.signal_window === "evergreen_fit") {
    reasons.push("No date_of_signal — treated as evergreen ICP fit, not recent intent.");
    fixes.push("Record date_of_signal so the 30/90-day window can be computed.");
  }
  reasons.unshift(`Accepted as ${lead.tier} (${lead.signal_window}); next action: ${lead.recommended_next_action}.`);
  return { status: "accepted", reasons, fixes };
}

/**
 * Validate + diagnose researched leads without mutating the pipeline behavior.
 * Returns a machine-readable ingest report Cowork/Hermes can act on.
 *
 * @param {unknown} rawInput  Parsed JSON from research-results.json (any shape).
 * @param {object} options    { now?, parseError? }
 */
export function ingestResearchResults(rawInput, options = {}) {
  const now = options.now || new Date().toISOString();
  const { rows, shape, skipped_non_objects } = coerceResearchRows(rawInput);

  const reportRows = rows.map((raw, index) => {
    const lead = normalizeEnrichedLead(raw, { now });
    const { status, reasons, fixes } = diagnoseRow(raw, lead);
    return {
      index,
      ref: clean(raw.business_name) || clean(raw.company) || `row ${index}`,
      lead_id: lead.lead_id,
      tier: lead.tier,
      signal_window: lead.signal_window,
      intent_type: lead.intent_type,
      score: lead.score,
      recommended_next_action: lead.recommended_next_action,
      has_evidence: hasEvidence(raw),
      ingest_status: status,
      reasons,
      fixes,
    };
  });

  // Dedupe diagnostics over the SAME normalization the pipeline uses.
  const normalized = rows.map((raw) => normalizeEnrichedLead(raw, { now }));
  const deduped = dedupeEnrichedLeads(normalized);
  const duplicates_collapsed = normalized.length - deduped.length;

  const count = (s) => reportRows.filter((r) => r.ingest_status === s).length;
  const accepted = count("accepted");
  const needs_verification = count("needs_verification");
  const rejected = count("rejected");

  return {
    generated_at: now,
    input_shape: shape,
    parse_error: options.parseError ? clean(options.parseError) : null,
    summary: {
      total_rows: rows.length,
      skipped_non_objects,
      accepted,
      needs_verification,
      rejected,
      duplicates_collapsed,
      // Whether the file gave us anything usable at all — distinguishes
      // "empty/malformed input" from "input present but nothing qualified".
      usable_input: rows.length > 0,
    },
    rows: reportRows,
  };
}
