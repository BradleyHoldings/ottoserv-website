# Lead-intent ingest contract (Cowork / Hermes → revenue loop)

This is the exact, operational hand-off for getting researched leads into the
autonomous revenue loop. **No outreach happens here.** Intake only
reads/normalizes/scores already-researched leads and writes local JSON.

## Where Cowork/Hermes writes

Write a single file:

```
data/lead-intent/research-results.json
```

(Override with `LEAD_INTENT_INPUT`.) This path is git-ignored — real lead/contact
data is never committed. The tracked, synthetic shape reference is
[`examples/research-results.example.json`](examples/research-results.example.json).

## Accepted input shapes

`research-results.json` may be **any** of these (the ingest adapter coerces them):

- a JSON **array** of lead objects (preferred);
- an object wrapping the array under `leads`, `results`, `research_results`,
  `data`, `items`, or `rows`;
- a single lead object.

## Lead object schema

| Field | Required | Notes |
|---|---|---|
| `business_name` (or `company`) | **yes** | Identity. Rows without it are dropped. |
| `phone`, `email`, `website` | one of | A reachable contact path. No contact path → **Reject**. |
| `industry` | recommended | ICP category (plumbing, hvac, property_management, …). Inferred if omitted. |
| `location` | recommended | City/region. |
| `decision_maker` / `contact_name` | optional | |
| `intent_type` | recommended | One of the documented intent types (e.g. `explicit_buying_intent`, `operational_pain`, `missed_call_or_response_issue`, `software_or_integration_need`, `process_bottleneck`, `hiring_signal`, `bad_review_pattern`, `growth_signal`, `other`). |
| `date_of_signal` | **for recent intent** | ISO date. Drives the 30-day / 90-day window. Missing → `evergreen_fit`. |
| `source_url` / `source_urls[]` | **for high intent** | Public permalink to the evidence. |
| `evidence_snippet` | **for high intent** | Exact quoted text from the source. |
| `intent_evidence_summary` | recommended | One-line human summary. |
| `pain_point` | recommended | |
| `recommended_offer` | optional | Otherwise inferred. |

### Evidence rule (enforced)

A lead can only be treated as **recent high-intent** when it carries public,
recent, explainable evidence — a `source_url`/`source_urls` **and/or**
`evidence_snippet`. A high-intent `intent_type` submitted *without* evidence is
**downgraded** to `evergreen_fit` and routed to Cowork to verify before any
outreach. Never fabricate evidence.

## Run intake

```
npm run lead:intake
```

This:
1. coerces + validates the input and writes **`data/lead-intent/ingest-report.json`**;
2. scores → tiers (A/B/C/Reject) → dedupes → builds the daily queues into
   `data/lead-intent/pipeline.json`;
3. merges accepted leads (deduped) into `data/call-imports/leads.json` so the
   revenue loop sees them;
4. when recent-intent volume is low, writes `cowork-research-tasks.json` with
   precise, evidence-gated research tasks to refill the pipeline.

## Reading the ingest report (the feedback loop)

`ingest-report.json` tells Cowork/Hermes exactly what happened per row so the
loop can close without a human:

- `summary` — `total_rows`, `accepted`, `needs_verification`, `rejected`,
  `duplicates_collapsed`, `usable_input`, plus `input_shape` and any
  `parse_error`.
- `rows[]` — per lead: `ingest_status` (`accepted` | `needs_verification` |
  `rejected`), `tier`, `signal_window`, `score`, `recommended_next_action`,
  `reasons`, and **`fixes`** (the exact change needed to upgrade the row).

`needs_verification` rows are the actionable queue: add the missing
`source_url` + `evidence_snippet` + `date_of_signal` and re-run intake.
