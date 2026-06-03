// ─── Hermes multi-day goal planner (Autonomy v2, milestone 3) ─────────────────
//
// THE GAP THIS FILLS
// The scorecard says how Hermes is doing RIGHT NOW; the ledger remembers the
// past. Neither sets a target or tracks progress toward it over days/weeks. To
// "run the company," Hermes needs operating goals (daily/weekly), measured
// against real outcomes, that persist across cycles so it can tell on-track from
// at-risk and keep itself pointed at growth/delivery/repair.
//
// This module derives goals from current state + gaps, reconciles them with the
// goals already in flight (so a Monday goal is tracked all week), measures each
// against the autonomy scorecard, and persists via the existing
// revenue_engine_state store under a separate row id ("operating_goals"). It
// COMPOSES the scorecard (no rebuild, no parallel store).
//
// SAFETY: planning + measurement only. It sets no external action and keeps every
// downstream action approval-gated; it just defines what "good" looks like and
// whether Hermes is hitting it.

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveRevenueEngineDir } from "./revenueEngineReadAdapter.mjs";
import { readRevenueState, upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";
import { computeScorecard } from "./hermesAutonomyScorecard.mjs";

export const GOALS_ROW_ID = "operating_goals";
export const GOALS_FILE = "operating-goals.json";

// Default operating targets. Override via options.targets.
export const DEFAULT_TARGETS = {
  high_intent_leads_weekly: 5, // refill the acquisition top of funnel
  tasks_completed_weekly: 5, // close approved work with evidence
  evidence_rate: 0.8, // evidence discipline
  open_repairs: 0, // keep rails healthy
  work_orders_advanced_weekly: 1, // move service delivery forward
};

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function round(n, d = 3) {
  return Number.isFinite(n) ? Number(n.toFixed(d)) : null;
}

// ISO week key (e.g. 2026-W23) for weekly-horizon goal identity.
export function isoWeekKey(iso) {
  const d = new Date(iso);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function periodKey(horizon, now) {
  return horizon === "weekly" ? isoWeekKey(now) : now.slice(0, 10);
}

function goalStatus(direction, current, target, scorecardBlocked) {
  if (current == null) return "unknown";
  if (direction === "reduce") {
    if (current <= target) return "met";
    return scorecardBlocked ? "blocked" : "at_risk";
  }
  // increase
  if (current >= target) return "met";
  const progress = target > 0 ? current / target : 0;
  if (scorecardBlocked && progress < 1) return "blocked";
  if (progress < 0.5) return "at_risk";
  return "on_track";
}

function progressFor(direction, current, target) {
  if (current == null) return null;
  if (direction === "reduce") return current <= target ? 1 : 0;
  return target > 0 ? round(Math.min(1, current / target)) : (current > 0 ? 1 : 0);
}

/**
 * Derive candidate operating goals from current state. Pure. Each goal's `current`
 * is measured from the autonomy scorecard + lead signals.
 */
export function deriveGoals(state = {}, options = {}) {
  const now = state.now || options.now || new Date().toISOString();
  const targets = { ...DEFAULT_TARGETS, ...(options.targets || {}) };
  const scorecard = state.scorecard || computeScorecard(state, { now });
  const blocked = scorecard.autonomy_status === "blocked";

  const dims = scorecard.dimensions || {};
  const highIntent = Number(dims.lead_pipeline?.a_tier || 0) + Number(state.pipeline?.summary?.high_intent_30d || 0);
  const tasksCompleted = Number(dims.execution?.completed || 0);
  const evidenceRate = dims.execution?.evidence_rate;
  const openRepairs = Number(dims.repair?.open_repairs || 0);
  const woAdvanced = Number(dims.service_delivery?.ready_for_build || 0);

  const specs = [
    { metric: "high_intent_leads", horizon: "weekly", direction: "increase", target: targets.high_intent_leads_weekly, current: highIntent, dimension: "lead_pipeline", owner: "Cowork", hint: "Dispatch lead research / ingest results to refill recent-intent leads." },
    { metric: "tasks_completed", horizon: "weekly", direction: "increase", target: targets.tasks_completed_weekly, current: tasksCompleted, dimension: "execution", owner: "Hermes", hint: "Drive approved tasks to evidence-backed completion." },
    { metric: "evidence_rate", horizon: "weekly", direction: "increase", target: targets.evidence_rate, current: evidenceRate, dimension: "execution", owner: "Hermes", hint: "Collect evidence on every evidence-required task." },
    { metric: "open_repairs", horizon: "daily", direction: "reduce", target: targets.open_repairs, current: openRepairs, dimension: "repair", owner: "Codex", hint: "Repair broken rails before scaling volume." },
    { metric: "work_orders_advanced", horizon: "weekly", direction: "increase", target: targets.work_orders_advanced_weekly, current: woAdvanced, dimension: "service_delivery", owner: "Codex", hint: "Advance approved work orders into build packets." },
  ];

  return specs.map((s) => {
    const period = periodKey(s.horizon, now);
    return {
      goal_id: `goal-${s.metric}-${period}`,
      metric: s.metric,
      horizon: s.horizon,
      period,
      direction: s.direction,
      target: s.target,
      current: s.current ?? null,
      progress: progressFor(s.direction, s.current ?? null, s.target),
      status: goalStatus(s.direction, s.current ?? null, s.target, blocked),
      dimension: s.dimension,
      owner: s.owner,
      next_action_hint: s.hint,
      created_at: now,
      updated_at: now,
    };
  });
}

/**
 * Reconcile freshly-derived goals with the goals already in flight: existing
 * goals (same goal_id) keep their created_at but take the new measurement;
 * new-period goals are added. Pure.
 */
export function reconcileGoals(existing = [], candidates = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const byId = new Map(asArray(existing).map((g) => [clean(g.goal_id), g]));
  const out = [];
  for (const c of asArray(candidates)) {
    const prior = byId.get(c.goal_id);
    out.push(prior ? { ...prior, current: c.current, progress: c.progress, status: c.status, target: c.target, next_action_hint: c.next_action_hint, updated_at: now } : c);
    byId.delete(c.goal_id);
  }
  // Carry forward any still-relevant prior goals not re-derived this run (e.g. a
  // weekly goal measured on a day with no matching candidate) — keep recent ones.
  for (const leftover of byId.values()) out.push(leftover);
  return out;
}

function summarizeGoals(goals) {
  const by_status = {};
  for (const g of goals) by_status[g.status] = (by_status[g.status] || 0) + 1;
  const met = by_status.met || 0;
  return { total: goals.length, by_status, attainment: goals.length ? round(met / goals.length) : null };
}

// ─── Persistence (existing store, separate row id) ────────────────────────────

function goalsFilePath(options = {}) {
  return path.join(resolveRevenueEngineDir(options), GOALS_FILE);
}

export async function loadGoals(options = {}) {
  try {
    const parsed = JSON.parse(await fs.readFile(goalsFilePath(options), "utf8"));
    return asArray(parsed.goals);
  } catch {
    const remote = await readRevenueState({ id: GOALS_ROW_ID });
    return remote && remote.document ? asArray(remote.document.goals) : [];
  }
}

/**
 * Plan: derive goals from state, reconcile with goals in flight, persist, and
 * return the goal set + summary. Best-effort persistence (no-op unconfigured).
 */
export async function runGoalPlanning(state = {}, options = {}) {
  const now = state.now || options.now || new Date().toISOString();
  const candidates = deriveGoals(state, options);
  const existing = options.existingGoals !== undefined ? asArray(options.existingGoals) : await loadGoals(options);
  const goals = reconcileGoals(existing, candidates, { now });
  const summary = summarizeGoals(goals);
  const document = { id: GOALS_ROW_ID, generated_at: now, goals, summary, schema_version: "1.0" };

  let local_written = false;
  if (options.writeLocal !== false) {
    try {
      const file = goalsFilePath(options);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, `${JSON.stringify(document, null, 2)}\n`, "utf8");
      local_written = true;
    } catch {
      // non-fatal
    }
  }
  let supabase = { ok: false, skipped: true, reason: "disabled" };
  if (options.persistSupabase !== false) supabase = await upsertRevenueState(document, { id: GOALS_ROW_ID });

  return { ok: true, goals, summary, persisted: { local: local_written, supabase } };
}
