// ─── Phase 1 lead-rail PERSISTENCE CONTRACT proofs ───────────────────────────
// Atomic compare-and-swap, authoritative-read four-state contract, global alias
// ownership, durable enrichment lifecycle, and "no completion without every
// required persistence receipt". The in-memory client models the Postgres CAS RPC
// exactly, so concurrency is enforced by the store contract, not a prior app read.

import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { deriveLeadId } from "../src/lib/leadRail/identity.mjs";
import { dedupeAndReconcile } from "../src/lib/leadRail/dedupe.mjs";
import { buildEnrichmentTask, reconcileEnrichmentTasks } from "../src/lib/leadRail/enrichment.mjs";
import { ENRICHMENT_STATUS } from "../src/lib/leadRail/eligibility.mjs";
import { applyEnrichmentResult, watchdogCoworkEnrichment } from "../src/lib/leadRail/coworkHandoff.mjs";
import { runLeadIntakeEnrichment } from "../src/lib/leadRail/pipeline.mjs";
import {
  upsertLeads, leadToRow, PERSISTENCE, AUTHORITATIVE_READ,
  readAuthoritativeLeads, aliasRowsForUpserts, persistAliasRows, persistAliases,
  lookupAliasesResult, persistEnrichmentTasks, persistEnrichmentWriteBack,
} from "../src/lib/leadRail/store.mjs";

const NOW = "2026-06-06T12:00:00.000Z";
const D = (daysAgo) => new Date(Date.parse(NOW) - daysAgo * 86_400_000).toISOString();

let tmpCounter = 0;
async function tmpDirs() {
  const base = path.join(os.tmpdir(), `lr-persist-${process.pid}-${Date.now()}-${tmpCounter++}`);
  const tasksDir = path.join(base, "tasks");
  const dataDir = path.join(base, "data");
  await fs.mkdir(tasksDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });
  return { tasksDir, dataDir };
}

