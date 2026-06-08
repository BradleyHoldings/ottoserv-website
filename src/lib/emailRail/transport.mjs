// Phase 2 email execution rail: approved provider transport resolver.
//
// OttoServ's approved production sender rail is Google Workspace/Gmail. This
// module deliberately does not add Resend/Postmark as new production dependencies.
// A credentialed Gmail transport must be injected by the approved runtime, and
// credentials must never be returned, logged, or placed in evidence payloads.

function clean(v) { return String(v ?? "").trim(); }

export function emailProviderName(env = process.env) {
  const explicit = clean(env.HERMES_EMAIL_PROVIDER).toLowerCase();
  if (explicit) return explicit;
  if (
    env.HERMES_GMAIL_TRANSPORT_READY
    || env.GOOGLE_WORKSPACE_EMAIL_READY
    || clean(env.HERMES_N8N_EMAIL_SEND_WEBHOOK)
    || clean(env.HERMES_GMAIL_SEND_WEBHOOK)
    || clean(env.N8N_AGENT_EMAIL_SEND_WEBHOOK_URL)
  ) return "gmail_workspace";
  return "";
}

function configuredWebhookUrl(env) {
  return clean(env.HERMES_N8N_EMAIL_SEND_WEBHOOK)
    || clean(env.HERMES_GMAIL_SEND_WEBHOOK)
    || clean(env.N8N_AGENT_EMAIL_SEND_WEBHOOK_URL);
}

function configuredReplyLookupWebhookUrl(env) {
  return clean(env.HERMES_N8N_EMAIL_REPLY_LOOKUP_WEBHOOK)
    || clean(env.HERMES_GMAIL_REPLY_LOOKUP_WEBHOOK);
}

function authHeaders(env) {
  const token = clean(env.HERMES_N8N_EMAIL_WEBHOOK_TOKEN) || clean(env.HERMES_N8N_WEBHOOK_TOKEN);
  if (!token) return {};
  const headerName = clean(env.HERMES_N8N_EMAIL_AUTH_HEADER) || "x-hermes-email-token";
  const scheme = clean(env.HERMES_N8N_EMAIL_AUTH_SCHEME).toLowerCase();
  if (headerName.toLowerCase() === "authorization") {
    return { Authorization: scheme === "raw" ? token : `Bearer ${token}` };
  }
  return { [headerName]: token };
}

function firstPayload(body) {
  if (Array.isArray(body)) return body[0] || {};
  if (Array.isArray(body?.data)) return body.data[0] || {};
  if (body?.json && typeof body.json === "object") return body.json;
  return body || {};
}

export function normalizeGmailWebhookResult(body = {}, draft = {}) {
  const payload = firstPayload(body);
  const nested = firstPayload(payload?.message || payload?.email || payload?.result || payload?.data || {});
  const src = Object.keys(nested || {}).length ? { ...payload, ...nested } : payload;
  return {
    message_id: clean(src.message_id) || clean(src.messageId) || clean(src.id) || clean(src.gmailMessageId) || clean(src.provider_message_id),
    thread_id: clean(src.thread_id) || clean(src.threadId) || clean(src.gmailThreadId) || clean(src.provider_thread_id),
    accepted: src.accepted === undefined ? clean(src.status).toLowerCase() !== "rejected" : Boolean(src.accepted),
    status: clean(src.status) || "accepted",
    from: clean(src.from) || clean(draft.from),
    to: clean(src.to) || clean(draft.to),
    provider_timestamp: clean(src.provider_timestamp) || clean(src.sent_at) || clean(src.date),
    source: "n8n_gmail_workspace",
  };
}

