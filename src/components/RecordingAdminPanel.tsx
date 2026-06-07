"use client";

import { useState } from "react";

// Admin-only recording panel for the Process Scan detail page. Surfaces truthful
// recording availability, audio status, upload state, and object reference, and
// provides short-lived signed-URL playback + deletion. It NEVER renders a public
// URL; playback uses a fresh, expiring signed URL fetched through the admin API.
export default function RecordingAdminPanel({
  scanId,
  token,
  recordingStatus,
  audioIncluded,
  audioStatus,
  activeRecordingId,
}: {
  scanId: string;
  token: string;
  recordingStatus: string;
  audioIncluded: boolean;
  audioStatus: string;
  activeRecordingId: string | null;
}) {
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [deleted, setDeleted] = useState(false);

  const isDurable = recordingStatus === "uploaded" && Boolean(activeRecordingId) && !deleted;

  async function loadPlayback() {
    if (!activeRecordingId) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/process-scans/${encodeURIComponent(scanId)}/recording/playback?recording_id=${encodeURIComponent(activeRecordingId)}`,
        { headers: { "x-admin-token": token }, cache: "no-store" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error || `Could not load playback (${res.status}).`);
        return;
      }
      setPlaybackUrl(body.url);
      setExpiresAt(body.expires_at || "");
    } catch {
      setMessage("Playback request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecording() {
    if (!activeRecordingId) return;
    if (!window.confirm("Delete this recording? This removes the stored object and downgrades the recording status.")) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/process-scans/${encodeURIComponent(scanId)}/recording?recording_id=${encodeURIComponent(activeRecordingId)}`,
        { method: "DELETE", headers: { "x-admin-token": token } },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error || `Delete failed (${res.status}).`);
        return;
      }
      setDeleted(true);
      setPlaybackUrl("");
      setMessage("Recording deleted. Status downgraded to not provided.");
    } catch {
      setMessage("Delete request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <Meta label="Availability" value={isDurable ? "Durable (verified)" : recordingStatus.replaceAll("_", " ")} />
        <Meta label="Audio" value={audioIncluded ? "Narration captured" : audioStatus.replaceAll("_", " ")} />
        <Meta label="Upload status" value={deleted ? "deleted" : recordingStatus.replaceAll("_", " ")} />
        <Meta label="Recording ref" value={activeRecordingId || "—"} />
      </div>

      {recordingStatus === "recorded_upload_pending" && (
        <p className="rounded border border-yellow-900 bg-yellow-950/30 p-3 text-xs text-yellow-200">
          Pending: the recording was captured but has not been verified in durable storage. Do not treat this as durable evidence until it shows verified.
        </p>
      )}

      {isDurable ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={loadPlayback}
            disabled={busy}
            className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Working..." : playbackUrl ? "Refresh signed URL" : "Load playback (signed URL)"}
          </button>
          {playbackUrl && (
            <>
              <video controls src={playbackUrl} className="aspect-video w-full rounded bg-black" />
              {expiresAt && <p className="text-xs text-gray-500">Signed URL expires at {expiresAt}.</p>}
            </>
          )}
          <button
            type="button"
            onClick={deleteRecording}
            disabled={busy}
            className="rounded border border-red-800 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-50"
          >
            Delete recording
          </button>
        </div>
      ) : (
        <p className="text-gray-400">
          No durable recording available. A verified upload is required before playback is offered.
        </p>
      )}

      {message && <p className="text-xs text-gray-300">{message}</p>}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-800 bg-[#0d0d0d] p-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-gray-200">{value}</p>
    </div>
  );
}
