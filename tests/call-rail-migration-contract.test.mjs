import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("call rail migration package includes read-only preflight, schema, and postflight", () => {
  const preflight = readFileSync("supabase/hermes_call_execution_preflight.sql", "utf8");
  const schema = readFileSync("supabase/hermes_call_execution_schema.sql", "utf8");
  const postflight = readFileSync("supabase/hermes_call_execution_postflight.sql", "utf8");

  assert.match(preflight, /READ-ONLY/i);
  assert.match(preflight, /hermes_pipeline/);
  assert.match(preflight, /hermes_call_executions/);
  assert.doesNotMatch(preflight, /\b(create|alter|drop|insert|update|delete|grant|revoke)\b/i);

  assert.match(schema, /create table if not exists public\.hermes_call_executions/i);
  assert.match(schema, /create table if not exists public\.hermes_call_evidence/i);
  assert.match(schema, /hermes_call_upsert_cas/);
  assert.match(schema, /hermes_call_claim_cas/);

  assert.match(postflight, /hermes_call_executions/);
  assert.match(postflight, /hermes_call_evidence/);
  assert.match(postflight, /rowsecurity/);
  assert.match(postflight, /pg_policies/);
  assert.doesNotMatch(postflight, /\b(create|alter|drop|insert|update|delete|grant|revoke)\b/i);
});
