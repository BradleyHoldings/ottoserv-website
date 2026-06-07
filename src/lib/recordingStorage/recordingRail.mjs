// ─── Front Office recording rail: orchestration ───────────────────────────────
//
// Consent → prepare upload (issue signed URL) → (browser PUTs) → verify object
// existence + metadata (read-after-write, size/checksum) → completed. Truthful:
// never marks completed without a verified object; failed/interrupted stays
// failed/pending; the canonical ProcessScan.recording_status only flips to
// "uploaded" after verification. No browser file is ever production authority.

import {
  UPLOAD_STATE, RECORDING_STATUS_FOR_STATE, RECORDING_SCHEMA_VERSION,
  transitionRecording, recordingObjectPath, deriveRecordingIdempotencyKey,
  validateRecordingMeta, isSafeScanId,
} from "./lifecycle.mjs";

function clean(v) { return String(v ?? "").trim(); }

// A consent record must be explicit, scoped to recording+upload, and timestamped.
export function validateConsent(consent = {}) {
  if (consent.recording !== true) return { ok: false, reason: "recording_consent_missing" };
  if (consent.upload !== true) return { ok: false, reason: "upload_consent_missing" };
  if (!clean(consent.consented_at)) return { ok: false, reason: "consent_timestamp_missing" };
  return { ok: true };
}

// Create a fresh recording record (pending, no object). Pure.
export function createRecordingRecord(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const scan_id = clean(input.scan_id);
  if (!isSafeScanId(scan_id)) return null;
  const idempotency_key = deriveRecordingIdempotencyKey(input);
  return {
    scan_id,
    recording_id: `recmeta_${idempotency_key}`,
    idempotency_key,
    attempt: Number(input.attempt ?? 0),
    object_path: "",
    bucket: clean(input.bucket) || undefined,
    mime_type: clean(input.mime_type) || "video/webm",
    size_bytes: Number(input.size_bytes ?? 0),
    checksum_sha256: clean(input.checksum_sha256) || "",
    audio_included: Boolean(input.audio_included),
    consent: input.consent || null,
    upload_state: UPLOAD_STATE.NOT_STARTED,
    recording_status: RECORDING_STATUS_FOR_STATE[UPLOAD_STATE.NOT_STARTED],
    retry_count: 0,
    verified_at: "",
    deleted_at: "",
    fail_reason: "",
    schema_version: RECORDING_SCHEMA_VERSION,
    version: 1,
    created_at: now,
    updated_at: now,
    history: [],
  };
}

/**
 * Prepare an upload: require consent, validate type/size, compute deterministic
 * object path, issue a short-lived signed upload URL, and advance to `uploading`.
 * Returns { ok, record, upload, reason }. Idempotent: same content → same path.
 */
export async function prepareUpload(record, storage, options = {}) {
  const now = options.now || new Date().toISOString();
  const consent = validateConsent(record.consent || options.consent || {});
  if (!consent.ok) return { ok: false, reason: consent.reason };

  const metaCheck = validateRecordingMeta(record);
  if (!metaCheck.ok) return { ok: false, reason: metaCheck.reason };
  if (!storage) return { ok: false, reason: "storage_not_configured" };

  let objectPath;
  try { objectPath = recordingObjectPath(record); }
  catch (err) { return { ok: false, reason: clean(err.message) }; }

  const preparing = transitionRecording(record, UPLOAD_STATE.PREPARING_UPLOAD, { now, object_path: objectPath, reason: "preparing_upload" });
  if (!preparing.ok) return { ok: false, reason: preparing.error };

  let signed;
  try { signed = await storage.signUpload(objectPath); }
  catch (err) {
    const failed = transitionRecording(preparing.record, UPLOAD_STATE.RETRY_WAITING, { now, fail_reason: clean(err.message), reason: "sign_upload_failed" });
    return { ok: false, reason: clean(err.message), record: failed.ok ? failed.record : preparing.record };
  }

  const uploading = transitionRecording(preparing.record, UPLOAD_STATE.UPLOADING, { now, reason: "signed_upload_issued" });
  return {
    ok: true,
    record: uploading.ok ? uploading.record : preparing.record,
    upload: { url: signed.url, token: signed.token, object_path: objectPath, expires_in: signed.expires_in },
  };
}

/**
 * Mark that the browser reported a finished PUT (uploaded but UNVERIFIED). This is
 * NOT completion — verification still must pass. Pure.
 */
export function markUploadedUnverified(record, ctx = {}) {
  return transitionRecording(record, UPLOAD_STATE.UPLOADED_UNVERIFIED, { ...ctx, reason: "browser_reported_put" });
}

