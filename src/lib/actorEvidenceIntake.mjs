// ─── Actor-side evidence intake / write path ──────────────────────────────────
//
// THE GAP THIS FILLS
// Patch 2 added the PURE write-back primitives (approvalEvidenceWriteback) and the
// queue is persisted in the revenue document (latest.json + Supabase). But there
// was no ACTOR-FACING entry point: a process that executed an approved/delegated
// task (Cowork, Codex, Hermes, Morgan/Retell, the email/n8n/CRM rails) had no safe
// way to hand its evidence back into the persisted state so Hermes could read the
// updated lifecycle and choose the next action.
//
// This module is that thin intake path. It:
//   1. loads the CURRENT full revenue document (local latest.json, else the
//      Supabase-backed revenue_engine_state, else a clear "unavailable" error);
//   2. validates the submission and that the target task actually exists;
//   3. attaches evidence + advances lifecycle status via the existing pure
//      write-back (gated: completed needs accepted evidence; idempotent);
//   4. optionally moves an in-document implementation work order's status via the
//      safe status adapter (also evidence-gated);
//   5. persists the updated document back the SAME way the loop does — best-effort
//      Supabase upsert (no-op when unconfigured) plus the local latest.json when we
//      read from it — and returns a PII-redacted view for the caller/UI.
//
// SAFETY: it records evidence/status only. It NEVER executes the task, sends an
// email, places a call, charges a card, activates n8n, or deploys. It reuses
// existing systems and adds no parallel store.

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveRevenueEngineDir } from "./revenueEngineReadAdapter.mjs";
import { readRevenueState, upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";
import { applyEvidenceToDocument, applySafeStatusUpdate } from "./approvalEvidenceWriteback.mjs";

function clean(value) {
  return String(value ?? "").trim();
}
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// PII scrub for the view we hand back to the caller/UI (same intent as the read
// adapter's evidence scrubbing). The persisted document keeps full evidence; only
// the returned/displayed copy is redacted.
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;
function scrubText(value) {
  return clean(value).replace(EMAIL_RE, "[redacted-email]").replace(PHONE_RE, "[redacted-phone]");
}
function redactLifecycleForUi(lifecycle = {}) {
  return {
    ...lifecycle,
    submitted_evidence: (Array.isArray(lifecycle.submitted_evidence) ? lifecycle.submitted_evidence : []).map((ev) => ({
      ...ev,
      evidence_summary: scrubText(ev.evidence_summary),
      evidence_reference: scrubText(ev.evidence_reference),
    })),
  };
}

/**
 * Load the current full (unredacted) revenue document for write-back. Tries the
 * local latest.json first, then the durable Supabase document. Returns
 * { available, document, source:{ kind, file? } }. Never throws.
 */
export async function loadRevenueDocument(options = {}) {
  const dir = resolveRevenueEngineDir(options);
  const file = path.join(dir, "latest.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    return { available: true, document: JSON.parse(raw), source: { kind: "local_file", file } };
  } catch {
    // fall through to Supabase
  }
  const remote = await readRevenueState();
  if (remote && remote.document) {
    return { available: true, document: remote.document, source: { kind: "supabase" } };
  }
  return { available: false, document: null, source: { kind: "none" } };
}

// Build the evidence object the write-back expects from the flexible actor input
// (accepts evidence text OR a structured evidence object).
function normalizeEvidenceInput(submission, actor, now) {
  const ev = isPlainObject(submission.evidence) ? submission.evidence : {};
  const text =
    clean(submission.evidence_text) ||
    (typeof submission.evidence === "string" ? clean(submission.evidence) : "");
  return {
    evidence_type: clean(submission.evidence_type) || clean(ev.evidence_type) || "proof",
    evidence_summary: clean(ev.evidence_summary) || text,
    evidence_reference: clean(submission.evidence_reference) || clean(ev.evidence_reference),
    submitted_by_agent: actor,
    submitted_at: clean(ev.submitted_at) || now,
    redaction_status: clean(ev.redaction_status) || "unredacted",
    ...(clean(ev.evidence_id) ? { evidence_id: clean(ev.evidence_id) } : {}),
  };
}

// Apply an optional in-document work-order status change, evidence-gated.
function applyWorkOrderStatus(document, target, lifecycle, now) {
  const orders = document?.implementationWorkOrders?.orders;
  if (!Array.isArray(orders)) return { ok: false, error: "No implementation work orders in the document." };
  const idx = orders.findIndex((o) => clean(o.id) === clean(target.id));
  if (idx === -1) return { ok: false, error: `Work order "${clean(target.id)}" not found.` };
  const res = applySafeStatusUpdate(orders[idx], { kind: "work_order", toStatus: target.status, evidenceLifecycle: lifecycle, now });
  if (!res.ok) return { ok: false, error: res.error };
  if (!res.changed) return { ok: true, changed: false, document };
  const nextOrders = orders.slice();
  nextOrders[idx] = res.record;
  return {
    ok: true,
    changed: true,
    document: { ...document, implementationWorkOrders: { ...document.implementationWorkOrders, orders: nextOrders } },
  };
}

/**
 * The actor-side intake. Records evidence (and optional status moves) against an
 * approved/delegated task and persists the updated revenue document. Does NOT
 * execute the task.
 *
 * submission: {
 *   task_id | execution_id | approval_item_id,   // which task
 *   actor | submitted_by_agent,                  // who submits
 *   evidence | evidence_text,                    // proof (object or text)
 *   evidence_type?, evidence_reference?,
 *   advance_to?,                                 // lifecycle status request
 *   target?: { kind:'work_order', id, status }   // optional entity status move
 * }
 * options: { now?, dataDir?, cwd?, persistSupabase? }
 */
export async function submitActorEvidence(submission = {}, options = {}) {
  const now = options.now || new Date().toISOString();

  // 1. Validate the submission.
  const taskId = clean(submission.task_id || submission.execution_id);
  const approvalId = clean(submission.approval_item_id);
  const actor = clean(submission.actor || submission.submitted_by_agent);
  if (!taskId && !approvalId) return { ok: false, error: "task_id (or approval_item_id) is required." };
  if (!actor) return { ok: false, error: "actor is required." };

  const evidence = normalizeEvidenceInput(submission, actor, now);
  if (!evidence.evidence_summary && !evidence.evidence_reference) {
    return { ok: false, error: "evidence is required (evidence text or an evidence object with a summary/reference)." };
  }

  // 2. Load current state; clear error if unavailable.
  const loaded = await loadRevenueDocument(options);
  if (!loaded.available) {
    return { ok: false, reason: "state_unavailable", error: "No revenue document found. Run `npm run revenue:daily-loop` or configure Supabase." };
  }

  // 3. Attach evidence + advance lifecycle (validates the task exists, gates completed).
  const applied = applyEvidenceToDocument(
    loaded.document,
    { task_id: taskId, approval_item_id: approvalId, evidence, ...(clean(submission.advance_to) ? { advance_to: clean(submission.advance_to) } : {}) },
    { now },
  );
  if (!applied.ok) {
    if (applied.reason === "task_not_found") return { ok: false, reason: "task_not_found", error: `No execution task found for "${taskId || approvalId}".` };
    return { ok: false, error: applied.error || "Evidence write-back failed." };
  }

  let document = applied.document;
  let changed = applied.changed;

  // 4. Optional work-order status move (evidence-gated by the just-updated lifecycle).
  const target = isPlainObject(submission.target) ? submission.target : null;
  if (target && clean(target.kind) === "work_order") {
    const wo = applyWorkOrderStatus(document, target, applied.item.lifecycle, now);
    if (!wo.ok) return { ok: false, error: wo.error };
    document = wo.document;
    changed = changed || wo.changed;
  }

  // 5. Persist (best-effort Supabase + local latest.json), only when something changed.
  let supabase = { ok: false, skipped: true, reason: "disabled" };
  let local_written = false;
  if (changed) {
    if (options.persistSupabase !== false) supabase = await upsertRevenueState(document);
    if (loaded.source.kind === "local_file") {
      try {
        await fs.writeFile(loaded.source.file, `${JSON.stringify(document, null, 2)}\n`, "utf8");
        local_written = true;
      } catch (err) {
        return { ok: false, error: `Applied in memory but failed to write ${loaded.source.file}: ${String(err?.message || err)}` };
      }
    }
  }

  return {
    ok: true,
    changed,
    evidence_id: applied.evidence_id,
    status: applied.status,
    source: loaded.source.kind,
    persisted: { local: local_written, supabase },
    lifecycle: redactLifecycleForUi(applied.item.lifecycle),
    next_action: applied.item.lifecycle.next_action || "",
  };
}
