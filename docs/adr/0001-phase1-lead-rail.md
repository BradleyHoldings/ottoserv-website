# ADR 0001 — Phase 1: one authoritative lead intake & enrichment rail

Status: Accepted · Date: 2026-06-06 · Scope: Phase 1 (intake → durable outreach
eligibility). NOT outreach execution.

## Context

Lead handling was implemented three times with diverging rules:

- `src/lib/leadIntent.mjs` — intent-aware, evidence-gated scorer (the good one), but
  minted a non-deterministic id (`li-<slug>-<digits of now>`).
- `src/lib/outreach/leadImport.ts` — location/term scorer with a **row-number**
  `lead_id`, used by 5 website routes.
- `src/lib/leadSpreadsheetIngest.mjs` — spreadsheet eligibility classifier.

Safety rules (mock/test domains, reserved phones, placeholder companies, excluded
fits) lived partly in `leadImport.ts`, partly in `leadSpreadsheetIngest.mjs`, and
partly in **live-only Python** (`quarantine_mock_revenue_leads.py`,
`repair_real_lead_sources.py`, `supabase_live_adapter.py`) that never lived in the
repo — a second, unversioned source of truth. Local JSON files acted as de-facto
stores.

## Decision

Build **one** authoritative rail in `src/lib/leadRail/` that *composes* the proven
pieces instead of forking them:

`identity → normalize → validate/quarantine → dedupe/reconcile → score → policy
eligibility → enrich-or-queue → upsert to Supabase hermes_pipeline → execution-truth
receipts → truthful partial/complete status`.

### Canonical schema (`schema.mjs`, `LEAD_SCHEMA_VERSION = "phase1.v1"`)
One versioned record with every required field. **Discovery time (`discovered_at`)
is kept distinct from import time (`imported_at`)** — conflating them was a Phase-0
defect. Carries `record_status`, `eligibility`, `enrichment_status`, `version`
(optimistic-concurrency), `schema_version`.

### Canonical store
Supabase **`hermes_pipeline`** (new relational table, additive migration,
service-key/RLS-only) is authoritative. Typed columns for SQL + lossless
`raw_payload` jsonb. Local JSON under `data/lead-rail/` is **only** a write-through
cache (`pipeline-cache.json`), a quarantine report (`quarantine.json`), or recovery
evidence — never an independent source of truth.

### Stable identity (`identity.mjs`, `IDENTITY_VERSION = "v1"`)
`lead_id = lid_v1_<sha256(version:basis:value)[0:16]>`, basis chosen by priority:
verified domain → normalized phone → normalized email → company+city/state. Pure,
row-order- and run-time-independent. `leadImport.ts`'s id was de-row-numbered to
match this intent.

### Dedupe strategy (`dedupe.mjs`)
Union-find over all identity keys. Deduplicates within the import, against existing
Supabase records, and across **aliases** (phone/email/domain changed but another key
matches). A repeated import updates one lead (version+1) and records the alias.
**Stale-import protection**: a fresher existing record is never overwritten.

### Validation & quarantine (`validate.mjs`)
The single unified validator. Migrates the live Python + TS + spreadsheet rules:
example/test/invalid domains, reserved/placeholder/malformed phones, placeholder
companies, excluded fits (vendor/recruiter/job-seeker/agency), missing public
evidence, no usable contact path. `record_status ∈ accepted | quarantined |
rejected`. **Nothing is deleted** — quarantined/rejected records are persisted with
reasons + evidence. A stray mock phone next to a real email is *dropped*, not
quarantined; only a fake *identity* or *no usable contact* quarantines.

Evidence rule (stricter than before, on purpose): a company's **own website is a
contact/enrichment channel, not intent evidence**. Verified/enriched/eligible
requires a discovered public source URL or quoted snippet + validation timestamp +
method/actor + confidence + reference.

### Scoring
**No new scorer.** `score.mjs` wraps `leadIntent.scoreIntentLead/tierForIntent`
(`SCORING_VERSION = "leadIntent.v1"`), re-scored from current fields every run, with
the proven gate that downgrades unsupported high-intent claims.

### Enrichment contract (`enrichment.mjs`)
Per-lead, idempotent. Verified contact → skip. Public evidence + no contact +
enrichable website → durable `enrich_lead_contact` task (`task_id = enr-<lead_id>`,
actor Cowork). No public evidence → never auto-enriched. Includes result-ingestion
(re-validated, evidence-required), stall detection, retry-in-place (no duplicate
task), and a **truthful `blocked`** state when Cowork is unavailable/out of credits.
There is **no automated Cowork worker** in Phase 1 and the rail never claims one.

### Execution-truth integration (`pipeline.mjs`)
Operation `lead_intake_enrichment` runs through the existing durable task lifecycle.
Each stage emits a machine-verifiable receipt (intake/validation/dedupe/persistence/
enrichment/scoring/policy). Final status is `completed` **only** when every required
stage has a receipt and Supabase persistence is confirmed by read-after-write;
otherwise `partially_completed` or `blocked`. **Not connected to any transport.**

### Migration from live-only scripts
The Python scripts are represented by repo-owned, versioned, tested modules:
`quarantine_mock_revenue_leads.py` → `validate.mjs`; `repair_real_lead_sources.py` →
`validate.mjs` + `dedupe.mjs`; `supabase_live_adapter.py` → `store.mjs` +
`supabase/hermes_pipeline_schema.sql`. The `validated_*`/`rejected_*`/audit JSON
artifacts become outputs of the rail (cache + quarantine + receipts), not inputs.

## Consolidation update - PR #25

PR #25's useful machine-readable contract work was consolidated into the existing
rail instead of merging its alternate `src/lib/leads/canonicalLeadCore.mjs`
implementation.

- Canonical lead contract: `docs/contracts/canonical-lead.schema.json`, tested
  against real `src/lib/leadRail/schema.mjs` output.
- Enrichment result contract: `docs/contracts/enrichment-result.schema.json`,
  tested against `src/lib/leadRail/enrichment.mjs` ingestion output.
- Both contracts use `lid_v1_<16hex>`, `schema_version: "phase1.v1"`, canonical
  rail field names/statuses, and `external_outreach_allowed: false`.
- `src/lib/outreach/leadImport.ts` is now a compatibility shim. Its runtime
  implementation is `src/lib/outreach/leadImport.mjs`, which delegates identity,
  normalization, validation, scoring, and dedupe to `src/lib/leadRail/`.
- Superseded draft paths must not be restored as parallel systems:
  `src/lib/leads/canonicalLeadCore.mjs`, `src/lib/leads/canonicalLeadCore.d.ts`,
  `src/lib/outreach/leadImportV2.ts`, `scripts/phase1-lead-core.mjs`,
  `docs/adr/ADR-001-phase1-canonical-lead-core.md`, and
  `docs/runbooks/PHASE1A_CANONICAL_LEAD_CORE.md`.

## Consequences

- `leadImport.ts` stays for the 5 website routes but is **legacy/frozen**; new lead
  intake goes through the rail. Retiring it is tracked in the readiness report.
- Website-only leads now quarantine as "missing evidence" — safer, but they require a
  real source or enrichment before eligibility.
- 24 new tests; full suite 392/394 (the 2 failures pre-date this work on `main`).
