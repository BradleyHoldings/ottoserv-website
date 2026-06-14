function clean(v) { return String(v ?? "").trim(); }
function isoTimestamp(v) {
  const s = clean(v);
  if (!s) return "";
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    const ms = n > 100000000000 ? n : n * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
}
function secondsFromRetell(call = {}) {
  if (call.duration_seconds !== undefined) return Number(call.duration_seconds || 0);
  if (call.duration_ms !== undefined) return Math.round(Number(call.duration_ms || 0) / 1000);
  return Number(call.duration || 0);
}
function dynamicVariables(value = {}) {
  const out = {};
  for (const key of ["contact_name", "business_name", "context"]) {
    const v = clean(value[key]);
    if (v) out[key] = v;
  }
  return out;
}

export function readRetellConfig(env = process.env) {
  const fromNumberRef = clean(env.RETELL_PHONE_NUMBER || env.RETELL_FROM_NUMBER || env.RETELL_PHONE_NUMBER_ID);
  return {
    configured: Boolean(clean(env.RETELL_API_KEY) && clean(env.RETELL_AGENT_ID) && fromNumberRef),
    api_key: clean(env.RETELL_API_KEY),
    agent_id: clean(env.RETELL_AGENT_ID),
    from_number: fromNumberRef,
    from_number_ref: fromNumberRef,
    base_url: clean(env.RETELL_BASE_URL) || "https://api.retellai.com",
  };
}

export function sanitizeRetellError(err) {
  return clean(err?.message || err).replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]").slice(0, 300);
}

export function makeRetellTransport(options = {}) {
  const cfg = options.config || readRetellConfig(options.env);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (!cfg.configured) return null;
  const root = cfg.base_url.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${cfg.api_key}` };

  return {
    provider: "retell",
    async placeCall(intent) {
      const fromNumber = clean(intent.from_number || intent.fromNumber || cfg.from_number);
      const body = {
        to_number: clean(intent.phone),
        from_number: fromNumber,
        override_agent_id: cfg.agent_id || undefined,
        metadata: {
          execution_id: clean(intent.execution_id),
          lead_id: clean(intent.lead_id),
          idempotency_key: clean(intent.idempotency_key),
          approved_script_ref: clean(intent.approved_script_ref),
          approved_angle: clean(intent.approved_angle),
          dynamic_variables_present: Object.keys(dynamicVariables(intent.dynamic_variables)).length > 0,
        },
      };
      const vars = dynamicVariables(intent.dynamic_variables);
      if (Object.keys(vars).length) body.retell_llm_dynamic_variables = vars;
      if (!body.from_number) throw new Error("retell_from_number_missing");
      const res = await fetchImpl(`${root}/v2/create-phone-call`, {
        method: "POST",
        headers: { ...headers, "Idempotency-Key": clean(intent.idempotency_key) },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`retell_place_call_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}`);
      const json = await res.json();
      return normalizeRetellCall(json);
    },
    async lookupCall(provider_call_id) {
      const res = await fetchImpl(`${root}/v2/get-call/${encodeURIComponent(provider_call_id)}`, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`retell_lookup_failed_${res.status}:${(await res.text().catch(() => "")).slice(0, 200)}`);
      return normalizeRetellCall(await res.json());
    },
  };
}

export function normalizeRetellCall(raw = {}) {
  const call = raw.call || raw;
  const successful = call.call_analysis?.call_successful;
  return {
    provider_call_id: clean(call.call_id || call.id),
    status: clean(call.call_status || call.status),
    outcome: clean(call.outcome || call.disconnection_reason || (successful ? "connected" : "")),
    started_at: isoTimestamp(call.start_timestamp || call.started_at),
    ended_at: isoTimestamp(call.end_timestamp || call.ended_at),
    duration_seconds: secondsFromRetell(call),
    recording_url: clean(call.recording_url),
    transcript_url: clean(call.transcript_url),
    summary: clean(call.call_analysis?.call_summary || call.summary || call.transcript),
  };
}
