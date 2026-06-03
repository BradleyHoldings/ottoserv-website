// ─── Hermes headless orchestrator (Autonomy v2, milestone 4) ──────────────────
//
// THE GAP THIS FILLS
// All the pieces exist — state read, learning-weighted selector, scorecard,
// operating ledger — but nothing RUNS them together on a schedule. "Hermes runs
// OttoServ day after day" requires one heartbeat that, each cycle:
//   sense (load state + memory) → decide (learning-weighted next actions) →
//   score (autonomy scorecard) → record (write events to the ledger) →
//   persist (publish the cycle so actors/dashboard/Hermes read what to do next).
//
// This module is that heartbeat. It COMPOSES the existing modules (no rebuild, no
// parallel store) and persists the cycle via the existing revenue_engine_state
// store under a separate row id ("operating_cycle") plus a local mirror.
//
// SAFETY: it reads, decides, records, and publishes proposals only. It triggers
// NO outreach/calls/emails/payments/n8n/deploys and executes no task — every
// action it emits is a proposal that keeps its approval gate. Best-effort
// persistence no-ops cleanly when unconfigured.

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveRevenueEngineDir } from "./revenueEngineReadAdapter.mjs";
import { loadRevenueDocument } from "./actorEvidenceIntake.mjs";
import { loadOperatingLedger, summarizeLedger, recordLedgerEvents, entriesFromNextActions, entriesFromRepairPackets } from "./hermesOperatingLedger.mjs";
import { selectNextActionsWithLearning } from "./hermesLearningWeights.mjs";
import { computeScorecard } from "./hermesAutonomyScorecard.mjs";
import { upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";

export const CYCLE_ROW_ID = "operating_cycle";
export const CYCLE_FILE = "operating-cycle.json";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readJsonSafe(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

// Resolve the lead-intent signal files (best-effort; absent → null, not fatal).
async function senseLeadSignals(options) {
  const cwd = options.cwd || process.cwd();
  const leadsPath = options.leadsPath || process.env.LEADS_PATH || path.join(cwd, "data", "call-imports", "leads.json");
  const liDir = options.leadIntentDir || process.env.LEAD_INTENT_OUTPUT_DIR || path.join(cwd, "data", "lead-intent");
  const [leadsRaw, pipeline, ingestReport] = await Promise.all([
    readJsonSafe(leadsPath),
    readJsonSafe(path.join(liDir, "pipeline.json")),
    readJsonSafe(path.join(liDir, "ingest-report.json")),
  ]);
  return { leads: asArray(leadsRaw), pipeline, ingestReport };
}

/**
 * Run one operating cycle. Returns the full cycle result; also persists it.
 *
 * @param {object} options {
 *   now?, cwd?, dataDir?, leadsPath?, leadIntentDir?,
 *   state? { document, leads, pipeline, ingestReport } // inject to skip disk,
 *   persistSupabase?, writeLocal?, recordLedger?
 * }
 */
export async function runOperatingCycle(options = {}) {
  const now = options.now || new Date().toISOString();
  const injected = options.state || {};

  // 1. SENSE — current revenue document, lead signals, and operating memory.
  const loadedDoc = injected.document !== undefined
    ? { available: true, document: injected.document, source: { kind: "injected" } }
    : await loadRevenueDocument(options);
  const document = loadedDoc.document || {};

  const leadSignals = injected.leads !== undefined || injected.pipeline !== undefined || injected.ingestReport !== undefined
    ? { leads: asArray(injected.leads), pipeline: injected.pipeline || null, ingestReport: injected.ingestReport || null }
    : await senseLeadSignals(options);

  const ledger = await loadOperatingLedger(options);
  const ledgerSummary = summarizeLedger(ledger.entries);

  const senseState = {
    document,
    leads: leadSignals.leads,
    pipeline: leadSignals.pipeline,
    ingestReport: leadSignals.ingestReport,
    ledger: ledger.entries,
    ledgerSummary,
    now,
  };

  // 2. DECIDE — learning-weighted next actions.
  const decided = selectNextActionsWithLearning(senseState, { now });

  // 3. SCORE — autonomy scorecard for this cycle.
  const scorecard = computeScorecard(senseState, { now });

  // 4. RECORD — write proposed actions + rail state into the operating ledger.
  let recorded = { added: 0, total: ledger.entries.length };
  if (options.recordLedger !== false) {
    const events = [
      ...entriesFromNextActions(decided, { now }),
      ...entriesFromRepairPackets(asArray(document.repairPackets), { now }),
    ];
    recorded = await recordLedgerEvents(events, { ...options, now });
  }

  // 5. PERSIST — publish the cycle so actors/dashboard/Hermes read what to do next.
  const cycle = {
    id: CYCLE_ROW_ID,
    generated_at: now,
    autonomy_status: scorecard.autonomy_status,
    autonomy_score: scorecard.autonomy_score,
    grades: scorecard.grades,
    top_blockers: scorecard.top_blockers,
    next_actions: decided.actions,
    next_actions_by_priority: decided.by_priority,
    scorecard,
    sense: {
      document_source: loadedDoc.source?.kind || "none",
      leads: leadSignals.leads.length,
      ledger_entries: ledger.entries.length,
    },
    ledger_recorded: { added: recorded.added, total: recorded.total },
  };

  let local_written = false;
  if (options.writeLocal !== false) {
    const file = path.join(resolveRevenueEngineDir(options), CYCLE_FILE);
    try {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, `${JSON.stringify(cycle, null, 2)}\n`, "utf8");
      local_written = true;
    } catch {
      // non-fatal
    }
  }

  let supabase = { ok: false, skipped: true, reason: "disabled" };
  if (options.persistSupabase !== false) {
    supabase = await upsertRevenueState(cycle, { id: CYCLE_ROW_ID });
  }

  return {
    ok: true,
    cycle,
    summary: {
      autonomy_status: scorecard.autonomy_status,
      autonomy_score: scorecard.autonomy_score,
      next_actions: decided.actions.length,
      top_action: decided.actions[0] ? { action_type: decided.actions[0].action_type, actor: decided.actions[0].actor, priority: decided.actions[0].priority } : null,
      blockers: scorecard.top_blockers.length,
      ledger_added: recorded.added,
      persisted: { local: local_written, supabase },
    },
  };
}
