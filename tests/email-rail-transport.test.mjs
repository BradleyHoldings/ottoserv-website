// ─── Phase 2 transport wiring — provider adapter proofs (fake fetch, no network) ─
import assert from "node:assert/strict";
import test from "node:test";
import { buildProviderTransport, emailProviderName } from "../src/lib/emailRail/transport.mjs";

test("transport: no provider configured → not ok, no credentials leaked", () => {
  const r = buildProviderTransport({});
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no_provider_configured");
  assert.ok(!("transport" in r));
});

test("transport: resend selected by api key, builds a transport + lookup", () => {
  assert.equal(emailProviderName({ RESEND_API_KEY: "x" }), "resend");
  const r = buildProviderTransport({ HERMES_EMAIL_PROVIDER: "resend", HERMES_EMAIL_API_KEY: "rk_test" });
  assert.equal(r.ok, true);
  assert.equal(typeof r.transport, "function");
  assert.equal(typeof r.lookup, "function");
});

test("transport: resend send normalizes a real provider response", async () => {
  let sawAuth = false, body = null;
  const fakeFetch = async (url, init) => {
    sawAuth = String(init.headers.Authorization || "").startsWith("Bearer ");
    body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ id: "resend_msg_abc123" }) };
  };
  const r = buildProviderTransport({ HERMES_EMAIL_PROVIDER: "resend", HERMES_EMAIL_API_KEY: "rk_test" }, { fetchImpl: fakeFetch });
  const out = await r.transport({ from: "hermes@ottoserv.com", to: "controlled@ottoserv.com", subject: "s", body: "b", idempotency_key: "idem_v1_abc" });
  assert.equal(out.message_id, "resend_msg_abc123");
  assert.equal(out.accepted, true);
  assert.equal(out.to, "controlled@ottoserv.com");
  assert.equal(sawAuth, true, "auth header used");
  assert.equal(body.headers["X-Entity-Ref-ID"], "idem_v1_abc", "idempotency passed to provider");
});

test("transport: resend HTTP error throws (so provider.mjs can classify/sanitize)", async () => {
  const fakeFetch = async () => ({ ok: false, status: 429, text: async () => "rate limit" });
  const r = buildProviderTransport({ HERMES_EMAIL_PROVIDER: "resend", HERMES_EMAIL_API_KEY: "rk_test" }, { fetchImpl: fakeFetch });
  await assert.rejects(() => r.transport({ from: "a@b.io", to: "c@d.io", subject: "s", body: "b" }), /resend_429/);
});

test("transport: postmark send normalizes MessageID", async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => ({ MessageID: "pm_xyz", ErrorCode: "0", SubmittedAt: "2026-06-08T14:00:00Z" }) });
  const r = buildProviderTransport({ HERMES_EMAIL_PROVIDER: "postmark", POSTMARK_SERVER_TOKEN: "tok" }, { fetchImpl: fakeFetch });
  const out = await r.transport({ from: "a@b.io", to: "c@d.io", subject: "s", body: "b" });
  assert.equal(out.message_id, "pm_xyz");
  assert.equal(out.accepted, true);
});

test("transport: a built transport never returns the credential anywhere", () => {
  const r = buildProviderTransport({ HERMES_EMAIL_PROVIDER: "resend", HERMES_EMAIL_API_KEY: "rk_supersecret" });
  assert.ok(!JSON.stringify(Object.keys(r)).includes("key"));
  assert.ok(!String(r.reason || "").includes("rk_supersecret"));
});
