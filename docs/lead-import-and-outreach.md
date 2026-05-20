# OttoServ Lead Import, Scoring, and Outreach Guardrails

## Endpoint

`POST /calls/import`

Auth is required with the `x-task-key` header. The route accepts the first configured key from `OTTO_TASK_KEY`, `TASK_KEY`, or the current OttoServ task-key fallback used by the internal techops form.

Dry-run validation:

`POST /calls/import?dry_run=1`

Dry-run parses, validates, scores, dedupes, and returns errors without writing ledgers.

Status output:

`GET /calls/status`

This returns the current operational snapshot: leads imported today, A-tier callable leads, B-tier email leads, enrichment queue, scheduled calls, failed imports, blockers, and next best actions.

## Accepted formats

CSV content type:

`Content-Type: text/csv`

JSON content type:

`Content-Type: application/json`

Accepted JSON shapes:

- `{ "leads": [{ ... }] }`
- `{ "records": [{ ... }] }`
- `[{ ... }]`
- `{ ... }`

CSV template:

`/templates/ottoserv-lead-import-template.csv`

## Accepted fields

- `company`
- `contact_name`
- `name`
- `phone`
- `email`
- `website`
- `website_url`
- `industry`
- `city`
- `state`
- `source_url`
- `notes`
- `description`
- `buying_signal`
- `pain_signal`
- `timezone`
- `local_timezone`

Aliases are normalized where practical. For example, `website` and `website_url` both map to the same lead field.

## Phone and contact guards

The import route blocks unsafe call targets before they enter the call queue.

- Missing phone is rejected unless the lead has a valid email for email-first handling.
- Malformed US numbers are rejected.
- `555` test/reserved numbers are rejected.
- `000` placeholder numbers are rejected.
- Toll-free numbers are rejected for outbound call queue imports.
- A lead with neither a valid phone nor valid email is rejected.

## Duplicate prevention

The importer dedupes against the persistent import ledger using:

- Normalized phone
- Lowercased email
- Lowercased website URL
- Normalized company name

Duplicates are returned in the `duplicates` array with the key that triggered the skip.

## Scoring rules

The current OttoServ ICP scoring model is intentionally simple and explainable.

- Property management company: `+30`
- Florida or target-market state: `+20`
- Valid phone number: `+20`
- Valid email: `+10`
- Website found: `+10`
- Mentions rentals, leasing, HOA, apartments, maintenance, tenant placement, or property management: `+15`
- Pain signal such as missed calls, hiring admin/leasing/dispatcher/receptionist, slow response complaints, manual processes, or communication complaints: `+20`
- Bad fit/vendor/broker-only/no-service relevance: negative score and possible rejection

## Tier classification

- `A-tier`: call first. Requires a strong score and valid phone.
- `B-tier`: email first. Strong enough to contact, but not call-first.
- `C-tier`: enrich later. Needs Cowork or Gemini evidence before spending call/email capacity.
- `Reject`: do not call. Bad fit, no safe contact path, or too low a score.

## Business-hours scheduling

A-tier leads receive a `scheduled_call_local` value. Slots are spread across local business hours, using the lead's `timezone` field or a state fallback. The default calling window is 9:00 AM to 5:00 PM local time, weekdays only.

## Outreach safety limits

- Calls only during business hours in the lead's local timezone.
- No repeated calls to the same company inside the cooldown window.
- Maintain do-not-call and internal blacklist support before Jarvis calls.
- Max calls per number per day: one unless Hermes explicitly approves otherwise.
- Max attempts per lead: three total attempts across call/email unless the lead replies.
- Stop after a negative response, opt-out, do-not-contact request, or clear bad fit.
- Emails must respect per-alias daily caps.
- Follow-ups should be spaced safely and tied to useful context.
- Do not send risky, spammy, deceptive, or high-pressure messages.
- Log every outreach attempt with timestamp, owner, channel, outcome, and evidence.

## Ledger outputs

When not in dry-run mode, the route writes:

- `data/call-imports/leads.json`
- `data/call-imports/outreach_queue.json`
- `data/call-imports/daily_metrics.json`

These files are operational ledgers, not static marketing content. They should be reviewed before committing real lead data.
