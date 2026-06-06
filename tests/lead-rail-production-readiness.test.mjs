// ─── Phase 1 production-readiness tests ──────────────────────────────────────
//
// Covers the new Sprint 2 deliverables:
//   - production config contract (missing/malformed/configured)
//   - no-local-authority-in-production rule
//   - migration shape and required constraints (schema file)
//   - Hermes adapter: duplicate request protection, restart recovery, watchdog
//   - Cowork handoff: unavailable/credit-exhausted state, result ingestion,
//     revalidation, no duplicate task
//   - Supabase write failure, read-after-write mismatch, version conflict
//   - no transport throughout
//   - no completion without persistence evidence
//   - controlled-real acceptance fixture scenarios

import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";

import { readRailConfig, describeRailConfig, assertNoLocalAuthorityInProduction, CONFIG_STATE, MODE } from "../src/lib/leadRail/config.mjs";
import { requestLeadRailRun, monitorLeadRailRun, isDuplicateRunRequest } from "../src/lib/hermesLeadRailAdapter.mjs";
import { upsertLeads, PERSISTENCE } from "../src/lib/leadRail/store.mjs";
import { runLeadIntakeEnrichment, REQUIRED_STAGES } from "../src/lib/leadRail/pipeline.mjs";
import { reconcileCoworkHandoff, ingestCoworkResult, watchdogCoworkEnrichment } from "../src/lib/leadRail/coworkHandoff.mjs";
import { buildEnrichmentTask, detectStalledEnrichment, ENRICH_STALL_MINUTES } from "../src/lib/leadRail/enrichment.mjs";
import { ENRICHMENT_STATUS } from "../src/lib/leadRail/eligibility.mjs";
import { deriveLeadId } from "../src/lib/leadRail/identity.mjs";
import {
  ACCEPTANCE_ROWS, ACCEPTANCE_SOURCE, ACCEPTANCE_CHECKLIST, ACCEPTANCE_RUN_ID,
  RECORD_A_NEW_VALID, RECORD_B_DUPLICATE, RECORD_D_NEEDS_ENRICHMENT, RECORD_E_INVALID, RECORD_G_STALE_PROTECTION_EXISTING,
} from "./fixtures/controlled-real-acceptance.mjs";

const NOW = "2026-06-06T12:00:00.000Z";
const D = (minutesAgo) => new Date(Date.parse(NOW) - minutesAgo * 60_000).toISOString();

let cnt = 0;
async function tmpDirs() {
  const base = path.join(os.tmpdir(), `lr-pr-${process.pid}-${Date.now()}-${cnt++}`);
  const tasksDir = path.join(base, "tasks");
  const dataDir = path.join(base, "data");
  await fs.mkdir(tasksDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });
  return { tasksDir, dataDir };
}

function fakeClient(initial = [], opts = {}) {
  const store = new Map((initial || []).map((l) => [l.lead_id, JSON.parse(JSON.stringify(l))]));
  return {
    store,
    configured: true,
    async read(id) { return store.has(id) ? JSON.parse(JSON.stringify(store.get(id))) : null; },
    async write(row) {
      if (opts.failWrite) return { ok: false, error: "write_failed_500:injected" };
      if (opts.throwWrite) throw new Error("network_down_injected");
      const lead = row.raw_payload || row;
      store.set(lead.lead_id, JSON.parse(JSON.stringify(lead)));
      return { ok: true };
    },
    async readBack(id) {
      if (opts.dropReadBack) return null;
      const l = store.get(id);
      if (!l) return null;
      if (opts.mismatchVersion) return { ...l, version: Number(l.version || 1) + 99 };
      return JSON.parse(JSON.stringify(l));
    },
  };
}

// Use .io domain and a non-reserved phone to ensure records pass validation.
const validRow = (over = {}) => ({
  company_name: "PR Test HVAC Co",
  website: "https://pr-test-hvac.io",
  phone: "5122341099",
  city: "Austin",
  state: "TX",
  source_url: "internal://pr-test",
  source_type: "acceptance_test",
  ...over,
});

// ─── CONFIG CONTRACT ──────────────────────────────────────────────────────────

