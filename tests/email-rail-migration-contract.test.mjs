import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const SQL = readFileSync(new URL("../supabase/hermes_email_execution_schema.sql", import.meta.url), "utf8");

test("email rail migration persists the passed intent JSON as raw_intent", () => {
  assert.match(SQL, /raw_intent\s*,/);
  assert.match(SQL, /raw_intent\s*=\s*p_row/);
  assert.doesNotMatch(SQL, /raw_intent\s*=\s*p_row->'raw_intent'/);
});

test("email rail migration keeps anon/auth out and grants service-role table access", () => {
  for (const table of ["hermes_email_executions", "hermes_email_evidence", "hermes_email_replies"]) {
    assert.match(SQL, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(SQL, new RegExp(`revoke all on public\\.${table} from anon, authenticated`, "i"));
    assert.match(SQL, new RegExp(`grant select, insert, update, delete on public\\.${table} to service_role`, "i"));
  }
  assert.match(SQL, /grant execute on function public\.hermes_email_upsert_cas/i);
  assert.match(SQL, /grant execute on function public\.hermes_email_claim_cas/i);
});