export function buildN8nGmailTransport(env = process.env, options = {}) {
  const url = configuredWebhookUrl(env);
  if (!url) return null;
  if (!/^https:\/\//i.test(url) && env.HERMES_ALLOW_INSECURE_EMAIL_WEBHOOK !== "1") {
    throw new Error("gmail_webhook_must_be_https");
  }
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  return async function n8nGmailTransport(draft = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(env.HERMES_EMAIL_WEBHOOK_TIMEOUT_MS || 30000));
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(env) },
        signal: controller.signal,
        body: JSON.stringify({
          provider: "gmail_workspace",
          from: clean(draft.from),
          to: clean(draft.to),
          subject: clean(draft.subject),
          body: clean(draft.body),
          message: clean(draft.body),
          idempotency_key: clean(draft.idempotency_key),
          controlled: true,
        }),
      });
      const text = await res.text();
      let parsed = {};
      try { parsed = text ? JSON.parse(text) : {}; } catch (_) { parsed = { status: text }; }
      if (!res.ok) throw new Error(`gmail_webhook_${res.status}`);
      return normalizeGmailWebhookResult(parsed, draft);
    } finally {
      clearTimeout(timeout);
    }
  };
}

export function normalizeGmailReplyLookupResult(body = {}) {
  const payload = firstPayload(body);
  if (!payload?.reply_found && clean(payload.status) === "not_found") return null;
  const message_id = clean(payload.provider_event_id) || clean(payload.message_id) || clean(payload.id);
  if (!message_id) return null;
  return {
    provider_event_id: message_id,
    message_id,
    thread_id: clean(payload.thread_id) || clean(payload.threadId),
    from: clean(payload.from),
    to: clean(payload.to),
    subject: clean(payload.subject),
    body: clean(payload.body) || clean(payload.body_preview) || clean(payload.snippet),
    snippet: clean(payload.snippet) || clean(payload.body_preview),
    date: clean(payload.date) || clean(payload.provider_timestamp),
    source: "n8n_gmail_workspace",
  };
}

export function buildN8nGmailReplyLookup(env = process.env, options = {}) {
  const url = configuredReplyLookupWebhookUrl(env);
  if (!url) return undefined;
  if (!/^https:\/\//i.test(url) && env.HERMES_ALLOW_INSECURE_EMAIL_WEBHOOK !== "1") {
    throw new Error("gmail_reply_lookup_webhook_must_be_https");
  }
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  return async function n8nGmailReplyLookup(_idempotencyKey = "", _executionId = "", context = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(env.HERMES_EMAIL_WEBHOOK_TIMEOUT_MS || 30000));
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(env) },
        signal: controller.signal,
        body: JSON.stringify({
          provider: "gmail_workspace",
          idempotency_key: clean(_idempotencyKey),
          execution_id: clean(_executionId),
          thread_id: clean(context.thread_id) || clean(context.provider_thread_id),
          from: clean(context.from) || clean(env.HERMES_EMAIL_CONTROLLED_RECIPIENT),
          newer_than: clean(context.newer_than) || "14d",
        }),
      });
      const text = await res.text();
      let parsed = {};
      try { parsed = text ? JSON.parse(text) : {}; } catch (_) { parsed = { status: text }; }
      if (!res.ok) throw new Error(`gmail_reply_lookup_webhook_${res.status}`);
      return normalizeGmailReplyLookupResult(parsed);
    } finally {
      clearTimeout(timeout);
    }
  };
}

// Returns { ok, transport?, lookup?, reason } and never any credential value.
export function buildProviderTransport(env = process.env, options = {}) {
  const provider = emailProviderName(env);
  if (!provider) return { ok: false, reason: "no_provider_configured" };

  if (["gmail_workspace", "gmail", "google_workspace"].includes(provider)) {
    const transport = typeof options.transport === "function" ? options.transport : buildN8nGmailTransport(env, options);
    if (typeof transport !== "function") {
      return { ok: false, provider: "gmail_workspace", reason: "gmail_transport_not_wired" };
    }
    return {
      ok: true,
      provider: "gmail_workspace",
      transport,
      lookup: typeof options.lookup === "function" ? options.lookup : buildN8nGmailReplyLookup(env, options),
    };
  }

  return { ok: false, reason: `unsupported_provider:${provider}` };
}
