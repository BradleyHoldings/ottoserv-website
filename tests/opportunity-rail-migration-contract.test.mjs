import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("supabase/hermes_opportunity_actions_schema.sql", "utf8");
const preflight = readFileSync("supabase/hermes_opportunity_actions_preflight.sql", "utf8");
const postflight = readFileSync("supabase/hermes_opportunity_actions_postflight.sql", "utf8");

test("opportunity rail migration package includes read-only preflight, schema, and postflight", () => {
  assert.match(preflight, /to_regclass\('public\.hermes_opportunity_actions'\)/);
  assert.match(preflight, /to_regclass\('public\.hermes_opportunity_booking_evidence'\)/);
  assert.doesNotMatch(preflight, /\b(create|alter|drop|insert|update|delete)\b/i);

  assert.match(schema, /create table if not exists public\.hermes_opportunity_actions/);
  assert.match(schema, /idempotency_key text not null unique/);
  assert.match(schema, /alter table public\.hermes_opportunity_actions enable row level security/);
  assert.match(schema, /revoke all on public\.hermes_opportunity_actions from anon, authenticated/);
  assert.match(schema, /grant select, insert, update, delete on public\.hermes_opportunity_actions to service_role/);
  assert.match(schema, /create table if not exists public\.hermes_opportunity_booking_evidence/);
  assert.match(schema, /provider_event_id text not null unique/);
  assert.match(schema, /alter table public\.hermes_opportunity_booking_evidence enable row level security/);
  assert.match(schema, /revoke all on public\.hermes_opportunity_booking_evidence from anon, authenticated/);
  assert.match(schema, /grant select, insert, update, delete on public\.hermes_opportunity_booking_evidence to service_role/);
  assert.match(schema, /create or replace function public\.hermes_opportunity_upsert_cas/);
  assert.match(schema, /create or replace function public\.hermes_opportunity_claim_cas/);
  assert.match(schema, /set search_path = public/);
  assert.match(schema, /revoke all on function public\.hermes_opportunity_upsert_cas/);
  assert.match(schema, /grant execute on function public\.hermes_opportunity_claim_cas/);

  assert.match(postflight, /hermes_opportunity_actions_table/);
  assert.match(postflight, /hermes_opportunity_booking_evidence_table/);
  assert.match(postflight, /hermes_opportunity_upsert_rpc/);
  assert.match(postflight, /hermes_opportunity_claim_rpc/);
});