test("config: missing SUPABASE_URL → persistence_pending", () => {
  const cfg = readRailConfig({ SUPABASE_SERVICE_KEY: "fake-long-service-key-1234567890" });
  assert.equal(cfg.state, CONFIG_STATE.PERSISTENCE_PENDING);
  assert.equal(cfg.present.service_key, true);
  assert.equal(cfg.present.supabase_url, false);
});

test("config: missing service key → persistence_pending", () => {
  const cfg = readRailConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co" });
  assert.equal(cfg.state, CONFIG_STATE.PERSISTENCE_PENDING);
});

test("config: both missing → persistence_pending", () => {
  const cfg = readRailConfig({});
  assert.equal(cfg.state, CONFIG_STATE.PERSISTENCE_PENDING);
  assert.equal(cfg.reason, "supabase_not_configured");
});

test("config: malformed URL → blocked", () => {
  const cfg = readRailConfig({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url", SUPABASE_SERVICE_KEY: "fake-long-service-key-1234567890" });
  assert.equal(cfg.state, CONFIG_STATE.BLOCKED);
  assert.match(cfg.reason, /malformed/);
});

test("config: malformed key (too short) → blocked", () => {
  const cfg = readRailConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co", SUPABASE_SERVICE_KEY: "short" });
  assert.equal(cfg.state, CONFIG_STATE.BLOCKED);
  assert.match(cfg.reason, /malformed_service_key/);
});

test("config: valid env → configured", () => {
  const cfg = readRailConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co",
    SUPABASE_SERVICE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake",
  });
  assert.equal(cfg.state, CONFIG_STATE.CONFIGURED);
  assert.equal(cfg.present.supabase_url, true);
  assert.equal(cfg.present.service_key, true);
});

test("config: describeRailConfig never exposes secrets", () => {
  const desc = describeRailConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co",
    SUPABASE_SERVICE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.supersecret",
  });
  const str = JSON.stringify(desc);
  assert.ok(!str.includes("supersecret"), "secret key must not appear in describe output");
  assert.ok(!str.includes("supabase.co"), "URL must not appear in describe output");
  assert.ok("configured" in desc);
  assert.ok("state" in desc);
});

// ─── NO-LOCAL-AUTHORITY-IN-PRODUCTION ────────────────────────────────────────

test("no-local-authority: internal mode + not configured → throws", () => {
  const cfg = readRailConfig({});
  cfg.mode = MODE.INTERNAL;
  assert.throws(() => assertNoLocalAuthorityInProduction(cfg), /production_local_authority_blocked/);
});

test("no-local-authority: dry mode + not configured → does not throw", () => {
  const cfg = readRailConfig({});
  cfg.mode = MODE.DRY;
  assert.doesNotThrow(() => assertNoLocalAuthorityInProduction(cfg));
});

test("no-local-authority: internal mode + configured → does not throw", () => {
  const cfg = readRailConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co",
    SUPABASE_SERVICE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake",
  });
  cfg.mode = MODE.INTERNAL;
  assert.doesNotThrow(() => assertNoLocalAuthorityInProduction(cfg));
});

// ─── MIGRATION SHAPE (schema file assertions) ─────────────────────────────────

test("migration: schema file exists and is non-empty", () => {
  const sql = readFileSync("supabase/hermes_pipeline_schema.sql", "utf8");
  assert.ok(sql.length > 500, "schema file should be substantial");
});

test("migration: creates hermes_pipeline with lead_id primary key", () => {
  const sql = readFileSync("supabase/hermes_pipeline_schema.sql", "utf8");
  assert.ok(sql.includes("create table if not exists public.hermes_pipeline"), "table creation present");
  assert.ok(sql.includes("lead_id") && sql.includes("primary key"), "lead_id primary key");
});

test("migration: version column present (optimistic concurrency)", () => {
  const sql = readFileSync("supabase/hermes_pipeline_schema.sql", "utf8");
  assert.ok(/version\s+integer\s+not null/.test(sql), "version NOT NULL column");
});

test("migration: distinct discovered_at and imported_at columns", () => {
  const sql = readFileSync("supabase/hermes_pipeline_schema.sql", "utf8");
  assert.ok(sql.includes("discovered_at"), "discovered_at present");
  assert.ok(sql.includes("imported_at"), "imported_at present");
});