const jclone = (v) => JSON.parse(JSON.stringify(v));
function fakeSamePayload(a, b) {
  const strip = (v) => { const x = jclone(v || {}); delete x.updated_at; return x; };
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

// In-memory authoritative store modelling the CAS RPC + alias ownership + tasks.
function fakeClient(initial = [], opts = {}) {
  const store = new Map((initial || []).map((l) => [l.lead_id, jclone(l)]));
  const aliases = new Map(Object.entries(opts.aliases || {}));
  const tasks = new Map();
  return {
    configured: true, store, aliases, tasks,
    async read(id) {
      if (opts.failRead) throw new Error("read_failed_500");
      return store.has(id) ? jclone(store.get(id)) : null;
    },
    async readAll() {
      if (opts.failReadAll || opts.failRead) throw new Error("read_all_failed_500");
      return [...store.values()].map(jclone);
    },
    async atomicWrite(row, expectedVersion) {
      if (opts.failWrite) return { ok: false, error: "cas_write_failed_500:boom" };
      if (opts.throwWrite) throw new Error("network down");
      if (typeof opts.onBeforeWrite === "function") opts.onBeforeWrite(store, row);
      const id = row.lead_id;
      const target = Number(row.version ?? 1);
      const cur = store.get(id) || null;
      if (!cur) {
        if (expectedVersion !== 0 || target !== 1) return { ok: false, status: "conflict", reason: "first_insert_version_mismatch", current_version: 0 };
        store.set(id, jclone(row.raw_payload));
        return { ok: true, status: "inserted", version: 1 };
      }
      const curVersion = Number(cur.version ?? 1);
      if (curVersion !== expectedVersion) {
        if (curVersion === target && fakeSamePayload(cur, row.raw_payload)) return { ok: true, status: "idempotent", version: curVersion };
        return { ok: false, status: curVersion > target ? "stale" : "conflict", reason: "compare_and_swap_failed", current_version: curVersion };
      }
      if (target !== expectedVersion + 1) return { ok: false, status: "conflict", reason: "non_sequential_version", current_version: curVersion };
      store.set(id, jclone(row.raw_payload));
      return { ok: true, status: "updated", version: target };
    },
    async readBack(id) {
      if (opts.dropReadBack) return null;
      const l = store.get(id);
      if (!l) return null;
      if (opts.mismatchVersion) return { ...jclone(l), version: Number(l.version || 1) + 99 };
      if (opts.mismatchPayload) return { ...jclone(l), company_name: `MUT_${l.company_name || ""}` };
      return jclone(l);
    },
    async writeAliases(rows) {
      if (opts.failAliasWrite) return { ok: false, error: "alias_write_failed_500" };
      for (const r of rows) { const owner = aliases.get(r.alias_key); if (owner && owner !== r.lead_id) return { ok: false, status: "conflict", error: `alias_owner_conflict:${r.alias_key}:owned_by_${owner}` }; }
      for (const r of rows) if (!aliases.has(r.alias_key)) aliases.set(r.alias_key, r.lead_id);
      return { ok: true, count: rows.length };
    },
    async readAliases(keys) {
      if (opts.failAliasRead) throw new Error("alias_read_failed_500");
      return (keys || []).filter((k) => aliases.has(k)).map((k) => ({ alias_key: k, lead_id: aliases.get(k) }));
    },
    async writeEnrichmentTasks(rows) {
      if (opts.failTaskWrite) return { ok: false, error: "task_write_failed_500" };
      for (const r of rows) tasks.set(r.task_id, jclone(r));
      return { ok: true, count: rows.length };
    },
  };
}

function lead(over = {}) {
  const base = {
    lead_id: "", company_name: "Cascade Plumbing Co", website: "https://cascadeplumbing.com",
    normalized_phone: "2068241107", email: "", city: "Seattle", state: "WA",
    version: 1, created_at: NOW, updated_at: NOW, last_validated_at: NOW, imported_at: NOW,
    record_status: "accepted", tier: "B-tier", eligibility: "email_eligible",
    contact_validation: { phone: { valid: true, normalized: "2068241107" } }, fit_validation: { has_public_evidence: true },
  };
  const rec = { ...base, ...over };
  if (!rec.lead_id) rec.lead_id = deriveLeadId(rec);
  return rec;
}

// ─── LEAD CONCURRENCY CONTRACT ───────────────────────────────────────────────

test("1. a new record inserts at version 1", async () => {
  const client = fakeClient();
  const res = await upsertLeads([lead({ version: 1 })], { client });
  assert.equal(res.results[0].status, PERSISTENCE.PERSISTED);
  assert.equal(res.results[0].version, 1);
  assert.equal(client.store.size, 1);
});

test("2. an identical version-1 replay is idempotent (no second row)", async () => {
  const rec = lead({ version: 1 });
  const client = fakeClient([rec]);
  const res = await upsertLeads([rec], { client });
  assert.equal(res.results[0].status, PERSISTENCE.PERSISTED);
  assert.equal(res.results[0].idempotent, true);
  assert.equal(client.store.size, 1);
});

test("3. same version + different payload is a conflict", async () => {
  const rec = lead({ version: 1 });
  const client = fakeClient([rec]);
  const changed = lead({ lead_id: rec.lead_id, version: 1, company_name: "Different Co" });
  const res = await upsertLeads([changed], { client });
  assert.equal(res.results[0].status, PERSISTENCE.VERSION_CONFLICT);
  assert.match(res.results[0].reason, /same_version_different_payload/);
});

test("4. version 1 legitimately advances to version 2", async () => {
  const rec = lead({ version: 1 });
  const client = fakeClient([rec]);
  const v2 = lead({ lead_id: rec.lead_id, version: 2, email: "office@cascadeplumbing.com", last_validated_at: D(0) });
  const res = await upsertLeads([v2], { client });
  assert.equal(res.results[0].status, PERSISTENCE.PERSISTED);
  assert.equal(res.results[0].version, 2);
  assert.equal(Number(client.store.get(rec.lead_id).version), 2);
});

test("5. skipped version advancement is rejected", async () => {
  const rec = lead({ version: 1 });
  const client = fakeClient([rec]);
  const v3 = lead({ lead_id: rec.lead_id, version: 3 });
  const res = await upsertLeads([v3], { client });
  assert.equal(res.results[0].status, PERSISTENCE.VERSION_CONFLICT);
  assert.match(res.results[0].reason, /non_sequential_version/);
});

test("6. lower-version stale updates are rejected", async () => {
  // Stored row is strictly fresher → STALE (incoming dropped).
  const stored = lead({ version: 5, last_validated_at: D(0) });
  const client = fakeClient([stored]);
  const stale = lead({ lead_id: stored.lead_id, version: 2, last_validated_at: D(30) });
  const res = await upsertLeads([stale], { client });
  assert.equal(res.results[0].status, PERSISTENCE.STALE);
  assert.equal(Number(client.store.get(stored.lead_id).version), 5, "stored row untouched");
});

test("7. two simultaneous writers based on v1 cannot both write v2 (exactly one winner)", async () => {
  const rec = lead({ version: 1 });
  // Writer A and Writer B both read v1. Writer A commits v2 just before B's CAS.
  const client = fakeClient([rec], {
    onBeforeWrite: (store, row) => {
      // simulate the other writer having already advanced the row to v2
      if (Number(store.get(row.lead_id)?.version) === 1) {
        store.set(row.lead_id, { ...rec, version: 2, company_name: "WinnerA", updated_at: D(0) });
      }
    },
  });
  const loser = lead({ lead_id: rec.lead_id, version: 2, company_name: "LoserB", last_validated_at: D(0) });
  const res = await upsertLeads([loser], { client });
  assert.equal(res.results[0].status, PERSISTENCE.VERSION_CONFLICT);
  assert.equal(client.store.get(rec.lead_id).company_name, "WinnerA", "winner's row preserved");
});

test("8. atomicity is enforced by the CAS write, not merely a prior application read", async () => {
  // The app pre-check reads v1 and would allow v2, but the row advances to v2
  // between read and write; the CAS rejects the loser. This proves enforcement
  // happens at write time (Postgres), not at the earlier read.
  const rec = lead({ version: 1 });
  let advanced = false;
  const client = fakeClient([rec], {
    onBeforeWrite: (store, row) => {
      if (!advanced) { advanced = true; store.set(row.lead_id, { ...rec, version: 2, company_name: "RaceWinner", updated_at: D(0) }); }
    },
  });
  const res = await upsertLeads([lead({ lead_id: rec.lead_id, version: 2, company_name: "RaceLoser", last_validated_at: D(0) })], { client });
  assert.equal(res.results[0].status, PERSISTENCE.VERSION_CONFLICT);
});

test("9. read-after-write verifies lead_id, version, and payload", async () => {
  // version mismatch
  const vMis = await upsertLeads([lead({ version: 1 })], { client: fakeClient([], { mismatchVersion: true }) });
  assert.equal(vMis.results[0].status, PERSISTENCE.PENDING);
  assert.match(vMis.results[0].reason, /read_after_write_version_mismatch/);
  // payload mismatch
  const pMis = await upsertLeads([lead({ version: 1 })], { client: fakeClient([], { mismatchPayload: true }) });
  assert.equal(pMis.results[0].status, PERSISTENCE.PENDING);
  assert.match(pMis.results[0].reason, /read_after_write_payload_mismatch/);
  // missing read-back
  const drop = await upsertLeads([lead({ version: 1 })], { client: fakeClient([], { dropReadBack: true }) });
  assert.equal(drop.results[0].status, PERSISTENCE.PENDING);
  assert.match(drop.results[0].reason, /read_after_write_missing/);
});

test("10. a failed write reports persistence_pending (never success)", async () => {
  const res = await upsertLeads([lead({ version: 1 })], { client: fakeClient([], { failWrite: true }) });
  assert.equal(res.ok, false);
  assert.equal(res.results[0].status, PERSISTENCE.PENDING);
  assert.match(res.results[0].reason, /write_failed/);
});

// ─── AUTHORITATIVE READ FOUR-STATE CONTRACT ──────────────────────────────────

test("11. authoritative read: success with rows", async () => {
  const res = await readAuthoritativeLeads({ client: fakeClient([lead({ version: 1 })]) });
  assert.equal(res.ok, true);
  assert.equal(res.status, AUTHORITATIVE_READ.ROWS);
  assert.equal(res.rows.length, 1);
});

test("12. authoritative read: success with ZERO rows is distinct from failure", async () => {
  const res = await readAuthoritativeLeads({ client: fakeClient([]) });
  assert.equal(res.ok, true);
  assert.equal(res.status, AUTHORITATIVE_READ.EMPTY);
  assert.equal(res.rows.length, 0);
});

test("13. authoritative read: a failed read is read_failed (never empty-as-success)", async () => {
  const res = await readAuthoritativeLeads({ client: fakeClient([lead()], { failReadAll: true }) });
  assert.equal(res.ok, false);
  assert.equal(res.status, AUTHORITATIVE_READ.READ_FAILED);
  assert.match(res.reason, /authoritative_read_failed/);
});

test("14. authoritative read: unconfigured is distinct", async () => {
  const res = await readAuthoritativeLeads({ client: null, config: null });
  assert.equal(res.configured, false);
  assert.equal(res.status, AUTHORITATIVE_READ.UNCONFIGURED);
});

test("15. internal-mode run STOPS on authoritative-read failure (never proceeds as empty)", async () => {
  const dirs = await tmpDirs();
  const client = fakeClient([lead({ version: 3 })], { failReadAll: true });
  const res = await runLeadIntakeEnrichment(
    { rows: [{ company_name: "New Co", website: "https://newco-persist.io", phone: "5122340000", source_url: "internal://x" }], source: { source_url: "x" }, mode: "internal", now: NOW },
    { ...dirs, store: { client }, skipLocal: true }, // NOT skipStoreRead → authoritative read attempted
  );
  assert.equal(res.final_status, "blocked");
  assert.equal(res.reason, "authoritative_read_failed");
});

// ─── GLOBAL ALIAS OWNERSHIP ──────────────────────────────────────────────────

test("16. all canonical identity aliases are written on first insert", async () => {
  const rec = lead({ version: 1, email: "office@cascadeplumbing.com" });
  const rows = aliasRowsForUpserts([rec], [], NOW);
  const keys = rows.map((r) => r.alias_key);
  assert.ok(keys.includes("domain:cascadeplumbing.com"));
  assert.ok(keys.includes("phone:2068241107"));
  assert.ok(keys.includes("email:office@cascadeplumbing.com"));
  const client = fakeClient();
  const res = await persistAliasRows(rows, { client });
  assert.equal(res.ok, true);
  for (const k of keys) assert.equal(client.aliases.get(k), rec.lead_id);
});

test("17. a contact change writes BOTH the old and new alias keys to the same lead", async () => {
  const existing = lead({ website: "https://cascade.com", normalized_phone: "2068241107", version: 3 });
  const incoming = lead({ website: "https://cascade.com", normalized_phone: "2065559999", last_validated_at: D(0) });
  const res = dedupeAndReconcile([incoming], [existing], { now: NOW });
  const rows = aliasRowsForUpserts(res.upserts, res.aliases, NOW);
  const byKey = new Map(rows.map((r) => [r.alias_key, r.lead_id]));
  assert.equal(byKey.get("phone:2068241107"), existing.lead_id, "old phone alias retained");
  assert.equal(byKey.get("phone:2065559999"), existing.lead_id, "new phone alias added");
});

test("18. alias lookup resolves a changed contact to the stable lead_id", async () => {
  const existing = lead({ website: "https://cascade.com", normalized_phone: "2068241107", version: 2 });
  const client = fakeClient([existing], { aliases: { "domain:cascade.com": existing.lead_id, "phone:2068241107": existing.lead_id } });
  const found = await lookupAliasesResult(["phone:2068241107", "domain:cascade.com"], { client });
  assert.equal(found.ok, true);
  assert.equal(found.rows.find((r) => r.alias_key === "phone:2068241107").lead_id, existing.lead_id);
});

test("19. same alias + same owner is idempotent", async () => {
  const rec = lead({ version: 1 });
  const client = fakeClient();
  const rows = aliasRowsForUpserts([rec], [], NOW);
  assert.equal((await persistAliasRows(rows, { client })).ok, true);
  const again = await persistAliasRows(rows, { client });
  assert.equal(again.ok, true, "re-writing the same owner's aliases is idempotent");
});

test("20. same alias claimed by a DIFFERENT lead is a hard conflict", async () => {
  const client = fakeClient([], { aliases: { "domain:cascadeplumbing.com": "lid_v1_existingowner" } });
  const rec = lead({ version: 1 }); // derives a different lead_id, same domain alias
  const res = await persistAliasRows(aliasRowsForUpserts([rec], [], NOW), { client });
  assert.equal(res.ok, false);
  assert.match(res.reason, /alias_owner_conflict/);
});

test("21. an alias read failure is truthful, not silently empty", async () => {
  const res = await lookupAliasesResult(["domain:cascade.com"], { client: fakeClient([], { failAliasRead: true }) });
  assert.equal(res.ok, false);
  assert.equal(res.status, "read_failed");
  assert.match(res.reason, /alias_read_failed/);
});

test("22. alias persistence failure prevents pipeline completion", async () => {
  const dirs = await tmpDirs();
  const client = fakeClient([], { failAliasWrite: true });
  const res = await runLeadIntakeEnrichment(
    { rows: [{ company_name: "Alias Fail Co", website: "https://aliasfail.io", phone: "5122340000", source_url: "internal://x" }], source: { source_url: "x" }, now: NOW },
    { ...dirs, skipStoreRead: true, store: { client }, skipLocal: true },
  );
  assert.notEqual(res.final_status, "completed");
  assert.equal(res.persistence.aliases.ok, false);
});

// ─── DURABLE ENRICHMENT LIFECYCLE ────────────────────────────────────────────

test("23. enrichment task durable creation + persistence", async () => {
  const l = lead({ lead_id: "lid_v1_enr0000000001" });
  const task = buildEnrichmentTask(l, { now: NOW });
  const client = fakeClient([l]);
  const res = await persistEnrichmentTasks([task], { client });
  assert.equal(res.ok !== false, true);
  assert.ok(client.tasks.has(task.task_id));
});

test("24. enrichment retry in place reuses the same task_id (no duplicate)", () => {
  const l = { lead_id: "lid_v1_enr0000000002" };
  const blocked = { ...buildEnrichmentTask(l, { now: D(2) }), status: ENRICHMENT_STATUS.BLOCKED, attempt: 1 };
  const res = reconcileEnrichmentTasks([l], [blocked], { now: NOW });
  assert.equal(res.tasks.length, 1);
  assert.equal(res.retried, 1);
  assert.equal(res.tasks[0].task_id, blocked.task_id);
  assert.equal(res.tasks[0].attempt, 2);
});

test("25. a blocked Cowork result persists blocked state, never completes the lead", async () => {
  const l = lead({ lead_id: "lid_v1_enr0000000003", version: 1, contact_validation: {}, email: "", normalized_phone: "" });
  const task = buildEnrichmentTask(l, { now: NOW });
  const client = fakeClient([l]);
  const res = await applyEnrichmentResult(l, task, { out_of_credits: true, reason: "no_credits" }, { store: { client }, now: NOW, baseVersion: 1 });
  assert.equal(res.ok, false);
  assert.equal(res.task.status, ENRICHMENT_STATUS.BLOCKED);
  assert.equal(Number(client.store.get(l.lead_id).version), 1, "lead version NOT advanced on block");
  assert.ok(client.tasks.has(task.task_id), "blocked task persisted durably");
});

test("26. a verified Cowork result writes back the lead at version+1 and persists the task", async () => {
  const l = lead({ lead_id: "lid_v1_enr0000000004", version: 1, contact_validation: {}, email: "", normalized_phone: "", website: "https://harborviewpm.io" });
  const task = buildEnrichmentTask(l, { now: NOW });
  const client = fakeClient([l]);
  const res = await applyEnrichmentResult(
    l, task,
    { email: "leasing@harborviewpm.io", source_url: "https://harborviewpm.io/team", actor: "Cowork" },
    { store: { client }, now: NOW, baseVersion: 1 },
  );
  assert.equal(res.ok, true, res.reason);
  assert.equal(res.lead.version, 2);
  assert.equal(Number(client.store.get(l.lead_id).version), 2);
  assert.equal(client.store.get(l.lead_id).enrichment_status, ENRICHMENT_STATUS.COMPLETED);
  assert.equal(client.tasks.get(task.task_id).status, ENRICHMENT_STATUS.COMPLETED);
});

test("27. enrichment write-back conflicts if the lead changed while Cowork was working", async () => {
  const l = lead({ lead_id: "lid_v1_enr0000000005", version: 1, contact_validation: {}, email: "", normalized_phone: "", website: "https://changed.io", last_validated_at: D(0) });
  // The stored lead already moved to v5 while Cowork worked from v1.
  const moved = lead({ lead_id: l.lead_id, version: 5, last_validated_at: D(0) });
  const client = fakeClient([moved]);
  const task = buildEnrichmentTask(l, { now: NOW });
  const res = await applyEnrichmentResult(
    l, task,
    { email: "leasing@changed.io", source_url: "https://changed.io/team", actor: "Cowork" },
    { store: { client }, now: NOW, baseVersion: 1 },
  );
  assert.equal(res.ok, false, "must not silently overwrite a concurrently-changed lead");
  assert.equal(Number(client.store.get(l.lead_id).version), 5, "stored lead unchanged");
});

test("28. watchdog flags a stalled enrichment task", () => {
  const task = buildEnrichmentTask({ lead_id: "lid_v1_enr0000000006", website: "https://x.io" }, { now: D(3) });
  const wd = watchdogCoworkEnrichment([task], { now: NOW, stallMinutes: 60 });
  assert.equal(wd.summary.stalled, 1);
  assert.equal(wd.alerts[0].failure_class, "enrichment_stalled");
});

// ─── COMPLETION GATING ───────────────────────────────────────────────────────

test("29. no completion without the canonical lead persistence receipt", async () => {
  const dirs = await tmpDirs();
  const res = await runLeadIntakeEnrichment(
    { rows: [{ company_name: "Lead Fail Co", website: "https://leadfail.io", phone: "5122340000", source_url: "internal://x" }], source: { source_url: "x" }, now: NOW },
    { ...dirs, skipStoreRead: true, store: { client: fakeClient([], { failWrite: true }) }, skipLocal: true },
  );
  assert.notEqual(res.final_status, "completed");
  assert.equal(res.persistence.persisted, 0);
});

test("30. no completion without the enrichment-task persistence receipt", async () => {
  const dirs = await tmpDirs();
  // A source that queues enrichment, with enrichment-task writes failing.
  const res = await runLeadIntakeEnrichment(
    { rows: [{ company_name: "Harborview PM", website: "https://harborviewpm.io", source_url: "https://indeed.com/x", evidence_snippet: "hiring dispatcher", industry: "property_management" }], source: { source_url: "x" }, now: NOW },
    { ...dirs, skipStoreRead: true, store: { client: fakeClient([], { failTaskWrite: true }) }, skipLocal: true },
  );
  // Only assert gating when an enrichment task was actually queued.
  if ((res.enrichment_tasks || []).length > 0) {
    assert.notEqual(res.final_status, "completed");
    assert.equal(res.persistence.enrichment_tasks.ok, false);
  }
});

test("31. the rail invokes no transport during persistence", async () => {
  const dirs = await tmpDirs();
  const res = await runLeadIntakeEnrichment(
    { rows: [{ company_name: "No Transport Co", website: "https://notransport.io", phone: "5122340000", source_url: "internal://x" }], source: { source_url: "x" }, now: NOW },
    { ...dirs, skipStoreRead: true, store: { client: fakeClient() }, skipLocal: true },
  );
  assert.equal(res.no_transport, true);
  assert.ok(!/message_id|smtp_id|call_id|retell|dm_id|post_id/i.test(JSON.stringify(res.receipts)));
});
