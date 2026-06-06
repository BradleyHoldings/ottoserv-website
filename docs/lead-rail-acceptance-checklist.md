# Lead Rail Phase 1 — Acceptance Checklist

**PR:** #26  
**Branch:** `phase1-lead-rail-integration`  
**Operator:** Jonathan (final review + approval required before each step)

---

## Pre-merge checklist

### Code review
- [ ] One canonical `src/lib/leadRail/` implementation (no second lead system)
- [ ] No nondeterministic lead IDs in active intake paths (all use `deriveLeadId`)
- [ ] No hidden transport invocation (all results carry `no_transport: true`)
- [ ] Supabase writes are server-only (`SUPABASE_SERVICE_KEY` never in `NEXT_PUBLIC_*`)
- [ ] Service key cannot reach browser code (checked via grep: `NEXT_PUBLIC_SUPABASE_SERVICE`)
- [ ] Legacy import adapters call canonical rail (not a parallel implementation)
- [ ] Task completion requires persistence receipts (pipeline code verified)
- [ ] Enrichment `queued` state is NOT presented as `completed`
- [ ] Stale imports cannot overwrite newer verified records (version check in store.mjs)

### Migration review
- [ ] `supabase/hermes_pipeline_schema.sql` is additive (no DROP/ALTER on existing tables)
- [ ] `hermes_pipeline.lead_id` is `PRIMARY KEY`
- [ ] `hermes_pipeline.version` is `NOT NULL DEFAULT 1`
- [ ] `hermes_pipeline.raw_payload` is `NOT NULL`
- [ ] `discovered_at` and `imported_at` are distinct columns
- [ ] RLS enabled on all three tables (`hermes_pipeline`, `hermes_lead_aliases`, `hermes_enrichment_tasks`)
- [ ] No policies defined (service-key-only write path)
- [ ] Alias table has FK to `hermes_pipeline(lead_id) ON DELETE CASCADE`
- [ ] Rollback SQL is present and correct
- [ ] Migration validation queries are present and commented

### Test results
- [ ] `lead-rail.test.mjs`: 24/24 pass
- [ ] `lead-rail-consolidation.test.mjs`: 4/4 pass
- [ ] `lead-rail-production-readiness.test.mjs`: 46/46 pass
- [ ] Full suite: 442/444 pass (only 2 known pre-existing failures)
- [ ] `npm run build`: passed

---

## Migration acceptance (after applying to Supabase)

- [ ] `SELECT count(*) FROM information_schema.tables WHERE table_name IN ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks')` → 3
- [ ] `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN (...)` → all rowsecurity=true
- [ ] `SELECT count(*) FROM pg_policies WHERE tablename IN (...)` → 0 (no policies)
- [ ] `hermes_pipeline.version` has `NOT NULL DEFAULT 1` (checked in column_defaults)
- [ ] `hermes_lead_aliases` FK to `hermes_pipeline` confirmed

---

## Controlled-real acceptance run (7 synthetic records, no outreach)

Run the acceptance fixture using `mode: "internal"` with Supabase configured.

### Scenario results

| # | Scenario | Expected | Actual | Pass |
|---|---|---|---|---|
| A | new valid lead | accepted, scored, persisted, read-back verified | | [ ] |
| B | duplicate of A | same lead_id as A, no second row, dedupe.duplicates > 0 | | [ ] |
| C | changed contact alias | reconciles to A's lead_id via domain key | | [ ] |
| D | missing contact (needs enrichment) | enrich_lead_contact queued, NOT completed, no outreach | | [ ] |
| E | invalid/mock lead | quarantined or rejected, quarantine evidence present | | [ ] |
| F | missing source evidence | quarantined, quarantine_reasons includes missing evidence | | [ ] |
| G | stale record protection | stale_skipped or version_conflict, existing row not overwritten | | [ ] |
| ✓ | repeated run (idempotent) | same correlation_id → idempotent=true, no duplicate records | | [ ] |
| ✓ | no outreach | no_transport: true in every result | | [ ] |

### Required pipeline output shape
- [ ] `final_status: "completed"` (all stages receipted + persistence confirmed)
- [ ] `receipts` contains all 7 stages: `intake, validation, dedupe, scoring, policy, enrichment, persistence`
- [ ] `no_transport: true`
- [ ] `persistence.persisted >= 1` (at least Record A accepted)
- [ ] `persistence.pending === 0`
- [ ] `receipts.persistence.read_back_ids` is non-empty (read-after-write verified)
- [ ] `summary.enrichment.queued >= 1` (Record D queued for Cowork)
- [ ] `summary.quarantined >= 1` (Records E and/or F quarantined)

### Supabase verification (after run)
- [ ] `SELECT * FROM hermes_pipeline WHERE company_name LIKE '%Acceptance HVAC%'` → 1 row
- [ ] `SELECT * FROM hermes_enrichment_tasks WHERE status='queued'` → at least 1 row (Record D)
- [ ] `SELECT * FROM hermes_pipeline WHERE record_status='accepted'` → only non-mock records
- [ ] Record version = 1 for newly inserted records
- [ ] Second run with same correlation_id: `idempotent: true`, no new rows created

---

## Hermes adapter acceptance

- [ ] `requestLeadRailRun` returns receipts for all REQUIRED_STAGES
- [ ] `monitorLeadRailRun` returns correct `stage_status` for the run
- [ ] `isDuplicateRunRequest` returns `false` for unknown correlation_id
- [ ] Duplicate request (same correlation_id, already completed) returns `idempotent: true`

---

## Cowork enrichment handoff acceptance

- [ ] Record D enrichment task has `task_id = "enr-<lead_id>"` (deterministic)
- [ ] Cowork packet contains `no_outreach: true`
- [ ] Repeated reconcile of same lead does NOT create a second task
- [ ] `watchdogCoworkEnrichment` detects stalled tasks (age > threshold)

---

## Configuration contract acceptance

- [ ] Missing `SUPABASE_URL` → `state: "persistence_pending"` (not crash)
- [ ] Malformed URL → `state: "blocked"` (not crash)
- [ ] `describeRailConfig()` output contains no secret values
- [ ] `mode=internal` + unconfigured Supabase → throws `production_local_authority_blocked`

---

## Blocker status (truthful)

| # | Blocker | Blocking merge? |
|---|---|---|
| 1 | Supabase not yet configured (env vars not deployed) | No — graceful `persistence_pending` |
| 2 | Migration not yet applied | No — store returns empty, pipeline is truthful |
| 3 | Cowork automated worker does not exist | No — correctly reported as queued/manual |
| 4 | Real lead data not yet loaded | No — acceptance run uses synthetic fixture |

**No blockers prevent reviewing and merging PR #26.** The migration and acceptance run are post-merge steps.

---

## Sign-off

- [ ] Jonathan reviewed PR #26 diff
- [ ] Jonathan reviewed migration SQL
- [ ] Controlled-real acceptance run completed with all scenarios passing
- [ ] Supabase records verified post-run
- [ ] PR #26 approved for merge
