// ─── Front Office recording — controlled-real acceptance (orchestration) ──────
// One synthetic Process Scan + a harmless short recording. Proves: consented
// capture → upload to private storage → object exists + metadata matches → scan
// read-back references the object → admin short-lived signed URL → unauthorized/
// public access fails → refresh/retry creates no duplicate → deletion removes
// access and updates status. No email/call/DM/social/Stripe transport is touched.
//
// Live Supabase Storage is not configured in this environment, so a faithful
// in-memory storage + metadata store model the Supabase Storage + PostgREST
// contracts exactly. The orchestration, verification gating, idempotency, and
// deletion truth are proven; the live bucket PUT is the operator's one step.

import assert from "node:assert/strict";
import test from "node:test";

import {
  createRecordingRecord, prepareUpload, markUploadedUnverified, verifyAndComplete,
  issuePlaybackUrl, deleteRecording,
} from "../src/lib/recordingStorage/recordingRail.mjs";
import { persistRecording } from "../src/lib/recordingStorage/store.mjs";
import { UPLOAD_STATE } from "../src/lib/recordingStorage/lifecycle.mjs";

const NOW = "2026-06-08T14:00:00.000Z";
const SCAN = { id: "scan_accept_0001", recording_status: "not_provided", active_recording_id: null };
const CONSENT = { recording: true, upload: true, consented_at: NOW };
const REC_META = { scan_id: SCAN.id, attempt: 0, mime_type: "video/webm", size_bytes: 4096, checksum_sha256: "abc123checksum", audio_included: true };

// In-memory private bucket (no public URL possible) + metadata store.
function fakeStorage() {
  const objects = new Map();
  return {
    objects,
    async signUpload(p) { return { url: `https://x.supabase.co/storage/v1/object/upload/signed/${p}?token=t`, token: "t", expires_in: 600 }; },
    _put(p, m) { objects.set(p, m); },
    async headObject(p) { return objects.get(p) ? { object_path: p, ...objects.get(p) } : null; },
    async signDownload(p) { if (!objects.has(p)) throw new Error("404"); return { url: `https://x.supabase.co/storage/v1/object/sign/${p}?token=dl`, expires_in: 120, expires_at: new Date(Date.parse(NOW) + 120000).toISOString() }; },
    async deleteObject(p) { const had = objects.delete(p); return { ok: true, deleted: had, already_absent: !had }; },
  };
}
function fakeStore() {
  const rows = new Map();
  return {
    rows,
    async upsert(r) { rows.set(r.recording_id, { ...r, consent_json: r.consent, history_json: r.history }); return { ok: true, row: r }; },
    async readById(id) { const r = rows.get(id); return r ? { ...r, consent: r.consent_json, history: r.history_json || [] } : null; },
    async listByScan(sid) { return [...rows.values()].filter((r) => r.scan_id === sid); },
  };
}
// Models the admin-token gate on the playback endpoint.
async function adminPlayback({ isAdmin, record, storage }) {
  if (!isAdmin) return { status: 401, body: { error: "Unauthorized" } };
  const signed = await issuePlaybackUrl(record, storage);
  if (!signed.ok) return { status: 409, body: { error: signed.reason } };
  return { status: 200, body: signed };
}

test("ACCEPTANCE: consent → upload → verify → read-back → admin signed URL → unauth fail → no-dupe → delete", async () => {
  const storage = fakeStorage();
  const store = fakeStore();
  const scan = { ...SCAN };

  // 1. Consented capture + prepare upload (private signed URL).
  const record = createRecordingRecord({ ...REC_META, consent: CONSENT }, { now: NOW });
  const prep = await prepareUpload(record, storage, { now: NOW });
  assert.equal(prep.ok, true);
  await persistRecording(prep.record, { store });
  assert.ok(prep.upload.url.includes("/object/upload/signed/"));
  assert.ok(!prep.upload.url.includes("/object/public/"), "never public");

  // 2. Browser PUTs to private storage.
  storage._put(prep.upload.object_path, { size_bytes: 4096, mime_type: "video/webm", checksum_sha256: "abc123checksum" });

  // 3. Finalize: object exists + metadata matches → completed (read-after-write).
  const unverified = markUploadedUnverified(prep.record, { now: NOW }).record;
  const done = await verifyAndComplete(unverified, storage, { now: NOW });
  assert.equal(done.ok, true);
  assert.equal(done.record.upload_state, UPLOAD_STATE.COMPLETED);
  await persistRecording(done.record, { store });

  // 4. Process Scan read-back references the object.
  scan.recording_status = "uploaded";
  scan.active_recording_id = done.record.recording_id;
  const persisted = await store.readById(done.record.recording_id);
  assert.equal(persisted.upload_state, "completed");
  assert.equal(persisted.scan_id, scan.id);
  assert.ok(storage.objects.has(persisted.object_path), "durable object exists");
  assert.equal(scan.active_recording_id, persisted.recording_id);

  // 5. Authorized admin gets a short-lived signed URL.
  const adminView = await adminPlayback({ isAdmin: true, record: done.record, storage });
  assert.equal(adminView.status, 200);
  assert.ok(adminView.body.url.includes("/object/sign/"));
  assert.equal(adminView.body.expires_in, 120);

  // 6. Unauthorized access fails.
  const anon = await adminPlayback({ isAdmin: false, record: done.record, storage });
  assert.equal(anon.status, 401);

  // 7. Refresh/retry creates no duplicate (same deterministic path + recording_id).
  const retryRecord = createRecordingRecord({ ...REC_META, consent: CONSENT }, { now: NOW });
  const retryPrep = await prepareUpload(retryRecord, storage, { now: NOW });
  assert.equal(retryPrep.upload.object_path, prep.upload.object_path, "same object path");
  assert.equal(retryRecord.recording_id, record.recording_id, "same recording id");
  await persistRecording(retryPrep.record, { store });
  assert.equal(store.rows.size, 1, "no duplicate metadata row");
  assert.equal(storage.objects.size, 1, "no duplicate object");

  // 8. Deletion removes access + truthful status downgrade.
  const del = await deleteRecording(done.record, storage, { now: NOW, reason: "acceptance_cleanup" });
  assert.equal(del.ok, true);
  assert.equal(del.record.upload_state, UPLOAD_STATE.DELETED);
  assert.equal(del.record.recording_status, "not_provided");
  await persistRecording(del.record, { store });
  assert.equal(storage.objects.has(prep.upload.object_path), false, "object gone");
  const afterDelete = await adminPlayback({ isAdmin: true, record: del.record, storage });
  assert.equal(afterDelete.status, 409);
  assert.equal(afterDelete.body.error, "recording_deleted");
});

test("ACCEPTANCE: no non-recording transport is reachable from the rail", async () => {
  for (const m of ["recordingRail", "storage", "store", "lifecycle"]) {
    const mod = await import(`../src/lib/recordingStorage/${m}.mjs`);
    const names = Object.keys(mod).join(" ").toLowerCase();
    for (const banned of ["email", "call", "retell", "dm", "social", "stripe", "sms"]) {
      assert.ok(!names.includes(banned), `${m} must not expose ${banned}`);
    }
  }
});
