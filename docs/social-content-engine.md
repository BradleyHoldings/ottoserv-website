# OttoServ Social Content Engine

## Audit Summary

The current repo already has social/content surfaces:

- `/dashboard/social` renders the social hub with calendar, approval queue, drafts, and published tabs.
- `/dashboard/social/post` renders a manual post composer with platform previews and a lightweight AI draft placeholder.
- `/dashboard/growth`, `/dashboard/growth/content`, and `/dashboard/growth/intelligence` render growth/content concepts, but they currently use local state and empty mock arrays.
- `src/lib/dashboardApi.ts` reads existing social records from the platform API at `/social/posts`.
- `src/lib/mockData.ts` already defines `SocialPost`, `SocialConnection`, `ContentPiece`, content performance, and winning-pattern types.

No Airtable, Blotato, Hyperframes, or OpenAI image generation integration exists in this repo yet. The clean extension point is the existing social post API normalization plus a shared content-engine module, not a new table/UI silo.

## Deep Module Owner

`src/lib/socialContentEngine.mjs` is now the deep SocialEngine module for the social content workflow. Dashboard components and dashboard API helpers should consume its public interface instead of rebuilding approval, Cowork, evidence, fallback, or status rules from raw platform/Airtable-shaped rows.

Public workflow interface:

- `createDraft(input)`
- `listDrafts(filters)`
- `submitForReview(id)`
- `reviewDraft(id, strategyReview)`
- `approveDraft(id, approval)`
- `rejectDraft(id, reason)`
- `routeApprovedItem(id, executor)`
- `recordExecutorHandoff(id, handoff)`
- `recordEvidence(id, evidence)`
- `markFailed(id, failure)`
- `assignFallback(id, fallbackOwner)`
- `getDashboardState()`
- `getHealthStatus()`
- `getAuditTrail(id)`

Storage/source of truth:

- Current repo source abstraction: `createMemorySocialWorkflowStore(initialItems)`.
- Current live dashboard source: OttoServ platform `/social/posts`, normalized by `normalizePlatformSocialRecord()` and loaded into SocialEngine by `src/lib/dashboardApi.ts`.
- Intended production source: platform/Supabase/Airtable-backed store implementing the same store interface, so Hermes/Codex/Cowork do not read random files or UI state directly.

Workflow path:

`Codex draft -> SocialEngine -> dashboard approval state -> Hermes review/routing -> Cowork handoff -> SocialEngine evidence return -> fallback handling -> health/status/audit -> learning loop`

Current callers:

- `src/lib/dashboardApi.ts` calls `createSocialEngine()` and exposes `getSocialDashboardState()` / `getSocialHealthStatus()`.
- `src/app/dashboard/social/page.tsx` reads posts and Cowork queue rows from `getSocialDashboardState()`.
- `tests/social-content-engine.test.mjs` exercises the SocialEngine public interface and dashboard/health outputs.

Removed or avoided shallow pathways:

- Removed direct social-row normalization from `dashboardApi.ts`.
- Removed dashboard-owned Cowork queue filtering/mapping from `/dashboard/social`.
- Avoided adding separate social draft writer/reader, Cowork packet mapper, fallback checker, or dashboard-only status mapper files.

Status, errors, evidence, and audit:

- Every workflow mutation appends `audit_log` entries with action, actor, detail, and timestamp.
- `recordEvidence()` writes `published_url`, `evidence_path`/`evidence_url`, publish timestamp, and performance notes to the same item.
- `markFailed()` and `assignFallback()` own failure/fallback state and drive `getHealthStatus()`.
- `getDashboardState()` returns counts, approval queue, Cowork queue, failure queue, next actions, and audit summaries.

## Live integration path (durable, connected)

The SocialEngine is now wired to a durable source of truth and the live dashboard:

- `src/lib/socialWorkflowStore.mjs` — filesystem-backed store implementing the
  engine's `store` contract (`create/update/get/list/nextId`). Path overridable
  via `SOCIAL_ENGINE_DATA_DIR`. Mutable ledger lives at
  `data/social-engine/social_drafts.json` (gitignored); the committed seed is
  `data/social-engine/seed/drafts.json`.
- `src/lib/socialEngineServer.mjs` — binds `createSocialEngine({ store })` to the
  file store and computes the health/status panel (last-run timestamps from the
  audit log + workflow counts).
- API routes (Node runtime, same-origin — no JWT needed):
  - `GET /api/social` → `{ state, health, items }`
  - `POST /api/social` → Codex creates/imports a draft
  - `POST /api/social/[id]` → `{ action: submit|review|approve|reject|handoff|evidence|fail|fallback }`
  - `GET /api/social/health` → social-ops health panel
- `/dashboard/social` reads `/api/social` and writes approvals/handoff/evidence/
  fallback back through it (`getLiveSocialState`, `approveSocialPost`, etc. in
  `src/lib/dashboardApi.ts`). Approve/reject now persist — no longer local-only.
- `/dashboard/growth/intelligence` reads live SocialEngine KPIs, a real pipeline
  funnel, and published-evidence records (was fully static).
- Imported evidence: `scripts/import-social-evidence.mjs` creates published
  records for the Instagram post and Cowork LinkedIn engagement logs (copied into
  `data/social-engine/evidence/`). Run via `npm run social:import-evidence`.
