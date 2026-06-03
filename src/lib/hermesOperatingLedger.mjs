// ─── Hermes operating ledger (Autonomy v2: persistent memory) ─────────────────
//
// THE GAP THIS FILLS (v2)
// Autonomy v1 closes one loop at a time from the LATEST state: the next-action
// selector, evidence write-back, and intake are all stateless snapshots. To run
// OttoServ day after day, Hermes needs MEMORY — an append-only record of what was
// proposed, dispatched, approved, evidenced, and how it turned out — so it can
// measure actor performance, rail reliability, and whether a chosen action
// actually worked, instead of re-deriving everything from scratch each run.
//
// This module is that memory. It is PURE for all event construction + learning,
// with a thin best-effort persistence path that REUSES the existing
// revenue_engine_state store under a separate row id ("operating_ledger") — no new
// table, no migration, no new infra. The local mirror lives in the already
// git-ignored data/revenue-engine/ runtime dir, so real client/contact data is
// never committed and PII is redacted on the way in.
//
// SAFETY: records only. It triggers no outreach, calls, emails, payments, n8n,
// deploys, or client-facing actions. It never advances a status or marks anything
// complete — it observes the loop that the v1 modules already drive.

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveRevenueEngineDir } from "./revenueEngineReadAdapter.mjs";
import { readRevenueState, upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";

export const LEDGER_ROW_ID = "operating_ledger";
export const LEDGER_FILE = "operating-ledger.json";
export const LEDGER_SCHEMA_VERSION = "1.0";
// Bound the file: keep the most recent N entries (chronological tail).
export const LEDGER_MAX_ENTRIES = 5000;

export const LEDGER_EVENT_TYPES = [
  "action_proposed",
  "action_dispatched",
  "approval_decided",
  "evidence_submitted",
  "status_changed",
  "outcome_recorded",
  "rail_broken",
  "rail_repaired",
];

const LEDGER_OUTCOMES = ["proposed", "dispatched", "pending", "success", "failure", "blocked"];

function clean(value) {
  return String(value ?? "").trim();
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function lower(value) {
  return clean(value).toLowerCase();
}

// djb2 — deterministic ids so the same event recorded twice collapses (idempotent).
function stableHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

// Redact PII from any free-text detail before it enters durable memory.
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;
function scrubText(value) {
  return clean(value)
    .replace(EMAIL_RE, "[redacted-email]")
    .replace(PHONE_RE, "[redacted-phone]")
    .slice(0, 400);
}

/**
 * Normalize one ledger event into the canonical entry. A deterministic entry_id
 * is derived from a stable dedupe key so re-recording the same event is a no-op.
 * Pure.
 */
export function makeLedgerEntry(input = {}, options = {}) {
  const now = clean(input.ts) || options.now || new Date().toISOString();
  const event_type = LEDGER_EVENT_TYPES.includes(clean(input.event_type)) ? clean(input.event_type) : "outcome_recorded";
  const source_id = clean(input.source_id);
  const action_id = clean(input.action_id);
  const disc = clean(input.dedupe_key) || clean(input.evidence_ref) || clean(input.to_status) || action_id || source_id || now;
  const entry_id = clean(input.entry_id) || `led-${stableHash(`${event_type}|${source_id}|${disc}`)}`;
  const outcome = LEDGER_OUTCOMES.includes(lower(input.outcome)) ? lower(input.outcome) : "proposed";

  return {
    entry_id,
    ts: now,
    event_type,
    source_type: clean(input.source_type),
    source_id,
    actor: clean(input.actor) || "Hermes",
    action_id,
    action_type: clean(input.action_type),
    risk_level: clean(input.risk_level) || "low",
    required_approval: Boolean(input.required_approval),
    approval_status: clean(input.approval_status) || "n/a",
    evidence_ref: scrubText(input.evidence_ref),
    outcome,
    to_status: clean(input.to_status),
    detail: scrubText(input.detail),
    next_action_id: clean(input.next_action_id),
    schema_version: LEDGER_SCHEMA_VERSION,
  };
}

/**
 * Build ledger entries from the next-action selector output. Each proposed action
 * becomes an `action_proposed` event (idempotent by the selector's stable
 * action_id). Pure.
 */
export function entriesFromNextActions(selectorOutput = {}, options = {}) {
  return asArray(selectorOutput.actions).map((a) =>
    makeLedgerEntry({
      event_type: "action_proposed",
      source_type: a.source_type,
      source_id: a.source_id,
      actor: a.actor,
      action_id: a.action_id,
      action_type: a.action_type,
      risk_level: a.risk_level,
      required_approval: a.required_approval,
      approval_status: a.required_approval ? "pending" : "n/a",
      outcome: "proposed",
      detail: a.reason,
      dedupe_key: a.action_id,
    }, options),
  );
}

/**
 * Build ledger entries from an actor evidence submission result (the return of
 * actorEvidenceIntake.submitActorEvidence, plus the task id). Produces an
 * `evidence_submitted` event and, when the status moved, a `status_changed` event
 * whose outcome reflects completion. Pure.
 */
export function entriesFromEvidenceResult(result = {}, context = {}, options = {}) {
  if (!result || result.ok !== true) return [];
  const taskId = clean(context.task_id) || clean(result.assigned_task_id);
  const actor = clean(context.actor) || "actor";
  const status = clean(result.status);
  const entries = [];

  entries.push(makeLedgerEntry({
    event_type: "evidence_submitted",
    source_type: "execution_task",
    source_id: taskId,
    actor,
    action_id: clean(context.action_id),
    evidence_ref: clean(result.evidence_id),
    outcome: result.changed ? "pending" : "dispatched",
    detail: clean(context.detail) || "Actor submitted evidence.",
    dedupe_key: clean(result.evidence_id),
  }, options));

  if (status) {
    const terminal = ["completed"].includes(status);
    entries.push(makeLedgerEntry({
      event_type: "status_changed",
      source_type: "execution_task",
      source_id: taskId,
      actor,
      to_status: status,
      outcome: terminal ? "success" : "pending",
      detail: `Lifecycle → ${status}.`,
      dedupe_key: `${taskId}|${status}`,
    }, options));
  }
  return entries;
}

/**
 * Build rail break/repair entries from repair packets (broken) and verified
 * repairs. Pure.
 */
export function entriesFromRepairPackets(packets = [], options = {}) {
  return asArray(packets).map((p) =>
    makeLedgerEntry({
      event_type: lower(p.status) === "verified" || lower(p.status) === "repaired" ? "rail_repaired" : "rail_broken",
      source_type: "repair_packet",
      source_id: clean(p.id) || clean(p.what_failed),
      actor: clean(p.owner) || "Hermes",
      outcome: lower(p.status) === "verified" || lower(p.status) === "repaired" ? "success" : "blocked",
      detail: clean(p.actual_behavior) || clean(p.category),
      dedupe_key: `${clean(p.id)}|${lower(p.status) || "open"}`,
    }, options),
  );
}

/**
 * Append new entries to existing ones, idempotently (dedupe by entry_id), keeping
 * chronological order and bounding to LEDGER_MAX_ENTRIES. Pure.
 */
export function appendLedgerEntries(existing = [], incoming = [], options = {}) {
  const max = Number(options.max || LEDGER_MAX_ENTRIES);
  const seen = new Set(asArray(existing).map((e) => clean(e.entry_id)));
  const merged = asArray(existing).slice();
  let added = 0;
  for (const entry of asArray(incoming)) {
    const id = clean(entry.entry_id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(entry);
    added += 1;
  }
  merged.sort((a, b) => clean(a.ts).localeCompare(clean(b.ts)));
  const bounded = merged.length > max ? merged.slice(merged.length - max) : merged;
  return { entries: bounded, added, total: bounded.length };
}

/**
 * Derive the learning view from the ledger: actor performance, rail reliability,
 * action-type outcomes, and approval throughput. Pure — this is what lets Hermes
 * improve instead of only reading latest state.
 */
export function summarizeLedger(entries = []) {
  const list = asArray(entries);
  const actors = {};
  const action_types = {};
  const rails = {};
  const by_event_type = {};
  const by_outcome = {};

  const actor = (name) => (actors[name] = actors[name] || { proposed: 0, evidence_submitted: 0, completed: 0, success: 0, failure: 0, blocked: 0 });
  const at = (name) => (action_types[name] = action_types[name] || { count: 0, success: 0, failure: 0, pending: 0 });

  let approvals_required = 0;
  let approvals_pending = 0;

  for (const e of list) {
    by_event_type[e.event_type] = (by_event_type[e.event_type] || 0) + 1;
    by_outcome[e.outcome] = (by_outcome[e.outcome] || 0) + 1;

    const A = actor(clean(e.actor) || "Hermes");
    if (e.event_type === "action_proposed") A.proposed += 1;
    if (e.event_type === "evidence_submitted") A.evidence_submitted += 1;
    if (e.event_type === "status_changed" && e.to_status === "completed") { A.completed += 1; A.success += 1; }
    if (e.outcome === "failure") A.failure += 1;
    if (e.outcome === "blocked") A.blocked += 1;

    if (e.action_type) {
      const T = at(e.action_type);
      T.count += 1;
      if (e.outcome === "success") T.success += 1;
      else if (e.outcome === "failure") T.failure += 1;
      else if (e.outcome === "pending" || e.outcome === "proposed") T.pending += 1;
    }

    if (e.source_type === "repair_packet" || e.source_type === "broken_rail") {
      const R = (rails[e.source_id] = rails[e.source_id] || { broken: 0, repaired: 0 });
      if (e.event_type === "rail_repaired") R.repaired += 1;
      else if (e.event_type === "rail_broken") R.broken += 1;
    }

    if (e.required_approval) {
      approvals_required += 1;
      if (clean(e.approval_status) === "pending") approvals_pending += 1;
    }
  }

  // Rates that drive learning. evidence_rate = evidence per proposal; completion
  // among actors that received work.
  for (const name of Object.keys(actors)) {
    const a = actors[name];
    a.evidence_rate = a.proposed ? Number((a.evidence_submitted / a.proposed).toFixed(3)) : null;
    a.completion_rate = a.evidence_submitted ? Number((a.completed / a.evidence_submitted).toFixed(3)) : null;
  }

  return {
    generated_at: new Date().toISOString(),
    totals: { entries: list.length, by_event_type, by_outcome },
    approvals: { required: approvals_required, pending: approvals_pending },
    actors,
    action_types,
    rails,
  };
}

// ─── Thin persistence (reuses revenue_engine_state under a separate row id) ────

function ledgerFilePath(options = {}) {
  return path.join(resolveRevenueEngineDir(options), LEDGER_FILE);
}

/**
 * Load the operating ledger: local JSON first, then the durable Supabase row
 * (id = operating_ledger). Returns { entries, source, summary? }. Never throws.
 */
export async function loadOperatingLedger(options = {}) {
  const file = ledgerFilePath(options);
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    return { available: true, entries: asArray(parsed.entries), source: { kind: "local_file", file } };
  } catch {
    // fall through to Supabase
  }
  const remote = await readRevenueState({ id: LEDGER_ROW_ID });
  if (remote && remote.document) {
    return { available: true, entries: asArray(remote.document.entries), source: { kind: "supabase" } };
  }
  return { available: false, entries: [], source: { kind: "none" } };
}

/**
 * Record events into the ledger: load → append idempotently → persist (local file
 * always; Supabase best-effort unless persistSupabase === false) → return the
 * refreshed summary. Safe: no-ops persistence cleanly when unconfigured.
 */
export async function recordLedgerEvents(events = [], options = {}) {
  const incoming = asArray(events).map((e) => makeLedgerEntry(e, options));
  const loaded = await loadOperatingLedger(options);
  const { entries, added, total } = appendLedgerEntries(loaded.entries, incoming, options);
  const summary = summarizeLedger(entries);
  const document = { id: LEDGER_ROW_ID, entries, summary, updated_at: options.now || new Date().toISOString(), schema_version: LEDGER_SCHEMA_VERSION };

  // Local mirror (source of truth on a persistent host).
  let local_written = false;
  if (options.writeLocal !== false) {
    const file = ledgerFilePath(options);
    try {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, `${JSON.stringify(document, null, 2)}\n`, "utf8");
      local_written = true;
    } catch {
      // non-fatal; durable path may still succeed
    }
  }

  // Durable mirror in the existing table under the ledger row id (best-effort).
  let supabase = { ok: false, skipped: true, reason: "disabled" };
  if (options.persistSupabase !== false && added > 0) {
    supabase = await upsertRevenueState(document, { id: LEDGER_ROW_ID });
  }

  return { ok: true, added, total, summary, persisted: { local: local_written, supabase } };
}
