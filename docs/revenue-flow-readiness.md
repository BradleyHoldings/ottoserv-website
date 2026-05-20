# OttoServ Revenue Flow Readiness

Updated: 2026-05-20

## Current Flow

Website conversion pages now have a direct path into the local ops queue:

1. Prospect visits `/demo`, `/pricing`, or `/missed-call-recovery`.
2. Prospect submits the revenue intake form.
3. `POST /api/leads/capture` validates identity, contact method, email format, and permission to contact.
4. Submission is written to `data/call-imports/form_submissions.json`.
5. The same payload is normalized and scored through the lead import system.
6. Ledgers are updated:
   - `leads.json`
   - `outreach_queue.json`
   - `jarvis_call_packets.json`
   - `daily_metrics.json`
7. A-tier leads become Jarvis call packets.
8. B-tier leads are email/manual enrichment first.
9. C-tier leads go to Cowork enrichment.
10. Rejected or malformed leads are assigned to Codex cleanup, not Hermes.
11. Jarvis logs calls through `POST /calls/outcomes`.
12. `/calls/status`, `npm run ops:morning`, and `npm run ops:evening` summarize the flow.

## CTA/Page Check

- `/ai-receptionist`: reachable, clear AI receptionist offer, CTA to `/demo` and `/process-audit`.
- `/missed-call-recovery`: reachable, now includes direct missed-call review form.
- `/lead-qualification`: reachable alias to `/lead-qualification-agent`.
- `/lead-qualification-agent`: reachable, clear qualification offer.
- `/property-management-ai-receptionist`: reachable alias to industry page.
- `/industries/property-management-ai-receptionist`: reachable, industry-specific page.
- `/trades-ai-receptionist`: reachable scaffold for trades lead handler offer.
- `/pricing`: reachable, now includes pricing request form.
- `/demo`: reachable, now includes demo request form.
- `/process-audit`: reachable, has full audit form wired to `/api/audit/request`.

## Blockers

- Local JSON ledgers are a safe working queue, not production CRM persistence. Supabase/Airtable mapping should be chosen before paid traffic.
- Email follow-up is not yet automated from B-tier leads.
- Real call recordings/transcripts depend on Jarvis call tooling and must be logged into `/calls/outcomes`.
- ROI calculator exists as reusable logic but is not yet exposed as a polished on-page calculator.