- End-to-end proof: `npm run verify:social-flow` boots the app against an isolated
  data dir and exercises create → approve → handoff → fallback → evidence →
  health → persistence. Unit coverage: `tests/social-engine-store.test.mjs`.

Remaining technical debt:

- `/dashboard/social/post` still composes client-side drafts; persistence should
  POST to `/api/social` (the route now exists).
- The external platform `/social/posts` adapter (`getSocialDashboardState`) is
  retained for back-compat but is not the live source of truth anymore.
- Hermes/Cowork runtime scripts outside this repo can now point
  `SOCIAL_ENGINE_DATA_DIR` at the shared workspace, or call the API routes
  directly, instead of using hidden local logs.
- Some legacy dashboard pages may still use static/mock data unrelated to the social workflow; this doc only covers the social engine path.

Mock/static/disconnected data:

- The social dashboard no longer falls back to mock social posts.
- `src/lib/mockData.ts` still provides TypeScript/UI platform definitions and unrelated demo data elsewhere in the app.
- Social write actions remain disconnected from durable storage until platform write endpoints are added.

## Extension Path

Keep Airtable as the operational source of truth and have platform/API endpoints normalize those records into the existing Social hub shape. The shared helper in `src/lib/socialContentEngine.mjs` owns:

- content pillars, angle rules, lifecycle statuses, and required Airtable fields
- monitored source/topic categories for AI/product updates, field-service software, and building/construction trends
- content opportunity translation from source link to practical OttoServ point of view
- structured brief and draft generation
- provider-style asset request payloads for `openai-image` and `hyperframes`
- Cowork queue filtering
- Blotato-ready distribution payloads
- performance labels and repurposing recommendations

This keeps Cowork, Blotato, and future internal schedulers consuming the same record lifecycle:

`Pending Approval` -> `Approved` -> `Ready for Manual Posting` or `Ready for Distribution` -> `Published`

## Airtable Command Center

Use the existing social/content table if present. Add only missing fields from `requiredAirtableFields` in `src/lib/socialContentEngine.mjs`.

Minimum Cowork fields:

- `Assigned Operator`
- `Distribution Status`
- `Published URL`
- `Posted Date`
- `Posting Notes`
- `Needs Fix Reason`

Recommended lifecycle fields:

- `Status`
- `Approval Status`
- `Distribution Status`
- `Repurpose Status`

Minimum content opportunity fields:

- `Source Link`
- `Factual Summary`
- `Why This Matters`
- `Operational Issue`
- `OttoServ Point of View`
- `HeyGen Script`
- `Short Script`
- `LinkedIn Post`
- `Facebook Post`
- `Instagram Caption`
- `X/Twitter Post`
- `Carousel Outline`
- `Front Office Leak Check CTA`

## Monitoring Scope

The content engine should monitor both AI/product updates and building/construction industry trends.

AI and product sources:

- AI tools and product releases
- OpenAI
- Google
- Zapier
- n8n
- Vapi
- Retell
- HeyGen

Field-service and CRM software:

- Field service software updates
- ServiceTitan
- Jobber
- Housecall Pro
- HubSpot

Industry and operating trends:

- construction industry trends
- trades labor shortages
- material cost trends
- data center and infrastructure construction demand
- housing trends
- remodeling trends
- property management trends
- service business trends
- customer response-time expectations
- contractor profitability and operational bottlenecks

For each content opportunity, produce:

- source link
- factual summary
- why this matters to HVAC, plumbing, roofing, electrical, property management, remodeling, or construction businesses
- operational issue behind the trend
- OttoServ point of view
- 45-60 second HeyGen script
- 15-25 second short version
- LinkedIn post
- Facebook post
- Instagram caption
- X/Twitter post
- carousel outline
- CTA tied to a front office leak check

Positioning:

`The AI operations brief for service businesses — translating industry trends, AI updates, and operational changes into practical ways to reduce missed calls, improve follow-up, book more jobs, and run cleaner systems.`

Tone rules:

- practical
- owner-friendly
- not hype-heavy
- not too technical
- explain what changed, why it matters, and what action a business owner should take
- always connect back to revenue leaks, follow-up, calls, scheduling, admin overload, or operational visibility

## Cowork Posting Queue

Create an Airtable view named `Cowork Posting Queue` with these filters:

- `Approval Status = Approved`
- `Distribution Status = Ready for Manual Posting`
- `Scheduled Date` is empty or today/earlier

Show these fields:

- `Topic`
- `Platform`
- `Post Text`
- `Caption`
- `Asset URL`
- `CTA`
- `Scheduled Date`
- `Status`
- `Notes`

Cowork should only operate from this queue. After posting, Cowork updates the same record with `Published URL`, `Posted Date`, and optional `Posting Notes`.

## Provider Boundaries

Current asset providers:

- static images/thumbnails: `openai-image`
- videos: `hyperframes`

Future providers such as HeyGen, Higgsfield, or internal renderers should be added behind the same asset request shape. Do not add vendor-specific lifecycle statuses or duplicate asset tables unless a provider requires a separate job table for reliability.

Current distribution provider:

- manual Cowork queue
- future Blotato handoff from the same approved/ready records

Blotato should consume records with `Approval Status = Approved` and `Distribution Status = Ready for Distribution`; it should write publish results back to the same Airtable record.
