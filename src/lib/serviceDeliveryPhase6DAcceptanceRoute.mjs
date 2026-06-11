function clean(value) {
  return String(value ?? "").trim();
}

function bearer(value) {
  return clean(value).replace(/^Bearer\s+/i, "");
}

function parseCookieHeader(value = "") {
  const out = new Map();
  for (const part of clean(value).split(";")) {
    const [rawName, ...rawValue] = part.split("=");
    const name = clean(rawName);
    if (!name) continue;
    out.set(name, clean(rawValue.join("=")));
  }
  return out;
}

function hasSuperAdminCookie(request) {
  const cookies = parseCookieHeader(request?.headers?.get?.("cookie"));
  if (cookies.get("ottoserv_token") !== "super_admin_token") return false;
  try {
    const userCookie = cookies.get("ottoserv_current_user") || cookies.get("ottoserv_user") || "";
    const user = JSON.parse(decodeURIComponent(userCookie));
    return user?.role === "super_admin" && user?.isOttoServEmployee === true && Boolean(clean(user?.email));
  } catch {
    return false;
  }
}

function envPresence(env = process.env) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(clean(env.NEXT_PUBLIC_SUPABASE_URL)),
    SUPABASE_URL: Boolean(clean(env.SUPABASE_URL)),
    SUPABASE_SERVICE_KEY: Boolean(clean(env.SUPABASE_SERVICE_KEY)),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(clean(env.SUPABASE_SERVICE_ROLE_KEY)),
    SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE: clean(env.SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE) === "true",
    ADMIN_API_TOKEN: Boolean(clean(env.ADMIN_API_TOKEN)),
  };
}

export function authorizePhase6DAcceptanceRequest(request, env = process.env) {
  if (hasSuperAdminCookie(request)) return { ok: true, auth_method: "ottoserv_super_admin_cookie" };
  const expected = clean(env.ADMIN_API_TOKEN);
  if (!expected) return { ok: false, status: 503, reason: "admin_token_not_configured" };
  const provided = clean(request?.headers?.get?.("x-admin-token")) || bearer(request?.headers?.get?.("authorization"));
  if (provided !== expected) return { ok: false, status: 401, reason: "unauthorized" };
  return { ok: true, auth_method: "admin_api_token" };
}

export async function buildPhase6DAcceptanceOptions(body = {}, env = process.env) {
  const envSeen = envPresence(env);
  if (!envSeen.SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE) {
    return { ok: false, status: 423, reason: "controlled_real_acceptance_disabled", env: envSeen };
  }

  const hasUrl = envSeen.NEXT_PUBLIC_SUPABASE_URL || envSeen.SUPABASE_URL;
  const hasKey = envSeen.SUPABASE_SERVICE_KEY || envSeen.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasUrl || !hasKey) {
    return { ok: false, status: 424, reason: "supabase_runtime_env_missing", env: envSeen };
  }

  const runId = clean(body.run_id || body.runId);
  if (!/^PHASE6D_CTRL_REAL_[A-Z0-9_]+CLEANME$/.test(runId)) {
    return { ok: false, status: 400, reason: "synthetic_run_id_required", env: envSeen };
  }

  return {
    ok: true,
    env: envSeen,
    options: {
      runId,
      now: clean(body.now) || undefined,
    },
  };
}

export function sanitizePhase6DAcceptanceReport(report = {}) {
  const sanitized = JSON.parse(JSON.stringify(report));
  if (sanitized.dashboard_export) {
    delete sanitized.dashboard_export.latest_path;
  }
  return {
    ...sanitized,
    no_live_retell_stripe_email_n8n: true,
  };
}
