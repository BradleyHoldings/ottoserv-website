// ─── Phase 2 email execution rail: provider adapter + evidence ────────────────
//
// Wraps the approved OttoServ email provider. A successful provider result MUST
// carry a real message id; evidence is built ONLY from a real provider response —
// never fabricated. Credentials are NEVER placed in logs, receipts, dashboard
// responses, or tests. A timeout is NOT proof a send did not happen: it yields a
// `sent_unverified` outcome that must be reconciled via provider lookup before any
// retry (rule 6).

function clean(v) { return String(v ?? "").trim(); }

export const SEND_OUTCOME = {
  ACCEPTED: "accepted",       // provider accepted with a real message id
  REJECTED: "rejected",       // provider explicitly rejected (sanitized category)
  UNVERIFIED: "sent_unverified", // ambiguous/timeout — must reconcile, do NOT retry blind
  ERROR: "error",             // local/transport error before any wire attempt
};

// Sanitize a provider/transport error into a safe category. Never leak credentials,
// tokens, or raw provider payloads.
export function sanitizeError(err) {
  const msg = clean(err?.message || err).toLowerCase();
  if (!msg) return "unknown_error";
  if (msg.includes("timeout") || msg.includes("etimedout") || msg.includes("aborted")) return "provider_timeout";
  if (msg.includes("rate") && msg.includes("limit")) return "rate_limited";
  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized") || msg.includes("forbidden")) return "auth_error";
  if (msg.includes("invalid") && msg.includes("recipient")) return "invalid_recipient";
  if (msg.includes("bounce")) return "hard_bounce";
  if (msg.includes("network") || msg.includes("econnrefused") || msg.includes("enotfound")) return "network_error";
  return "provider_error";
}

// Build a provider-evidence record from a REAL transport result. Returns null if
// the result lacks a usable message id — we never invent evidence (rule 4).
export function evidenceFromResult(result, intent, now) {
  const provider_message_id = clean(result?.message_id) || clean(result?.id) || clean(result?.provider_message_id);
  if (!provider_message_id) return null;
  const accepted = result?.accepted !== false && clean(result?.status) !== "rejected";
  return {
    evidence_type: "email_provider_receipt",
    execution_id: clean(intent.execution_id),
    lead_id: clean(intent.lead_id),
    idempotency_key: clean(intent.idempotency_key),
    provider_message_id,
    provider_thread_id: clean(result?.thread_id) || clean(result?.provider_thread_id) || "",
    sender: clean(result?.from) || clean(intent.sender),
    recipient: clean(result?.to) || clean(intent.recipient),
    accepted_status: accepted ? "accepted" : "rejected",
    provider_timestamp: clean(result?.provider_timestamp) || clean(result?.sent_at) || now,
    error_category: accepted ? "" : (clean(result?.error_category) || "rejected"),
    source: clean(result?.source) || "provider",
    recorded_at: now,
  };
}

/**
 * Send via the supplied transport. The transport is a function the caller wires
 * with real credentials (or a stub in tests). This adapter owns the
 * accepted/rejected/timeout classification but performs NO persistence.
 *
 * @param {function} transport (draft) => provider result | throws
 * @param {object} intent durable email intent
 * @param {object} options { now, timeoutMs }
 * @returns { outcome, evidence?, error_category?, raw_status? }
 */
export async function sendViaProvider(transport, intent, options = {}) {
  const now = options.now || new Date().toISOString();
  if (typeof transport !== "function") return { outcome: SEND_OUTCOME.ERROR, error_category: "no_transport" };

  const draft = {
    from: clean(intent.sender),
    to: clean(intent.recipient),
    subject: clean(intent.subject),
    body: clean(intent.body),
    // The idempotency key is passed to the provider where supported so the provider
    // itself dedupes a retried send.
    idempotency_key: clean(intent.idempotency_key),
  };

  let result;
  try {
    result = await transport(draft);
  } catch (err) {
    const category = sanitizeError(err);
    // A timeout/abort is ambiguous: the send may have happened. Do NOT treat it as
    // a clean failure — surface sent_unverified for reconciliation.
    if (category === "provider_timeout" || category === "network_error") {
      return { outcome: SEND_OUTCOME.UNVERIFIED, error_category: category };
    }
    return { outcome: SEND_OUTCOME.ERROR, error_category: category };
  }

  const evidence = evidenceFromResult(result, intent, now);
  if (!evidence) {
    // Provider returned but gave no message id — ambiguous, not a confirmed failure.
    return { outcome: SEND_OUTCOME.UNVERIFIED, error_category: "no_message_id" };
  }
  if (evidence.accepted_status !== "accepted") {
    return { outcome: SEND_OUTCOME.REJECTED, evidence, error_category: evidence.error_category || "rejected" };
  }
  return { outcome: SEND_OUTCOME.ACCEPTED, evidence };
}

/**
 * Reconcile an ambiguous (sent_unverified) outcome via a provider lookup function.
 * Only after this resolves may a retry be considered. Returns the resolved outcome.
 *
 * @param {function} lookup (idempotency_key|execution_id) => provider result|null
 */
export async function reconcileUnverified(lookup, intent, options = {}) {
  const now = options.now || new Date().toISOString();
  if (typeof lookup !== "function") return { outcome: SEND_OUTCOME.UNVERIFIED, reconciled: false, reason: "no_lookup" };
  let found;
  try { found = await lookup(clean(intent.idempotency_key), clean(intent.execution_id)); }
  catch (err) { return { outcome: SEND_OUTCOME.UNVERIFIED, reconciled: false, reason: sanitizeError(err) }; }
  if (!found) {
    // Provider has no record of the send → it is safe to retry.
    return { outcome: SEND_OUTCOME.ERROR, reconciled: true, retry_safe: true, reason: "no_provider_record" };
  }
  const evidence = evidenceFromResult(found, intent, now);
  if (!evidence) return { outcome: SEND_OUTCOME.UNVERIFIED, reconciled: false, reason: "lookup_no_message_id" };
  return { outcome: SEND_OUTCOME.ACCEPTED, reconciled: true, retry_safe: false, evidence };
}
