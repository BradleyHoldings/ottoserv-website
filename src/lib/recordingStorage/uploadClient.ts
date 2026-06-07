// ─── Front Office recording: browser upload client (no credentials) ───────────
//
// Runs in the browser. It NEVER sees the Supabase service key — it asks our server
// for a short-lived signed upload target, PUTs the blob to it, then asks the server
// to VERIFY + finalize. Truthful status is whatever the server confirms; a failed
// or interrupted upload reports failed/pending, never completed.

export type UploadProgress =
  | "preparing_upload"
  | "uploading"
  | "verifying"
  | "completed"
  | "failed";

export interface UploadResult {
  ok: boolean;
  state: UploadProgress;
  recording_id?: string;
  reason?: string;
}

async function sha256Hex(blob: Blob): Promise<string> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return "";
    const buf = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

/**
 * Upload a recorded blob for a scan. Consent must be explicit. Returns the
 * server-verified terminal state. Idempotent: a retry with the same blob resolves
 * to the same object (no duplicate).
 */
export async function uploadRecording(params: {
  scanId: string;
  uploadCapability: string;
  blob: Blob;
  audioIncluded: boolean;
  consent: { recording: boolean; upload: boolean; consented_at: string };
  attempt?: number;
  onProgress?: (state: UploadProgress) => void;
}): Promise<UploadResult> {
  const { scanId, uploadCapability, blob, audioIncluded, consent, onProgress } = params;
  const report = (s: UploadProgress) => onProgress?.(s);

  if (!consent?.recording || !consent?.upload) {
    return { ok: false, state: "failed", reason: "consent_required" };
  }
  if (!blob || blob.size === 0) return { ok: false, state: "failed", reason: "empty_recording" };
  if (!uploadCapability) return { ok: false, state: "failed", reason: "capability_required" };

  report("preparing_upload");
  const checksum = await sha256Hex(blob);
  const mime = blob.type || "video/webm";

  // 1. Ask the server for a signed upload target (server validates consent/type/size).
  let prep: Record<string, unknown>;
  try {
    const res = await fetch(`/api/process-scans/${encodeURIComponent(scanId)}/recording`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-process-scan-upload-token": uploadCapability },
      body: JSON.stringify({ attempt: params.attempt ?? 0, mime_type: mime, size_bytes: blob.size, checksum_sha256: checksum, audio_included: audioIncluded, consent }),
    });
    prep = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, state: "failed", reason: String(prep.error || `prepare_failed_${res.status}`) };
  } catch (err) {
    return { ok: false, state: "failed", reason: err instanceof Error ? err.message : "prepare_network_error" };
  }

  // 2. PUT the blob to the signed URL (browser → storage, no service key here).
  report("uploading");
  try {
    const put = await fetch(String(prep.upload_url), {
      method: "PUT",
      headers: { "Content-Type": mime, ...(prep.upload_token ? { Authorization: `Bearer ${prep.upload_token}` } : {}) },
      body: blob,
    });
    if (!put.ok) return { ok: false, state: "failed", reason: `put_failed_${put.status}`, recording_id: String(prep.recording_id || "") };
  } catch (err) {
    // Interrupted upload — stays pending/failed, never completed.
    return { ok: false, state: "failed", reason: err instanceof Error ? err.message : "upload_network_error", recording_id: String(prep.recording_id || "") };
  }

  // 3. Finalize: server VERIFIES object existence + metadata before completing.
  report("verifying");
  try {
    const res = await fetch(`/api/process-scans/${encodeURIComponent(scanId)}/recording`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-process-scan-upload-token": uploadCapability },
      body: JSON.stringify({ recording_id: prep.recording_id }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.ok) {
      report("completed");
      return { ok: true, state: "completed", recording_id: String(prep.recording_id || "") };
    }
    report("failed");
    return { ok: false, state: "failed", reason: String(body.reason || "verification_pending"), recording_id: String(prep.recording_id || "") };
  } catch (err) {
    return { ok: false, state: "failed", reason: err instanceof Error ? err.message : "finalize_network_error", recording_id: String(prep.recording_id || "") };
  }
}
