# Phase 10A Security, Authority, and Autonomy Graduation Framework

## Objective

Phase 10A defines and enforces the safety model for controlled autonomy. It does not expand live execution.

## Rails Discovered And Reused

- `approvalExecutionQueue` and approval evidence writeback
- safe action policy surfaces in the email, call, opportunity, service delivery, commercial, and Retell rails
- `multiAgentCommandState`
- `taskOwnershipLedger`
- `resourceAvailabilityState`
- `schedulingWindowState`
- `dispatchControlState`
- `dailyAutonomousOperatingCycle`
- `durableRevenueExecutionQueue`
- `controlledEmailExecution`
- `serviceDeliveryExecution`
- latest.json plus `revenueEngineReadAdapter`

## Tables And Stores

Reused:

- `latest.json`
- `implementation-work-orders.json`
- approval/evidence event stores
- service delivery persistence stores
- commercial payment evidence stores
- email/call evidence stores

Added:

- None. Phase 10A is a read/model layer over existing rails.

## Autonomy Levels

- `L0 advisory_only`: report and recommend only.
- `L1 draft_or_queue_only`: drafts, queue items, repair recommendations, approval packets.
- `L2 execute_low_risk_with_evidence`: low-risk internal or queue/report execution with evidence.
- `L3 controlled_real_execution_with_caps`: approved real execution within caps, windows, policy, and provider evidence.
- `L4 production_gated_execution`: operator-approved production-scoped action with rollback and monitoring.
- `L5 fully_autonomous_approved_domain`: approved-domain autonomy with standing caps, monitoring, and kill switch.

Each level records allowed actions, blocked actions, approval requirements, evidence, caps, rollback/fail-closed requirements, monitoring, and escalation rules in `src/lib/autonomyGraduationFramework.mjs`.

## Action Risk Model

- `low`: read/report state, generate drafts, create queue items, repair recommendations, non-production internal status with evidence.
- `medium`: approved email within cap/window, approved follow-up task, approved call queueing, client-facing draft, CRM update with evidence.
- `high`: live call, client-facing launch instructions, production workflow, routing/deploy/env/schema changes, payment link, Retell production behavior.
- `critical`: charge money, pricing/products, phone number provisioning, production voice launch, data deletion, bulk outreach, credential/access grants, safety control disablement.

## Graduation Rules

An action can graduate only when it has sandbox tests, controlled-real acceptance evidence, idempotency, duplicate prevention, rollback or fail-closed behavior where applicable, monitoring, evidence requirements, caps/limits, owner approval for medium/high/critical risk, and no unresolved safety incidents. Critical actions always require explicit Jonathan/operator approval.

## Authority Mapping

Active authority profiles are exposed for Hermes, Codex, Claude Code, Cowork, Jonathan/operator, Retell/call rail, email rail, Supabase/data rail, and Vercel/deploy rail. Jarvis remains a reserved Hermes alias and is not routable. Nova, Dash, Atlas, and Sentinel remain planned non-routable profiles with `L0` authority only.

## Security Guardrails

- no secrets in logs or reports
- no local pulling of production secrets
- no auth bypass or forged admin cookies
- same-origin/admin guard required for protected internal routes
- fail closed when flags are disabled
- production flags removed after acceptance runs
- live actions require policy checks
- completed statuses require evidence
- critical actions require Jonathan/operator approval

## Latest JSON / Read Adapter

`runRevenueDailyLoop` writes `autonomyGraduationState` into `latest.json`.

`readAutonomousRevenueState` exposes `autonomyGraduationState` read-only for dashboard/Hermes consumers.

## What Is Protected Now

- planned agents cannot receive live authority
- Jarvis cannot duplicate Hermes authority
- action graduation is blocked without controlled-real evidence, idempotency, duplicate prevention, rollback/fail-closed behavior, monitoring, caps, and approvals
- critical actions cannot graduate without explicit Jonathan/operator approval
- Phase 10A makes no live sends, calls, Stripe, n8n, deploy, schema, Retell production, or credential changes

## Phase 10B Boundary

Phase 10B can add UI/operator workflows for reviewing blocked graduation items, attaching approval records, and explicitly approving bounded autonomy changes. It should still avoid raising any live execution level until evidence and approvals are present.
