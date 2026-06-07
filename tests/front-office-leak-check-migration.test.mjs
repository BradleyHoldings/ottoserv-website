import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const migration = readFileSync(join(root, "supabase", "front_office_leak_check_acceptance_migration.sql"), "utf8");
const preflight = readFileSync(join(root, "supabase", "front_office_leak_check_acceptance_preflight.sql"), "utf8");
const postflight = readFileSync(join(root, "supabase", "front_office_leak_check_acceptance_postflight.sql"), "utf8");
const rollback = readFileSync(join(root, "supabase", "front_office_leak_check_acceptance_rollback.sql"), "utf8");
const schema = readFileSync(join(root, "supabase-schema.sql"), "utf8");

test("focused migration owns only leak-check report fields and pilot conversion persistence", () => {
  assert.match(migration, /alter table public\.process_scans/i);
  assert.match(migration, /revenue_risks_json/i);
  assert.match(migration, /priority_ranking_json/i);
  assert.match(migration, /practical_next_actions_json/i);
  assert.match(migration, /create table if not exists public\.process_scan_conversion_events/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /service_role/i);
  assert.match(migration, /check \(event_type in \('pilot_start_requested'\)\)/i);
  assert.doesNotMatch(migration, /newsletter_subscribers/i);
  assert.doesNotMatch(migration, /audit_requests/i);
});

test("preflight and postflight are read-only validation scripts", () => {
  for (const sql of [preflight, postflight]) {
    assert.match(sql, /select/i);
    assert.doesNotMatch(sql, /\b(create|alter|drop|insert|update|delete|grant|revoke)\b/i);
  }
  assert.match(postflight, /process_scan_conversion_events/i);
  assert.match(postflight, /rls_enabled/i);
});

test("rollback reverses only the focused acceptance migration", () => {
  assert.match(rollback, /drop table if exists public\.process_scan_conversion_events/i);
  assert.match(rollback, /drop column if exists revenue_risks_json/i);
  assert.match(rollback, /drop column if exists priority_ranking_json/i);
  assert.match(rollback, /drop column if exists practical_next_actions_json/i);
  assert.doesNotMatch(rollback, /process_scans;/i);
});

test("legacy supabase schema does not carry PR-only conversion table changes", () => {
  assert.doesNotMatch(schema, /process_scan_conversion_events/);
  assert.doesNotMatch(schema, /revenue_risks_json/);
  assert.doesNotMatch(schema, /priority_ranking_json/);
  assert.doesNotMatch(schema, /practical_next_actions_json/);
});
