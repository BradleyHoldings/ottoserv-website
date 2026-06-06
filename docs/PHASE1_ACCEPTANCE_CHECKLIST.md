# Phase 1 Live Acceptance Checklist

Run end-to-end against ONE real (or controlled-real) source. Phase 1 passes only
when every box is checked with evidence. No external outreach at any point.

## Preconditions
- [ ] `supabase/hermes_pipeline_schema.sql` applied (table `hermes_pipeline` exists, RLS on, no policies).
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` present server-side; `describePipelineConfig()` → `configured: true`, no secret leaked.
- [ ] Source converted to a JSON array of row objects.

## Run
- [ ] `npm run lead:rail -- --source <rows.json> --mode internal` completes.
- [ ] `final_status: completed` (or a truthful `partially_completed`/`blocked` with a stated reason).

## Deterministic identity
- [ ] Re-running with the rows **shuffled** yields the identical set of `lead_id`s.
- [ ] No `lead_id` contains a row number or a timestamp.

## Dedupe evidence
- [ ] `receipts.dedupe` shows `new` / `updated` / `duplicates` counts.
- [ ] An in-file duplicate collapses to one lead.
- [ ] Re-import of the same source produces `new: 0` (updates only), no second lead.
- [ ] A record with a changed phone/email/domain reconciles to the same lead with an alias.

## Validation / quarantine evidence
- [ ] `receipts.validation` shows accepted / quarantined / rejected counts.
- [ ] Mock/test/example records appear in `data/lead-rail/quarantine.json` with reasons (NOT deleted).
- [ ] Excluded fits (vendor/recruiter/job-seeker/agency) are `rejected` with reasons (NOT deleted).
- [ ] No accepted lead lacks a discovered public source URL/snippet.

## Enrichment (completion OR truthful pending)
- [ ] Leads with verified contact are NOT queued for enrichment.
- [ ] Leads with public evidence but no contact have a durable `enrich_lead_contact` task (one per lead).
- [ ] Leads without public evidence are NOT auto-enriched.
- [ ] `receipts.enrichment.worker_automated: false` (no fake worker claimed).
- [ ] An ingested Cowork result is re-validated and requires evidence before completing.
- [ ] Cowork-unavailable path reports `blocked`; stalls raise a watchdog signal.

## Scoring & eligibility
- [ ] `receipts.scoring` carries `scoring_version` and per-tier counts.
- [ ] An unsupported high-intent claim is downgraded (evidence gate) in `score_reasons`.
- [ ] `receipts.policy` shows per-lead eligibility (enrich/email_eligible/call_eligible/manual_review/gated/rejected).
- [ ] `email_eligible`/`call_eligible` did NOT trigger any send/dial (packet preparation only).

## Persistence (authoritative store)
- [ ] `receipts.persistence` shows `persisted` count + `read_back_ids` (read-after-write confirmed).
- [ ] Rows exist in Supabase `hermes_pipeline` with `version` set.
- [ ] A simulated failed write / read-back mismatch reports `persistence_pending` (never success).
- [ ] A stale import does not overwrite a newer row (`stale_skipped`).

## Durable task state & restart safety
- [ ] A durable `lead_intake_enrichment` task exists with full transition history.
- [ ] Killing mid-run then re-running resumes the SAME task to completion (no duplicate task/leads).

## Zero outreach
- [ ] No Gmail send, Retell call, DM, social post, or Stripe action occurred.
- [ ] `result.no_transport === true`; no receipt carries a transport id.
