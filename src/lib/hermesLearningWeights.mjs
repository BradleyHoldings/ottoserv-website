// ─── Hermes learning weights (Autonomy v2, milestone 2) ──────────────────────
//
// THE GAP THIS FILLS
// The next-action selector (v1) ranks actions by business urgency only — it is
// blind to history. The operating ledger + scorecard now know which actors
// deliver and which rails keep breaking, but nothing FEEDS that learning back
// into the decision. So Hermes keeps routing work to an actor that never closes
// it, and a chronically broken rail sits at normal priority.
//
// This module is the feedback layer. It derives reliability weights from the
// ledger summary and APPLIES them to selector output: it escalates chronically
// broken rails, raises attention on actions routed to unreliable actors, attaches
// a reroute suggestion, and annotates confidence from each action_type's
// historical success. It COMPOSES the existing selector (does not modify or
// rebuild it) and adds no parallel store.
//
// SAFETY: pure + annotation-only. It NEVER lowers an approval gate, never changes
// required_approval/forbidden_actions, and never reassigns execution by itself —
// it proposes. Re-routing is a suggestion a human/Hermes acts on within gates.

import { selectNextActions, PRIORITY_RANK } from "./hermesNextActionSelector.mjs";

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

// Reliability classification thresholds (need a minimum sample before judging).
export const LEARNING_THRESHOLDS = {
  min_samples: 2,
  reliable_rate: 0.6,
  unreliable_rate: 0.4,
  chronic_break_count: 2, // rail broken ≥ this and not fully repaired → chronic
};

// Conservative reroute hints: who can also carry a class of work. Empty/unknown
// → escalate to Hermes for reassignment (never silently bypass a gate).
const ACTOR_ALTERNATES = {
  Cowork: ["Gemini (research)", "Hermes (reassign)"],
  Codex: ["Hermes (reassign)"],
  "Morgan/Retell": ["Hermes (reassign)"],
  "OttoServ Outreach (email rail)": ["Hermes (reassign)"],
};

function bumpUp(priority) {
  const order = ["critical", "high", "medium", "low"];
  const i = order.indexOf(priority);
  return i > 0 ? order[i - 1] : priority;
}

/**
 * Derive reliability weights from a ledger summary (summarizeLedger output, which
 * the scorecard also exposes as actor_reliability + dimensions.repair). Pure.
 *
 * @returns { actors:{name:{samples,reliability,status}}, action_types:{...},
 *   rails:{id:{broken,repaired,chronic}} }
 */
export function deriveLearningWeights(ledgerSummary = {}) {
  const T = LEARNING_THRESHOLDS;
  const actorsIn = ledgerSummary.actors || {};
  const actors = {};
  for (const [name, a] of Object.entries(actorsIn)) {
    const samples = Math.max(Number(a.evidence_submitted || 0), Number(a.proposed || 0));
    // Prefer completion_rate; fall back to evidence_rate when nothing completed yet.
    const reliability = a.completion_rate != null ? a.completion_rate : (a.evidence_rate != null ? a.evidence_rate : null);
    let status = "unproven";
    if (samples >= T.min_samples && reliability != null) {
      if (reliability >= T.reliable_rate) status = "reliable";
      else if (reliability <= T.unreliable_rate) status = "unreliable";
    }
    actors[name] = { samples, reliability, status };
  }

  const action_types = {};
  for (const [type, t] of Object.entries(ledgerSummary.action_types || {})) {
    const count = Number(t.count || 0);
    const success_rate = count ? Number((Number(t.success || 0) / count).toFixed(3)) : null;
    action_types[type] = { count, success_rate };
  }

  const rails = {};
  for (const [id, r] of Object.entries(ledgerSummary.rails || {})) {
    const broken = Number(r.broken || 0);
    const repaired = Number(r.repaired || 0);
    rails[id] = { broken, repaired, chronic: broken >= T.chronic_break_count && repaired < broken };
  }

  return { actors, action_types, rails };
}

/**
 * Apply learning weights to selector output. Pure: returns a NEW result with
 * reweighted + annotated actions (input untouched). Each action gains a `learning`
 * block { actor_status, actor_reliability, action_type_success_rate, adjustment,
 * reroute_to }. Gates are never relaxed.
 */
export function applyLearning(selectorOutput = {}, weights = {}, options = {}) {
  const actions = asArray(selectorOutput.actions).map((a) => {
    const actorW = weights.actors?.[a.actor] || { status: "unproven", reliability: null, samples: 0 };
    const typeW = weights.action_types?.[a.action_type] || { success_rate: null };
    const railW = weights.rails?.[a.source_id];

    let priority = a.priority;
    let adjustment = "none";
    let reroute_to = "";
    const notes = [];

    // Chronically broken rail → escalate to critical.
    if ((a.source_type === "repair_packet" || a.source_type === "broken_rail") && railW?.chronic) {
      if (PRIORITY_RANK[priority] > PRIORITY_RANK.critical) { priority = "critical"; adjustment = "escalated_chronic_rail"; }
      notes.push(`Rail broken ${railW.broken}× with ${railW.repaired} repair(s) — chronic; escalate.`);
    }

    // Unreliable assigned actor → raise attention + propose reroute (gates intact).
    if (actorW.status === "unreliable") {
      const bumped = bumpUp(priority);
      if (bumped !== priority) { priority = bumped; adjustment = adjustment === "none" ? "raised_unreliable_actor" : adjustment; }
      reroute_to = (ACTOR_ALTERNATES[a.actor] || ["Hermes (reassign)"])[0];
      notes.push(`${a.actor} reliability ${actorW.reliability} over ${actorW.samples} sample(s) — consider rerouting to ${reroute_to}.`);
    } else if (actorW.status === "reliable") {
      notes.push(`${a.actor} is reliable (${actorW.reliability} over ${actorW.samples}).`);
    }

    if (typeW.success_rate != null && typeW.success_rate < 0.4) {
      notes.push(`"${a.action_type}" has a low historical success rate (${typeW.success_rate}) — verify approach.`);
    }

    return {
      ...a,
      priority,
      learning: {
        actor_status: actorW.status,
        actor_reliability: actorW.reliability,
        action_type_success_rate: typeW.success_rate,
        adjustment,
        ...(reroute_to ? { reroute_to } : {}),
        ...(notes.length ? { notes } : {}),
      },
    };
  });

  // Re-sort by the (possibly adjusted) priority, then source_type, then id.
  actions.sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    if (a.source_type !== b.source_type) return a.source_type.localeCompare(b.source_type);
    return a.action_id.localeCompare(b.action_id);
  });

  const by_priority = {};
  for (const a of actions) by_priority[a.priority] = (by_priority[a.priority] || 0) + 1;

  return {
    generated_at: clean(selectorOutput.generated_at) || options.now || new Date().toISOString(),
    weights_applied: true,
    count: actions.length,
    by_priority,
    actions,
  };
}

/**
 * Convenience: run the selector and apply learning in one call. `state` is the
 * selector state; `state.ledgerSummary` (summarizeLedger output) drives the
 * weights. Composes existing modules — no rebuild.
 */
export function selectNextActionsWithLearning(state = {}, options = {}) {
  const base = selectNextActions(state, options);
  const weights = deriveLearningWeights(state.ledgerSummary || {});
  return applyLearning(base, weights, options);
}
