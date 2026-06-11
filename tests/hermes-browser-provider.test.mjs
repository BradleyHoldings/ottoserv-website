import assert from "node:assert/strict";
import test from "node:test";

import { browserBridgeConfig, createBrowserProvider, summarizeBrowserCapabilities } from "../src/lib/hermesBrowserProvider.mjs";

test("browser bridge is disabled when URL is missing", () => {
  const config = browserBridgeConfig({});
  assert.equal(config.configured, false);
  assert.equal(createBrowserProvider({ config, fetchImpl: () => {} }), null);
});

test("browser provider calls capability and DM endpoints without exposing token", async () => {
  const calls = [];
  const provider = createBrowserProvider({
    config: { configured: true, baseUrl: "http://127.0.0.1:7788", token: "secret", provider: "test" },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, text: async () => JSON.stringify({ browser_available: true, dm_available: true, message_id: "dm-1" }) };
    },
  });
  await provider.capabilities();
  await provider.sendDm({ platform: "linkedin", profile_url: "https://linkedin.example/x", message: "Hello" });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "http://127.0.0.1:7788/v1/capabilities");
  assert.equal(calls[1].url, "http://127.0.0.1:7788/v1/dm/send");
  assert.equal(calls[1].init.headers.authorization, "Bearer secret");
});

test("capability summary keeps only operational fields", () => {
  assert.deepEqual(summarizeBrowserCapabilities({
    browser_available: true,
    persistent_profile: true,
    research_available: true,
    dm_available: false,
    platforms: { linkedin: { logged_in: true } },
    blockers: ["instagram_login_expired"],
    cookies: "must_not_escape",
  }), {
    browser_available: true,
    persistent_profile: true,
    research_available: true,
    dm_available: false,
    platforms: { linkedin: { logged_in: true } },
    blockers: ["instagram_login_expired"],
  });
});
