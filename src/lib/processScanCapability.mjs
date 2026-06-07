import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_SECONDS = 2 * 60 * 60;

function clean(value) { return String(value ?? "").trim(); }
function b64url(input) {
  return Buffer.from(input).toString("base64url");
}
function fromB64url(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}
function secretFrom(options = {}) {
  return clean(options.secret) || clean(process.env.PROCESS_SCAN_UPLOAD_SECRET) || clean(process.env.ADMIN_API_TOKEN) || clean(process.env.SUPABASE_SERVICE_KEY);
}

export function issueProcessScanCapability(scanId, options = {}) {
  const secret = secretFrom(options);
  if (!secret) return "";
  const nowMs = Date.parse(options.now || new Date().toISOString());
  const ttl = Number(options.ttlSeconds || DEFAULT_TTL_SECONDS);
  const payload = {
    scan_id: clean(scanId),
    purpose: "process_scan_recording_upload",
    exp: Math.floor((Number.isNaN(nowMs) ? Date.now() : nowMs) / 1000) + ttl,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyProcessScanCapability(token, scanId, options = {}) {
  const secret = secretFrom(options);
  if (!clean(token)) return { ok: false, reason: "capability_missing" };
  if (!secret) return { ok: false, reason: "capability_secret_missing" };
  const [body, sig] = clean(token).split(".");
  if (!body || !sig) return { ok: false, reason: "capability_malformed" };
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return { ok: false, reason: "capability_signature_invalid" };
    }
  } catch {
    return { ok: false, reason: "capability_signature_invalid" };
  }

  let payload;
  try { payload = JSON.parse(fromB64url(body)); }
  catch { return { ok: false, reason: "capability_payload_invalid" }; }
  if (clean(payload.purpose) !== "process_scan_recording_upload") return { ok: false, reason: "purpose_mismatch" };
  if (clean(payload.scan_id) !== clean(scanId)) return { ok: false, reason: "scan_mismatch" };
  const now = Math.floor(Date.parse(options.now || new Date().toISOString()) / 1000);
  if (Number(payload.exp || 0) <= now) return { ok: false, reason: "capability_expired" };
  return { ok: true, scan_id: clean(payload.scan_id), expires_at: new Date(Number(payload.exp) * 1000).toISOString() };
}
