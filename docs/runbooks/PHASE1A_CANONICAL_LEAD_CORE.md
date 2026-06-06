# Phase 1A — Canonical Lead Core Runbook

## Purpose

Phase 1A establishes a repo-owned, internal-only lead contract before Supabase migration and live execution wiring.

It provides:

- versioned canonical lead schema;
- deterministic lead identity independent of CSV row order;
- multi-key aliases and deduplication;
- validation, rejection, and quarantine reasons;
- evidence-aware contact eligibility;
- deterministic Cowork enrichment-task contracts;
- a safe CLI that performs no external actions.

## Safety boundary

Phase 1A does **not**:

- send Gmail messages;
- place Retell calls;
- send DMs or connection requests;
- post or comment on social platforms;
- trigger Stripe or payment actions;
- activate production n8n workflows;
- write to production Supabase;
- claim enrichment completed merely because a task was queued.

The CLI output always includes:

```json
{
  "mode": "internal_no_outreach",
  "external_actions_taken": false,
  "production_systems_touched": false
}
```

## Commands

### Run the unit and CLI tests

```bash
node --test \
  tests/canonical-lead-core.test.mjs \
  tests/phase1-lead-core-cli.test.mjs \
  tests/lead-import-v2.test.mjs
```

### Run the prior relevant regression suite

```bash
node --test \
  tests/lead-intake-freshness.test.mjs \
  tests/lead-intent-ingest.test.mjs \
  tests/lead-research-contract.test.mjs \
  tests/hermes-lead-enrichment-autonomy.test.mjs \
  tests/hermes-score-reconciliation.test.mjs \
  tests/revenue-engine-supabase.test.mjs
```

### Build

```bash
npm run build
```

### Process a JSON fixture internally

```bash
npm run lead:phase1-core -- \
  --input path/to/leads.json \
  --output /tmp/phase1-lead-result.json
```

### Compare against an existing canonical export

```bash
npm run lead:phase1-core -- \
  --input path/to/incoming.json \
  --existing path/to/existing-canonical.json \
  --output /tmp/phase1-lead-result.json
```

The `--existing` input is read-only. No Supabase or other external store is touched.

## Output groups

- `accepted`: all unique canonical records, including active, quarantined, or rejected records so evidence is not erased;
- `duplicates`: duplicate record plus canonical owner and matched alias;
- `quarantine`: records needing verification or enrichment;
- `rejected`: placeholder identities or excluded business fits;
- `enrichment_tasks`: deterministic internal tasks for public-evidence-backed leads missing a usable contact path.

## Phase 1A acceptance checklist

- [ ] Canonical core tests pass.
- [ ] CLI tests pass.
- [ ] Existing 34-test lead regression suite remains green.
- [ ] Next.js production build passes.
- [ ] Same lead receives the same `lead_id` after row reordering.
- [ ] Changed phone/email with the same domain reconciles to the same identity.
- [ ] Duplicates are reported, not silently discarded.
- [ ] Mock/test identities are rejected with reasons.
- [ ] Missing public evidence cannot become email/call eligible.
- [ ] Public evidence plus no verified contact path creates one deterministic enrichment task.
- [ ] Enrichment tasks contain `external_outreach_allowed: false`.
- [ ] CLI result reports zero external actions and zero production systems touched.
- [ ] `/calls/import` uses the deterministic-ID adapter.

## Phase 1B handoff

Phase 1B must not create a second identity or validation implementation. It should integrate this core into all remaining intake paths and add:

1. additive Supabase `hermes_pipeline` migration;
2. alias-based lookup and reconciliation;
3. optimistic concurrency/version handling;
4. read-after-write evidence;
5. quarantine persistence;
6. durable execution-truth receipts;
7. enrichment result ingestion and write-back;
8. restart recovery and watchdog coverage;
9. controlled-real acceptance using the existing real lead source;
10. zero external outreach throughout Phase 1 acceptance.