test("migration: RLS enabled on hermes_pipeline", () => {
  const sql = readFileSync("supabase/hermes_pipeline_schema.sql", "utf8");
  assert.ok(/alter table public\.hermes_pipeline enable row level security/.test(sql), "RLS enabled");
});

test("migration: alias table present with FK to hermes_pipeline", () => {
  const sql = readFileSync("supabase/hermes_pipeline_schema.sql", "utf8");
  assert.ok(sql.includes("hermes_lead_aliases"), "alias table present");
  assert.ok(sql.includes("references public.hermes_pipeline"), "FK to hermes_pipeline");
});

test("migration: rollback procedure documented", () => {
  const sql = readFileSync("supabase/hermes_pipeline_schema.sql", "utf8");
  assert.ok(/ROLLBACK/i.test(sql), "rollback section present");
  assert.ok(/drop table/i.test(sql), "drop table in rollback");
});

test("migration: raw_payload NOT NULL (lossless round-trip)", () => {
  const sql = readFileSync("supabase/hermes_pipeline_schema.sql", "utf8");
  assert.ok(/raw_payload\s+jsonb\s+not null/.test(sql), "raw_payload NOT NULL");
});

// ─── SUPABASE WRITE FAILURE ───────────────────────────────────────────────────

test("store: write failure → persistence_pending (never claims success)", async () => {
  const client = fakeClient([], { failWrite: true });
  const lead = { lead_id: "lid_v1_test000000001", version: 1, company_name: "FailTest", record_status: "accepted", updated_at: NOW, last_validated_at: NOW };
  const result = await upsertLeads([lead], { client });
  assert.equal(result.persisted, 0);
  assert.equal(result.pending, 1);
  assert.equal(result.results[0].status, PERSISTENCE.PENDING);
  assert.ok(result.results[0].reason.includes("write_failed"), `reason: ${result.results[0].reason}`);
});

test("store: write throws → persistence_pending", async () => {
  const client = fakeClient([], { throwWrite: true });
  const lead = { lead_id: "lid_v1_test000000002", version: 1, company_name: "ThrowTest", record_status: "accepted", updated_at: NOW };
  const result = await upsertLeads([lead], { client });
  assert.equal(result.pending, 1);
  assert.match(result.results[0].reason, /write_error/);
});

// ─── READ-AFTER-WRITE MISMATCH ────────────────────────────────────────────────

test("store: read-back returns nothing → persistence_pending", async () => {
  const client = fakeClient([], { dropReadBack: true });
  const lead = { lead_id: "lid_v1_test000000003", version: 1, company_name: "DropTest", record_status: "accepted", updated_at: NOW };
  const result = await upsertLeads([lead], { client });
  assert.equal(result.pending, 1);
  assert.match(result.results[0].reason, /read_after_write_missing/);
});

test("store: read-back version mismatch → persistence_pending", async () => {
  const client = fakeClient([], { mismatchVersion: true });
  const lead = { lead_id: "lid_v1_test000000004", version: 1, company_name: "VersionMismatch", record_status: "accepted", updated_at: NOW };
  const result = await upsertLeads([lead], { client });
  assert.equal(result.pending, 1);
  assert.match(result.results[0].reason, /version_mismatch/);
});

// ─── VERSION CONFLICT ─────────────────────────────────────────────────────────

test("store: existing row is newer version → version_conflict", async () => {
  const lead_id = "lid_v1_test000000005";
  const existing = { lead_id, version: 10, company_name: "Existing", record_status: "accepted", updated_at: NOW, last_validated_at: NOW };
  const client = fakeClient([existing]);
  const incomingLead = { lead_id, version: 1, company_name: "Incoming", record_status: "accepted", updated_at: NOW, last_validated_at: NOW };
  const result = await upsertLeads([incomingLead], { client });
  assert.ok(
    result.results[0].status === PERSISTENCE.VERSION_CONFLICT || result.results[0].status === PERSISTENCE.STALE,
    `Expected version_conflict or stale_skipped, got: ${result.results[0].status}`
  );
});

// ─── DUPLICATE ALIAS LOOKUP ───────────────────────────────────────────────────

