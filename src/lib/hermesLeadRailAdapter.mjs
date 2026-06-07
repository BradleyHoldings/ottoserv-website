// ─── Hermes lead rail adapter ─────────────────────────────────────────────────
//
// Wires the canonical `lead_intake_enrichment` operation into the durable
// execution-truth system used by Phase 0. Hermes requests and monitors a
// lead-rail run through this adapter only — it never calls the pipeline directly.
//
// Guarantees:
//   - One durable task per correlation_id (duplicate requests → idempotent noop).
//   - Every stage has a receipt before the run can be called completed.
//   - Restart recovery: a resumed run reuses the existing task and skips already-
//     completed stages.
//   - Watchdog: stalled stages are detected and reported.
//   - No transport: Phase 1 ends at eligibility + packet preparation.
//   - No fabricated receipts: the adapter cannot manufacture completion evidence.
//   - Supabase persistence is required for `completed`; without it the result is
//     `partially_completed/supabase_not_configured`.

import { runLeadIntakeEnrichment, LEAD_INTAKE_OPERATION, REQUIRED_STAGES } from "./leadRail/pipeline.mjs";
import { describeRailConfig, readRailConfig, assertNoLocalAuthorityInProduction, CONFIG_STATE } from "./leadRail/config.mjs";
import { detectStalledEnrichment } from "./leadRail/enrichment.mjs";
import { loadAllTasks } from "./execution/taskLifecycle.mjs";

export { LEAD_INTAKE_OPERATION, REQUIRED_STAGES };

const STALL_THRESHOLD_MINUTES = 60; // a stage with no progress after 60m is flagged

function clean(v) {
  return String(v ?? "").trim();
}

/**
 * Request a lead-rail run for a source. Hermes calls this once per source;
 * duplicate calls with the same correlation_id are idempotent.
 *
 * @param {object} request {
 *   rows: object[],
 *   source: { source_url?, source_type?, label? },
 *   mode: "dry" | "internal",
 *   correlation_id?: string,
 *   now?: string,
 *   existingRecords?: object[],
 *   existingEnrichmentTasks?: object[],
 * }
 * @param {object} options {
 *   tasksDir?, dataDir?,
 *   store?: { client?, config?, fetchImpl? },
 *   skipLocal?, skipStoreRead?, dnc?, blacklist?
 * }
 *
 * @returns {Promise<object>} Adapter result with truthful final_status, receipts,
 *   config_report, and no_transport: true.
 */
export async function requestLeadRailRun(request = {}, options = {}) {
  const now = request.now || new Date().toISOString();
  const config = readRailConfig();
  const config_report = describeRailConfig();

  // In production/internal mode: block if Supabase is not configured.
  // In dry mode: allow to proceed (will produce persistence_pending truthfully).
  if (clean(request.mode) === "internal") {
    try {
      assertNoLocalAuthorityInProduction(config);
    } catch (err) {
      return {
        ok: false,
        final_status: "blocked",
        reason: "production_local_authority_blocked",
        detail: err.message,
        config_report,
        no_transport: true,
        receipts: {},
      };
    }
  }

  // Run the canonical pipeline. It handles idempotency, durable tasks, receipts.
  const result = await runLeadIntakeEnrichment(
    { ...request, now },
    options
  );

  return {
    ...result,
    config_report,
    adapter_version: "hermes_lead_rail_adapter.v1",
  };
}

/**
 * Monitor an in-flight or completed lead-rail run by correlation_id. Returns the
 * current task state and receipts without executing anything. Watchdog alerts are
 * included for any stalled enrichment tasks.
 *
 * @param {string} correlation_id
 * @param {object} options { tasksDir?, enrichmentTasks?: object[], now? }
 * @returns {Promise<object>} { found, task, receipts, stage_status, watchdog, config_report }
 */
export async function monitorLeadRailRun(correlation_id, options = {}) {
  const now = options.now || new Date().toISOString();
  const config_report = describeRailConfig();

  const all = await loadAllTasks(options).catch(() => []);
  const task = all.find(
    (t) => clean(t.operation_type) === LEAD_INTAKE_OPERATION && clean(t.correlation_id) === clean(correlation_id)
  ) || null;

  if (!task) {
    return {
      found: false,
      correlation_id,
      task: null,
      receipts: null,
      stage_status: {},
      watchdog: { alerts: [] },
      config_report,
    };
  }

  const receipts = task.payload?.phase1_receipts || {};
  const stage_status = {};
  for (const stage of REQUIRED_STAGES) {
    stage_status[stage] = receipts[stage] ? "receipted" : "missing";
  }

  // Watchdog: detect stalled enrichment tasks if provided.
  const enrichmentTasks = Array.isArray(options.enrichmentTasks) ? options.enrichmentTasks : [];
  const watchdog = detectStalledEnrichment(enrichmentTasks, { now, stallMinutes: STALL_THRESHOLD_MINUTES });

  return {
    found: true,
    correlation_id,
    task,
    task_state: clean(task.state),
    receipts,
    stage_status,
    all_required_receipts: REQUIRED_STAGES.every((s) => receipts[s]),
    summary: task.payload?.phase1_summary || null,
    watchdog,
    config_report,
  };
}

/**
 * Check whether a duplicate run request is being submitted. Returns true when an
 * existing task with this correlation_id is already at or past `running` state.
 * Hermes MUST call this before submitting a new run to avoid duplicates.
 */
export async function isDuplicateRunRequest(correlation_id, options = {}) {
  const all = await loadAllTasks(options).catch(() => []);
  const existing = all.find(
    (t) => clean(t.operation_type) === LEAD_INTAKE_OPERATION && clean(t.correlation_id) === clean(correlation_id)
  );
  if (!existing) return false;
  const terminal = new Set(["running", "partially_completed", "completed", "failed", "cancelled"]);
  return terminal.has(clean(existing.state));
}
