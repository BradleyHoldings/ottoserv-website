// ─── Front Office recording rail: Supabase Storage client (server-only) ───────
//
// Wraps Supabase Storage REST for a PRIVATE bucket. SERVER-ONLY: it uses the
// service-role key and must never be imported into browser code. It issues
// short-lived signed upload + download URLs (so the browser never sees the service
// key), verifies object existence + metadata (read-after-write), and deletes.
//
// Private bucket only. No public object URLs are ever produced here.

import { getSupabaseConfig } from "../socialSupabaseStore.mjs";

export const RECORDING_BUCKET = process.env.RECORDING_BUCKET || "process-scan-recordings";
export const SIGNED_UPLOAD_TTL = Number(process.env.RECORDING_UPLOAD_TTL_SECONDS || 600);   // 10 min
export const SIGNED_DOWNLOAD_TTL = Number(process.env.RECORDING_DOWNLOAD_TTL_SECONDS || 120); // 2 min

function clean(v) { return String(v ?? "").trim(); }
function headers(key, extra = {}) { return { apikey: key, Authorization: `Bearer ${key}`, ...extra }; }

export function describeStorageConfig() {
  const cfg = getSupabaseConfig();
  return {
    configured: Boolean(cfg),
    bucket: RECORDING_BUCKET,
    private: true,
    schema_file: "supabase/process_scan_recordings_schema.sql",
    reason: cfg ? "configured" : "supabase_not_configured",
  };
}

/**
 * Build the server-side storage client. Returns null when Supabase is unconfigured.
 * All methods THROW on transport failure so callers never treat a failure as
 * "object absent" (which would let a failed upload look complete).
 */
export function makeStorageClient(options = {}) {
  const cfg = options.config || getSupabaseConfig();
  if (!cfg) return null;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const root = cfg.url.replace(/\/$/, "");
  const bucket = clean(options.bucket) || RECORDING_BUCKET;

  // Issue a short-lived signed UPLOAD url. The browser PUTs the file to this url;
  // it never receives the service key. (Supabase: POST /storage/v1/object/upload/sign/{bucket}/{path})
  async function signUpload(objectPath, ttl = SIGNED_UPLOAD_TTL) {
    const res = await fetchImpl(`${root}/storage/v1/object/upload/sign/${bucket}/${objectPath}`, {
      method: "POST", headers: headers(cfg.key, { "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn: ttl }),
    });
    if (!res.ok) throw new Error(`sign_upload_failed_${res.status}`);
    const body = await res.json();
    return { url: `${root}/storage/v1${clean(body.url)}`, token: clean(body.token), expires_in: ttl };
  }

  // Verify object existence + metadata via HEAD/info. Returns null if absent.
  async function headObject(objectPath) {
    const res = await fetchImpl(`${root}/storage/v1/object/info/${bucket}/${objectPath}`, {
      method: "GET", headers: headers(cfg.key), cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`head_object_failed_${res.status}`);
    const info = await res.json();
    return {
      object_path: objectPath,
      size_bytes: Number(info?.size ?? info?.metadata?.size ?? 0),
      mime_type: clean(info?.contentType || info?.metadata?.mimetype),
      checksum_sha256: clean(info?.metadata?.checksum_sha256 || info?.checksum || ""),
      last_modified: clean(info?.updated_at || info?.lastModified || ""),
    };
  }

  // Short-lived signed DOWNLOAD url for admin playback. Private bucket → no public url.
  async function signDownload(objectPath, ttl = SIGNED_DOWNLOAD_TTL) {
    const res = await fetchImpl(`${root}/storage/v1/object/sign/${bucket}/${objectPath}`, {
      method: "POST", headers: headers(cfg.key, { "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn: ttl }),
    });
    if (!res.ok) throw new Error(`sign_download_failed_${res.status}`);
    const body = await res.json();
    return { url: `${root}/storage/v1${clean(body.signedURL || body.signedUrl)}`, expires_in: ttl, expires_at: new Date(Date.now() + ttl * 1000).toISOString() };
  }

  async function deleteObject(objectPath) {
    const res = await fetchImpl(`${root}/storage/v1/object/${bucket}/${objectPath}`, {
      method: "DELETE", headers: headers(cfg.key),
    });
    if (!res.ok && res.status !== 404) throw new Error(`delete_failed_${res.status}`);
    return { ok: true, deleted: res.ok, already_absent: res.status === 404 };
  }

  return { configured: true, bucket, signUpload, headObject, signDownload, deleteObject };
}
