# Revenue Generation OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first safe pass of OttoServ's daily Revenue Generation Operating System so Jarvis/Hermes can produce a daily plan, unified queues, evidence requirements, repair routing, and dashboard-visible state.

**Architecture:** Add a deep `RevenueEngine` module that owns the daily revenue loop, queue item model, evidence rules, repair classification, content intelligence, and dashboard state. Existing assets remain as rails: call import/outcomes, Jarvis call packet generation, SocialEngine, Command Center, n8n workflow definitions, and Hermes/Cowork handoff docs. The first pass uses deterministic local data and platform-facing dashboard adapters; durable Supabase/Airtable writes are left behind one engine interface rather than scattered in UI code.

**Tech Stack:** Next.js 16 App Router, TypeScript dashboard API helpers, Node ESM modules/tests, existing local JSON ledgers, existing call-import scripts, existing SocialEngine module.

---

## Current State Map

- Website repo has lead capture, process audit intake, call import, call outcomes, call status, Jarvis call packets, Command Center, social dashboard, visibility kit, and n8n workflow setup scripts.
- `src/lib/outreach/leadStore.ts` owns local lead/outreach/call ledgers for the current revenue path.
- `scripts/verify-revenue-flow.mjs` proves cold lead capture can become a Jarvis call packet and booked-call metric.
- `src/lib/socialContentEngine.mjs` now owns social workflow state and evidence/fallback for social items.
- `docs/tomorrow-work-packets.json` and fallback docs contain useful Cowork/Jarvis/Codex packet shapes, but they are not one unified queue.
- Local Hermes at `C:\OttoServ\Hermes` has CSV queues, Cowork CDP inbox/outbox, docs, and reports, but prior audits warn local Hermes should remain QA/context support unless promoted.
- n8n definitions exist, but live production activation is not verified in this repo.

## Missing Pieces

- No single revenue daily-loop owner.
- No unified queue model spanning content, outreach, calls, SEO/GEO/AIEO, Cowork, Retell, Codex repair, approvals, and evidence.
- No engine-owned evidence rule that prevents "queued" or "assigned" from becoming "complete".
- No failure classifier that creates repair packets.
- Command Center does not yet expose a revenue engine panel.
- Content intelligence is partially social-only and does not protect the whole revenue loop from repetitive billboard copy.
- Daily automation schedule is not represented as a route/script/cron-ready entrypoint in this website repo.

## Broken Pieces

- Some dashboard actions still create local-only optimistic state.
- Lint is repo-wide red because of unrelated legacy errors.
- Durable write paths for platform social/revenue queues are not wired.
- Hermes/Cowork runtime rails are not connected to a durable shared RevenueEngine API.

## Existing Assets To Reuse

- `src/lib/outreach/leadStore.ts`
- `src/lib/socialContentEngine.mjs`
- `src/lib/commandCenter.mjs`
- `src/lib/dashboardApi.ts`
- `src/app/dashboard/command-center/page.tsx`
- `scripts/verify-revenue-flow.mjs`
- `scripts/ops-report.mjs`
- `docs/tomorrow-work-packets.json`
- `docs/agent-fallback-rules.md`
- `docs/jarvis-call-packet-template.md`
- `n8n-workflows.json`

## Proposed Architecture

Create `src/lib/revenueEngine.mjs` as the deep module with:

- `createDailyRevenuePlan(input)`
- `createQueueItem(input)`
- `buildUnifiedQueues(input)`
- `recordEvidence(item, evidence)`
- `canMarkComplete(item)`
- `classifyFailure(failure)`
- `createRepairPacket(failure)`
- `routeFailure(failure)`
- `getDashboardState(input)`
- `getHealthStatus(input)`
- `getContentIntelligence(input)`
- `getSeoGeoAieoOpportunities(input)`
- `createDailyLoopRun(input)`

Expose types in `src/lib/revenueEngine.d.ts`.

Add tests in `tests/revenue-engine.test.mjs` for:

