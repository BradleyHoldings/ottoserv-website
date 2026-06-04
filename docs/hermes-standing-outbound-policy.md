# Hermes Standing Outbound Policy (bottleneck fix)

**Problem.** Hermes made Jonathan approve every normal cold email and call one by
one, making Jonathan the bottleneck at the top of the lead cycle. Quality is good
enough for autonomous execution under approved policy.

**Change.** Normal outbound now materializes under a **standing policy** — no
per-item Jonathan approval — while exceptional cases stay gated and missing
prerequisites are blocked (never sent).

## What is autonomous (standing policy, no per-item approval)

Materialized as send-/call-ready actor packets when **all** hold:

- Action is approved-template **B-tier cold email** or **normal approved-policy call**.
- Inside the current channel cap (`email.daily_cap` / `call.daily_cap`).
- Has a contact path and carries the outbound evidence contract.
- Is **not** exceptional (see below).

Also still autonomous (unchanged): lead research, enrichment/scoring, draft/packet
creation, normal follow-ups, CRM/lead status updates, evidence logging, routing.

## What still requires Jonathan approval (GATED)

- Increasing cold email send limits or call volume/limits (over-cap → limit increase).
- New outbound campaigns or new audience/segments.
- Custom pricing/guarantees, payment links outside approved products.
- High-emotion/sensitive moments, upset customers, negative replies needing judgment.
- Legal/compliance-sensitive messages and client-facing deliverables.
- Anything outside the approved offer/script/policy.

## What BLOCKS execution (not an approval ask)

DNC/blacklist, cooldown window, outside business hours (calls), missing contact
path, or missing evidence requirement → returned as `blocked`, never sent.

## Evidence discipline (enforced)

Every executed outbound action requires evidence before it can complete:
**message/call id, timestamp, disposition/outcome, and next action**
(`OUTBOUND_EVIDENCE_CONTRACT`). Completion stays gated on that evidence by the
execution bridge.

## Bottleneck accounting

The autonomy scorecard now counts only **gated** proposals as the Jonathan
bottleneck. Normal standing-materialized outbound becomes an open execution task,
not a pending approval — so the bottleneck rate drops and the operating score
rises when normal outbound flows under standing policy.

## Files

- `src/lib/hermesApprovalThroughput.mjs` — standing outbound policy, exceptional
  detection, execution-block detection, caps, evidence contract, `blocked` output.
- `src/lib/hermesAutonomyScorecard.mjs` — bottleneck counts gated proposals only.
- `src/lib/hermesOrchestrator.mjs` — cycle materializes outbound under standing
  policy and re-scores with throughput.
- `scripts/hermes-throughput.mjs` — runner wires `DEFAULT_STANDING_OUTBOUND_POLICY`.
- `tests/hermes-standing-outbound-policy.test.mjs` — proofs (below).

## Verification

`node --test tests/hermes-standing-outbound-policy.test.mjs` → 7/7 pass:

1. normal B-tier email under cap is not Jonathan-gated (standing),
2. normal call under approved policy is not Jonathan-gated (standing),
3. send/call limit increase (over cap) is gated,
4. high-emotion / upset-customer / negative-reply case is gated,
5. missing evidence/contact path blocks execution,
6. evidence is required before completion,
7. bottleneck rate drops and operating score improves when normal outbound is
   standing-materialized.

Existing suites unaffected: `hermes-approval-throughput`, `hermes-autonomy-scorecard`,
and `hermes-orchestrator` remain green. (Two unrelated pre-existing failures in
`command-center` / `work-orders` are not touched by this change.)

**Safety:** all functions are pure/deterministic and trigger no real emails, calls,
DMs, payment links, n8n workflows, or deploys.
