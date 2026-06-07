// ─── Front Office recording storage rail — contract proofs ────────────────────
// Consent, deterministic object path, duplicate prevention, upload success,
// failed upload, interruption/retry, verification mismatch (size/checksum),
// read-after-write, signed-URL expiry shape, deletion, retention metadata,
// no public exposure, no local production authority.

import assert from "node:assert/strict";
import test from "node:test";

import {
  UPLOAD_STATE, RECORDING_STATUS_FOR_STATE, RECORDING_TRUTH,
  canTransition, transitionRecording, recordingObjectPath,
  deriveRecordingIdempotencyKey, validateRecordingMeta, isSafeScanId,
} from "../src/lib/recordingStorage/lifecycle.mjs";
import {
  validateConsent, createRecordingRecord, prepareUpload, markUploadedUnverified,
  verifyAndComplete, issuePlaybackUrl, deleteRecording, findAbandoned,
} from "../src/lib/recordingStorage/recordingRail.mjs";
import { persistRecording, PERSISTENCE } from "../src/lib/recordingStorage/store.mjs";

const NOW = "2026-06-08T14:00:00.000Z";
const CONSENT = { recording: true, upload: true, consented_at: NOW };

function rec(overrides = {}) {
  return createRecordingRecord({
    scan_id: "scan_abc123", attempt: 0, mime_type: "video/webm",
    size_bytes: 2048, checksum_sha256: "deadbeef", audio_included: true,
    consent: CONSENT, ...overrides,
  }, { now: NOW });
}

// A fake storage client modeling Supabase Storage (signed urls, HEAD, delete).
function fakeStorage(opts = {}) {
  const objects = new Map(); // object_path → { size_bytes, mime_type, checksum_sha256 }
  return {
    objects,
    async signUpload(objectPath) {
      if (opts.failSign) throw new Error("sign_upload_failed_500");
      return { url: `https://x.supabase.co/storage/v1/object/upload/signed/${objectPath}?token=tok`, token: "tok", expires_in: 600 };
    },
    // Simulate the browser PUT having (or not) landed the object.
    _put(objectPath, meta) { objects.set(objectPath, meta); },
    async headObject(objectPath) {
      if (opts.failHead) throw new Error("head_object_failed_500");
      return objects.get(objectPath) ? { object_path: objectPath, ...objects.get(objectPath) } : null;
    },
    async signDownload(objectPath) {
      if (!objects.has(objectPath)) throw new Error("sign_download_failed_404");
      return { url: `https://x.supabase.co/storage/v1/object/sign/${objectPath}?token=dl`, expires_in: 120, expires_at: new Date(Date.parse(NOW) + 120000).toISOString() };
    },
    async deleteObject(objectPath) { const had = objects.delete(objectPath); return { ok: true, deleted: had, already_absent: !had }; },
  };
}

// ─── 1. Consent is mandatory ─────────────────────────────────────────────────
test("consent: requires recording + upload + timestamp", () => {
  assert.equal(validateConsent(CONSENT).ok, true);
  assert.equal(validateConsent({ recording: true, upload: true }).reason, "consent_timestamp_missing");
  assert.equal(validateConsent({ recording: true, consented_at: NOW }).reason, "upload_consent_missing");
  assert.equal(validateConsent({ upload: true, consented_at: NOW }).reason, "recording_consent_missing");
});

test("prepare: refuses without consent", async () => {
  const r = rec({ consent: { recording: true } });
  const out = await prepareUpload(r, fakeStorage());
  assert.equal(out.ok, false);
  assert.equal(out.reason, "upload_consent_missing");
});

// ─── 2. Deterministic, traversal-safe object path ────────────────────────────
test("object path: deterministic + tied to scan/attempt, traversal-safe", () => {
  const a = recordingObjectPath({ scan_id: "scan_abc123", attempt: 0, size_bytes: 2048, checksum_sha256: "deadbeef", mime_type: "video/webm" });
  const b = recordingObjectPath({ scan_id: "scan_abc123", attempt: 0, size_bytes: 2048, checksum_sha256: "deadbeef", mime_type: "video/webm" });
  assert.equal(a, b);
  assert.match(a, /^recordings\/scan_abc123\/attempt-0\/rec_[0-9a-f]{16}\.webm$/);
  assert.throws(() => recordingObjectPath({ scan_id: "../etc/passwd", size_bytes: 1 }), /unsafe_scan_id/);
  assert.equal(isSafeScanId("a/b"), false);
  assert.equal(isSafeScanId("ok-id_123"), true);
});