- daily loop includes ICP, offer, channels, risks, queues, repair, approvals
- queue items require evidence before completion
- failure classifier routes to Codex/Cowork/credential/n8n/Retell/platform repair
- dashboard state contains revenue plan, queues, evidence inbox, broken rails, channel performance, and self-repair status
- content intelligence blocks repetitive "missed calls/leaking revenue" wording unless intentionally selected
- SEO/GEO/AIEO opportunities include blog, answer page, FAQ, metadata, schema, and internal links

Route dashboard data through `dashboardApi.ts` and Command Center rather than new isolated pages for the first pass.

## Implementation Tasks

### Task 1: Failing RevenueEngine Tests

**Files:**
- Create: `tests/revenue-engine.test.mjs`

- [x] **Step 1: Write failing tests**

Add tests that import the desired API from `../src/lib/revenueEngine.mjs` and assert daily loop, evidence gating, repair routing, dashboard state, content intelligence, and SEO/GEO/AIEO outputs.

- [x] **Step 2: Run tests to verify red**

Run: `node --test tests\revenue-engine.test.mjs`
Expected: FAIL because `src/lib/revenueEngine.mjs` does not exist.

### Task 2: Deep RevenueEngine Module

**Files:**
- Create: `src/lib/revenueEngine.mjs`
- Create: `src/lib/revenueEngine.d.ts`
- Modify: `tests/revenue-engine.test.mjs`

- [x] **Step 1: Implement public interface**

Implement deterministic functions listed in Proposed Architecture. Keep storage abstract by taking existing leads, calls, social state, and optional previous runs as inputs.

- [x] **Step 2: Run tests**

Run: `node --test tests\revenue-engine.test.mjs`
Expected: PASS.

### Task 3: Dashboard Integration

**Files:**
- Modify: `src/lib/dashboardApi.ts`
- Modify: `src/lib/commandCenter.mjs`
- Modify: `src/app/dashboard/command-center/page.tsx`

- [x] **Step 1: Add `getRevenueDashboardState()`**

Have `dashboardApi.ts` build the first-pass RevenueEngine state from existing platform/dashboard calls and safe empty arrays when not connected.

- [x] **Step 2: Surface Revenue Engine in Command Center**

Add a revenue engine panel showing today plan, active queue counts, evidence gaps, repair queue count, broken rails, and next action.

### Task 4: Daily Loop Entrypoint

**Files:**
- Create: `scripts/revenue-daily-loop.mjs`
- Modify: `package.json`

- [x] **Step 1: Add script**

Add `npm run revenue:daily-loop` to print the daily plan, queues, evidence requirements, repair queue, and health status. The script should be cron/Vercel/Windows Task Scheduler friendly and avoid requiring credentials.

### Task 5: Documentation and Verification Report

**Files:**
- Create: `docs/revenue-generation-os.md`

- [x] **Step 1: Document current state and architecture**

Include current state map, missing pieces, broken pieces, existing assets, architecture, implementation pass, verification evidence, and technical debt.

### Task 6: Verification, Commit, Push

**Files:**
- All changed files

- [x] **Step 1: Run targeted tests**

Run:

```powershell
node --test tests\revenue-engine.test.mjs tests\social-content-engine.test.mjs
```

Expected: PASS.

- [x] **Step 2: Run build**

Run:

```powershell
npm.cmd run build
```

Expected: PASS, with known Turbopack multiple-lockfile warning if unchanged.

- [x] **Step 3: Run lint**

Run:

```powershell
npm.cmd run lint
```

Expected: current repo-wide lint may fail on pre-existing unrelated errors; report exact status.

- [x] **Step 4: Commit and push**

Run:

```powershell
git add docs src scripts tests package.json
git commit -m "feat: add revenue generation operating system"
git push
```

Expected: branch is pushed with social engine and revenue engine changes.

## Self-Review

- Spec coverage: covers audit, daily loop, unified queues, evidence, repair router, dashboard surface, execution rails represented, content intelligence, SEO/GEO/AIEO, and scale guardrail.
- Placeholder scan: no planned implementation step depends on a placeholder API name outside the listed files.
- Type consistency: public names in tests, module, declaration file, dashboard adapter, docs, and script use the same `RevenueEngine` naming.
