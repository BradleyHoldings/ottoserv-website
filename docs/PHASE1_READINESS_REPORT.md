# Phase 1 Readiness Report (truthful)

Date: 2026-06-06 · Branch: `claude/awesome-bell-NmHRW`

## Done & verified in this repo

- One authoritative rail under `src/lib/leadRail/` (identity, normalize, validate,
  dedupe, score, eligibility, enrichment, schema, store, pipeline).
- Deterministic versioned `lead_id` (`lid_v1_<sha256>`); `leadImport.ts` id
  de-row-numbered.
- Unified validation/quarantine (mock/test/invalid domains, reserved/placeholder
  phones, placeholder companies, excluded fits, missing evidence, no-contact) with
  reasons; nothing deleted.
- Dedupe within import + against store + alias reconciliation + stale-import
  protection.
- Single scorer reused (`leadIntent.scoreIntentLead`), evidence-gate retained.
- Policy eligibility (enrich/email_eligible/call_eligible/manual_review/gated/
  rejected); eligibility prepares packets only — no transport.
- Per-lead idempotent enrichment contract: durable `enrich_lead_contact` task,
  result ingestion (re-validated), stall detection, retry-in-place, truthful
  `blocked`. **No automated Cowork worker is claimed.**
- Supabase `hermes_pipeline` store: deterministic upsert, read-after-write
  verification, optimistic concurrency, `persistence_pending` on unconfirmed writes,
  no secret exposure. Additive migration `supabase/hermes_pipeline_schema.sql`.
- Execution-truth op `lead_intake_enrichment` with per-stage receipts; `completed`
  only with all receipts + confirmed persistence.
- CLI `npm run lead:rail` (fixture / real source, dry/internal, no transport),
  restart-safe + idempotent.
- Tests: **24 new**, all green. Full suite **392/394**.

## Test evidence

`node --test tests/lead-rail.test.mjs` → `# tests 24 / # pass 24 / # fail 0`.
`node --test tests/*.test.mjs` → `# tests 394 / # pass 392 / # fail 2`.

The 2 failures (`command-center: builds safe zero-state…`, `work-orders: summaries
and filters…`) **pre-exist on `origin/main`** and are unrelated to Phase 1
(confirmed by running them on a clean `origin/main` worktree). Not introduced here;
not fixed here (out of scope, would be a separate change).

## Still blocked / not done (honest)

1. **Live Supabase acceptance pending operator action.** No `SUPABASE_*` creds are
   available in this build environment, so `hermes_pipeline` could not be created or
   written here. Persistence is proven with an injected in-memory client + every
   failure path; the live run + `supabase/hermes_pipeline_schema.sql` apply must be
   done on the droplet/Supabase project. Until then the rail truthfully reports
   `persistence_pending` / `supabase_not_configured`.
2. **No automated Cowork enrichment worker.** Enrichment is queued and ingestible but
   executed manually by Cowork. The blocked/stall/retry handling is real; an
   automated worker is future work and is NOT claimed to exist.
3. **`leadImport.ts` not retired.** It still backs 5 website routes
   (`/calls/import`, `/calls/jarvis-packets`, `/calls/outcomes`, `/api/audit/request`,
   `/api/leads/capture`). It is legacy/frozen; migrating those routes onto the rail
   (and deleting the duplicate scorer) is a follow-up to fully satisfy "one
   implementation". Its id is now row-independent in the interim.
4. **Live-only Python parity is by representation, not execution.** The logic of
   `quarantine_mock_revenue_leads.py` / `repair_real_lead_sources.py` /
   `supabase_live_adapter.py` is reimplemented + tested in repo code; the original
   live JSON artifacts (`validated_*`, `rejected_*`, audit) were not present in this
   repo to diff against, so a one-time reconciliation run on the droplet is advised
   to confirm no live record is reclassified unexpectedly.
5. **`npm run build` not executed here.** The Phase-1 change is library/CLI code, not
   routing/metadata/server components; a full Next build was not run in this sandbox
   (module resolution for `next` is unavailable to bare `tsc`). Recommend a CI/local
   `npm run build` before merge as a final gate.

## Non-goals respected

No Gmail sends, Retell calls, social outreach, Stripe changes, client-automation
deploys, fake completion evidence, local-JSON-as-truth, or duplicate scorer/validator
added. The droplet was not modified from this environment.
