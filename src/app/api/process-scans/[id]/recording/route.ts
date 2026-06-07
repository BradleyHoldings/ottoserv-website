import { NextRequest, NextResponse } from "next/server";
import { getProcessScan, updateProcessScan } from "@/lib/processScans";
import {
  createRecordingRecord, createSignedUploadIntent, finalizeVerifiedUpload, deleteRecording,
} from "@/lib/recordingStorage/recordingRail.mjs";
import { makeStorageClient } from "@/lib/recordingStorage/storage.mjs";
import { makeRecordingStore, persistRecording } from "@/lib/recordingStorage/store.mjs";
import { isSafeScanId } from "@/lib/recordingStorage/lifecycle.mjs";
import { verifyProcessScanCapability } from "@/lib/processScanCapability.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_API_TOKEN || "";
  return Boolean(expected && token && token === expected);
}

function getUploadCapability(req: NextRequest, body: Record<string, unknown>): string {
  return req.headers.get("x-process-scan-upload-token") || String(body.upload_capability || "");
}

// POST — issue a short-lived signed upload target for a consenting submitter.
// Scan-scoped, consent-gated, type/size validated. The browser never sees the
// service key; it PUTs to the returned signed URL. Returns the object path so the
// client can call PUT (finalize) after the upload completes.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSafeScanId(id)) return NextResponse.json({ error: "invalid_scan_id" }, { status: 400 });
  const scan = await getProcessScan(id);
  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const capability = verifyProcessScanCapability(getUploadCapability(request, body), id);
  if (!capability.ok) return NextResponse.json({ error: capability.reason }, { status: 401 });

  const storage = makeStorageClient();
  const store = makeRecordingStore();
  if (!storage || !store) return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });

  const record = createRecordingRecord({
    scan_id: id,
    attempt: Number(body.attempt ?? 0),
    mime_type: String(body.mime_type ?? "video/webm"),
    size_bytes: Number(body.size_bytes ?? 0),
    checksum_sha256: String(body.checksum_sha256 ?? ""),
    audio_included: Boolean(body.audio_included),
    consent: body.consent,
  });
  if (!record) return NextResponse.json({ error: "invalid_record" }, { status: 400 });

  const prep = await createSignedUploadIntent(record, { storage, store, persist: persistRecording });
  if (!prep.ok) return NextResponse.json({ error: prep.reason }, { status: 400 });

  return NextResponse.json({
    recording_id: prep.record.recording_id,
    object_path: prep.upload.object_path,
    upload_url: prep.upload.url,
    upload_token: prep.upload.token,
    expires_in: prep.upload.expires_in,
    upload_state: prep.record.upload_state,
  });
}

// PUT — finalize: the browser reports its PUT finished; the server VERIFIES the
// object truly exists with matching metadata before marking completed. Never
// trusts the client's word alone.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSafeScanId(id)) return NextResponse.json({ error: "invalid_scan_id" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const capability = verifyProcessScanCapability(getUploadCapability(request, body), id);
  if (!capability.ok) return NextResponse.json({ error: capability.reason }, { status: 401 });
  const recordingId = String(body.recording_id ?? "");
  if (!recordingId) return NextResponse.json({ error: "missing_recording_id" }, { status: 400 });

  const storage = makeStorageClient();
  const store = makeRecordingStore();
  if (!storage || !store) return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });

  const record = await store.readById(recordingId);
  if (!record || record.scan_id !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const done = await finalizeVerifiedUpload(record, {
    storage,
    store,
    persist: persistRecording,
    updateScan: (scanId: string, patch: Record<string, unknown>) => updateProcessScan(scanId, patch as never),
    readScan: getProcessScan,
  });

  if (!done.ok) {
    return NextResponse.json({ ok: false, upload_state: done.record?.upload_state, reason: done.reason }, { status: 202 });
  }
  return NextResponse.json({ ok: true, upload_state: done.record.upload_state, recording_status: "uploaded" });
}

// DELETE — admin-only: remove the object and downgrade status truthfully.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const recordingId = request.nextUrl.searchParams.get("recording_id") || "";
  if (!recordingId) return NextResponse.json({ error: "missing_recording_id" }, { status: 400 });

  const storage = makeStorageClient();
  const store = makeRecordingStore();
  if (!storage || !store) return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });

  const record = await store.readById(recordingId);
  if (!record || record.scan_id !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const del = await deleteRecording(record, storage, { reason: "admin_deleted" });
  await persistRecording(del.record, { store });
  await updateProcessScan(id, { recording_status: "not_provided", active_recording_id: null } as never);
  return NextResponse.json({ ok: del.ok, upload_state: del.record.upload_state });
}
