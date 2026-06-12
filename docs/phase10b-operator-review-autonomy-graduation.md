# Phase 10B: Operator Review and Approval Workflow for Autonomy Graduation

Phase 10B adds a bounded operator review layer on top of the Phase 10A autonomy graduation framework. It lets Hermes surface graduation requests, lets Jonathan/operator record approve/reject/defer/manual/reduce/suspend/retest/review decisions, and stores those decisions as durable approval evidence without triggering live execution.

## Approval Rails Reused

- `src/lib/execution/approvalStore.mjs` stores durable approval records for autonomy graduation decisions.
- `src/lib/approvalExecutionBridge.mjs` remains the bridge pattern for approved work packets; Phase 10B does not execute through it automatically.
- `src/lib/hermesApprovalOutbox.ts` approval outbox semantics are reused as the durable approval/evidence pattern.
- `latest.json` and `src/lib/revenueEngineReadAdapter.mjs` expose the review state for dashboards and read-only consumers.

## Tables and Stores

- Reused: `data/revenue-engine/approvals/*.json`
- Reused: `latest.json`
- Reused: revenue engine state document shape emitted by `runRevenueDailyLoop`
- Added: none

## Graduation Request Model

Each request contains:

- `request_id`
- `action_category`
- `action_id`
- `current_autonomy_level`
- `requested_autonomy_level`
- `risk_class`
- `requested_by`
- `reason`
- `supporting_evidence`
- `missing_evidence`
- `caps_limits`
- `time_window_constraints`
- `rollback_fail_closed_status`
- `monitoring_status`
- `safety_incidents_exceptions`
- `affected_agents_resources`
- `affected_rails`
- `recommended_decision`
- `current_status`
- `source_blocked_reasons`
- `created_at`

## Operator Decision Model

Supported decisions:

- `approve_bounded_autonomy`
- `reject_graduation`
- `defer_until_evidence`
- `require_manual_only`
- `reduce_autonomy`
- `suspend_autonomy`
- `request_retest`
- `request_operator_review`

Decision records include the operator, reason, scope, max allowed autonomy level, caps, expiration/review timestamps, evidence references, rollback requirements, monitoring requirements, and a `no_live_execution_enabled` flag.

## Durable Behavior

`decideGraduationRequest` writes a durable approval record with `operation_type: "autonomy_graduation"` through `saveApproval`. Approval evidence is auditable and reusable by future policy consumers, but the act of approval does not send email, place calls, trigger Retell, trigger Stripe/n8n, deploy, modify schema, or enable immediate live execution.

## Bounded Policy Output

`buildAutonomyGraduationReviewState` emits:

- `pending_graduation_requests`
- `approved_bounded_autonomy`
- `rejected_deferred_requests`
- `suspended_reduced_autonomy_items`
- `active_autonomy_caps`
- `expiration_review_requirements`
- `operator_decision_history`
- `next_required_evidence`
- `bounded_autonomy_policy`
- `summary`
- `safety`

The bounded policy is explicitly future-facing and includes `no_automatic_live_enablement: true`.

## Latest and Read Adapter

`runRevenueDailyLoop` now writes `autonomyGraduationReviewState` into `latest.json` and includes the review summary in the loop summary. `readAutonomousRevenueState` exposes `autonomyGraduationReviewState` as a read-only dashboard surface.

## Safety Confirmations

- No automatic live enablement from approval.
- No email sent.
- No calls placed.
- No Retell production activation.
- No Stripe or n8n trigger.
- No deploy triggered.
- No schema modified.
- No duplicate approval tables created.
- Planned agents are not granted live authority.
- Jarvis cannot duplicate Hermes authority.

## What Can Now Be Reviewed

Jonathan/operator can now review Phase 10A blocked graduation items, approve bounded future autonomy with caps and evidence, reject or defer graduation, force manual-only handling, reduce or suspend autonomy, request retesting, or request deeper operator review.

## Remaining for Phase 10C

- Consume bounded policies in live gated rails only after explicit implementation.
- Complete live business-hours acceptance for Phase 9B.
- Add any richer approval-center UI if needed beyond the read model.
- Add expiration enforcement and renewal workflows where live rails consume the policy.
