# Phase 0 — Telegram execution-truth deploy packet

> **Staged, not live.** Phase 0 is complete only after the actual Telegram Hermes process on the Droplet uses this bridge and the live acceptance tests pass. This package does not enable email, calls, Stripe, n8n, or client communications.

## What this package does

- Creates a durable two-step request → confirmation flow.
- Keys idempotency from the original request.
- Requires verified Telegram user/chat allowlists.
- Enforces approval scope, requester ownership, attachment scope, and expiry.
- Hard-locks execution to dry mode.
- Allows only state-derived operational status.
- Runs a two-minute watchdog with durable alert deduplication.
- Retries failed alert delivery instead of incorrectly marking it sent.
- Installs the watchdog only after service-user Node and permissions are proven.

## Validation before deployment

```bash
node --check deploy/droplet/phase0/*.mjs
bash -n deploy/droplet/phase0/install-phase0.sh
node --test tests/phase0-final-corrections.test.mjs
node --test tests/hermes-execution-contract.test.mjs
npm run build
```

Then follow `PHASE0_DROPLET_DEPLOYMENT_RUNBOOK.md`.
