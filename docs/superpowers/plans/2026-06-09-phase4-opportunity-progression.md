# Phase 4 Opportunity Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn verified positive email or call interest into exactly one approved next-step action and one evidence-verified booking, with durable idempotent state and canonical lead progression.

**Architecture:** Add an `opportunityRail` that consumes existing Phase 2 reply rows and Phase 3 call outcomes, writes deterministic opportunity-action intents to Supabase, claims them atomically, executes only approved invitation/callback/review actions, verifies booking evidence before marking booked, and updates Phase 1 canonical leads by CAS. Command Center receives an admin-only Phase 4 projection.

**Tech Stack:** Node ESM modules, Supabase/PostgREST RPCs, Next.js Command Center data adapter, `node:test` `.mjs` tests, additive SQL migrations.

---

### Task 1: Contracts And Routing

**Files:**
- Create: `src/lib/opportunityRail/intent.mjs`
- Test: `tests/opportunity-rail-routing.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
test("routes meeting requests to one meeting-link action with deterministic id", () => {
  const intent = createOpportunityIntent({ source: emailMeetingReply, lead }, { now });
  assert.equal(intent.intent_id, createOpportunityIntent({ source: emailMeetingReply, lead }, { now }).intent_id);
  assert.equal(intent.selected_action, "send_meeting_link");
  assert.equal(intent.lifecycle_state, "approved");
  assert.equal(intent.source_evidence.provider_event_id, "gmail_reply_1");
});
```

- [ ] **Step 2: Run red test**

Run: `node --test tests/opportunity-rail-routing.test.mjs`
Expected: fails because `src/lib/opportunityRail/intent.mjs` is missing.

- [ ] **Step 3: Implement minimal routing**

Implement deterministic IDs, lead/version refs, source evidence, chosen action, policy receipt, lifecycle, retries, timestamps, and routing for positive interest, meeting request, callback request, question/objection, ambiguous/no-connect recovery, Leak Check fit, Full Process Audit fit, proposal, and human review.

- [ ] **Step 4: Run green test**

Run: `node --test tests/opportunity-rail-routing.test.mjs`
Expected: all routing tests pass.

### Task 2: Store, Claim, And Booking Evidence

**Files:**
- Create: `src/lib/opportunityRail/store.mjs`
- Create: `supabase/hermes_opportunity_actions_schema.sql`
- Create: `supabase/hermes_opportunity_actions_preflight.sql`
- Create: `supabase/hermes_opportunity_actions_postflight.sql`
- Test: `tests/opportunity-rail-store.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
test("persistIntent verifies read-after-write and duplicate idempotency", async () => {
  const client = fakeOpportunityClient();
  const result = await persistOpportunityIntent(intent, { client });
  assert.equal(result.ok, true);
  const duplicate = await persistOpportunityIntent({ ...intent, intent_id: "other-id" }, { client });
  assert.equal(duplicate.status, "duplicate_idempotency");
});
```

- [ ] **Step 2: Run red test**

Run: `node --test tests/opportunity-rail-store.test.mjs`
Expected: fails because store module is missing.

- [ ] **Step 3: Implement store and SQL**

Mirror Phase 2/3 stores: table constants, Supabase client, `persistOpportunityIntent`, `claimOpportunityIntent`, `writeBookingEvidence`, `readBookingEvidence`, dashboard listing, CAS upsert RPC, claim RPC, unique idempotency keys, lease expiry, booking evidence unique provider event ID, and read-after-write checks.

- [ ] **Step 4: Run green test**

Run: `node --test tests/opportunity-rail-store.test.mjs`
Expected: store tests pass.

### Task 3: Policy, Execution, Recovery, And Lead Updates

**Files:**
- Create: `src/lib/opportunityRail/policy.mjs`
- Create: `src/lib/opportunityRail/executor.mjs`
- Create: `src/lib/opportunityRail/booking.mjs`
- Test: `tests/opportunity-rail-executor.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
test("does not mark booked from a sent meeting link", async () => {
  const result = await executeOpportunityIntent(meetingLinkIntent, { mode: "controlled", transport: fakeMailer() });
  assert.equal(result.intent.lifecycle_state, "sent_unverified");
  assert.equal(result.lead_updated, false);
});
```

- [ ] **Step 2: Run red test**

Run: `node --test tests/opportunity-rail-executor.test.mjs`
Expected: fails because executor modules are missing.

- [ ] **Step 3: Implement policy and executor**

Block stale lead versions, suppression/DNC, quiet hours, attempt caps, active positive reply, duplicates, unresolved approvals, invalid contact paths, pricing/guarantee/custom-contract/proposal actions without Jonathan approval, and Stripe/payment. Execute only approved meeting link, Leak Check invite, Full Process Audit invite, approved callback scheduling, or human-review packet. Add no-answer/ambiguous recovery with retry/email fallback/escalation.

- [ ] **Step 4: Implement booking verification and lead CAS update**

Require calendar/booking evidence with event ID, time, attendee, source action, and status before moving canonical lead to `booked_next_step`; stop generic sequences after booking, rejection, DNC, wrong number, or active human handling.

- [ ] **Step 5: Run green test**

Run: `node --test tests/opportunity-rail-executor.test.mjs`
Expected: executor tests pass.

### Task 4: Orchestration And Command Center

**Files:**
- Create: `src/lib/opportunityRail/dashboard.mjs`
- Create: `src/lib/opportunityRail/pipeline.mjs`
- Modify: `src/lib/commandCenter.mjs`
- Test: `tests/opportunity-rail-command-center-integration.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
test("admin command center exposes Phase 4 opportunity stage, action, booking evidence, failures, approvals, retries, and blockers", () => {
  const data = buildCommandCenterData({ opportunityRail: dashboard }, { role: "ottoserv_admin" });
  assert.equal(data.opportunityRail.summary.booked, 1);
  assert.equal(data.moduleCards.some((card) => card.id === "opportunityRail"), true);
});
```

- [ ] **Step 2: Run red test**

Run: `node --test tests/opportunity-rail-command-center-integration.test.mjs`
Expected: fails because Command Center does not expose Phase 4.

- [ ] **Step 3: Implement projection**

Add admin-only `opportunityRail` payload, module card, alerts for failures/blockers/unresolved approvals, and lead next-action visibility without exposing client-only dashboards.

- [ ] **Step 4: Run green test**

Run: `node --test tests/opportunity-rail-command-center-integration.test.mjs`
Expected: Command Center tests pass.

### Task 5: Validation, Controlled-Real, And Delivery

**Files:**
- Create: `scripts/phase4-controlled-real-acceptance.mjs`
- Create: `outputs/phase4-report.md`

- [ ] **Step 1: Run focused tests**

Run: `node --test tests/phase0-final-corrections.test.mjs tests/lead-rail.test.mjs tests/email-rail.test.mjs tests/call-rail-phase3.test.mjs tests/opportunity-rail-*.test.mjs`

- [ ] **Step 2: Run full `.mjs` suite**

Run: `node --test tests/*.mjs`

- [ ] **Step 3: Run build**

Run: `npm run build`

- [ ] **Step 4: Controlled-real acceptance**

Use one Jonathan-controlled synthetic lead, verified positive-interest evidence, exactly one invitation/booking action, one real Jonathan calendar booking, booking evidence read-back, rerun/restart idempotency proof, ambiguous/no-connect recovery without prospect contact, and no uncontrolled email/call/DM/social/Stripe/pricing/prospect contact.

- [ ] **Step 5: Push and PR**

Run: `git push -u origin phase4-opportunity-progression` and open a PR with the final evidence report. Do not merge.
