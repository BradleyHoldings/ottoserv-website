// ─── Phase 1 lead rail: the one authoritative orchestrator ────────────────────
//
// Drives a source end to end:
//   intake → normalize → identity → validate/quarantine → dedupe/reconcile →
//   score → policy eligibility → enrich-or-queue → upsert to Supabase
//   hermes_pipeline → execution-truth receipts → truthful partial/complete status.
//
// It is wired into the durable task lifecycle as operation `lead_intake_enrichment`
// and emits a machine-verifiable RECEIPT per stage. Final status is `completed`
// ONLY when every required stage has a receipt and persistence is confirmed;
// otherwise it is truthfully `partially_completed` or `blocked`. It connects to NO
// transport — Phase 1 ends at outreach eligibility + packet preparation.
//
// Idempotent + restart-safe: a repeated run of the same source reuses the same
// durable task (by correlation id), re-derives the same deterministic lead ids, and
// reconciles (updates) rather than duplicating.

import { createHash } from "node:crypto";

import { createTask, transition, saveTask, loadAllTasks } from "../execution/taskLifecycle.mjs";
import { normalizeRow } from "./normalize.mjs";
import { validateLead, RECORD_STATUS } from "./validate.mjs";
import { scoreLead, SCORING_VERSION } from "./score.mjs";
import { classifyEligibility, ELIGIBILITY, ENRICHMENT_STATUS } from "./eligibility.mjs";
import { buildCanonicalLead, LEAD_SCHEMA_VERSION } from "./schema.mjs";
import { dedupeAndReconcile } from "./dedupe.mjs";
import { reconcileEnrichmentTasks, needsEnrichment, ENRICH_TASK_TYPE } from "./enrichment.mjs";
import { upsertLeads, readAllLeads, writeCache, writeQuarantine, PERSISTENCE } from "./store.mjs";

export const LEAD_INTAKE_OPERATION = "lead_intake_enrichment";

// Stages that MUST have a receipt before a run may be called completed.
export const REQUIRED_STAGES = ["intake", "validation", "dedupe", "scoring", "policy", "enrichment", "persistence"];

function clean(v) {
  return String(v ?? "").trim();
}
function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function sourceHash(rows, sourceMeta) {
  const h = createHash("sha256");
  h.update(JSON.stringify({ rows, source_url: clean(sourceMeta?.source_url), source_type: clean(sourceMeta?.source_type) }));
  return h.digest("hex");
}

/**
 * Run Phase-1 intake + enrichment for one source.
 *
 * @param {object} input {
 *   rows: object[],                  // already-parsed source rows
 *   source: { source_url?, source_type?, label? },
 *   mode: "dry" | "internal",        // never "live": Phase 1 has no transport
 *   existingRecords?: object[],      // canonical leads to dedupe against (else store read)
 *   existingEnrichmentTasks?: object[],
 *   now?, correlation_id?
 * }
 * @param {object} options {
 *   tasksDir?, dataDir?, store?:{ client?, config?, fetchImpl? }, skipLocal?,
 *   skipStoreRead?, dnc?, blacklist?
 * }
 */