/**
 * Verify the object truly exists with matching metadata, then mark completed.
 * Read-after-write + size match (+ checksum when both sides have it). If the
 * object is absent or metadata mismatches, the record stays pending/failed —
 * never silently completed.
 */
export async function verifyAndComplete(record, storage, options = {}) {
  const now = options.now || new Date().toISOString();
  if (!storage) return { ok: false, reason: "storage_not_configured", record };
  const objectPath = clean(record.object_path);
  if (!objectPath) return { ok: false, reason: "no_object_path", record };

  let info;
  try { info = await storage.headObject(objectPath); }
  catch (err) {
    // Transport failure ≠ object absent. Stay uploaded_unverified for safe retry.
    return { ok: false, reason: `verify_transport_failed:${clean(err.message)}`, record, requires_reverify: true };
  }
  if (!info) {
    const failed = transitionRecording(record, UPLOAD_STATE.RETRY_WAITING, { now, fail_reason: "object_absent_after_upload", reason: "verify_object_absent" });
    return { ok: false, reason: "object_absent", record: failed.ok ? failed.record : record };
  }

  // Size must match what the client declared (when declared).
  if (Number(record.size_bytes) > 0 && Number(info.size_bytes) > 0 && Number(info.size_bytes) !== Number(record.size_bytes)) {
    const failed = transitionRecording(record, UPLOAD_STATE.FAILED, { now, fail_reason: `size_mismatch:${info.size_bytes}!=${record.size_bytes}`, reason: "verify_size_mismatch" });
    return { ok: false, reason: "size_mismatch", record: failed.ok ? failed.record : record };
  }
  // Checksum must match when both sides have one.
  if (clean(record.checksum_sha256) && clean(info.checksum_sha256) && clean(info.checksum_sha256) !== clean(record.checksum_sha256)) {
    const failed = transitionRecording(record, UPLOAD_STATE.FAILED, { now, fail_reason: "checksum_mismatch", reason: "verify_checksum_mismatch" });
    return { ok: false, reason: "checksum_mismatch", record: failed.ok ? failed.record : record };
  }

  const completed = transitionRecording(record, UPLOAD_STATE.COMPLETED, {
    now, verified_at: now,
    size_bytes: Number(info.size_bytes) || Number(record.size_bytes),
    object_path: objectPath,
    reason: "object_verified",
  });
  if (!completed.ok) return { ok: false, reason: completed.error, record };
  return { ok: true, record: completed.record, object: info };
}

/**
 * Issue a short-lived signed playback URL for an admin. Only valid for a COMPLETED,
 * non-deleted recording. Returns { ok, url, expires_at }.
 */
export async function issuePlaybackUrl(record, storage, options = {}) {
  if (!storage) return { ok: false, reason: "storage_not_configured" };
  if (clean(record.deleted_at) || clean(record.upload_state) === UPLOAD_STATE.DELETED) return { ok: false, reason: "recording_deleted" };
  if (clean(record.upload_state) !== UPLOAD_STATE.COMPLETED) return { ok: false, reason: `not_playable_state:${record.upload_state}` };
  try {
    const signed = await storage.signDownload(clean(record.object_path));
    return { ok: true, url: signed.url, expires_in: signed.expires_in, expires_at: signed.expires_at };
  } catch (err) { return { ok: false, reason: clean(err.message) }; }
}

/**
 * Delete the object + mark the record deleted (truthful status downgrade). Used for
 * retention/admin deletion and for cleaning up abandoned partial uploads.
 */
export async function deleteRecording(record, storage, options = {}) {
  const now = options.now || new Date().toISOString();
  if (!storage) return { ok: false, reason: "storage_not_configured", record };
  const objectPath = clean(record.object_path);
  if (objectPath) {
    try { await storage.deleteObject(objectPath); }
    catch (err) { return { ok: false, reason: `delete_failed:${clean(err.message)}`, record }; }
  }
  const deleted = transitionRecording(record, UPLOAD_STATE.DELETED, { now, deleted_at: now, reason: clean(options.reason) || "admin_deleted" });
  return { ok: true, record: deleted.ok ? deleted.record : { ...record, upload_state: UPLOAD_STATE.DELETED, deleted_at: now } };
}

// Identify abandoned partial uploads (stuck pending past a TTL) for cleanup.
export function findAbandoned(records = [], options = {}) {
  const now = Date.parse(options.now || new Date().toISOString());
  const ttlMs = Number(options.ttl_ms ?? 3600 * 1000); // 1h
  return (Array.isArray(records) ? records : []).filter((r) => {
    const pending = ["preparing_upload", "uploading", "uploaded_unverified", "retry_waiting"].includes(clean(r.upload_state));
    if (!pending) return false;
    const updated = Date.parse(clean(r.updated_at));
    return !Number.isNaN(updated) && (now - updated) > ttlMs;
  });
}