// ─── 3. Duplicate prevention via deterministic idempotency key ───────────────
test("idempotency: same content → same key/path; different content → different", () => {
  const k1 = deriveRecordingIdempotencyKey({ scan_id: "s", size_bytes: 100, checksum_sha256: "c" });
  assert.equal(k1, deriveRecordingIdempotencyKey({ scan_id: "s", size_bytes: 100, checksum_sha256: "c" }));
  assert.notEqual(k1, deriveRecordingIdempotencyKey({ scan_id: "s", size_bytes: 200, checksum_sha256: "c" }));
  assert.notEqual(k1, deriveRecordingIdempotencyKey({ scan_id: "s2", size_bytes: 100, checksum_sha256: "c" }));
});

// ─── 4. Type + size validation ───────────────────────────────────────────────
test("validate meta: rejects bad mime, zero, and oversized", () => {
  assert.equal(validateRecordingMeta({ mime_type: "video/webm", size_bytes: 2048 }).ok, true);
  assert.equal(validateRecordingMeta({ mime_type: "application/zip", size_bytes: 10 }).ok, false);
  assert.equal(validateRecordingMeta({ mime_type: "video/webm", size_bytes: 0 }).ok, false);
  assert.equal(validateRecordingMeta({ mime_type: "video/webm", size_bytes: 999 * 1024 * 1024 }).ok, false);
});

// ─── 5. Upload success: prepare → put → verify → completed ───────────────────
test("upload success: completed only after verified object existence", async () => {
  const storage = fakeStorage();
  let r = rec();
  const prep = await prepareUpload(r, storage, { now: NOW });
  assert.equal(prep.ok, true);
  assert.equal(prep.record.upload_state, UPLOAD_STATE.UPLOADING);
  // Browser PUTs the object.
  storage._put(prep.upload.object_path, { size_bytes: 2048, mime_type: "video/webm", checksum_sha256: "deadbeef" });
  r = markUploadedUnverified(prep.record, { now: NOW }).record;
  assert.equal(r.recording_status, "recorded_upload_pending", "still pending pre-verify");
  const done = await verifyAndComplete(r, storage, { now: NOW });
  assert.equal(done.ok, true);
  assert.equal(done.record.upload_state, UPLOAD_STATE.COMPLETED);
  assert.equal(done.record.recording_status, "uploaded");
  assert.equal(done.record.verified_at, NOW);
});

// ─── 6. Failed upload (object never landed) stays pending/retry, not completed ─
test("verify: object absent → retry_waiting, never completed", async () => {
  const storage = fakeStorage();
  const prep = await prepareUpload(rec(), storage, { now: NOW });
  const r = markUploadedUnverified(prep.record, { now: NOW }).record;
  const done = await verifyAndComplete(r, storage, { now: NOW }); // never _put
  assert.equal(done.ok, false);
  assert.equal(done.reason, "object_absent");
  assert.equal(done.record.upload_state, UPLOAD_STATE.RETRY_WAITING);
  assert.notEqual(done.record.recording_status, "uploaded");
});

// ─── 7. Interruption/retry: transport failure stays verifiable (no false fail) ─
test("verify: transport failure → stays unverified for safe re-verify", async () => {
  const storage = fakeStorage({ failHead: true });
  const prep = await prepareUpload(rec(), storage, { now: NOW });
  const r = markUploadedUnverified(prep.record, { now: NOW }).record;
  const done = await verifyAndComplete(r, storage, { now: NOW });
  assert.equal(done.ok, false);
  assert.equal(done.requires_reverify, true);
  assert.equal(done.record.upload_state, UPLOAD_STATE.UPLOADED_UNVERIFIED); // unchanged
});

// ─── 8. Verification mismatch: size + checksum ───────────────────────────────
test("verify: size mismatch → failed, not completed", async () => {
  const storage = fakeStorage();
  const prep = await prepareUpload(rec(), storage, { now: NOW });
  storage._put(prep.upload.object_path, { size_bytes: 9999, mime_type: "video/webm", checksum_sha256: "deadbeef" });
  const r = markUploadedUnverified(prep.record, { now: NOW }).record;
  const done = await verifyAndComplete(r, storage, { now: NOW });
  assert.equal(done.reason, "size_mismatch");
  assert.equal(done.record.upload_state, UPLOAD_STATE.FAILED);
});
test("verify: checksum mismatch → failed", async () => {
  const storage = fakeStorage();
  const prep = await prepareUpload(rec(), storage, { now: NOW });
  storage._put(prep.upload.object_path, { size_bytes: 2048, mime_type: "video/webm", checksum_sha256: "different" });
  const r = markUploadedUnverified(prep.record, { now: NOW }).record;
  const done = await verifyAndComplete(r, storage, { now: NOW });
  assert.equal(done.reason, "checksum_mismatch");
  assert.equal(done.record.upload_state, UPLOAD_STATE.FAILED);
});

