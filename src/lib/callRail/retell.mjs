function clean(v) { return String(v ?? "").trim(); }

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
        },
      };
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
  return {
    provider_call_id: clean(call.call_id || call.id),
    status: clean(call.call_status || call.status),
    outcome: clean(call.disconnection_reason || call.call_analysis?.call_successful ? "connected" : call.outcome),
    started_at: clean(call.start_timestamp || call.started_at),
    ended_at: clean(call.end_timestamp || call.ended_at),
    duration_seconds: Number(call.duration_seconds || call.duration || 0),
    recording_url: clean(call.recording_url),
    transcript_url: clean(call.transcript_url),
    summary: clean(call.call_analysis?.call_summary || call.summary || call.transcript),
  };
}