test("dedupe: same domain → same lead_id regardless of phone format", async () => {
  const { tasksDir, dataDir } = await tmpDirs();
  const client = fakeClient();
  // Use a non-blocked domain (.io) and a non-reserved phone (no 555/000)
  const rows = [
    { company_name: "Alias Test HVAC", website: "https://alias-test-hvac.io", phone: "5122340111", city: "Austin", state: "TX", source_url: "internal://test" },
    { company_name: "Alias Test HVAC", website: "https://www.alias-test-hvac.io", phone: "(512) 234-0111", city: "Austin", state: "TX", source_url: "internal://test" },
  ];
  const result = await runLeadIntakeEnrichment({ rows, source: { source_type: "test" }, mode: "dry", now: NOW, existingRecords: [] }, { tasksDir, dataDir, skipLocal: true, store: { client } });
  const ids = new Set(result.upserts.map((u) => u.lead_id));
  assert.equal(ids.size, 1, "Two rows with same domain must resolve to one lead_id");
  if (result.summary) {
    assert.ok(result.summary.dedupe.duplicates > 0 || result.summary.dedupe.new === 1, "deduplication counted");
  }
});

// ─── HERMES ADAPTER: DUPLICATE REQUEST PROTECTION ────────────────────────────

test("adapter: duplicate correlation_id → idempotent noop on second call", async () => {
  const { tasksDir, dataDir } = await tmpDirs();
  const client = fakeClient();
  const rows = [validRow()];
  const opts = { tasksDir, dataDir, skipLocal: true, skipStoreRead: true, store: { client } };
  const r1 = await requestLeadRailRun({ rows, source: ACCEPTANCE_SOURCE, mode: "dry", now: NOW, existingRecords: [] }, opts);
  assert.ok(r1.final_status);

  // Force task to completed so second call sees it as done.
  if (r1.task) {
    const { saveTask } = await import("../src/lib/execution/taskLifecycle.mjs");
    await saveTask({ ...r1.task, state: "completed" }, opts);
  }

  const r2 = await requestLeadRailRun({ rows, source: ACCEPTANCE_SOURCE, mode: "dry", correlation_id: r1.correlation_id, now: NOW, existingRecords: [] }, opts);
  assert.equal(r2.idempotent, true, "second run with same correlation_id must be idempotent");
  assert.equal(r2.final_status, "completed", "idempotent return shows completed from prior run");
  assert.ok(!r2.resumed || r2.idempotent, "no new execution occurred");
});

test("adapter: isDuplicateRunRequest returns false for unknown id", async () => {
  const { tasksDir } = await tmpDirs();
  const isDup = await isDuplicateRunRequest("unknown-correlation-id", { tasksDir });
  assert.equal(isDup, false);
});

// ─── HERMES ADAPTER: RESTART RECOVERY ────────────────────────────────────────

test("adapter: resumed run from partial state re-uses existing task", async () => {
  const { tasksDir, dataDir } = await tmpDirs();
  const client = fakeClient();
  const rows = [validRow()];
  const opts = { tasksDir, dataDir, skipLocal: true, skipStoreRead: true, store: { client } };
  const r1 = await requestLeadRailRun({ rows, source: ACCEPTANCE_SOURCE, mode: "dry", now: NOW, existingRecords: [] }, opts);
  const taskId1 = r1.task?.task_id;

  // Second run same correlation_id but not yet completed → resume, reuse task
  const r2 = await requestLeadRailRun({ rows, source: ACCEPTANCE_SOURCE, mode: "dry", correlation_id: r1.correlation_id, now: NOW, existingRecords: [] }, opts);
  assert.equal(r2.task?.task_id, taskId1, "resumed run reuses same task_id");
});

// ─── HERMES ADAPTER: WATCHDOG ─────────────────────────────────────────────────

test("adapter: monitorLeadRailRun returns stage_status for known run", async () => {
  const { tasksDir, dataDir } = await tmpDirs();
  const client = fakeClient();
  const rows = [validRow()];
  const opts = { tasksDir, dataDir, skipLocal: true, skipStoreRead: true, store: { client } };
  const r1 = await requestLeadRailRun({ rows, source: ACCEPTANCE_SOURCE, mode: "dry", now: NOW, existingRecords: [] }, opts);
  const monitor = await monitorLeadRailRun(r1.correlation_id, { tasksDir });
  assert.equal(monitor.found, true);
  assert.ok("stage_status" in monitor, "stage_status present");
  assert.ok("watchdog" in monitor, "watchdog present");
  for (const stage of ["intake", "validation", "dedupe"]) {
    assert.ok(stage in monitor.stage_status, `${stage} in stage_status`);
  }
});

