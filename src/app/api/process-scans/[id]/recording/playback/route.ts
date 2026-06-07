import { NextRequest, NextResponse } from "next/server";
import { issuePlaybackUrl } from "@/lib/recordingStorage/recordingRail.mjs";
import { makeStorageClient } from "@/lib/recordingStorage/storage.mjs";
import { makeRecordingStore } from "@/lib/recordingStorage/store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_API_TOKEN || "";
  return Boolean(expected && token && token === expected);
}

// GET — admin-only: mint a SHORT-LIVED signed playback URL for a completed,
// non-deleted recording. The URL is never persisted, never public, and expires fast.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const recordingId = request.nextUrl.searchParams.get("recording_id") || "";
  if (!recordingId) return NextResponse.json({ error: "missing_recording_id" }, { status: 400 });

  const storage = makeStorageClient();
  const store = makeRecordingStore();
  if (!storage || !store) return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });

  const record = await store.readById(recordingId);
  if (!record || record.scan_id !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const signed = await issuePlaybackUrl(record, storage);
  if (!signed.ok) return NextResponse.json({ error: signed.reason }, { status: 409 });
  return NextResponse.json({ url: signed.url, expires_in: signed.expires_in, expires_at: signed.expires_at });
}