// ─── 9. Retry does not create a duplicate object (same path) ─────────────────
test("retry: re-preparing same content reuses the same object path", async () => {
  const storage = fakeStorage();
  const p1 = await prepareUpload(rec(), storage, { now: NOW });
  const p2 = await prepareUpload(rec(), storage, { now: NOW });
  assert.equal(p1.upload.object_path, p2.upload.object_path);
});

// ─── 10. Admin playback: short-lived signed URL only when completed ──────────
test("playback: signed URL only for completed, non-deleted; not public", async () => {
  const storage = fakeStorage();
  const prep = await prepareUpload(rec(), storage, { now: NOW });
  storage._put(prep.upload.object_path, { size_bytes: 2048, mime_type: "video/webm", checksum_sha256: "deadbeef" });
  const completed = (await verifyAndComplete(markUploadedUnverified(prep.record, { now: NOW }).record, storage, { now: NOW })).record;

  const pending = await issuePlaybackUrl(prep.record, storage); // uploading state
  assert.equal(pending.ok, false);

  const url = await issuePlaybackUrl(completed, storage);
  assert.equal(url.ok, true);
  assert.ok(url.url.includes("/object/sign/"), "signed url path");
  assert.ok(!url.url.includes("/object/public/"), "never a public url");
  assert.equal(url.expires_in, 120, "short-lived");
  assert.ok(url.expires_at);
});

// ─── 11. Deletion removes access + truthful status downgrade ─────────────────
test("delete: removes object and downgrades status; playback then refused", async () => {
  const storage = fakeStorage();
  const prep = await prepareUpload(rec(), storage, { now: NOW });
  storage._put(prep.upload.object_path, { size_bytes: 2048, mime_type: "video/webm", checksum_sha256: "deadbeef" });
  const completed = (await verifyAndComplete(markUploadedUnverified(prep.record, { now: NOW }).record, storage, { now: NOW })).record;

  const del = await deleteRecording(completed, storage, { now: NOW, reason: "retention_expired" });
  assert.equal(del.ok, true);
  assert.equal(del.record.upload_state, UPLOAD_STATE.DELETED);
  assert.equal(del.record.recording_status, "not_provided");
  assert.ok(del.record.deleted_at);
  assert.equal(storage.objects.has(prep.upload.object_path), false, "object removed");
  const playback = await issuePlaybackUrl(del.record, storage);
  assert.equal(playback.ok, false);
  assert.equal(playback.reason, "recording_deleted");
});

// ─── 12. Abandoned partial upload cleanup ────────────────────────────────────
test("cleanup: stale pending uploads are flagged as abandoned", () => {
  const stale = { upload_state: "uploading", updated_at: "2026-06-08T10:00:00.000Z" };
  const fresh = { upload_state: "uploading", updated_at: NOW };
  const completed = { upload_state: "completed", updated_at: "2026-06-08T10:00:00.000Z" };
  const abandoned = findAbandoned([stale, fresh, completed], { now: NOW, ttl_ms: 3600 * 1000 });
  assert.equal(abandoned.length, 1);
  assert.equal(abandoned[0], stale);
});

// ─── 13. No local production authority (record state ≠ durable truth) ────────
test("truth: pending/unverified states are never durable evidence", () => {
  assert.ok(RECORDING_TRUTH.pending.has("uploaded_unverified"));
  assert.ok(!RECORDING_TRUTH.durable.has("uploaded_unverified"));
  assert.ok(RECORDING_TRUTH.durable.has("completed"));
  assert.equal(RECORDING_STATUS_FOR_STATE.uploaded_unverified, "recorded_upload_pending");
  assert.equal(canTransition("uploading", "completed"), false, "cannot skip verification");
  assert.equal(canTransition("uploaded_unverified", "completed"), true);
});

// ─── 14. Persistence: read-after-write verification ──────────────────────────
test("persist: read-after-write confirms state, fake store", async () => {
  const rows = new Map();
  const store = {
    async upsert(r) { rows.set(r.recording_id, { ...r }); return { ok: true, row: r }; },
    async readById(id) { const r = rows.get(id); return r ? { ...r, consent: r.consent_json, history: r.history_json || [] } : null; },
  };
  const r = rec();
  const result = await persistRecording(r, { store });
  assert.equal(result.ok, true);
  assert.equal(result.status, PERSISTENCE.PERSISTED);
  assert.equal(result.upload_state, r.upload_state);
});
test("persist: unconfigured store → pending, never silently ok", async () => {
  const result = await persistRecording(rec(), { store: null, config: null });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "supabase_not_configured");
});

// ─── 15. No public exposure: storage client never builds a public URL ────────
test("no public exposure: storage module exposes no public-url method", async () => {
  const mod = await import("../src/lib/recordingStorage/storage.mjs");
  const names = Object.keys(mod).join(" ").toLowerCase();
  assert.ok(!names.includes("public"), "no public-url helper exported");
});
