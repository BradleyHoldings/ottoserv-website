// ─── Hermes actor availability + cost-aware routing (Autonomy v2, priority 4) ─
//
// THE GAP THIS FILLS
// Hermes runs through several actor rails — Cowork (browser/subscription), the
// Opus/Claude browser, Codex, Hermes itself, and metered API/local rails. Those
// rails have CREDIT and TIME WINDOWS: a subscription tool can be temporarily out of
// credits, an API budget can be exhausted, a browser session can be rate-limited
// until a reset. The self-repair loop, however, treated ANY rail that could not
// produce output as a BROKEN RAIL — minting a critical repair packet, dragging
// rail_reliability down, and forcing the autonomy status to "blocked". That is
// wrong: a temporarily-exhausted actor is not a defect. The correct behavior is to
// QUEUE the work until the window resets and let Hermes do other safe work — with
// NO reliability penalty and NO false broken-rail packet.
//
// This module models actor availability + cost tiers and exposes the predicates the
// self-repair loop uses to DEFER (not repair) work owned by a temporarily-
// unavailable actor. It is PURE: it reads a small availability descriptor and a
// clock; it triggers nothing and never sends/calls/charges.
//
// COST-AWARE ROUTING: subscription/browser rails are PRIMARY (already paid for);
// the metered API rail is FALLBACK ONLY when budget exists or Jonathan approved.
// preferredActorOrder() encodes that so routing saves money by default.

function clean(value) {
  return String(value ?? "").trim();
}
function lower(value) {
  return clean(value).toLowerCase();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

// Cost tiers, cheapest-first. Subscription + browser are already paid; api is
// metered (spend money) and local is free but capacity-limited.
export const ACTOR_COST_TIERS = {
  Cowork: "subscription",
  "Claude browser": "browser",
  "Opus browser": "browser",
  Codex: "subscription",
  Hermes: "local",
  "Hermes API": "api",
  API: "api",
  Morgan: "metered_calls",
  Retell: "metered_calls",
};

// Routing preference: cheapest capable rail first. API is fallback only.
export const PREFERRED_ACTOR_ORDER = ["Hermes", "Cowork", "Codex", "Claude browser", "Opus browser", "Hermes API", "API"];

// Availability states that are TEMPORARY (queue-until-reset), NOT defects.
export const TEMPORARY_UNAVAILABLE_STATES = new Set([
  "credit_exhausted",
  "window_cooldown",
  "rate_limited",
  "budget_exhausted",
  "quota_reset_pending",
]);

/**
 * Normalize a raw availability descriptor into a per-actor map. Accepts either a
 * map { actorName: { state, resets_at, ... } } or an array of { actor, state, ... }.
 * Unknown/empty input → {} (everyone implicitly available). Pure.
 */
export function normalizeAvailability(raw) {
  const out = {};
  if (Array.isArray(raw)) {
    for (const a of raw) {
      const name = clean(a.actor) || clean(a.name);
      if (name) out[name] = { ...a };
    }
  } else if (raw && typeof raw === "object") {
    for (const [name, v] of Object.entries(raw)) {
      if (clean(name)) out[clean(name)] = typeof v === "object" && v ? { ...v } : { state: clean(v) };
    }
  }
  return out;
}

/**
 * Resolve an actor's current availability against the clock. A window with a
 * `resets_at` in the PAST is considered recovered (available again). Returns
 * { available, temporary, state, reason, resets_at, cost_tier }.
 */
export function resolveActorAvailability(actor, availabilityMap = {}, now = new Date().toISOString()) {
  const name = clean(actor);
  const entry = normalizeAvailability(availabilityMap)[name] || {};
  const state = lower(entry.state);
  const cost_tier = clean(entry.cost_tier) || ACTOR_COST_TIERS[name] || "unknown";
  const resets_at = clean(entry.resets_at);

  // A reset time in the past means the window has elapsed → available again.
  if (resets_at) {
    const resetMs = Date.parse(resets_at);
    if (Number.isFinite(resetMs) && resetMs <= Date.parse(now)) {
      return { available: true, temporary: false, state: "recovered", reason: "window reset elapsed", resets_at: "", cost_tier };
    }
  }

  if (!state || state === "available") {
    return { available: true, temporary: false, state: "available", reason: "", resets_at: "", cost_tier };
  }
  if (TEMPORARY_UNAVAILABLE_STATES.has(state)) {
    return { available: false, temporary: true, state, reason: clean(entry.reason) || `${name} ${state}`, resets_at, cost_tier };
  }
  // Any other non-available state (e.g. "disabled", "broken") is NOT temporary —
  // that genuinely is a defect the repair loop should still handle.
  return { available: false, temporary: false, state, reason: clean(entry.reason) || `${name} ${state}`, resets_at, cost_tier };
}

/**
 * True when the actor is TEMPORARILY unavailable (credit/window/rate/budget). Such
 * work should be QUEUED until reset, never converted into a broken-rail packet.
 */
export function isTemporarilyUnavailable(actor, availabilityMap = {}, now = new Date().toISOString()) {
  return resolveActorAvailability(actor, availabilityMap, now).temporary === true;
}

/**
 * Cost-aware routing: given the actors that could do a task and the current
 * availability, return the cheapest AVAILABLE actor (subscription/browser before
 * api). API/metered rails are only chosen when no cheaper rail is available AND
 * `options.apiBudgetAvailable` (or Jonathan approval) is set. Returns null when
 * nothing is available right now (→ queue the task).
 */
export function chooseActor(candidates = [], availabilityMap = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const map = normalizeAvailability(availabilityMap);
  const pool = asArray(candidates).length ? asArray(candidates).map(clean) : [...PREFERRED_ACTOR_ORDER];
  // Order by preference (cheapest-first), keeping unknown actors last.
  const ranked = pool.slice().sort((a, b) => {
    const ia = PREFERRED_ACTOR_ORDER.indexOf(a);
    const ib = PREFERRED_ACTOR_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const apiOk = Boolean(options.apiBudgetAvailable) || Boolean(options.jonathanApproved);
  for (const actor of ranked) {
    const tier = clean(map[actor]?.cost_tier) || ACTOR_COST_TIERS[actor] || "unknown";
    if ((tier === "api" || tier === "metered_calls") && !apiOk) continue; // fallback only
    if (resolveActorAvailability(actor, map, now).available) return actor;
  }
  return null;
}
