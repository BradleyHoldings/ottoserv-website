// ─── Lead-intent research-results.json CONTRACT + validator ───────────────────
//
// THE GAP THIS FILLS (Sprint priority 2)
// The pipeline can already ingest researched leads (leadIntentIngest →
// lead:intake) and Hermes can already PROPOSE dispatch_lead_research. But the
// hand-off Cowork → research-results.json → lead:intake had no EXPLICIT, machine-
// checkable contract:
//   - Cowork had only an example file to copy, no field-level spec it could
//     self-check BEFORE submitting, so malformed/under-evidenced files round-trip
//     through intake before the gaps are known;
//   - Hermes had no single "is this research ready for intake?" gate to read, so
//     it could not decide research-complete vs. needs-redispatch autonomously.
//
// This module is that contract. `RESEARCH_RESULTS_CONTRACT` is the explicit spec.
// `validateResearchResults` is a THIN GATE over the EXISTING ingest diagnostics
// (no parallel scorer): it returns ready_for_intake + blocking issues + the
// per-row fixes Cowork must apply. PURE — triggers nothing, writes nothing.

import { ingestResearchResults, coerceResearchRows } from "./leadIntentIngest.mjs";

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

// Intent types that REQUIRE public evidence (mirrors leadIntentIngest's gate).
export const EVIDENCE_REQUIRED_INTENT_TYPES = [
  "explicit_buying_intent",
  "operational_pain",
  "missed_call_or_response_issue",
  "software_or_integration_need",
  "process_bottleneck",
];

// The explicit, copy-pasteable contract Cowork fills and Hermes gates on.
export const RESEARCH_RESULTS_CONTRACT = {
  schema_version: "1.0",
  output_file: "data/lead-intent/research-results.json",
  apply_command: "npm run lead:intake",
  accepted_shapes: [
    "JSON array of lead objects",
    'object wrapping the array: { "leads": [...] } (also: results/research_results/data/items/rows)',
    "a single lead object",
  ],
  required_fields: [
    "business_name (or company) — the operator's name",
    "at least ONE contact path: phone OR email OR website",
    "industry — ICP category (plumbing, hvac, electrical, roofing, remodeling_contractor, property_management, home_services)",
  ],
  recent_intent_fields: [
    `intent_type — one of: ${EVIDENCE_REQUIRED_INTENT_TYPES.join(", ")}`,
    "source_url (or source_urls[]) — a PUBLIC permalink",
    "evidence_snippet — the exact quoted text from that source",
    "date_of_signal — when the signal was posted (drives the 30/90-day window)",
  ],
  recommended_fields: [
    "location", "decision_maker", "intent_evidence_summary", "pain_point",
    "recommended_offer", "signal_window",
  ],
  evidence_rule:
    "Never mark a lead high-intent without a PUBLIC, recent, explainable source_url + exact snippet + date. " +
    "A high-intent claim without evidence is downgraded to evergreen_fit (not recent intent).",
  forbidden: [
    "Do NOT contact, email, call, or DM any lead.",
    "Do NOT fabricate evidence or infer intent without a citation.",
    "Do NOT use private/closed-group content without permission.",
  ],
};

/**
 * Validate a parsed research-results.json against the contract. THIN gate over the
 * existing ingest diagnostics — no parallel scoring.
 *
 * @param {unknown} input  parsed JSON (any shape coerceResearchRows accepts)
 * @param {object} options { now?, parseError?, minAccepted? }
 * @returns {
 *   ok, ready_for_intake, summary, blocking[], needs_verification_rows[],
 *   contract, next_step }
 */
export function validateResearchResults(input, options = {}) {
  const now = options.now || new Date().toISOString();
  const minAccepted = Number(options.minAccepted ?? 1);
  const report = ingestResearchResults(input, { now, parseError: options.parseError });
  const { shape } = coerceResearchRows(input);

  const blocking = [];
  if (report.parse_error) blocking.push(`Invalid JSON: ${report.parse_error}`);
  if (!report.summary.usable_input) {
    blocking.push(`No usable lead rows found (input shape: ${shape}). Provide a JSON array of lead objects.`);
  } else if (report.summary.accepted < minAccepted) {
    blocking.push(
      `Only ${report.summary.accepted} accepted lead(s); need >= ${minAccepted}. ` +
        `${report.summary.needs_verification} need verification, ${report.summary.rejected} rejected.`,
    );
  }

  const needsVerification = asArray(report.rows)
    .filter((r) => r.ingest_status === "needs_verification" || r.ingest_status === "rejected")
    .map((r) => ({ ref: r.ref, status: r.ingest_status, fixes: r.fixes }));

  const ready_for_intake = blocking.length === 0;
  return {
    ok: true,
    ready_for_intake,
    summary: report.summary,
    blocking,
    needs_verification_rows: needsVerification,
    contract: RESEARCH_RESULTS_CONTRACT,
    next_step: ready_for_intake
      ? `Contract satisfied (${report.summary.accepted} accepted) — run \`${RESEARCH_RESULTS_CONTRACT.apply_command}\` to score + merge into the revenue loop.`
      : "Apply the listed fixes to research-results.json, then re-validate before intake.",
  };
}
