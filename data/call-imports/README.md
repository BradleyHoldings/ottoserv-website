# Call Import Ledgers

Runtime imports write JSON ledgers here:

- `leads.json`
- `outreach_queue.json`
- `daily_metrics.json`

Those JSON files can contain real lead and contact data, so they are ignored by git. Use `POST /calls/import?dry_run=1` to validate a file without writing ledgers.
