# Phase 1 Lead Rail — Deployment / Runbook (NO OUTREACH)

This rail ends at **outreach eligibility + packet preparation**. It never sends
email, places calls, sends DMs, posts socially, touches Stripe, or deploys client
automations. There is no live mode.

## What it does

`npm run lead:rail -- --fixture` (or `--source <rows.json>`) runs:

intake → normalize → identity → validate/quarantine → dedupe/reconcile → score →
policy eligibility → enrich-or-queue → upsert to Supabase `hermes_pipeline` →
execution-truth receipts → truthful partial/complete status.

## 1. One-time Supabase setup (authoritative store)

Run `supabase/hermes_pipeline_schema.sql` once in the Supabase SQL Editor (or
`psql`). It is additive (does not touch `revenue_engine_state`). It creates
`hermes_pipeline` (+ `hermes_enrichment_tasks`) with RLS enabled and **no policies**
— the table is PII-bearing and reachable only with the service key.

Required env (server-only; never expose the service key to the browser):

```
NEXT_PUBLIC_SUPABASE_URL   (or SUPABASE_URL)
SUPABASE_SERVICE_KEY       (or SUPABASE_SERVICE_ROLE_KEY)
# optional overrides
HERMES_PIPELINE_TABLE=hermes_pipeline
LEAD_RAIL_DATA_DIR=data/lead-rail
HERMES_TASKS_DIR=data/revenue-engine/tasks
```

Verify config without leaking secrets:

```
node -e "import('./src/lib/leadRail/store.mjs').then(m=>console.log(m.describePipelineConfig()))"
```

## 2. Run against the fixture (safe, offline)

```
npm run lead:rail -- --fixture
```

Expected: `final_status: completed` when Supabase is configured; otherwise
`partially_completed` with `reason: supabase_not_configured` (honest — it never
fakes persistence). Receipts and a redacted summary print to stdout. Artifacts are
written to the gitignored `data/lead-rail/` (`pipeline-cache.json`,
`quarantine.json`).

## 3. Run against a real source (dry/internal, still no transport)

Convert the source (CSV/XLSX/sheet) to a JSON array of row objects, then:

```
npm run lead:rail -- --source /path/to/rows.json --mode internal
```

`--mode internal` only labels the run; it still triggers no transport.

## 4. Idempotency & restart recovery

- The rail keys a durable task by a **source hash** (`correlation_id`). Re-running
  the same source reuses the same task and re-derives the same deterministic
  `lead_id`s, so a repeat run **updates/reconciles** — it never duplicates leads or
  tasks.
- If a run is interrupted before persistence is confirmed, it ends
  `partially_completed`. Re-running **resumes the same task** and drives it to
  `completed` once Supabase write + read-back succeed.

## 5. Enrichment hand-off (Cowork, manual in Phase 1)

Leads with public evidence but no usable contact path get a durable
`enrich_lead_contact` task (one per lead). There is **no automated Cowork worker**.
Cowork executes manually and a result is ingested via
`ingestEnrichmentResult(lead, task, result)` — which **re-validates** the returned
contact and requires a public evidence URL before marking the lead enriched. If
Cowork is unavailable/out of credits, the task is reported `blocked` (truthful), and
`detectStalledEnrichment` raises a watchdog signal after the stall threshold.

## 6. Monitoring

- Stage receipts: `result.receipts.{intake,validation,dedupe,scoring,policy,enrichment,persistence}`.
- Durable task state: `data/revenue-engine/tasks/*.json` (or `HERMES_TASKS_DIR`).
- Stalled enrichment: `detectStalledEnrichment(tasks, { now })`.
- Persistence honesty: a write that cannot be confirmed reports
  `persistence_pending` / `version_conflict` / `stale_skipped` — never success.

## 7. Rollback

The rail is additive and side-effect-free outside `hermes_pipeline` and the
gitignored cache. To roll back: stop running `lead:rail`. To clear test data:
`delete from public.hermes_pipeline where record_status <> 'do-not-delete';` (no such
status — i.e., decide explicitly). Quarantine/rejected rows are intentionally kept.
