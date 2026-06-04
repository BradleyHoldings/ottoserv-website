// Priority 7: production/Supabase state check. describeRevenueStateConfig reports
// which env var NAMES are missing WITHOUT exposing any secret values.

import assert from "node:assert/strict";
import test from "node:test";

import { describeRevenueStateConfig } from "../src/lib/revenueEngineSupabaseStore.mjs";

const URL_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"];
const KEY_KEYS = ["SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

function withEnv(vars, fn) {
  const saved = {};
  for (const k of [...URL_KEYS, ...KEY_KEYS]) { saved[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, vars);
  try { return fn(); } finally {
    for (const k of [...URL_KEYS, ...KEY_KEYS]) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
}

test("missing env → not configured, names listed, NO values exposed", () => {
  const desc = withEnv({}, () => describeRevenueStateConfig());
  assert.equal(desc.configured, false);
  assert.equal(desc.reason, "supabase_not_configured");
  assert.ok(desc.missing_env.some((m) => /SUPABASE_URL/.test(m)));
  assert.ok(desc.missing_env.some((m) => /SERVICE_KEY|SERVICE_ROLE_KEY/.test(m)));
  // The whole descriptor must never contain a value — only booleans + names.
  const serialized = JSON.stringify(desc);
  assert.doesNotMatch(serialized, /https?:\/\//, "no URL value leaked");
  assert.equal(desc.present.supabase_url, false);
  assert.equal(desc.present.service_key, false);
});

test("configured env → configured true, nothing missing, still no secret values", () => {
  const desc = withEnv({ SUPABASE_URL: "https://secret.example", SUPABASE_SERVICE_KEY: "super-secret-key" }, () => describeRevenueStateConfig());
  assert.equal(desc.configured, true);
  assert.deepEqual(desc.missing_env, []);
  assert.equal(desc.present.supabase_url, true);
  assert.equal(desc.present.service_key, true);
  const serialized = JSON.stringify(desc);
  assert.doesNotMatch(serialized, /secret\.example|super-secret-key/, "no env value leaks into the descriptor");
});

test("descriptor points at the schema file, table, and writers", () => {
  const desc = describeRevenueStateConfig();
  assert.equal(desc.schema_file, "supabase/revenue_engine_schema.sql");
  assert.equal(desc.table, "revenue_engine_state");
  assert.ok(desc.used_by.includes("hermes:operate"));
});
