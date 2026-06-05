# Phase 0 — live acceptance tests

Run against the actual Telegram Hermes process with `MODE=dry`.

## A — request and controlled dry confirmation

Create one request and confirm it before expiry. Expect one pending-operation file, one task, one approval chain, state-derived Telegram messages, and no claim that outreach was sent.

## B — duplicate confirmation

Confirm the same original request with a second Telegram message. Expect one task only, no second execution, both confirmation IDs recorded, and the existing task reused.

## C — authorization, scope, and expiry

Reject without creating a task: confirmation with no pending request, a non-allowlisted user or chat, a different requester, an expired request, operation-scope mismatch, or attachment mismatch.

## D — stalled worker and alert retry/dedup

Hold a task in `queued` beyond the watchdog threshold. Expect queued/blocked status, a proactive alert, suppression during cooldown, retry after failed delivery, and re-alert after resolution and recurrence.

## E — restart recovery

Restart the live Telegram service. Expect the same task, approval, pending operation, and status after restart; the watchdog timer remains active; no duplicate execution.

Phase 0 is complete only when A–E pass on the live Droplet and no stub evidence is presented as production evidence.