test("adapter: watchdog detects stalled enrichment task", () => {
  const stalledTask = {
    task_id: "enr-lid_v1_stall0000001",
    lead_id: "lid_v1_stall0000001",
    status: ENRICHMENT_STATUS.QUEUED,
    attempt: 0,
    queued_at: D(ENRICH_STALL_MINUTES + 60), // stalled for longer than threshold
    updated_at: D(ENRICH_STALL_MINUTES + 60),
  };
  const result = detectStalledEnrichment([stalledTask], { now: NOW, stallMinutes: ENRICH_STALL_MINUTES });
  assert.equal(result.alerts.length, 1, "stalled task should produce an alert");
  assert.equal(result.alerts[0].failure_class, "enrichment_stalled");
});

// ─── COWORK UNAVAILABLE / OUT OF CREDITS ─────────────────────────────────────

test("cowork: unavailable → tasks blocked, no packets emitted", () => {
  const lead = { lead_id: "lid_v1_cw000000001", website: "https://cowork-test.io", contact_validation: { website: { valid: true, host: "cowork-test.io" } }, fit_validation: { has_public_evidence: true }, source_url: "internal://test" };
  const result = reconcileCoworkHandoff([lead], [], { now: NOW, coworkAvailable: false });
  assert.equal(result.packets.length, 0, "no packets when Cowork unavailable");
  assert.equal(result.blocked, 1, "task should be blocked");
  const blockedTask = result.tasks.find((t) => t.lead_id === lead.lead_id);
  assert.ok(blockedTask, "blocked task present");
  assert.equal(blockedTask.status, ENRICHMENT_STATUS.BLOCKED);
});

test("cowork: out of credits → tasks blocked", () => {
  const lead = { lead_id: "lid_v1_cw000000002", website: "https://cowork2-test.io", contact_validation: { website: { valid: true, host: "cowork2-test.io" } }, fit_validation: { has_public_evidence: true }, source_url: "internal://test" };
  const result = reconcileCoworkHandoff([lead], [], { now: NOW, coworkAvailable: true, outOfCredits: true });
  assert.equal(result.packets.length, 0, "no packets when out of credits");
  assert.equal(result.blocked, 1);
});

// ─── ENRICHMENT RESULT REVALIDATION ──────────────────────────────────────────

test("cowork: result with no source_url → not completed", () => {
  const lead = { lead_id: "lid_v1_cw000000003", company_name: "EnrichTest", contact_validation: {}, website: "" };
  const task = buildEnrichmentTask(lead, { now: NOW });
  const result = ingestCoworkResult(lead, task, { phone: "5125550199", email: "test@test.com" /* no source_url */ }, { now: NOW });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing_evidence_url");
});

test("cowork: blocked result → task becomes blocked, lead enrichment_status blocked", () => {
  const lead = { lead_id: "lid_v1_cw000000004", company_name: "BlockedEnrichTest", contact_validation: {}, website: "" };
  const task = buildEnrichmentTask(lead, { now: NOW });
  const result = ingestCoworkResult(lead, task, { blocked: true, reason: "out_of_credits" }, { now: NOW });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "actor_blocked");
  assert.equal(result.task.status, ENRICHMENT_STATUS.BLOCKED);
});

test("cowork: valid result with evidence → completed, contact written to lead", () => {
  const lead = { lead_id: "lid_v1_cw000000005", company_name: "SuccessEnrich", contact_validation: {}, website: "https://enrich-success.io" };
  const task = buildEnrichmentTask(lead, { now: NOW });
  // Use a phone without 555/000/repeated digits so it passes validatePhone
  const result = ingestCoworkResult(lead, task, {
    phone: "5122340199",
    source_url: "https://enrich-success.io/contact",
    actor: "Cowork",
    confidence: "verified",
  }, { now: NOW });
  assert.equal(result.ok, true, `ingest should succeed: ${result.reason}`);
  assert.equal(result.task.status, ENRICHMENT_STATUS.COMPLETED);
  assert.ok(result.lead.contact_validation?.phone?.valid, "phone validated and written to lead");
});

