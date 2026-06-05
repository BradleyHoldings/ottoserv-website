# Hermes Autonomy Readiness Audit (evidence-based)

Date: 2026-06-05. Method: direct repository + runtime inspection. **No score is
based on seed data, mocks, simulated execution, queued packets, or passing unit
tests alone.** Live/external capabilities that cannot be verified end-to-end here
are classified by their real blocker, not assumed working.

## Verdict up front
Hermes has a **strong reasoning/decision layer and a now-trustworthy execution
contract**, but **near-zero verified live execution**: the Telegram-facing agent
is a separate process not in this repo, there is no running worker daemon, and no
live email/call/CRM/payment transport is wired with credentials. It is **not**
production-autonomous. It is safe-by-default and truthful-by-construction.

## Separate readiness scores (0–100), each with evidence
| Dimension | Score | Evidence basis |
|---|---|---|
| Reasoning readiness | **75** | Selector, scorecard, mission planner, throughput policy all implemented + tested (`hermes-next-action-selector`, `hermes-autonomy-scorecard`, `mission.mjs`). Decisions are deterministic and policy-aware. |
| Execution readiness | **20** | State machine + receipts + command rail exist and are tested, but **no live transport, no running worker daemon, no Telegram bot in repo**. Only stub/dry execution is verified. |
| Revenue readiness | **25** | Pipeline/intake/scoring/standing-policy work; **no live outreach, no booked-revenue evidence**. Real ARR movement unverified. |
| Service-delivery readiness | **30** | Work-order/build-packet/handoff simulators exist + tested; **no delivered client artifact with evidence**. |
| Self-repair readiness | **55** | Watchdog detects stalls/mismatches/false completions and auto-applies safe repairs (`hermes-execution-contract` tests 6,7,15,16); bounded to safe classes; escalates the rest. Not yet exercised against a live runner. |
| Security readiness | **45** | Approval durability, idempotent consumption, stub≠production evidence, high-risk gating, no-secret-exposure design. **Not audited**: real credential handling, transport auth, webhook auth (none in repo). |
| **Overall verified autonomy** | **30** | Truthful state + safe orchestration are real; live execution is essentially unverified. |

## 26-area matrix
| # | Area | Classification | Evidence / blocker |
|---|---|---|---|
| 1 | Perception & intake | functional but incomplete | Spreadsheet ingest + lead-intent tested; no live attachment webhook in repo. |
| 2 | Durable operational memory | production-ready (local) | Operating ledger, task store, approval store persist to disk; Supabase path best-effort. |
| 3 | Planning & decomposition | functional but incomplete | `mission.mjs` builds bounded missions; not yet driving the runner. |
| 4 | Policy & authority | functional but incomplete | Standing policy + durable approvals + high-risk gating tested; needs real operator review of scopes. |
| 5 | Actor & model routing | functional but incomplete | `hermesActorAvailability` cost-aware routing + deferral tested; no live actor health probes. |
| 6 | Tool & integration execution | simulated only | Executors run via stub transports; no live integration wired. |
| 7 | Revenue operations | functional but incomplete | Operating cycle integrated; no live revenue evidence. |
| 8 | Lead acquisition & enrichment | functional but incomplete | Ingest/dedupe/freshness/enrichment-routing tested; enrichment actor (Cowork) not live here. |
| 9 | Outreach execution | simulated only / blocked by credentials | Email/call executors close packets via stubs; **no Gmail/Retell creds, no verified contacts**. |
| 10 | Calls (Retell) | blocked by credentials | No Retell credentials/transport in repo. |
| 11 | Email | blocked by credentials | No Gmail/SMTP credentials/transport in repo. |
| 12 | Social / browser work | absent (here) | Handled by Cowork/browser actors outside repo. |
| 13 | CRM & pipeline movement | functional but incomplete | Lifecycle/stage state exists; no live CRM write. |
| 14 | Payment & onboarding | blocked by policy / absent | Stripe changes are high-risk gated; no live payment path here. |
| 15 | Service delivery | simulated only | Simulators tested; no delivered artifact evidence. |
| 16 | Evidence & verification | production-ready | Receipt validator + evidence-gated transitions + stub/production split, all tested. |
| 17 | Monitoring & watchdogs | functional but incomplete | Watchdog implemented + tested; needs scheduling against a live runner. |
| 18 | Self-diagnosis | functional but incomplete | Watchdog failure-class diagnosis tested; limited classes. |
| 19 | Self-repair | functional but incomplete | Safe auto-repair + escalation handoff tested; bounded scope. |
| 20 | Security | functional but incomplete | Approval/evidence/gating solid; credential & transport auth unverified. |
| 21 | Cost / subscription awareness | functional but incomplete | Cost-tier routing + credit-outage deferral tested; no live usage metering. |
| 22 | Failure recovery | functional but incomplete | Retry/resume/rehydrate in state machine + watchdog; partial-resume modeled, not run live. |
| 23 | Learning from outcomes | functional but incomplete | Learning weights from ledger tested; needs real outcomes. |
| 24 | Dashboard visibility | functional but incomplete | Dashboard reads operating state; needs lifecycle-state surfacing. |
| 25 | Long-horizon planning | functional but incomplete | Mission planner exists; no multi-mission portfolio. |
| 26 | Forecasting to $1M ARR | absent | No revenue model/forecast wired. |

## What Hermes can genuinely do now
- Refuse to claim execution it cannot prove (state machine + receipt gate + language mapper — tested).
- Turn an approval into a durable, idempotent, auto-advancing task through the real operating cycle (command rail — tested e2e, transports off).
- Detect a stalled/false-progress task within threshold and proactively report + safely repair it (watchdog — tested against the incident scenario).
- Import/validate/dedupe/score leads and route no-contact leads to enrichment under standing policy (tested).

## What it CANNOT do (must not claim)
- Send a real email or place a real call (no credentials/transport).
- Report outreach as sent/booked (no production transport receipt can exist yet).
- Run unattended without a scheduled worker/watchdog process (none running here).

## Only simulated (stub) today
- Email/call execution receipts in tests and dry runs (clearly flagged `source:"stub"`, blocked from being shown as production).