export async function runLeadIntakeEnrichment(input = {}, options = {}) {
  const now = input.now || new Date().toISOString();
  const rows = asArray(input.rows);
  const source = input.source || {};
  const mode = clean(input.mode) === "internal" ? "internal" : "dry";
  const file_hash = sourceHash(rows, source);
  const correlation_id = clean(input.correlation_id) || `lead-src-${file_hash.slice(0, 16)}`;

  const receipts = {};
  const stageReceipt = (stage, payload) => {
    receipts[stage] = { stage, generated_at: now, ...payload };
    return receipts[stage];
  };

  // ── Durable task: reuse existing (idempotent / restart recovery) or create ──
  const all = await loadAllTasks(options).catch(() => []);
  let task = all.find((t) => clean(t.operation_type) === LEAD_INTAKE_OPERATION && clean(t.correlation_id) === correlation_id) || null;
  const resumed = Boolean(task);
  if (task && clean(task.state) === "completed") {
    return {
      ok: true, idempotent: true, resumed: true, task,
      correlation_id, file_hash,
      final_status: "completed",
      summary: task.payload?.phase1_summary || null,
      receipts: task.payload?.phase1_receipts || null,
      message: "Source already processed to completion — no duplicate leads/tasks created.",
    };
  }
  if (!task) {
    task = createTask({ operation_type: LEAD_INTAKE_OPERATION, correlation_id, actor: "Hermes", payload: { mode, file_hash, source_label: clean(source.label) }, now });
    await saveTask(task, options);
  }

  // ── Stage 1: INTAKE ──────────────────────────────────────────────────────────
  stageReceipt("intake", { file_hash, rows_parsed: rows.length, source_type: clean(source.source_type) || "import", source_url: clean(source.source_url), mode });
  if (rows.length === 0) {
    task = await advance(task, "blocked", { now, reason: "intake_empty:no rows parsed", next_action: "provide a non-empty source" }, options);
    return finalize(task, "blocked", receipts, { records: [], quarantined: [], enrichment: [] }, options, now, { reason: "no_rows" });
  }

  // ── Stage 2: NORMALIZE + IDENTITY + VALIDATE ─────────────────────────────────
  const accepted = [];
  const quarantined = [];
  for (const row of rows) {
    const { normalized, scoringInput } = normalizeRow(row, { now, importedAt: now });
    const validation = validateLead(normalized, { now });
    if (validation.record_status === RECORD_STATUS.ACCEPTED) {
      const scored = scoreLead(scoringInput, { now });
      const policy = classifyEligibility({ record_status: validation.record_status, contact_validation: validation.contact_validation, fit_validation: validation.fit_validation, score: scored }, { dnc: options.dnc, blacklist: options.blacklist });
      accepted.push(buildCanonicalLead({ normalized, validation, scored, policy, now }));
    } else {
      // Quarantined/rejected: still score for context, but no policy promotion.
      const scored = scoreLead(scoringInput, { now });
      const policy = classifyEligibility({ record_status: validation.record_status, contact_validation: validation.contact_validation, fit_validation: validation.fit_validation, score: scored });
      quarantined.push(buildCanonicalLead({ normalized, validation, scored, policy, now }));
    }
  }
  stageReceipt("validation", {
    accepted: accepted.length,
    quarantined: quarantined.filter((q) => q.record_status === RECORD_STATUS.QUARANTINED).length,
    rejected: quarantined.filter((q) => q.record_status === RECORD_STATUS.REJECTED).length,
    validation_version: "v1",
  });

  // ── Stage 3: DEDUPE / RECONCILE (within file + against store) ─────────────────
  let existing = asArray(input.existingRecords);
  if (!existing.length && !options.skipStoreRead) {
    existing = await readAllLeads(options.store || {}).catch(() => []);
  }
  const dedupe = dedupeAndReconcile(accepted, existing, { now });
  stageReceipt("dedupe", { new: dedupe.stats.new, updated: dedupe.stats.updated, duplicates: dedupe.stats.duplicates, stale_skipped: dedupe.stats.stale_skipped, aliases: dedupe.aliases.length });

  // ── Stage 4: SCORING receipt (already computed; record version) ──────────────
  stageReceipt("scoring", {
    scored: dedupe.upserts.length,
    scoring_version: SCORING_VERSION,
    by_tier: countBy(dedupe.upserts, "tier"),
  });

  // ── Stage 5: POLICY eligibility receipt ──────────────────────────────────────
  stageReceipt("policy", { by_eligibility: countBy(dedupe.upserts, "eligibility"), schema_version: LEAD_SCHEMA_VERSION });

  // ── Stage 6: ENRICHMENT (queue per-lead; truthful blocked, no fake worker) ───
  const enrichTargets = dedupe.upserts.filter((l) => needsEnrichment(l) || l.eligibility === ELIGIBILITY.ENRICH);
  const priorTasks = asArray(input.existingEnrichmentTasks);
  const enrich = reconcileEnrichmentTasks(enrichTargets, priorTasks, { now });
  const enrichmentCompleted = enrich.tasks.filter((t) => t.status === ENRICHMENT_STATUS.COMPLETED).length;
  const enrichmentBlocked = enrich.tasks.filter((t) => t.status === ENRICHMENT_STATUS.BLOCKED).length;
  stageReceipt("enrichment", {
    task_type: ENRICH_TASK_TYPE,
    queued: enrich.queued, refreshed: enrich.refreshed, retried: enrich.retried,
    completed: enrichmentCompleted, blocked: enrichmentBlocked,
    actor: "Cowork",
    worker_automated: false, // honest: no automated Cowork worker exists in Phase 1
    note: enrichTargets.length && !enrichmentCompleted ? "enrichment QUEUED — not proof of success; awaiting Cowork actor result" : "no enrichment required",
  });

  // ── Drive lifecycle to running (with required receipts) ──────────────────────
  task = await driveToRunning(task, { now, file_hash, correlation_id }, options);

  // ── Stage 7: PERSISTENCE to canonical Supabase store ─────────────────────────
  const persistence = await upsertLeads(dedupe.upserts, { ...(options.store || {}), now });
  stageReceipt("persistence", {
    configured: persistence.configured,
    attempted: dedupe.upserts.length,
    persisted: persistence.persisted,
    pending: persistence.pending,
    conflicts: persistence.conflicts || 0,
    stale: persistence.stale || 0,
    read_back_ids: persistence.results.filter((r) => r.status === PERSISTENCE.PERSISTED).map((r) => r.read_back_id),
    reason: persistence.reason || (persistence.ok ? "persisted_and_verified" : "persistence_pending"),
  });

  // Local write-through cache + quarantine artifact (NOT a source of truth).
  let local = { cache: null, quarantine: null };
  if (!options.skipLocal) {
    try {
      local.cache = await writeCache(dedupe.all, { dataDir: options.dataDir, now });
      if (quarantined.length) local.quarantine = await writeQuarantine(quarantined, { dataDir: options.dataDir, now });
    } catch (err) {
      stageReceipt("local_cache", { ok: false, error: clean(err?.message) });
    }
  }

  // ── Final state: completed only with all receipts + confirmed persistence ────
  const allReceipts = REQUIRED_STAGES.every((s) => receipts[s]);
  const persistenceOk = persistence.configured && persistence.pending === 0 && (persistence.conflicts || 0) === 0;
  const nothingToPersist = dedupe.upserts.length === 0;
  let finalState;
  let reason;
  if (!allReceipts) {
    finalState = "partially_completed";
    reason = "missing_stage_receipts";
  } else if (persistenceOk || nothingToPersist) {
    finalState = "completed";
    reason = nothingToPersist ? "no_accepted_records_to_persist" : "persisted_and_verified";
  } else {
    finalState = "partially_completed";
    reason = persistence.configured ? "persistence_pending" : "supabase_not_configured";
  }

  task = await advance(task, finalState, {
    now,
    evidence: finalState === "completed"
      ? { kind: "receipt", source: "rail", completion_evidence_ref: `phase1:${file_hash.slice(0, 16)}:persisted=${persistence.persisted}` }
      : { kind: "receipt", source: "rail", stage_evidence_ref: `phase1:${file_hash.slice(0, 16)}:reason=${reason}` },
    reason: `phase1_${finalState}:${reason}`,
    next_action: finalState === "completed" ? "prepare eligible packets (no transport)" : nextActionFor(reason),
  }, options);

  const summary = buildSummary({ rows, accepted, quarantined, dedupe, persistence, enrich, mode, finalState, reason, file_hash });
  // Persist summary + receipts onto the task for idempotent re-reads.
  task = { ...task, payload: { ...task.payload, phase1_summary: summary, phase1_receipts: receipts } };
  await saveTask(task, options);

  return {
    ok: finalState === "completed",
    idempotent: false,
    resumed,
    task,
    correlation_id,
    file_hash,
    final_status: finalState,
    reason,
    receipts,
    summary,
    records: dedupe.all,
    upserts: dedupe.upserts,
    quarantined,
    enrichment_tasks: enrich.tasks,
    persistence,
    local,
    no_transport: true,
  };
}

