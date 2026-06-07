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
  if (env.HERMES_GMAIL_TRANSPORT_READY || env.GOOGLE_WORKSPACE_EMAIL_READY) return "gmail_workspace";
  return "";
}

// Returns { ok, transport?, lookup?, reason } and never any credential value.
export function buildProviderTransport(env = process.env, options = {}) {
  const provider = emailProviderName(env);
  if (!provider) return { ok: false, reason: "no_provider_configured" };

  if (["gmail_workspace", "gmail", "google_workspace"].includes(provider)) {
    if (typeof options.transport !== "function") {
      return { ok: false, provider: "gmail_workspace", reason: "gmail_transport_not_wired" };
    }
    return {
      ok: true,
      provider: "gmail_workspace",
      transport: options.transport,
      lookup: typeof options.lookup === "function" ? options.lookup : undefined,
    };
  }

  return { ok: false, reason: `unsupported_provider:${provider}` };
}
