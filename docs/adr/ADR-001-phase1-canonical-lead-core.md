# ADR-001: Phase 1 canonical lead core

- **Status:** Proposed for Phase 1A
- **Date:** 2026-06-06
- **Scope:** Internal lead identity, validation, deduplication, quarantine, and enrichment-task contracts

## Context

OttoServ currently has overlapping lead implementations in repository TypeScript/JavaScript and live-only Hermes Python scripts. They use different schemas, identity rules, validation details, queue outputs, and persistence assumptions. The existing spreadsheet importer also incorporates the source row number into `lead_id`, so reordering the same file can create a different identity.

Phase 1 must establish one internal contract before Supabase migration and live execution wiring. Email, calls, DMs, social posting, payments, and client-facing actions remain out of scope.

## Decision

### Canonical store

Supabase `hermes_pipeline` is the intended authoritative store in Phase 1B. Phase 1A defines the records and contracts without performing production writes. Local JSON remains an import artifact, cache, quarantine report, or recovery artifact—not an independent source of truth.

### Canonical schema

The canonical schema is versioned as `1.0.0` and includes:

- deterministic `lead_id` and `identity_aliases`;
- business/contact fields;
- source and evidence fields;
- separate discovery, import, validation, creation, and update timestamps;
- contact and fit validation;
- score/tier explanation fields;
- pipeline stage, eligibility, next action, enrichment state, and record status.

### Stable identity

Identity is generated from the highest-priority durable alias available:

1. normalized website domain;
2. normalized phone;
3. normalized email;
4. normalized company + city/state;
5. normalized company fallback.

The selected alias is hashed with SHA-256 and a version prefix. CSV row position, import order, timestamps, and display formatting are excluded.

All durable aliases are retained so a record can reconcile when one contact attribute changes. Phase 1B must match incoming aliases against existing Supabase aliases before upsert.

### Deduplication

Deduplication is multi-key and deterministic. It checks aliases across both the current batch and existing records. Duplicates are reported with the matched alias and canonical owner; they are not silently deleted.

### Validation and quarantine

Records are rejected for placeholder identity or excluded business fit. They are quarantined for invalid/test contact data, missing public evidence, or missing verified contact path. Rejection and quarantine reasons remain machine-readable.

No lead is marked call/email eligible without public evidence and a valid corresponding contact path.

### Enrichment

A real company with public evidence but no verified contact path receives a deterministic `enrich_lead_contact` task:

- one task ID and idempotency key per lead;
- Cowork as the declared actor;
- explicit evidence requirements;
- timeout and retry contract;
- `external_outreach_allowed: false`.

A queued enrichment task is not evidence that enrichment succeeded.

### No-outreach boundary

Phase 1A creates only internal eligibility and enrichment-task contracts. It does not invoke Gmail, Retell, social/browser outreach, Stripe, n8n production workflows, or client delivery.

## Consequences

### Positive

- Stable identity survives file reordering and repeated imports.
- Duplicate logic can converge repository and live-script behavior.
- Evidence and quarantine rules become explicit and testable.
- Phase 1B has a defined target for Supabase migration and live acceptance.

### Tradeoffs

- Existing importers are not yet the authoritative path until Phase 1B integrates this core and migrates live-only scripts.
- Alias reconciliation must be implemented transactionally in the Supabase adapter.
- Existing score implementations remain untouched in Phase 1A to avoid an unsafe partial consolidation.

## Phase 1B follow-on

Opus should:

1. migrate useful live-only Python validation logic into repo-owned adapters;
2. integrate this core into all intake entrypoints;
3. add Supabase schema/migration and alias reconciliation;
4. add durable execution-truth receipts and restart recovery;
5. perform a controlled-real acceptance run with zero external outreach;
6. remove superseded duplicate business-logic implementations after parity tests pass.
