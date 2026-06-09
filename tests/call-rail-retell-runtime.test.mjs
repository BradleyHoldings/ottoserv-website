import assert from "node:assert/strict";
import test from "node:test";

import { makeRetellTransport } from "../src/lib/callRail/retell.mjs";
import { buildRetellReadinessReport } from "../src/lib/callRail/retellReadiness.mjs";

test("Retell transport creates outbound calls with owned from_number and override_agent_id", async () => {
  let captured = null;
  const transport = makeRetellTransport({
    config: {
      configured: true,
      api_key: "rk_test_secret",
      agent_id: "agent_phase3",
      from_number: "+15551234567",
      base_url: "https://api.retellai.test",
    },
    fetchImpl: async (url, init) => {
      captured = { url, init, body: JSON.parse(init.body) };
      return {
        ok: true,
        async json() {
          return { call_id: "call_123", call_status: "registered" };
        },
      };
    },
  });

  await transport.placeCall({
    phone: "+15559876543",
    execution_id: "cex_1",
    lead_id: "lead_1",
    idempotency_key: "idem_1",
  });

  assert.equal(captured.url, "https://api.retellai.test/v2/create-phone-call");
  assert.equal(captured.body.from_number, "+15551234567");
  assert.equal(captured.body.to_number, "+15559876543");
  assert.equal(captured.body.override_agent_id, "agent_phase3");
  assert.equal(Object.hasOwn(captured.body, "from_number_id"), false);
  assert.equal(Object.hasOwn(captured.body, "agent_id"), false);
  assert.equal(captured.init.headers.Authorization, "Bearer rk_test_secret");
});

test("Retell readiness verifies key, owned outbound phone number, and configured agent without leaking secrets", async () => {
  const calls = [];
  const report = await buildRetellReadinessReport({
    env: {
      RETELL_API_KEY: "rk_live_secret",
      RETELL_AGENT_ID: "agent_phase3_acceptance",
      RETELL_PHONE_NUMBER_ID: "pn_owned_123",
      RETELL_BASE_URL: "https://api.retellai.test",
    },
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.endsWith("/v2/list-phone-numbers")) {
        return {
          ok: true,
          async json() {
            return {
              phone_numbers: [{
                phone_number_id: "pn_owned_123",
                phone_number: "+15551234567",
                phone_number_type: "retell-twilio",
                allowed_outbound_country_list: ["US"],
                outbound_agents: [{ agent_id: "agent_phase3_acceptance" }],
              }],
            };
          },
        };
      }
      if (url.endsWith("/get-agent/agent_phase3_acceptance")) {
        return {
          ok: true,
          async json() {
            return {
              agent_id: "agent_phase3_acceptance",
              agent_name: "Hermes Phase 3 Synthetic Acceptance",
              response_engine: { type: "retell-llm" },
              webhook_url: "https://example.test/webhook",
              webhook_events: ["call_ended"],
            };
          },
        };
      }
      throw new Error(`unexpected ${url}`);
    },
  });

  assert.equal(report.ok, true);
  assert.equal(report.retell.api_key_verified, true);
  assert.equal(report.retell.phone_number_owned, true);
  assert.equal(report.retell.outbound_ready, true);
  assert.equal(report.retell.agent_exists, true);
  assert.equal(report.phone_number.phone_number_last4, "***4567");
  assert.equal(JSON.stringify(report).includes("rk_live_secret"), false);
  assert.equal(JSON.stringify(report).includes("+15551234567"), false);
  assert.deepEqual(calls, [
    "https://api.retellai.test/v2/list-phone-numbers",
    "https://api.retellai.test/get-agent/agent_phase3_acceptance",
  ]);
});

test("Retell readiness retrieves configured phone number directly when list does not include it", async () => {
  const report = await buildRetellReadinessReport({
    env: {
      RETELL_API_KEY: "rk_live_secret",
      RETELL_AGENT_ID: "agent_phase3_acceptance",
      RETELL_PHONE_NUMBER_ID: "+14079045560",
      RETELL_BASE_URL: "https://api.retellai.test",
    },
    fetchImpl: async (url) => {
      if (url.endsWith("/v2/list-phone-numbers")) return { ok: true, async json() { return { phone_numbers: [] }; } };
      if (url.endsWith("/get-phone-number/%2B14079045560")) {
        return {
          ok: true,
          async json() {
            return {
              phone_number: "+14079045560",
              phone_number_type: "retell-twilio",
              allowed_outbound_country_list: ["US"],
              outbound_agents: [{ agent_id: "agent_phase3_acceptance" }],
            };
          },
        };
      }
      if (url.endsWith("/get-agent/agent_phase3_acceptance")) {
        return {
          ok: true,
          async json() {
            return { agent_id: "agent_phase3_acceptance", agent_name: "Morgan", response_engine: { type: "retell-llm" } };
          },
        };
      }
      throw new Error(`unexpected ${url}`);
    },
  });

  assert.equal(report.ok, true);
  assert.equal(report.retell.phone_number_owned, true);
  assert.equal(report.retell.outbound_ready, true);
  assert.equal(report.phone_number.phone_number_last4, "***5560");
});
