function clean(v) { return String(v ?? "").trim(); }

function digits(v) { return clean(v).replace(/\D/g, ""); }

function last(value, count = 6) {
  const s = clean(value);
  return s ? s.slice(-count) : "";
}

function maskPhone(value) {
  const d = digits(value);
  if (!d) return "";
  return `***${d.slice(-4)}`;
}

function sanitizeRetellShape(value) {
  if (Array.isArray(value)) return value.map(sanitizeRetellShape);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (/^(api_key|token|secret|authorization|credential)$/i.test(key) || /_(token|secret|credential)$/i.test(key)) {
      out[key] = "[redacted]";
    } else if (/^(phone_number|from_number|to_number|e164|number)$/i.test(key) && typeof item === "string") {
      out[key] = maskPhone(item);
    } else if (/webhook_url|url/i.test(key) && typeof item === "string") {
      out[key] = item ? "[configured]" : "";
    } else {
      out[key] = sanitizeRetellShape(item);
    }
  }
  return out;
}

function extractPhoneNumbers(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.phone_numbers)) return raw.phone_numbers;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.numbers)) return raw.numbers;
  return [];
}

function normalizeCountryList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clean(item).toUpperCase()).filter(Boolean);
}

export function findRetellPhoneNumber(phoneNumbers = [], configuredRef = "") {
  const ref = clean(configuredRef);
  const refDigits = digits(ref);
  return phoneNumbers.find((number) => {
    const candidates = [
      number?.phone_number_id,
      number?.id,
      number?.phone_number,
      number?.number,
      number?.e164,
      number?.sid,
    ].map(clean).filter(Boolean);
    return candidates.some((candidate) => {
      if (candidate === ref) return true;
      const candidateDigits = digits(candidate);
      return Boolean(refDigits && candidateDigits && candidateDigits === refDigits);
    });
  }) || null;
}

export function describeRetellPhoneNumber(phoneNumber, agentId = "") {
  const outboundAgents = Array.isArray(phoneNumber?.outbound_agents) ? phoneNumber.outbound_agents : [];
  const allowedCountries = normalizeCountryList(phoneNumber?.allowed_outbound_country_list);
  const configuredAgentBound = outboundAgents.some((agent) => {
    if (typeof agent === "string") return clean(agent) === clean(agentId);
    return clean(agent?.agent_id || agent?.id) === clean(agentId);
  });
  const hasNoAgentRestriction = outboundAgents.length === 0;
  const type = clean(phoneNumber?.phone_number_type || phoneNumber?.type);
  const e164 = clean(phoneNumber?.phone_number || phoneNumber?.number || phoneNumber?.e164);
  const countryReady = allowedCountries.length === 0 || allowedCountries.includes("US") || allowedCountries.includes("USA");
  const outboundReady = Boolean(e164 && countryReady && (hasNoAgentRestriction || configuredAgentBound));

  return {
    phone_number_last4: maskPhone(e164),
    phone_number_type: type || "unknown",
    allowed_outbound_country_list: allowedCountries,
    outbound_agents_count: outboundAgents.length,
    configured_agent_bound: configuredAgentBound,
    has_no_agent_restriction: hasNoAgentRestriction,
    outbound_ready: outboundReady,
  };
}

export function describeRetellAgent(agent = {}) {
  const events = Array.isArray(agent.webhook_events) ? agent.webhook_events.map(clean).filter(Boolean) : [];
  const responseEngine = agent.response_engine || {};
  return {
    agent_id_last6: last(agent.agent_id || agent.id),
    agent_name: clean(agent.agent_name || agent.name),
    response_engine_type: clean(responseEngine.type || responseEngine.response_engine_type || agent.response_engine_type),
    timezone: clean(agent.timezone),
    webhook_url_present: Boolean(clean(agent.webhook_url)),
    webhook_events: events,
    webhook_events_count: events.length,
  };
}

async function retellJson(fetchImpl, root, apiKey, path) {
  const response = await fetchImpl(`${root}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`retell_${path.replace(/[^a-z0-9]+/gi, "_")}_${response.status}:${text.slice(0, 160)}`);
  }
  return response.json();
}

async function firstSuccessful(calls) {
  const errors = [];
  for (const call of calls) {
    try {
      return { ok: true, value: await call() };
    } catch (err) {
      errors.push(clean(err?.message || err));
    }
  }
  return { ok: false, errors };
}

export async function buildRetellReadinessReport(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const root = clean(env.RETELL_BASE_URL || options.baseUrl || "https://api.retellai.com").replace(/\/$/, "");
  const apiKey = clean(env.RETELL_API_KEY);
  const agentId = clean(env.RETELL_AGENT_ID);
  const phoneRef = clean(env.RETELL_PHONE_NUMBER_ID || env.RETELL_PHONE_NUMBER || env.RETELL_FROM_NUMBER);
  const report = {
    ok: false,
    retell: {
      api_key_present: Boolean(apiKey),
      api_key_verified: false,
      phone_number_ref_present: Boolean(phoneRef),
      phone_number_owned: false,
      outbound_ready: false,
      agent_id_present: Boolean(agentId),
      agent_exists: false,
      agent_appropriate: false,
      webhook_configured: false,
    },
    configured: {
      agent_id_last6: last(agentId),
      phone_number_ref_last4: maskPhone(phoneRef) || last(phoneRef),
    },
    phone_number: null,
    agent: null,
    errors: [],
  };

  if (!apiKey || !agentId || !phoneRef) {
    report.errors.push("retell_runtime_env_missing");
    return report;
  }

  const phonesResult = await firstSuccessful([
    () => retellJson(fetchImpl, root, apiKey, "/v2/list-phone-numbers"),
    () => retellJson(fetchImpl, root, apiKey, "/list-phone-numbers"),
  ]);
  if (!phonesResult.ok) {
    report.errors.push(...phonesResult.errors.map((err) => err.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")));
    return report;
  }
  report.retell.api_key_verified = true;

  const phoneNumbers = extractPhoneNumbers(phonesResult.value);
  const phoneNumber = findRetellPhoneNumber(phoneNumbers, phoneRef);
  report.retell.phone_number_owned = Boolean(phoneNumber);
  if (phoneNumber) {
    report.phone_number = describeRetellPhoneNumber(phoneNumber, agentId);
    report.retell.outbound_ready = report.phone_number.outbound_ready;
  }

  const agentResult = await firstSuccessful([
    () => retellJson(fetchImpl, root, apiKey, `/get-agent/${encodeURIComponent(agentId)}`),
    () => retellJson(fetchImpl, root, apiKey, `/v2/get-agent/${encodeURIComponent(agentId)}`),
  ]);
  if (!agentResult.ok) {
    report.errors.push(...agentResult.errors.map((err) => err.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")));
    return report;
  }

  const agent = agentResult.value?.agent || agentResult.value;
  report.retell.agent_exists = clean(agent?.agent_id || agent?.id) === agentId;
  report.agent = describeRetellAgent(agent);
  report.retell.webhook_configured = report.agent.webhook_url_present || report.agent.webhook_events_count > 0;
  report.retell.agent_appropriate = Boolean(report.retell.agent_exists && (report.agent.agent_name || report.agent.response_engine_type));
  report.ok = Boolean(report.retell.api_key_verified && report.retell.phone_number_owned && report.retell.outbound_ready && report.retell.agent_exists && report.retell.agent_appropriate);
  if (!report.ok) report.errors.push("retell_readiness_gate_failed");
  return sanitizeRetellShape(report);
}
