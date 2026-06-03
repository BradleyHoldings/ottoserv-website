# OttoServ Revenue Generation Operating System

## Current State Map

OttoServ already has useful rails, but they were not owned by one revenue operating module:

- Lead capture and process audit intake can enter local call-import ledgers.
- `src/lib/outreach/leadStore.ts` stores leads, outreach queue, daily metrics, call outcomes, and Jarvis call packets.
- `scripts/verify-revenue-flow.mjs` proves a cold lead can become a Jarvis call packet and booked-call metric.
- `src/lib/socialContentEngine.mjs` owns the social content workflow, approval state, Cowork handoff, evidence, failure, fallback, health, and audit.
- `src/lib/commandCenter.mjs` and `/dashboard/command-center` already provide the OttoServ OS surface.
- `docs/tomorrow-work-packets.json`, `docs/agent-fallback-rules.md`, and `docs/jarvis-call-packet-template.md` define useful Jarvis/Cowork/Codex expectations.
- `n8n-workflows.json` and setup scripts exist, but live production activation is not verified from this repo.
- Local Hermes at `C:\OttoServ\Hermes` contains CSV queues and Cowork CDP inbox/outbox, but existing audits keep local Hermes in QA/context mode unless explicitly promoted.

## Missing Pieces

- A single daily revenue loop owner.
- Unified queue shape across content, outreach, calls, SEO/GEO/AIEO, Cowork, Retell/Morgan, Codex repair, approvals, replies, and evidence.
- Evidence gate that prevents "drafted", "queued", or "assigned" from being treated as complete.
- Failure classifier and repair router.
- Command Center surface for today's revenue plan, queue counts, repair state, broken rails, and next action.
- Content intelligence guardrails to prevent repetitive OttoServ billboard posts.
- Scheduler-friendly daily loop command.

## Broken Pieces

- Some dashboard actions remain optimistic/local-only until backend write routes are added.
- Repo-wide lint is already red from unrelated legacy errors.
- Durable platform/Supabase/Airtable persistence is not wired for every revenue queue.
- Cowork, Retell/Morgan, Hermes/Jarvis, n8n, and Codex rails are represented as packets, but not all are live API integrations from this website repo.

## Existing Assets Reused

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

## Architecture

`src/lib/revenueEngine.mjs` is the deep module for the Revenue Generation OS.

Public interface:

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

The rest of the app should call this interface instead of directly assembling revenue queues from random files, mock data, or dashboard state.

## Daily Revenue Loop

The loop is designed for Monday through Saturday, morning and afternoon.

Each run produces:

- ICP focus
- Offer focus
- Content angles
- Outreach angles
- Channel-specific actions
- Lead follow-up actions
- Call queue actions
- Website/SEO/GEO/AIEO actions
- Revenue risks
- Broken execution rails
- Codex repair queue
- Cowork/Retell execution packets
- Approval queue only for approval-required actions

Run command:

```powershell
npm.cmd run revenue:daily-loop
```

The script writes a JSON run packet under `data/revenue-engine/` by default and prints a summary for schedulers or Hermes/Jarvis runners.

## Unified Queues

`buildUnifiedQueues()` returns:

- `content`
- `outreach`
- `calls`
- `seoGeoAieo`
- `coworkExecution`
- `codexRepair`
- `approval`
- `evidenceInbox`
- `replies`

Every queue item has:

- channel
- target audience
- offer/CTA
- content angle
- draft copy or action instructions
- execution owner/rail
- risk level
- approval requirement
- evidence requirement
- status
- result/outcome
- next action

## Evidence Rules

Nothing is complete until `recordEvidence()` attaches evidence and `canMarkComplete()` returns true.

The engine distinguishes:

- Drafted is not posted.
- Queued is not sent.
- Assigned is not completed.
- Suggested is not executed.
- Failed execution creates a repair item.
- Missing evidence keeps the item open.

## Repair Router

`classifyFailure()` and `routeFailure()` classify failures into:

- Codex repair required
- Cowork/browser retry required
- Credential/auth issue
- Missing data
- Policy/approval blocked
- Content quality issue
- Platform limitation
- n8n workflow failure
- Website/deployment failure
- Retell/calling failure
- Airtable/Supabase data issue

Repair packets include:

- what failed
- expected behavior
- actual behavior
- evidence/logs
- likely files or workflows
- acceptance criteria
- verification steps

## OttoServ OS Surface

`src/lib/dashboardApi.ts` exposes `getRevenueDashboardState()`.

`/dashboard/command-center` now renders a Revenue Generation OS panel with:

- daily loop schedule
- ICP focus
- offer focus
- next action
- unified queue counts
- evidence inbox count
- repair count
- broken rail count
- call/lead readiness
- morning and afternoon cycle objectives

## Content Intelligence

`getContentIntelligence()` uses recent posts and source insights to detect billboard risk and recommend richer content angles.

It supports:

- Founder POV
- Insight posts
- Lessons learned
- Educational posts
- Contrarian takes
- Process breakdowns
- Story-based posts
- Case-study-style posts
- Comparison posts
- Short videos
- Carousels
- Images
- Blog posts
- Reddit/Quora answers
- SEO/GEO/AIEO pages

If recent copy repeats "leaking revenue" or "missed calls", the engine marks billboard risk high and blocks those phrases unless they are the intentional angle.

## SEO/GEO/AIEO

`getSeoGeoAieoOpportunities()` generates:

- blog post opportunities
- answer-targeted pages
- industry pages
- comparison pages
- metadata recommendations
- schema recommendations
- internal linking suggestions

Focus topics include AI receptionist, front office automation, missed call recovery, lead follow-up, service business operations, process audits, operational waste, and AI employee implementation.

## First Safe Implementation Pass

Implemented in this pass:

- Deep `RevenueEngine` module.
- RevenueEngine type declarations.
- RevenueEngine tests.
- Command Center Revenue Generation OS panel.
- Dashboard API adapter.
- Daily loop script and npm entrypoint.
- SocialEngine changes from the previous pass are kept and included in this architecture path.

Not implemented as fake volume:

- No automated calls to new unapproved lists.
- No silent production n8n activation.
- No credential/security changes.
- No claim that Cowork/Retell executed external actions unless evidence is attached.

## Technical Debt

- Add durable platform/Supabase/Airtable-backed queue storage implementing the RevenueEngine shape.
- Add authenticated API routes for Hermes/Jarvis/Cowork/Codex to create and update RevenueEngine items.
- Connect Retell/Morgan call creation directly once the approved call queue API is confirmed.
- Connect n8n/Vercel/Windows scheduler to `npm.cmd run revenue:daily-loop` or an equivalent protected API route.
- Resolve repo-wide lint failures unrelated to this engine.
- Replace optimistic dashboard write actions with durable backend writes.

## Verification

Run:

```powershell
node --test tests\revenue-engine.test.mjs tests\social-content-engine.test.mjs
npm.cmd run revenue:daily-loop
npm.cmd run build
npm.cmd run lint
```

Expected:

- RevenueEngine and SocialEngine tests pass.
- Daily loop command writes a run packet and prints summary.
- Build passes.
- Lint may remain red until unrelated legacy lint debt is resolved.
