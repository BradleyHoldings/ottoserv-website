// Hermes browser bridge provider. The bridge owns the real browser/session.
// This module never stores cookies or credentials; it only calls an explicitly
// configured local/remote bridge and requires structured evidence back.

function clean(value) {
  return String(value ?? "").trim();
}

export function browserBridgeConfig(env = process.env) {
  const baseUrl = clean(env.HERMES_BROWSER_BRIDGE_URL).replace(/\/$/, "");
  const token = clean(env.HERMES_BROWSER_BRIDGE_TOKEN);
  return {
    configured: Boolean(baseUrl),
    baseUrl,
    token,
    provider: clean(env.HERMES_BROWSER_PROVIDER) || "http_bridge",
  };
}

export function createBrowserProvider(options = {}) {
  const config = options.config || browserBridgeConfig(options.env);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (!config.configured || typeof fetchImpl !== "function") return null;

  async function request(path, payload = null, method = "POST") {
    const headers = { "content-type": "application/json" };
    if (config.token) headers.authorization = `Bearer ${config.token}`;
    const response = await fetchImpl(`${config.baseUrl}${path}`, {
      method,
      headers,
      body: payload == null ? undefined : JSON.stringify(payload),
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
    if (!response.ok) {
      const error = new Error(clean(body?.error) || `browser_bridge_${response.status}`);
      error.status = response.status;
      error.details = body;
      throw error;
    }
    return body;
  }

  return {
    provider: config.provider,
    capabilities: () => request("/v1/capabilities", null, "GET"),
    researchLead: (lead) => request("/v1/research/lead", { lead }),
    sendDm: (packet) => request("/v1/dm/send", { packet }),
    inspectDmReplies: (input) => request("/v1/dm/replies", input),
  };
}

export function summarizeBrowserCapabilities(result = {}) {
  const platforms = result.platforms && typeof result.platforms === "object" ? result.platforms : {};
  return {
    browser_available: result.browser_available === true,
    persistent_profile: result.persistent_profile === true,
    research_available: result.research_available === true,
    dm_available: result.dm_available === true,
    platforms,
    blockers: Array.isArray(result.blockers) ? result.blockers : [],
  };
}
