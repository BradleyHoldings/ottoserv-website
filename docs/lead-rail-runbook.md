# Lead Rail Phase 1 — Deployment Runbook

**Branch:** `phase1-lead-rail-integration`  
**PR:** #26 — Phase 1 canonical lead rail consolidation  
**Schema version:** `phase1.v1`  
**Date:** 2026-06-06

---

## Pre-requisites

- [ ] PR #26 review complete (see acceptance checklist)
- [ ] Supabase project access confirmed (service-role key available)
- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` added to Vercel environment (preview + production)
- [ ] Migration SQL reviewed (`supabase/hermes_pipeline_schema.sql`)
- [ ] Rollback procedure understood (section below)
- [ ] No live outreach enabled (no email/call/DM will be triggered by Phase 1)

---

## Step 1 — Review migration SQL

File: `supabase/hermes_pipeline_schema.sql`

Verify:
- Three new tables: `hermes_pipeline`, `hermes_lead_aliases`, `hermes_enrichment_tasks`
- All three have `enable row level security` with NO policies (service-key only)
- `hermes_pipeline.lead_id` is the primary key (deterministic `lid_v1_*`)
- `hermes_pipeline.version` is `NOT NULL DEFAULT 1` (optimistic concurrency)
- `hermes_pipeline.raw_payload` is `NOT NULL` (lossless round-trip)
- `hermes_lead_aliases` has FK to `hermes_pipeline(lead_id) ON DELETE CASCADE`
- Rollback block is present and correct
- No `ALTER TABLE`, `DROP TABLE`, or `DROP COLUMN` on existing tables

---

## Step 2 — Inspect current Supabase state (read-only)

Before applying the migration, confirm the tables do not already exist:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname='public'
  AND tablename IN ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks');
-- Expected: 0 rows (tables do not exist yet)
```

If any row is returned, check whether the schema matches and whether data exists before proceeding.

---

## Step 3 — Apply migration

1. Open Supabase SQL Editor for your project.
2. Paste the full content of `supabase/hermes_pipeline_schema.sql`.
3. Run the SQL.
4. Run the migration validation queries (section 5 of the SQL file):

```sql
-- 5a. Three tables present:
SELECT count(*) FROM information_schema.tables
  WHERE table_schema='public'
    AND table_name IN ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks');
-- Expected: 3

-- 5b. RLS enabled on all three:
SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname='public'
    AND tablename IN ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks');
-- Expected: rowsecurity=true for all three

-- 5c. No policies (service-key-only access):
SELECT count(*) FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks');
-- Expected: 0
```

---

## Step 4 — Configure environment variables

Add to Vercel environment (both Preview and Production):

| Variable | Source |
|---|---|
| `SUPABASE_URL` | Supabase project Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase project Settings → API → service_role secret |
| `HERMES_PIPELINE_TABLE` | `hermes_pipeline` (default, can be omitted) |
| `LEAD_RAIL_MODE` | `internal` for production runs, `dry` for testing |

**Security:**
- `SUPABASE_SERVICE_KEY` must NEVER be set as `NEXT_PUBLIC_*` — it would be exposed to the browser.
- Only `NEXT_PUBLIC_SUPABASE_URL` is safe for browser exposure (anon key only, not the service key).

Verify config without exposing secrets:
```js
import { describeRailConfig } from './src/lib/leadRail/config.mjs';
console.log(describeRailConfig());
// Expected: { configured: true, state: 'configured', present: { supabase_url: true, service_key: true }, ... }
```

---

## Step 5 — Deploy PR #26

1. Merge PR #26 into main (after Jonathan's review and approval).
2. Confirm Vercel deploy succeeds (check build logs).
3. Confirm no errors in the Vercel function logs.

---

## Step 6 — Run controlled-real acceptance (no outreach)

Use the fixture at `tests/fixtures/controlled-real-acceptance.mjs`. Run the pipeline with `mode: "internal"` using 7 synthetic records. Do NOT use real lead data initially.

```bash
# From the project root, after configuring env vars:
node -e "
import('./src/lib/hermesLeadRailAdapter.mjs').then(async ({ requestLeadRailRun }) => {
  const { ACCEPTANCE_ROWS, ACCEPTANCE_SOURCE } = await import('./tests/fixtures/controlled-real-acceptance.mjs');
  const result = await requestLeadRailRun({
    rows: ACCEPTANCE_ROWS,
    source: ACCEPTANCE_SOURCE,
    mode: 'internal',
  });
  console.log(JSON.stringify({ final_status: result.final_status, summary: result.summary, receipts: Object.keys(result.receipts || {}) }, null, 2));
});
"
```

**Expected result:**
- `final_status: "completed"` (with Supabase configured)
- All REQUIRED_STAGES have receipts: `["intake","validation","dedupe","scoring","policy","enrichment","persistence"]`
- `no_transport: true`
- `persistence.persisted > 0`
- `persistence.pending === 0`

If `final_status` is `"partially_completed"` with `reason: "supabase_not_configured"`, the env vars are not set correctly.

---

## Step 7 — Verify persisted records

After the acceptance run, verify in Supabase SQL Editor:

```sql
SELECT lead_id, company_name, record_status, eligibility, version, created_at
FROM public.hermes_pipeline
ORDER BY created_at DESC
LIMIT 10;
```

Expected: at least 1 accepted record (Record A / Acceptance HVAC Services LLC).

```sql
SELECT task_id, lead_id, status FROM public.hermes_enrichment_tasks;
```

Expected: at least 1 queued enrichment task (Record D).

---

## Rollback Procedure

If the migration needs to be reversed, run this SQL in Supabase (with explicit authorization from Jonathan):

```sql
BEGIN;
  DROP TRIGGER IF EXISTS hermes_enrichment_tasks_updated_at ON public.hermes_enrichment_tasks;
  DROP TRIGGER IF EXISTS hermes_pipeline_updated_at ON public.hermes_pipeline;
  DROP FUNCTION IF EXISTS public.hermes_set_updated_at() CASCADE;
  DROP TABLE IF EXISTS public.hermes_enrichment_tasks CASCADE;
  DROP TABLE IF EXISTS public.hermes_lead_aliases CASCADE;
  DROP TABLE IF EXISTS public.hermes_pipeline CASCADE;
COMMIT;
```

After rollback, verify:
```sql
SELECT count(*) FROM information_schema.tables
  WHERE table_schema='public'
    AND table_name IN ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks');
-- Expected: 0
```

The application will gracefully fall back to `persistence_pending` state (no crash) since it checks for Supabase configuration before writing.

---

## Safety constraints for Phase 1

- **No outreach:** Phase 1 ends at eligibility classification + packet preparation. No emails, calls, DMs, or social posts are enabled.
- **No transport:** Every result includes `no_transport: true`.
- **Service-role only:** `SUPABASE_SERVICE_KEY` is used server-side only. No browser writes.
- **Idempotent runs:** Re-running with the same `correlation_id` returns the existing result without creating duplicate records or tasks.
- **Quarantine evidence:** Rejected/quarantined records are preserved in the quarantine artifact and are NOT deleted.
