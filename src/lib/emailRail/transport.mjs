// ─── Phase 2 email execution rail: real provider transport wiring ─────────────
//
// Builds a CREDENTIALED transport function for the approved OttoServ email provider
// from the environment. provider.mjs#sendViaProvider accepts this transport; in
// no_send/test mode no transport is wired and nothing is sent. This module is the
// single place that touches provider credentials — they are read here and NEVER
// returned, logged, or placed in any receipt/evidence/dashboard payload.
//
// Supported providers (selected via HERMES_EMAIL_PROVIDER):
//   - "resend"   → Resend HTTP API   (HERMES_EMAIL_API_KEY or RESEND_API_KEY)
//   - "postmark" → Postmark HTTP API (POSTMARK_SERVER_TOKEN)
//
// A successful provider response is normalized to the shape provider.mjs expects:
//   { message_id, thread_id?, to, from, status, accepted, provider_timestamp }
// On HTTP/transport failure the underlying error propagates so provider.mjs can
// classify timeouts as sent_unverified (rule 6) and sanitize the category.

function clean(v) { return String(v ?? "").trim(); }

export function emailProviderName(env = process.env) {
  const explicit = clean(env.HERMES_EMAIL_PROVIDER).toLowerCase();
  if (explicit) return explicit;
  if (env.RESEND_API_KEY || env.HERMES_EMAIL_API_KEY) return "resend";
  if (env.POSTMARK_SERVER_TOKEN) return "postmark";
  return "";
}

// Returns { ok, transport?, lookup?, reason } — never the credential itself.
export function buildProviderTransport(env = process.env, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const provider = emailProviderName(env);
  if (!provider) return { ok: false, reason: "no_provider_configured" };

  if (provider === "resend") {
    const key = clean(env.HERMES_EMAIL_API_KEY) || clean(env.RESEND_API_KEY);
    if (!key) return { ok: false, reason: "resend_api_key_missing" };
    const transport = async (draft) => {
      const res = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          from: draft.from, to: [draft.to], subject: draft.subject, text: draft.body,
          headers: draft.idempotency_key ? { "X-Entity-Ref-ID": draft.idempotency_key } : undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const err = new Error(`resend_${res.status}:${text.slice(0, 120)}`);
        err.status = res.status;
        throw err;
      }
      const body = await res.json();
      return {
        message_id: clean(body?.id),
        to: draft.to, from: draft.from,
        status: "accepted", accepted: true,
        provider_timestamp: new Date().toISOString(),
        source: "provider",
      };
    };
    // Lookup for reconciliation: Resend GET /emails/{id} by message id.
    const lookup = async (_idem, _exec, messageId) => {
      const id = clean(messageId);
      if (!id) return null;
      const res = await fetchImpl(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) return null;
      const body = await res.json();
      return body?.id ? { message_id: clean(body.id), status: "accepted", accepted: true } : null;
    };
    return { ok: true, provider, transport, lookup };
  }

  if (provider === "postmark") {
    const token = clean(env.POSTMARK_SERVER_TOKEN);
    if (!token) return { ok: false, reason: "postmark_token_missing" };
    const transport = async (draft) => {
      const res = await fetchImpl("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Postmark-Server-Token": token },
        body: JSON.stringify({ From: draft.from, To: draft.to, Subject: draft.subject, TextBody: draft.body }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const err = new Error(`postmark_${res.status}:${text.slice(0, 120)}`);
        err.status = res.status;
        throw err;
      }
      const body = await res.json();
      return {
        message_id: clean(body?.MessageID),
        to: draft.to, from: draft.from,
        status: clean(body?.ErrorCode) === "0" ? "accepted" : "accepted",
        accepted: true,
        provider_timestamp: clean(body?.SubmittedAt) || new Date().toISOString(),
        source: "provider",
      };
    };
    return { ok: true, provider, transport };
  }

  return { ok: false, reason: `unsupported_provider:${provider}` };
}