// ── lifecycle helpers ──────────────────────────────────────────────────────────

const HAPPY_PATH = ["requested", "approved", "submission_pending", "queued", "accepted_by_worker", "running"];

async function driveToRunning(task, ctx, options) {
  const receiptFor = {
    queued: { kind: "receipt", source: "rail", queue_record_id: task.task_id, db_row_id: task.task_id, persisted: true },
    accepted_by_worker: { kind: "receipt", source: "rail", worker_ack_id: `phase1_runner:${ctx.correlation_id}`, worker_id: "lead_rail_runner" },
    running: { kind: "receipt", source: "rail", run_id: `phase1:${ctx.file_hash.slice(0, 16)}`, heartbeat_at: ctx.now },
  };
  const state = clean(task.state);
  // Already at/after running (resume from a prior partial/complete run): the final
  // transition handles it — no re-driving through the happy path.
  if (state === "running" || state === "partially_completed" || state === "completed") return task;

  let begin = HAPPY_PATH.indexOf(state);
  if (begin === -1) {
    // Recover a blocked/retrying/failed task by re-submitting to the rail.
    task = await advance(task, "submission_pending", { now: ctx.now, reason: "resume: re-submitting to lead rail runner.", next_action: "obtain queue receipt" }, options);
    begin = HAPPY_PATH.indexOf("submission_pending");
  }
  for (let i = begin + 1; i < HAPPY_PATH.length; i += 1) {
    const to = HAPPY_PATH[i];
    const reason = {
      approved: "Phase-1 internal intake authorized by standing policy (no transport).",
      submission_pending: "Submitting to the lead rail runner.",
      queued: "Durable task row IS the queue record.",
      accepted_by_worker: "Lead rail runner accepted the task.",
      running: "Lead rail stages executing.",
    }[to];
    task = await advance(task, to, { now: ctx.now, reason, evidence: receiptFor[to], policy_ref: "standing_intake_policy", next_action: "run stages" }, options);
  }
  return task;
}

