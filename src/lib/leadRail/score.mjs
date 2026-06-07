// ─── Phase 1 lead rail: scoring (single source) ───────────────────────────────
//
// There is ONE scorer in the system: leadIntent.scoreIntentLead / tierForIntent
// (evidence-aware, deterministic, with the proven gate that downgrades unsupported
// high-intent claims). This module is a thin, versioned adapter so the rail re-uses
// that scorer instead of forking a second one. It re-scores from the CURRENT
// normalized fields every run, so a change to a verified field changes the score
// reproducibly. PURE. Carries no outreach side effects.

import { scoreIntentLead, tierForIntent } from "../leadIntent.mjs";

// Bump only when the scoring inputs/weights change. Recorded on every receipt so a
// stored score can be traced to the exact rules that produced it.
export const SCORING_VERSION = "leadIntent.v1";

/**
 * Score a normalized lead. Returns { score, tier, score_reasons, scoring_version,
 * scored_at, signal_window, evidence_backed }.
 *
 * @param {object} scoringInput the leadIntent-shaped object from normalizeRow
 * @param {object} options { now }
 */
export function scoreLead(scoringInput = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const scored = scoreIntentLead(scoringInput, now);
  const tier = tierForIntent(scored);
  return {
    score: scored.score,
    tier,
    score_reasons: scored.reasons,
    signal_window: scored.window,
    evidence_backed: scored.hasEvidence,
    reachable: scored.reachable,
    bad_fit: scored.badFit,
    scoring_version: SCORING_VERSION,
    scored_at: now,
  };
}
