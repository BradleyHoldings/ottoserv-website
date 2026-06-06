import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";

import { deriveLeadId, identityKeys, IDENTITY_VERSION } from "../src/lib/leadRail/identity.mjs";
import { validateLead, validatePhone, validateEmail, validateWebsite, RECORD_STATUS } from "../src/lib/leadRail/validate.mjs";
import { scoreLead } from "../src/lib/leadRail/score.mjs";
import { classifyEligibility, ELIGIBILITY, ENRICHMENT_STATUS } from "../src/lib/leadRail/eligibility.mjs";
import { normalizeRow } from "../src/lib/leadRail/normalize.mjs";
import { dedupeAndReconcile } from "../src/lib/leadRail/dedupe.mjs";
import { needsEnrichment, buildEnrichmentTask, reconcileEnrichmentTasks, ingestEnrichmentResult, detectStalledEnrichment } from "../src/lib/leadRail/enrichment.mjs";
import { upsertLeads, leadToRow, PERSISTENCE } from "../src/lib/leadRail/store.mjs";
import { runLeadIntakeEnrichment, REQUIRED_STAGES, LEAD_INTAKE_OPERATION } from "../src/lib/leadRail/pipeline.mjs";
import { loadAllTasks } from "../src/lib/execution/taskLifecycle.mjs";

const NOW = "2026-06-06T12:00:00.000Z";
const D = (daysAgo) => new Date(Date.parse(NOW) - daysAgo * 86_400_000).toISOString();

// ── helpers ─────────────────────────────────────────────────────────────────
let tmpCounter = 0;
async function tmpDirs() {
  const base = path.join(os.tmpdir(), `lead-rail-${process.pid}-${Date.now()}-${tmpCounter++}`);
  const tasksDir = path.join(base, "tasks");
  const dataDir = path.join(base, "data");
  await fs.mkdir(tasksDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });
  return { tasksDir, dataDir };
}

