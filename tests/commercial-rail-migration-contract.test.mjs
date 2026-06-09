import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("commercial rail migration package includes read-only preflight, additive schema, postflight, and rollback notes", () => {
  const preflight = readFileSync("supabase/hermes_commercial_actions_preflight.sql", "utf8");
  const schema = readFileSync("supabase/hermes_commercial_actions_schema.sql", "utf8");
  const postflight = readFileSync("supabase/hermes_commercial_actions_postflight.sql", "utf8");

  assert.match(preflight, /READ-ONLY/i);
  assert.match(preflight, /hermes_commercial_actions/);
  assert.match(preflight, /hermes_pipeline/);
  assert.doesNotMatch(preflight, /\b(create|alter|drop|insert|update|delete|grant|revoke)\b/i);

  assert.match(schema, /create table if not exists public\.hermes_commercial_actions/i);
  assert.match(schema, /create table if not exists public\.hermes_commercial_payment_evidence/i);
  assert.match(schema, /hermes_commercial_upsert_cas/);
  assert.match(schema, /hermes_commercial_paid_onboarding_cas/);
  assert.match(schema, /idempotency_key text not null unique/i);
  assert.match(schema, /provider_link_id text not null/i);
  assert.match(schema, /grant select, insert, update, delete on public\.hermes_commercial_actions to service_role/i);
  assert.match(schema, /ROLLBACK/i);

  assert.match(postflight, /hermes_commercial_actions/);
  assert.match(postflight, /hermes_commercial_payment_evidence/);
  assert.match(postflight, /rowsecurity/);
  assert.match(postflight, /pg_policies/);
  assert.doesNotMatch(postflight, /\b(create|alter|drop|insert|update|delete|grant|revoke)\b/i);
});
