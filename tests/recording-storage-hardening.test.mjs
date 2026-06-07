import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { issueProcessScanCapability, verifyProcessScanCapability } from "../src/lib/processScanCapability.mjs";
import {
  createRecordingRecord,
  createSignedUploadIntent,
  finalizeVerifiedUpload,
  verifyAndComplete,
} from "../src/lib/recordingStorage/recordingRail.mjs";
import { persistRecording, PERSISTENCE } from "../src/lib/recordingStorage/store.mjs";

const NOW = "2026-06-08T14:00:00.000Z";
const SECRET = "test-secret-for-capability";
const SCAN_ID = "ps_hardened_001";
const CONSENT = { recording: true, upload: true, consented_at: NOW };

function rec(overrides = {}) {
  return createRecordingRecord({
    scan_id: SCAN_ID,
    attempt: 0,
    mime_type: "video/webm",
    size_bytes: 1024,
    checksum_sha256: "abc123",
    audio_included: true,
    consent: CONSENT,
    ...overrides,
  }, { now: NOW });
}

function fakeStorage() {
  const objects = new Map();
  let signCalls = 0;
  return {
    objects,
    get signCalls() { return signCalls; },
    async signUpload(objectPath) {
      signCalls += 1;
      return { url: `https://storage.local/upload/${objectPath}`, token: "upload-token", expires_in: 600 };
    },
    _put(objectPath, meta) { objects.set(objectPath, meta); },
    async headObject(objectPath) {
      return objects.get(objectPath) ? { object_path: objectPath, ...objects.get(objectPath) } : null;
    },
  };
}

function casStore({ failFirstPersist = false, failReadBack = false } = {}) {
  const rows = new Map();
  let writes = 0;
  return {
    rows,
    async upsertCas(record, expectedVersion) {
      writes += 1;
      if (failFirstPersist && writes === 1) return { ok: false, status: "persistence_pending", reason: "forced_persist_failure" };
      const current = rows.get(record.recording_id);
      const currentVersion = current ? Number(current.version || 0) : 0;
      if (currentVersion !== Number(expectedVersion || 0)) return { ok: false, status: "version_conflict", current_version: currentVersion };
      rows.set(record.recording_id, { ...record });
      return { ok: true, row: record, version: record.version };
    },
    async readById(id) {
      if (failReadBack) throw new Error("forced_readback_failure");
      const row = rows.get(id);
      return row ? { ...row } : null;
    },
  };
}

test("capability: upload target requires a scan-scoped token, not just scan id and consent", () => {
  const token = issueProcessScanCapability(SCAN_ID, { secret: SECRET, now: NOW, ttlSeconds: 600 });
  assert.equal(verifyProcessScanCapability(token, SCAN_ID, { secret: SECRET, now: NOW }).ok, true);
  assert.equal(verifyProcessScanCapability("", SCAN_ID, { secret: SECRET, now: NOW }).reason, "capability_missing");
  assert.equal(verifyProcessScanCapability(token, "ps_other", { secret: SECRET, now: NOW }).reason, "scan_mismatch");
});

test("route: public upload-target issuance verifies capability before signing", () => {
  const route = readFileSync(new URL("../src/app/api/process-scans/[id]/recording/route.ts", import.meta.url), "utf8");
  const postStart = route.indexOf("export async function POST");
  const verifyAt = route.indexOf("verifyProcessScanCapability", postStart);
  const signAt = route.indexOf("createSignedUploadIntent", postStart);

  assert.ok(postStart >= 0, "POST handler exists");
  assert.ok(verifyAt > postStart, "POST handler verifies capability");
  assert.ok(signAt > verifyAt, "capability verification occurs before signed upload issuance");
  assert.match(route, /status:\s*401/);
});

test("prepare: persists and reads back pending intent before issuing signed upload URL", async () => {
  const storage = fakeStorage();
  const store = casStore();
  const out = await createSignedUploadIntent(rec(), { storage, store, now: NOW });

  assert.equal(out.ok, true);
  assert.equal(storage.signCalls, 1);
  assert.equal(store.rows.get(out.record.recording_id).upload_state, "uploading");
});

test("prepare: metadata persistence failure prevents signed URL issuance", async () => {
  const storage = fakeStorage();
  const store = casStore({ failFirstPersist: true });
  const out = await createSignedUploadIntent(rec(), { storage, store, now: NOW });

  assert.equal(out.ok, false);
  assert.equal(out.reason, "forced_persist_failure");
  assert.equal(storage.signCalls, 0);
});

test("persist: CAS rejects stale concurrent finalize/retry writes", async () => {
  const store = casStore();
  const base = rec();
  const first = await persistRecording(base, { store, expectedVersion: 0 });
  assert.equal(first.ok, true);

  const retryA = { ...base, upload_state: "retry_waiting", version: 2 };
  const retryB = { ...base, upload_state: "completed", version: 2 };
  assert.equal((await persistRecording(retryA, { store, expectedVersion: 1 })).ok, true);
  const stale = await persistRecording(retryB, { store, expectedVersion: 1 });
  assert.equal(stale.ok, false);
  assert.equal(stale.status, PERSISTENCE.CONFLICT);
});

test("finalize: Process Scan update must read back active recording before completion is reported", async () => {
  const storage = fakeStorage();
  const store = casStore();
  const prep = await createSignedUploadIntent(rec(), { storage, store, now: NOW });
  storage._put(prep.upload.object_path, { size_bytes: 1024, mime_type: "video/webm", checksum_sha256: "abc123" });

  const result = await finalizeVerifiedUpload(prep.record, {
    storage,
    store,
    now: NOW,
    updateScan: async () => ({ id: SCAN_ID, recording_status: "uploaded", active_recording_id: prep.record.recording_id }),
    readScan: async () => ({ id: SCAN_ID, recording_status: "recorded_upload_pending", active_recording_id: null }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "process_scan_read_back_failed");
});

test("verify: missing storage checksum falls back truthfully to size/type verification", async () => {
  const storage = fakeStorage();
  const prepared = await createSignedUploadIntent(rec(), { storage, store: casStore(), now: NOW });
  storage._put(prepared.upload.object_path, { size_bytes: 1024, mime_type: "video/webm", checksum_sha256: "" });

  const done = await verifyAndComplete({ ...prepared.record, upload_state: "uploaded_unverified" }, storage, { now: NOW });
  assert.equal(done.ok, true);
  assert.equal(done.record.verification.checksum, "not_available");
  assert.equal(done.record.verification.method, "size_type");
});

test("migration: recording metadata has scan FK and active_recording_id uses safe FK strategy", () => {
  const sql = readFileSync(new URL("../supabase/process_scan_recordings_schema.sql", import.meta.url), "utf8").toLowerCase();
  assert.match(sql, /scan_id\s+text\s+not null\s+references public\.process_scans\(id\)/);
  assert.match(sql, /active_recording_id text/);
  assert.match(sql, /foreign key \(active_recording_id\)\s+references public\.process_scan_recordings\(recording_id\)/);
});