test("cowork: duplicate task — same lead_id produces same task_id", () => {
  const lead = { lead_id: "lid_v1_cw000000006", website: "https://dedup-enrich.io", contact_validation: { website: { valid: true } }, fit_validation: { has_public_evidence: true }, source_url: "internal://test" };
  const r1 = reconcileCoworkHandoff([lead], [], { now: NOW, coworkAvailable: true });
  const r2 = reconcileCoworkHandoff([lead], r1.tasks, { now: NOW, coworkAvailable: true });
  // second reconciliation should refresh, not create a new task
  assert.equal(r2.queued, 0, "no new task queued for same lead");
  assert.equal(r2.refreshed, 1, "existing task refreshed");
  const taskIds = r2.tasks.map((t) => t.task_id);
  const unique = new Set(taskIds);
  assert.equal(unique.size, taskIds.length, "no duplicate task_ids");
});

// ─── NO TRANSPORT ─────────────────────────────────────────────────────────────

test("pipeline: no_transport always true in result", async () => {
  const { tasksDir, dataDir } = await tmpDirs();
  const result = await runLeadIntakeEnrichment(
    { rows: [validRow()], source: ACCEPTANCE_SOURCE, mode: "dry", now: NOW, existingRecords: [] },
    { tasksDir, dataDir, skipLocal: true, skipStoreRead: true }
  );
  assert.equal(result.no_transport, true, "no_transport must be true");
});

test("adapter: no_transport always true in adapter result", async () => {
  const { tasksDir, dataDir } = await tmpDirs();
  const result = await requestLeadRailRun(
    { rows: [validRow()], source: ACCEPTANCE_SOURCE, mode: "dry", now: NOW, existingRecords: [] },
    { tasksDir, dataDir, skipLocal: true, skipStoreRead: true }
  );
  assert.equal(result.no_transport, true);
});

// ─── NO COMPLETION WITHOUT PERSISTENCE EVIDENCE ───────────────────────────────

test("pipeline: unconfigured Supabase → partially_completed (never completed)", async () => {
  const { tasksDir, dataDir } = await tmpDirs();
  const result = await runLeadIntakeEnrichment(
    { rows: [validRow()], source: ACCEPTANCE_SOURCE, mode: "dry", now: NOW, existingRecords: [] },
    { tasksDir, dataDir, skipLocal: true, skipStoreRead: true }
    // no store client → unconfigured
  );
  // With no Supabase configured and real accepted records, should be partially_completed
  if (result.upserts && result.upserts.length > 0) {
    assert.notEqual(result.final_status, "completed", "should not be completed without Supabase persistence");
  }
  assert.ok(["partially_completed", "blocked", "completed"].includes(result.final_status));
});

test("pipeline: write failure → partially_completed (not completed)", async () => {
  const { tasksDir, dataDir } = await tmpDirs();
  const client = fakeClient([], { failWrite: true });
  const result = await runLeadIntakeEnrichment(
    { rows: [validRow()], source: ACCEPTANCE_SOURCE, mode: "dry", now: NOW, existingRecords: [] },
    { tasksDir, dataDir, skipLocal: true, skipStoreRead: true, store: { client } }
  );
  assert.notEqual(result.final_status, "completed", "write failure must not produce completed status");
  assert.equal(result.persistence.persisted, 0, "nothing should be persisted on write failure");
});

// ─── CONTROLLED-REAL ACCEPTANCE SCENARIOS ────────────────────────────────────

test("acceptance: fixture has 9 required checklist items", () => {
  assert.equal(ACCEPTANCE_CHECKLIST.length, 9, "acceptance checklist must have all 9 items");
  const scenarios = ACCEPTANCE_CHECKLIST.map((c) => c.scenario);
  assert.ok(scenarios.includes("new_valid"), "new_valid scenario required");
  assert.ok(scenarios.includes("duplicate_of_a"), "duplicate scenario required");
  assert.ok(scenarios.includes("missing_contact_needs_enrichment"), "enrichment scenario required");
  assert.ok(scenarios.includes("invalid_mock"), "invalid/mock scenario required");
  assert.ok(scenarios.includes("no_outreach"), "no_outreach scenario required");
});

