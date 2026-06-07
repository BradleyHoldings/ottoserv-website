import assert from "node:assert/strict";
import test from "node:test";

import { buildProviderTransport, emailProviderName } from "../src/lib/emailRail/transport.mjs";

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