async function advance(task, to, ctx, options) {
  const res = transition(task, to, ctx);
  if (!res.ok) {
    // Surface the failure truthfully instead of pretending the state changed.
    const blocked = transition(task, "blocked", { now: ctx.now, reason: `transition_failed:${res.error}`, next_action: "diagnose" });
    const next = blocked.ok ? blocked.task : task;
    await saveTask(next, options);
    return next;
  }
  if (res.noop) return task;
  await saveTask(res.task, options);
  return res.task;
}

async function finalize(task, finalState, receipts, data, options, now, extra = {}) {
  const summary = { final_status: finalState, ...extra, receipts_present: Object.keys(receipts) };
  task = { ...task, payload: { ...task.payload, phase1_summary: summary, phase1_receipts: receipts } };
  await saveTask(task, options);
  return { ok: false, task, final_status: finalState, receipts, summary, records: data.records, quarantined: data.quarantined, no_transport: true, ...extra };
}

function nextActionFor(reason) {
  if (reason === "supabase_not_configured") return "configure SUPABASE_URL + SUPABASE_SERVICE_KEY, then re-run (idempotent).";
  if (reason === "persistence_pending") return "investigate Supabase write/read-back, then re-run (idempotent).";
  return "diagnose and re-run.";
}

function countBy(records, field) {
  const out = {};
  for (const r of records) { const k = clean(r[field]) || "unknown"; out[k] = (out[k] || 0) + 1; }
  return out;
}

function buildSummary(d) {
  return {
    file_hash: d.file_hash,
    mode: d.mode,
    rows_parsed: d.rows.length,
    accepted: d.accepted.length,
    quarantined: d.quarantined.filter((q) => q.record_status === RECORD_STATUS.QUARANTINED).length,
    rejected: d.quarantined.filter((q) => q.record_status === RECORD_STATUS.REJECTED).length,
    dedupe: d.dedupe.stats,
    by_tier: countBy(d.dedupe.upserts, "tier"),
    by_eligibility: countBy(d.dedupe.upserts, "eligibility"),
    enrichment: { queued: d.enrich.queued, retried: d.enrich.retried, blocked: d.enrich.tasks.filter((t) => t.status === ENRICHMENT_STATUS.BLOCKED).length },
    persistence: { configured: d.persistence.configured, persisted: d.persistence.persisted, pending: d.persistence.pending, conflicts: d.persistence.conflicts || 0 },
    final_status: d.finalState,
    reason: d.reason,
    no_transport: true,
  };
}