// In-memory Supabase client implementing the store's read/write/readBack contract.
function fakeClient(initial = [], opts = {}) {
  const store = new Map((initial || []).map((l) => [l.lead_id, JSON.parse(JSON.stringify(l))]));
  return {
    store,
    async read(id) { return store.has(id) ? JSON.parse(JSON.stringify(store.get(id))) : null; },
    async write(row) {
      if (opts.failWrite) return { ok: false, error: "write_failed_500:boom" };
      if (opts.throwWrite) throw new Error("network down");
      const lead = row.raw_payload;
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

const acceptedRow = (over = {}) => ({
  company_name: "Cascade Plumbing Co",
  website: "https://cascadeplumbing.com",
  phone: "(206) 824-1107",
  email: "office@cascadeplumbing.com",
  city: "Seattle",
  state: "WA",
  industry: "plumbing",
  source_url: "https://www.reddit.com/r/smallbusiness/comments/x/",
  date_of_signal: D(10),
  intent_type: "missed_call_or_response_issue",
  evidence_snippet: "We keep missing calls after 5pm.",
  ...over,
});

// Build a minimal canonical record (the fields dedupe/identity/store read).
function canonical(over = {}) {
  const base = {
    lead_id: "", company_name: "Acme", website: "", normalized_phone: "", email: "",
    city: "", state: "", version: 1, created_at: NOW, updated_at: NOW,
    last_validated_at: NOW, imported_at: NOW, record_status: RECORD_STATUS.ACCEPTED,
    tier: "B-tier", eligibility: ELIGIBILITY.EMAIL,
  };
  const rec = { ...base, ...over };
  if (!rec.lead_id) rec.lead_id = deriveLeadId(rec);
  return rec;
}

// ── 1. deterministic lead ID independent of row order ─────────────────────────
test("lead_id is deterministic and independent of row order / run time", () => {
  const a = deriveLeadId({ website: "https://Cascadeplumbing.com/contact", company_name: "X" });
  const b = deriveLeadId({ website: "http://www.cascadeplumbing.com", company_name: "Y" });
  assert.equal(a, b, "same domain → same id regardless of casing/path/scheme/company");
  assert.ok(a.startsWith(`lid_${IDENTITY_VERSION}_`));

  const r1 = normalizeRow(acceptedRow(), { now: NOW }).normalized;
  const r2 = normalizeRow(acceptedRow(), { now: D(5) }).normalized; // different run time
  assert.equal(deriveLeadId(r1), deriveLeadId(r2), "id does not depend on import/run time");
});

test("pipeline produces the same lead_id set regardless of input order", async () => {
  const rows = [acceptedRow(), acceptedRow({ company_name: "Harborview PM", website: "https://harborviewpm.com", phone: "", email: "", source_url: "https://indeed.com/x" }), acceptedRow({ company_name: "Summit Air", website: "https://summitair.com", email: "s@summitair.com", phone: "" })];
  const t1 = await tmpDirs();
  const t2 = await tmpDirs();
  const a = await runLeadIntakeEnrichment({ rows, source: { source_url: "s1" }, now: NOW }, { ...t1, skipStoreRead: true, store: { client: fakeClient() }, skipLocal: true });
  const b = await runLeadIntakeEnrichment({ rows: [...rows].reverse(), source: { source_url: "s1" }, now: NOW }, { ...t2, skipStoreRead: true, store: { client: fakeClient() }, skipLocal: true });
  const ids = (r) => r.upserts.map((l) => l.lead_id).sort();
  assert.deepEqual(ids(a), ids(b));
});

// ── 2. duplicate within one file ──────────────────────────────────────────────
test("duplicate within one file collapses to a single lead", () => {
  const a = canonical({ company_name: "Cascade", website: "https://cascade.com" });
  const b = canonical({ company_name: "Cascade Plumbing Co", website: "https://www.cascade.com/contact" });
  const res = dedupeAndReconcile([a, b], [], { now: NOW });
  assert.equal(res.upserts.length, 1);
  assert.equal(res.stats.new, 1);
  assert.equal(res.stats.duplicates, 1);
});

// ── 3. duplicate against Supabase (existing records) ──────────────────────────
test("duplicate against existing store updates, never creates a second lead", () => {
  const existing = canonical({ website: "https://cascade.com", normalized_phone: "2068241107", version: 1 });
  const incoming = canonical({ website: "https://cascade.com", normalized_phone: "2068241107", last_validated_at: D(0) });
  const res = dedupeAndReconcile([incoming], [existing], { now: NOW });
  assert.equal(res.stats.new, 0);
  assert.equal(res.stats.updated, 1);
  assert.equal(res.upserts[0].lead_id, existing.lead_id, "stable id reused");
  assert.equal(res.upserts[0].version, 2, "version bumped");
});

// ── 4. changed phone/email/domain reconciliation (alias) ──────────────────────
test("changed phone reconciles to the same lead with an alias record", () => {
  const existing = canonical({ website: "https://cascade.com", normalized_phone: "2068241107", version: 3 });
  const incoming = canonical({ website: "https://cascade.com", normalized_phone: "2065559999", last_validated_at: D(0) });
  const res = dedupeAndReconcile([incoming], [existing], { now: NOW });
  assert.equal(res.stats.updated, 1);
  assert.equal(res.upserts[0].lead_id, existing.lead_id);
  assert.equal(res.aliases.length, 1);
  assert.deepEqual(res.aliases[0].changed[0], { kind: "normalized_phone", from: "2068241107", to: "2065559999" });
});

// ── 5. mock/test quarantine ───────────────────────────────────────────────────
test("mock/test records are quarantined, not deleted", () => {
  const { normalized } = normalizeRow({ company_name: "Test Company", website: "https://example.com", email: "test@example.com", phone: "(000) 000-0000" }, { now: NOW });
  const v = validateLead(normalized, { now: NOW });
  assert.equal(v.record_status, RECORD_STATUS.QUARANTINED);
  assert.ok(v.reasons.some((r) => r.includes("placeholder_company")));
  assert.ok(v.reasons.some((r) => r.includes("mock_website_domain")));
});

// ── 6. missing source evidence ────────────────────────────────────────────────
test("a record with no public source evidence is quarantined", () => {
  const { normalized } = normalizeRow({ company_name: "Real Plumbing LLC", website: "https://realplumbing.com", phone: "(206) 824-1188", email: "hi@realplumbing.com" }, { now: NOW });
  const v = validateLead(normalized, { now: NOW });
  assert.equal(v.record_status, RECORD_STATUS.QUARANTINED);
  assert.ok(v.reasons.some((r) => r.includes("missing_source_evidence")));
});

// ── 7. invalid contact paths ──────────────────────────────────────────────────
test("invalid/reserved phones are rejected by the validator", () => {
  assert.equal(validatePhone("(800) 555-0100").valid, false); // toll-free + 555
  assert.equal(validatePhone("000-000-0000").code, "placeholder_000_phone");
  assert.equal(validatePhone("206-555-0100").code, "reserved_555_phone");
  assert.equal(validatePhone("12345").code, "malformed_phone");
  assert.equal(validatePhone("(206) 824-1107").valid, true);
  assert.equal(validateEmail("test@example.com").code, "non_real_email_domain");
  assert.equal(validateWebsite("https://example.com").code, "non_real_domain");
});

test("a lead whose only contact is mock and has no website is quarantined", () => {
  const { normalized } = normalizeRow({ company_name: "Ghost HVAC", phone: "206-555-0100", source_url: "https://reddit.com/x", evidence_snippet: "pain" }, { now: NOW });
  const v = validateLead(normalized, { now: NOW });
  assert.equal(v.record_status, RECORD_STATUS.QUARANTINED);
  assert.ok(v.reasons.some((r) => r.includes("no_contact_path")));
});

// ── 8. public evidence + missing contact → queues enrichment ──────────────────
test("public evidence with an enrichable website but no contact queues enrichment", () => {
  const { normalized } = normalizeRow({ company_name: "Harborview PM", website: "https://harborviewpm.com", source_url: "https://indeed.com/x", evidence_snippet: "hiring dispatcher", industry: "property_management" }, { now: NOW });
  const v = validateLead(normalized, { now: NOW });
  assert.equal(v.record_status, RECORD_STATUS.ACCEPTED);
  const scored = scoreLead(normalizeRow({ company_name: "Harborview PM", website: "https://harborviewpm.com", source_url: "https://indeed.com/x", evidence_snippet: "hiring dispatcher", industry: "property_management" }, { now: NOW }).scoringInput, { now: NOW });
  const policy = classifyEligibility({ record_status: v.record_status, contact_validation: v.contact_validation, fit_validation: v.fit_validation, score: scored });
  assert.equal(policy.eligibility, ELIGIBILITY.ENRICH);
  assert.equal(policy.enrichment_status, ENRICHMENT_STATUS.QUEUED);
  const lead = { lead_id: "lid_v1_x", contact_validation: v.contact_validation, fit_validation: v.fit_validation };
  assert.equal(needsEnrichment(lead), true);
});

// ── 9. existing verified contact skips enrichment ─────────────────────────────
test("a lead with a verified contact path is not queued for enrichment", () => {
  const { normalized } = normalizeRow(acceptedRow(), { now: NOW });
  const v = validateLead(normalized, { now: NOW });
  const lead = { lead_id: "lid_v1_y", contact_validation: v.contact_validation, fit_validation: v.fit_validation };
  assert.equal(needsEnrichment(lead), false);
  const scored = scoreLead(normalizeRow(acceptedRow(), { now: NOW }).scoringInput, { now: NOW });
  const policy = classifyEligibility({ record_status: v.record_status, contact_validation: v.contact_validation, fit_validation: v.fit_validation, score: scored });
  assert.notEqual(policy.eligibility, ELIGIBILITY.ENRICH);
  assert.equal(policy.enrichment_status, ENRICHMENT_STATUS.NOT_REQUIRED);
});

// ── 10. unsupported high-intent claim is downgraded ───────────────────────────
test("a high-intent claim without public evidence is downgraded (evidence gate)", () => {
  const noEvidence = scoreLead({ business_name: "X Plumbing", industry: "plumbing", intent_type: "explicit_buying_intent", date_of_signal: D(2), phone: "2068241107" }, { now: NOW });
  assert.equal(noEvidence.signal_window, "evergreen_fit");
  assert.ok(noEvidence.score_reasons.some((r) => /downgrad/i.test(r)));
  const withEvidence = scoreLead({ business_name: "X Plumbing", industry: "plumbing", intent_type: "explicit_buying_intent", date_of_signal: D(2), phone: "2068241107", source_url: "https://reddit.com/x", evidence_snippet: "we want this now" }, { now: NOW });
  assert.equal(withEvidence.signal_window, "last_30_days");
  assert.ok(withEvidence.score > noEvidence.score);
});

// ── 11. stale import protection ───────────────────────────────────────────────
test("a stale import never overwrites a fresher existing record", () => {
  const existing = canonical({ website: "https://cascade.com", last_validated_at: D(0), version: 5 });
  const stale = canonical({ website: "https://cascade.com", email: "old@cascade.com", last_validated_at: D(30) });
  const res = dedupeAndReconcile([stale], [existing], { now: NOW });
  assert.equal(res.stats.updated, 0);
  assert.equal(res.stats.stale_skipped, 1);
  assert.equal(res.upserts.length, 0, "nothing persisted from a stale import");
});

// ── 12. Supabase failed write → persistence_pending ───────────────────────────
test("a failed Supabase write reports persistence_pending (never success)", async () => {
  const rec = canonical({ website: "https://cascade.com", version: 1 });
  const res = await upsertLeads([rec], { client: fakeClient([], { failWrite: true }) });
  assert.equal(res.ok, false);
  assert.equal(res.results[0].status, PERSISTENCE.PENDING);
  assert.match(res.results[0].reason, /write_failed/);
});

// ── 13. read-after-write mismatch → pending ───────────────────────────────────
test("a read-after-write mismatch reports persistence_pending", async () => {
  const rec = canonical({ website: "https://cascade.com", version: 1 });
  const res = await upsertLeads([rec], { client: fakeClient([], { mismatchVersion: true }) });
  assert.equal(res.results[0].status, PERSISTENCE.PENDING);
  assert.match(res.results[0].reason, /read_after_write_version_mismatch/);

  const dropped = await upsertLeads([rec], { client: fakeClient([], { dropReadBack: true }) });
  assert.equal(dropped.results[0].status, PERSISTENCE.PENDING);
  assert.match(dropped.results[0].reason, /read_after_write_missing/);
});

// ── 14. concurrency / version conflict ────────────────────────────────────────
test("a concurrent version advance is detected and not overwritten", async () => {
  const advanced = canonical({ website: "https://cascade.com", version: 9, last_validated_at: D(0) });
  // We try to write version 2 (base 1) but the row is already at 9 and newer.
  const rec = canonical({ lead_id: advanced.lead_id, website: "https://cascade.com", version: 2, last_validated_at: D(20) });
  const res = await upsertLeads([rec], { client: fakeClient([advanced]) });
  assert.equal(res.results[0].status, PERSISTENCE.STALE);

  // Same version race but our record is fresher → version_conflict (needs rebase).
  const rec2 = canonical({ lead_id: advanced.lead_id, website: "https://cascade.com", version: 2, last_validated_at: D(0) });
  const res2 = await upsertLeads([rec2], { client: fakeClient([{ ...advanced, last_validated_at: D(0) }]) });
  assert.equal(res2.results[0].status, PERSISTENCE.VERSION_CONFLICT);
});

// ── 15. repeated execution idempotency ────────────────────────────────────────
test("repeated execution creates no duplicate leads or tasks", async () => {
  const dirs = await tmpDirs();
  const client = fakeClient();
  const rows = [acceptedRow(), acceptedRow({ company_name: "Summit Air", website: "https://summitair.com", email: "s@summitair.com", phone: "" })];
  const opts = { ...dirs, skipStoreRead: true, store: { client }, skipLocal: true };
  const first = await runLeadIntakeEnrichment({ rows, source: { source_url: "s" }, now: NOW }, opts);
  assert.equal(first.final_status, "completed");
  const sizeAfterFirst = client.store.size;

  const second = await runLeadIntakeEnrichment({ rows, source: { source_url: "s" }, now: NOW }, opts);
  assert.equal(second.idempotent, true);
  assert.equal(second.task.task_id, first.task.task_id);
  assert.equal(client.store.size, sizeAfterFirst, "no new leads on re-run");
  const tasks = await loadAllTasks(dirs);
  assert.equal(tasks.filter((t) => t.operation_type === LEAD_INTAKE_OPERATION).length, 1, "no duplicate task");
});

// ── 16. restart recovery ──────────────────────────────────────────────────────
test("a run interrupted before persistence resumes to completion on re-run", async () => {
  const dirs = await tmpDirs();
  const rows = [acceptedRow()];
  // First run: store unconfigured → ends partially_completed (persistence_pending).
  const first = await runLeadIntakeEnrichment({ rows, source: { source_url: "s" }, now: NOW }, { ...dirs, skipStoreRead: true, store: { client: null }, skipLocal: true });
  assert.equal(first.final_status, "partially_completed");
  assert.equal(first.task.state, "partially_completed");

  // Restart with a working store → same task resumes and completes.
  const client = fakeClient();
  const second = await runLeadIntakeEnrichment({ rows, source: { source_url: "s" }, now: NOW }, { ...dirs, skipStoreRead: true, store: { client }, skipLocal: true });
  assert.equal(second.resumed, true);
  assert.equal(second.task.task_id, first.task.task_id);
  assert.equal(second.final_status, "completed");
  const tasks = await loadAllTasks(dirs);
  assert.equal(tasks.filter((t) => t.operation_type === LEAD_INTAKE_OPERATION).length, 1);
});

// ── 17. stalled enrichment watchdog signal ────────────────────────────────────
test("a stalled enrichment task raises a watchdog signal", () => {
  const task = buildEnrichmentTask({ lead_id: "lid_v1_h", company_name: "Harborview", website: "https://harborviewpm.com" }, { now: D(3) });
  const wd = detectStalledEnrichment([task], { now: NOW, stallMinutes: 60 });
  assert.equal(wd.summary.stalled, 1);
  assert.equal(wd.alerts[0].failure_class, "enrichment_stalled");
  assert.equal(wd.alerts[0].retry_eligible, true);
});

test("enrichment retries in place without creating a duplicate task", () => {
  const lead = { lead_id: "lid_v1_h" };
  const blocked = { ...buildEnrichmentTask(lead, { now: D(2) }), status: ENRICHMENT_STATUS.BLOCKED, attempt: 1 };
  const res = reconcileEnrichmentTasks([lead], [blocked], { now: NOW });
  assert.equal(res.tasks.length, 1, "same task id reused");
  assert.equal(res.retried, 1);
  assert.equal(res.tasks[0].attempt, 2);
  assert.equal(res.tasks[0].task_id, blocked.task_id);
});

test("enrichment result ingestion requires real verified contact + evidence", () => {
  const lead = { lead_id: "lid_v1_h", company_name: "Harborview", website: "https://harborviewpm.com", contact_validation: {} };
  const task = buildEnrichmentTask(lead, { now: NOW });
  // queued is not proof: a result with no contact fails.
  assert.equal(ingestEnrichmentResult(lead, task, {}, { now: NOW }).ok, false);
  // actor out of credits → blocked, not completed.
  const blocked = ingestEnrichmentResult(lead, task, { out_of_credits: true }, { now: NOW });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.task.status, ENRICHMENT_STATUS.BLOCKED);
  // verified contact + evidence → completed write-back.
  const ok = ingestEnrichmentResult(lead, task, { email: "leasing@harborviewpm.com", source_url: "https://harborviewpm.com/team", actor: "Cowork" }, { now: NOW });
  assert.equal(ok.ok, true);
  assert.equal(ok.lead.enrichment_status, ENRICHMENT_STATUS.COMPLETED);
  assert.equal(ok.lead.email, "leasing@harborviewpm.com");
});

// ── 18. no email/call/DM/social action ────────────────────────────────────────
test("the rail triggers no transport (no email/call/DM/social)", async () => {
  const dirs = await tmpDirs();
  const res = await runLeadIntakeEnrichment({ rows: [acceptedRow()], source: { source_url: "s" }, now: NOW }, { ...dirs, skipStoreRead: true, store: { client: fakeClient() }, skipLocal: true });
  assert.equal(res.no_transport, true);
  // No stage receipt may carry a transport id (message_id / call_id / dm / post).
  const blob = JSON.stringify(res.receipts);
  assert.ok(!/message_id|smtp_id|call_id|retell|dm_id|post_id|published_url/i.test(blob), "no transport identifiers in receipts");
  // The pipeline source must not import any transport executor.
  const src = readFileSync(new URL("../src/lib/leadRail/pipeline.mjs", import.meta.url), "utf8");
  assert.ok(!/EmailExecutor|CallExecutor|retell|gmail|nodemailer|social/i.test(src), "rail imports no transport");
});

// ── 19. no completion claim without receipts ──────────────────────────────────
test("completion requires all stage receipts + confirmed persistence", async () => {
  const dirs = await tmpDirs();
  // Persistence pending (unconfigured) → must NOT claim completed.
  const pending = await runLeadIntakeEnrichment({ rows: [acceptedRow()], source: { source_url: "s" }, now: NOW }, { ...dirs, skipStoreRead: true, store: { client: null }, skipLocal: true });
  assert.notEqual(pending.final_status, "completed");
  assert.equal(pending.task.state, "partially_completed");

  // Working store → completed, and every required stage has a receipt.
  const dirs2 = await tmpDirs();
  const ok = await runLeadIntakeEnrichment({ rows: [acceptedRow()], source: { source_url: "s2" }, now: NOW }, { ...dirs2, skipStoreRead: true, store: { client: fakeClient() }, skipLocal: true });
  assert.equal(ok.final_status, "completed");
  for (const stage of REQUIRED_STAGES) assert.ok(ok.receipts[stage], `missing receipt: ${stage}`);
  // empty intake → blocked, never completed.
  const dirs3 = await tmpDirs();
  const empty = await runLeadIntakeEnrichment({ rows: [], source: { source_url: "s3" }, now: NOW }, { ...dirs3, skipStoreRead: true, store: { client: fakeClient() }, skipLocal: true });
  assert.equal(empty.final_status, "blocked");
});

// ── bonus: end-to-end fixture classification ──────────────────────────────────
test("the committed fixture processes end-to-end into accept/quarantine/reject", async () => {
  const dirs = await tmpDirs();
  const rows = JSON.parse(readFileSync(new URL("../data/lead-rail/fixtures/sample-source.json", import.meta.url), "utf8"));
  const client = fakeClient();
  const res = await runLeadIntakeEnrichment({ rows, source: { source_type: "fixture", source_url: "fixture" }, now: NOW }, { ...dirs, skipStoreRead: true, store: { client }, skipLocal: true });
  assert.equal(res.final_status, "completed");
  assert.equal(res.summary.rejected, 1);
  assert.ok(res.summary.quarantined >= 1);
  assert.equal(res.summary.dedupe.duplicates, 1, "the in-file Cascade duplicate collapsed");
  assert.ok(res.summary.enrichment.queued >= 1, "the no-contact evidenced lead queued enrichment");
});