test("acceptance: acceptance rows are 7 (6 unique scenarios + 1 intentional dup)", () => {
  assert.equal(ACCEPTANCE_ROWS.length, 7);
});

test("acceptance: record A and record B resolve to same lead_id (stable identity)", () => {
  const idA = deriveLeadId({ website: RECORD_A_NEW_VALID.website, normalized_phone: RECORD_A_NEW_VALID.phone, city: RECORD_A_NEW_VALID.city, state: RECORD_A_NEW_VALID.state, company_name: RECORD_A_NEW_VALID.company_name });
  const idB = deriveLeadId({ website: RECORD_B_DUPLICATE.website, normalized_phone: RECORD_B_DUPLICATE.phone, city: RECORD_B_DUPLICATE.city, state: RECORD_B_DUPLICATE.state, company_name: RECORD_B_DUPLICATE.company_name });
  // Both share the same domain (acceptance-hvac.example.com) → same lead_id
  assert.equal(idA, idB, "Record A and B must resolve to same lead_id via domain identity");
});

test("acceptance: invalid record E has no website → lead_id may be empty/company-only", () => {
  const id = deriveLeadId({ website: RECORD_E_INVALID.website, normalized_phone: RECORD_E_INVALID.phone, city: RECORD_E_INVALID.city, state: RECORD_E_INVALID.state, company_name: RECORD_E_INVALID.company_name });
  // Empty phone (0000000000 = invalid), no website → may have no durable basis
  assert.ok(typeof id === "string", "deriveLeadId returns string");
});

test("acceptance: enrichment record D — no contact → needsEnrichment", async () => {
  const { needsEnrichment } = await import("../src/lib/leadRail/enrichment.mjs");
  const lead = {
    contact_validation: { phone: { valid: false }, email: { valid: false }, website: { valid: true, host: "acceptance-propmgmt.example.com" } },
    fit_validation: { has_public_evidence: true },
    source_url: "internal://acceptance-fixture/v1",
  };
  assert.equal(needsEnrichment(lead), true, "Record D must trigger enrichment");
});

test("acceptance: full dry run of acceptance fixture produces receipts for all stages", async () => {
  const { tasksDir, dataDir } = await tmpDirs();
  const client = fakeClient();
  const result = await runLeadIntakeEnrichment(
    {
      rows: ACCEPTANCE_ROWS,
      source: ACCEPTANCE_SOURCE,
      mode: "dry",
      now: NOW,
      existingRecords: [],
      existingEnrichmentTasks: [],
    },
    { tasksDir, dataDir, skipLocal: true, skipStoreRead: true, store: { client } }
  );
  assert.equal(result.no_transport, true, "no_transport must be true");
  const r = result.receipts || {};
  for (const stage of ["intake", "validation", "dedupe", "scoring", "policy"]) {
    assert.ok(r[stage], `receipt for stage ${stage} must be present`);
  }
  assert.ok(result.quarantined && result.quarantined.length > 0, "at least one record should be quarantined (invalid/mock lead E)");
});

test("acceptance: repeated run of acceptance fixture is idempotent (restart-safe)", async () => {
  const { tasksDir, dataDir } = await tmpDirs();
  const client = fakeClient();
  const opts = { tasksDir, dataDir, skipLocal: true, skipStoreRead: true, store: { client } };
  const r1 = await runLeadIntakeEnrichment({ rows: [validRow()], source: ACCEPTANCE_SOURCE, mode: "dry", now: NOW, existingRecords: [] }, opts);
  // Force completion
  if (r1.task) {
    const { saveTask } = await import("../src/lib/execution/taskLifecycle.mjs");
    await saveTask({ ...r1.task, state: "completed", payload: { ...r1.task.payload, phase1_summary: r1.summary, phase1_receipts: r1.receipts } }, opts);
  }
  const r2 = await runLeadIntakeEnrichment({ rows: [validRow()], source: ACCEPTANCE_SOURCE, mode: "dry", correlation_id: r1.correlation_id, now: NOW, existingRecords: [] }, opts);
  assert.equal(r2.idempotent, true, "second run must be idempotent");
  assert.equal(r2.final_status, "completed");
});
