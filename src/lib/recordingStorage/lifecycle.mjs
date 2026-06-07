// ─── Front Office recording rail: lifecycle + deterministic object paths ──────
//
// Durable recording upload truth for the Front Office Leak Check. A browser-local
// preview is NEVER production authority — only a verified Supabase Storage object
// is. This module owns the upload lifecycle state machine, deterministic object
// paths (tied to scan id + attempt, traversal-safe), and the deterministic
// idempotency key that prevents duplicate objects across retries/refreshes.

import { createHash } from "node:crypto";

export const RECORDING_SCHEMA_VERSION = "recstore.v1";

// Upload lifecycle. Reuses the existing recording_status vocabulary where it maps
// (recorded_upload_pending ↔ uploaded_unverified family; uploaded ↔ completed;
// upload_failed ↔ failed) and adds the durable intermediate states.
export const UPLOAD_STATE = {
  NOT_STARTED: "not_started",
  RECORDING: "recording",
  PREPARING_UPLOAD: "preparing_upload",
  UPLOADING: "uploading",
  UPLOADED_UNVERIFIED: "uploaded_unverified", // object PUT returned but not yet verified
  COMPLETED: "completed",                     // object existence + metadata verified
  RETRY_WAITING: "retry_waiting",
  FAILED: "failed",
  CANCELLED: "cancelled",
  DELETED: "deleted",
};

// Map durable upload state → the canonical ProcessScan.recording_status enum
// (not_provided | recorded_upload_pending | uploaded | upload_failed). This keeps
// the existing public/report contract intact while the rail tracks finer state.
export const RECORDING_STATUS_FOR_STATE = {
  not_started: "not_provided",
  recording: "recorded_upload_pending",
  preparing_upload: "recorded_upload_pending",
  uploading: "recorded_upload_pending",
  uploaded_unverified: "recorded_upload_pending", // STILL pending until verified
  completed: "uploaded",
  retry_waiting: "recorded_upload_pending",
  failed: "upload_failed",
  cancelled: "not_provided",
  deleted: "not_provided",
};

const ALLOWED = {
  not_started: ["recording", "preparing_upload", "cancelled"],
  recording: ["preparing_upload", "cancelled", "failed"],
  preparing_upload: ["uploading", "retry_waiting", "failed", "cancelled"],
  uploading: ["uploaded_unverified", "retry_waiting", "failed", "cancelled"],
  uploaded_unverified: ["completed", "retry_waiting", "failed"],
  completed: ["deleted"],
  retry_waiting: ["preparing_upload", "uploading", "failed", "cancelled"],
  failed: ["retry_waiting", "preparing_upload", "cancelled"],
  cancelled: [],
  deleted: [],
};

// States in which it is TRUE a durable, verified object exists.
export const RECORDING_TRUTH = {
  durable: new Set(["completed"]),
  // pending/uncertain — must NOT be presented as durable evidence
  pending: new Set(["recording", "preparing_upload", "uploading", "uploaded_unverified", "retry_waiting"]),
  absent: new Set(["not_started", "failed", "cancelled", "deleted"]),
};

const ALLOWED_MIME = new Set(["video/webm", "video/mp4"]);
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB hard cap

function clean(v) { return String(v ?? "").trim(); }
function sha16(s) { return createHash("sha256").update(s).digest("hex").slice(0, 16); }

export function canTransition(from, to) {
  return (ALLOWED[clean(from)] || []).includes(clean(to));
}

// A scan id is used inside an object path; it must be a safe slug (no traversal,
// no separators). We hard-validate rather than sanitize silently.
export function isSafeScanId(scanId) {
  const s = clean(scanId);
  return /^[A-Za-z0-9_-]{1,128}$/.test(s);
}

/**
 * Deterministic, traversal-safe object path for a recording.
 *   recordings/<scan_id>/attempt-<n>/<idempotency_key>.webm
 * Same scan + attempt + content fingerprint → same path (idempotent, no dupes).
 */
export function recordingObjectPath(input = {}) {
  const scanId = clean(input.scan_id);
  if (!isSafeScanId(scanId)) throw new Error(`unsafe_scan_id:${scanId}`);
  const attempt = Number.isInteger(Number(input.attempt)) && Number(input.attempt) >= 0 ? Number(input.attempt) : 0;
  const idem = clean(input.idempotency_key) || deriveRecordingIdempotencyKey(input);
  const ext = clean(input.mime_type) === "video/mp4" ? "mp4" : "webm";
  const path = `recordings/${scanId}/attempt-${attempt}/${idem}.${ext}`;
  if (path.includes("..") || path.includes("//")) throw new Error("path_traversal_detected");
  return path;
}

// Deterministic idempotency key from scan id + content fingerprint (size + checksum
// when available, else size + attempt). Identical content for a scan → identical
// key → identical object path → no duplicate object on retry/refresh.
export function deriveRecordingIdempotencyKey(input = {}) {
  const basis = [
    clean(input.scan_id),
    String(input.size_bytes ?? 0),
    clean(input.checksum_sha256) || `attempt:${Number(input.attempt ?? 0)}`,
    clean(input.mime_type) || "video/webm",
  ].join("|");
  return `rec_${sha16(basis)}`;
}

// Validate a candidate recording's type + size before any upload target is issued.
export function validateRecordingMeta(meta = {}) {
  const mime = clean(meta.mime_type);
  const size = Number(meta.size_bytes ?? 0);
  if (!ALLOWED_MIME.has(mime)) return { ok: false, reason: `unsupported_mime:${mime || "(none)"}` };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, reason: "invalid_size" };
  if (size > MAX_BYTES) return { ok: false, reason: `too_large:${size}>${MAX_BYTES}` };
  return { ok: true };
}

/**
 * Apply a lifecycle transition to a recording record. Pure. Bumps an optimistic
 * concurrency version and appends history. Carries verification/object fields
 * through ctx so the store can persist authoritative truth.
 */
export function transitionRecording(record, to, ctx = {}) {
  const from = clean(record.upload_state);
  to = clean(to);
  if (!Object.values(UPLOAD_STATE).includes(to)) return { ok: false, error: `unknown_state:${to}` };
  if (from === to) return { ok: true, record, noop: true };
  if (!canTransition(from, to)) return { ok: false, error: `illegal_transition:${from}->${to}` };
  const now = ctx.now || new Date().toISOString();
  const rec = { from, to, at: now, reason: clean(ctx.reason) };
  const next = {
    ...record,
    upload_state: to,
    recording_status: RECORDING_STATUS_FOR_STATE[to] || record.recording_status,
    retry_count: to === UPLOAD_STATE.RETRY_WAITING ? Number(record.retry_count || 0) + 1 : Number(record.retry_count || 0),
    version: Number(record.version || 1) + 1,
    updated_at: now,
    history: [...(Array.isArray(record.history) ? record.history : []), rec],
  };
  for (const k of ["object_path", "verified_at", "size_bytes", "checksum_sha256", "deleted_at", "fail_reason", "verification"]) {
    if (ctx[k] !== undefined) next[k] = ctx[k];
  }
  return { ok: true, record: next, transition: rec };
}
