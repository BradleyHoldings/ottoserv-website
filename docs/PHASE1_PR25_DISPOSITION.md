# PR #25 disposition

PR #25 was useful as a source of contract and documentation ideas, but it replaced
the canonical rail with a second implementation. This branch consolidates only the
useful parts into `src/lib/leadRail/` and recommends closing PR #25 without merging.

## Retained

- `docs/contracts/canonical-lead.schema.json` - retained as a machine-readable
  contract, rewritten to match `leadRail/schema.mjs` output: `lid_v1_<16hex>`,
  `phase1.v1`, canonical field names, canonical statuses, and
  `external_outreach_allowed: false`.
- PR #25 enrichment contract idea - retained as
  `docs/contracts/enrichment-result.schema.json`, renamed from the draft
  `enrich-lead-contact.schema.json` shape and rewritten to match
  `leadRail/enrichment.mjs` ingestion output.

## Adapted

- `.gitignore` - rejected as a wholesale change; no consolidation change needed.
- `docs/PHASE1_ACCEPTANCE_CHECKLIST.md` - useful acceptance intent remains covered
  by `tests/lead-rail.test.mjs`, `tests/lead-rail-consolidation.test.mjs`, and the
  current runbook.
- `docs/PHASE1_LEAD_RAIL_RUNBOOK.md` - adapted in place as the single current
  Phase 1 runbook.
- `docs/PHASE1_READINESS_REPORT.md` - not duplicated; current disposition and
  validation evidence belong in this file and PR notes.
- `docs/adr/0001-phase1-lead-rail.md` - adapted in place as the single ADR.
- `src/app/calls/import/route.ts` - response shape preserved; importer now routes
  through the canonical compatibility adapter.
- `src/lib/outreach/leadImport.ts` - adapted into a TypeScript compatibility shim
  over `src/lib/outreach/leadImport.mjs`.
- PR #25 deterministic identity and alias ideas - adapted into tests proving row
  reordering, repeat import, and route adapter identity behavior against
  `src/lib/leadRail/identity.mjs`.
- PR #25 contract tests - adapted as `tests/lead-rail-consolidation.test.mjs`.

## Rejected

- `data/lead-rail/fixtures/sample-source.json` deletion - rejected; the canonical
  fixture remains required by `tests/lead-rail.test.mjs` and
  `npm run lead:rail -- --fixture`.
- `docs/adr/ADR-001-phase1-canonical-lead-core.md` - rejected as a parallel ADR.
- `docs/runbooks/PHASE1A_CANONICAL_LEAD_CORE.md` - rejected as a parallel runbook.
- `package.json` script changes from `lead:rail` to `lead:phase1-core` - rejected;
  canonical CLI remains `scripts/lead-rail.mjs`.
- `scripts/lead-rail.mjs` deletion - rejected.
- `scripts/phase1-lead-core.mjs` - rejected as a second CLI/core path.
- `src/lib/leadRail/*` deletions - rejected.
- `src/lib/leads/canonicalLeadCore.d.ts` - rejected as a second canonical contract.
- `src/lib/leads/canonicalLeadCore.mjs` - rejected as a second implementation.
- `src/lib/outreach/leadImportV2.ts` - rejected as another importer implementation.
- `supabase/hermes_pipeline_schema.sql` deletion - rejected; migration remains
  present but was not applied.
- `tests/canonical-lead-core.test.mjs` - rejected because it tests the alternate core.
- `tests/lead-import-v2.test.mjs` - rejected because `leadImportV2.ts` is not retained.
- `tests/phase1-lead-core-cli.test.mjs` - rejected because
  `scripts/phase1-lead-core.mjs` is not retained.
- `tests/lead-rail.test.mjs` deletion - rejected; it remains the primary rail suite.

## Duplicate implementation audit

Canonical paths retained:

- schema: `src/lib/leadRail/schema.mjs`
- identity: `src/lib/leadRail/identity.mjs`
- validation: `src/lib/leadRail/validate.mjs`
- dedupe: `src/lib/leadRail/dedupe.mjs`
- scoring adapter: `src/lib/leadRail/score.mjs`
- enrichment contract: `src/lib/leadRail/enrichment.mjs`
- persistence path: `src/lib/leadRail/store.mjs`
- execution-truth operation: `src/lib/leadRail/pipeline.mjs`

Compatibility path:

- `src/lib/outreach/leadImport.ts` and `src/lib/outreach/leadImport.mjs` exist only
  to preserve legacy route API shapes while delegating to `src/lib/leadRail/`.

Do not merge PR #25. Close it after this consolidation branch is reviewed.
