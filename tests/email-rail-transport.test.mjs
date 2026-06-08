import assert from "node:assert/strict";
import test from "node:test";

import { buildProviderTransport, emailProviderName, normalizeGmailReplyLookupResult, normalizeGmailWebhookResult } from "../src/lib/emailRail/transport.mjs";

test("transport: no provider configured -> not ok, no credentials leaked", () => {
  const r = buildProviderTransport({});
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no_provider_configured");
  assert.ok(!("transport" in r));
});

test("transport: Gmail/Workspace is the only approved live provider family", () => {
  assert.equal(emailProviderName({ HERMES_EMAIL_PROVIDER: "gmail_workspace" }), "gmail_workspace");
  assert.equal(emailProviderName({ HERMES_GMAIL_TRANSPORT_READY: "1" }), "gmail_workspace");
  assert.equal(buildProviderTransport({ HERMES_EMAIL_PROVIDER: "resend" }).ok, false);
  assert.match(buildProviderTransport({ HERMES_EMAIL_PROVIDER: "postmark" }).reason, /unsupported_provider/);
});

test("transport: Gmail/Workspace requires an injected approved transport", () => {
  const r = buildProviderTransport({ HERMES_EMAIL_PROVIDER: "gmail_workspace" });
  assert.equal(r.ok, false);
  assert.equal(r.provider, "gmail_workspace");
  assert.equal(r.reason, "gmail_transport_not_wired");
});

test("transport: injected Gmail/Workspace handoff returns the approved transport and lookup", async () => {
  const sent = [];
  const transport = async (draft) => {
    sent.push(draft);
    return { message_id: "gmail_msg_abc123", thread_id: "gmail_thr_abc123", accepted: true, status: "accepted" };
  };
  const lookup = async () => ({ message_id: "gmail_msg_abc123", accepted: true });

  const r = buildProviderTransport({ HERMES_EMAIL_PROVIDER: "gmail_workspace" }, { transport, lookup });
  assert.equal(r.ok, true);
  assert.equal(r.provider, "gmail_workspace");
  assert.equal(typeof r.transport, "function");
  assert.equal(typeof r.lookup, "function");

  const out = await r.transport({ from: "jonathan@ottoservco.com", to: "controlled@example.com", subject: "s", body: "b" });
  assert.equal(out.message_id, "gmail_msg_abc123");
  assert.equal(out.thread_id, "gmail_thr_abc123");
  assert.equal(sent[0].from, "jonathan@ottoservco.com");
});

test("transport: configured n8n Gmail webhook becomes the approved transport", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ messageId: "gmail_msg_live_1", threadId: "gmail_thr_live_1", status: "accepted" });
      },
    };
  };
  const r = buildProviderTransport({
    HERMES_N8N_EMAIL_SEND_WEBHOOK: "https://n8n.ottoserv.com/webhook/hermes-controlled-gmail-send",
    HERMES_N8N_EMAIL_WEBHOOK_TOKEN: "secret-token",
  }, { fetchImpl });
  assert.equal(r.ok, true);
  const out = await r.transport({ from: "jonathan@ottoservco.com", to: "controlled@example.com", subject: "s", body: "b", idempotency_key: "idem_1" });
  assert.equal(out.message_id, "gmail_msg_live_1");
  assert.equal(out.thread_id, "gmail_thr_live_1");
  assert.equal(calls[0].url, "https://n8n.ottoserv.com/webhook/hermes-controlled-gmail-send");
  assert.equal(JSON.parse(calls[0].init.body).provider, "gmail_workspace");
  assert.ok(!JSON.stringify(r).includes("secret-token"));
});

test("transport: configured n8n Gmail reply lookup becomes provider lookup", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          reply_found: true,
          message_id: "gmail_reply_1",
          thread_id: "gmail_thr_live_1",
          from: "Homebase <homebaseprous@gmail.com>",
          subject: "Re: Hello",
          snippet: "Yes, I am interested.",
        });
      },
    };
  };
  const r = buildProviderTransport({
    HERMES_N8N_EMAIL_SEND_WEBHOOK: "https://n8n.ottoserv.com/webhook/hermes-controlled-gmail-send",
    HERMES_N8N_EMAIL_REPLY_LOOKUP_WEBHOOK: "https://n8n.ottoserv.com/webhook/hermes-controlled-gmail-reply-lookup",
    HERMES_N8N_EMAIL_WEBHOOK_TOKEN: "secret-token",
    HERMES_EMAIL_CONTROLLED_RECIPIENT: "homebaseprous@gmail.com",
  }, { fetchImpl });
  assert.equal(r.ok, true);
  assert.equal(typeof r.lookup, "function");
  const found = await r.lookup("idem_1", "exec_1", { thread_id: "gmail_thr_live_1" });
  assert.equal(found.provider_event_id, "gmail_reply_1");
  assert.equal(found.thread_id, "gmail_thr_live_1");
  assert.equal(calls[0].url, "https://n8n.ottoserv.com/webhook/hermes-controlled-gmail-reply-lookup");
  assert.equal(JSON.parse(calls[0].init.body).from, "homebaseprous@gmail.com");
  assert.ok(!JSON.stringify(r).includes("secret-token"));
});

test("transport: n8n Gmail response normalization accepts common provider shapes", () => {
  assert.equal(normalizeGmailWebhookResult([{ id: "m1", threadId: "t1" }]).message_id, "m1");
  assert.equal(normalizeGmailWebhookResult({ result: { gmailMessageId: "m2", gmailThreadId: "t2" } }).thread_id, "t2");
});

test("transport: configured Gmail webhook must be HTTPS unless explicitly allowed", () => {
  assert.throws(() => buildProviderTransport({
    HERMES_N8N_EMAIL_SEND_WEBHOOK: "http://localhost:5678/webhook/hermes-controlled-gmail-send",
  }), /gmail_webhook_must_be_https/);
});

test("transport: Gmail reply lookup normalization distinguishes not-found from evidence", () => {
  assert.equal(normalizeGmailReplyLookupResult({ status: "not_found", reply_found: false }), null);
  const found = normalizeGmailReplyLookupResult({ message_id: "reply_1", thread_id: "thr_1", body_preview: "Yes" });
  assert.equal(found.provider_event_id, "reply_1");
  assert.equal(found.thread_id, "thr_1");
  assert.equal(found.body, "Yes");
});

test("transport: resolver never returns credential-shaped values", () => {
  const r = buildProviderTransport({
    HERMES_EMAIL_PROVIDER: "gmail_workspace",
    HERMES_GMAIL_TRANSPORT_READY: "1",
    GOOGLE_REFRESH_TOKEN: "secret_refresh_token",
  });
  const serialized = JSON.stringify(r);
  assert.ok(!serialized.includes("secret_refresh_token"));
  assert.ok(!serialized.includes("GOOGLE_REFRESH_TOKEN"));
});
