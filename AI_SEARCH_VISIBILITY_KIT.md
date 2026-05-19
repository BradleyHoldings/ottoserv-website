# AI Search Visibility Kit (AEO) — OttoServ Deliverable

A reusable module that takes a client intake JSON file and produces:

- An **AI Learn About Us** page (markdown-like, structured for AI extraction)
- **5–10 problem-space pages** per client (industry-aware: property management, HVAC, plumbing, roofing, contractor, home services, generic SMB)
- An **FAQ page**, a **Pricing & Fit page**, and **Comparison pages** (vs each competitor + vs DIY)
- **JSON-LD schema** on every page (Organization, LocalBusiness, ProfessionalService, Service, FAQPage, BreadcrumbList, Review, Article)
- An **AI prompt visibility tracker** (per-prompt, per-engine results)
- An **external authority checklist** (GBP, Bing Places, Apple, Yelp, BBB, chamber, directories, review platforms, Reddit/Quora, podcasts, press, case studies)
- An **admin review workflow** with per-page status (draft → in_review → needs_revision → approved → published) and explicit gates (client approval, legal, pricing, testimonials, claims, schema)

This is the MVP. It runs on filesystem JSON, not Supabase, so it works in dev with zero schema migrations. The store interface is isolated (`src/lib/visibility-kit/store.ts`) — swap it for Supabase later without changing callers.

## Files created

```
src/lib/visibility-kit/
  types.ts                       # ClientIntake, PromptTrackerRow, AuthorityChecklistItem, ReviewStatus, ReviewGate
  store.ts                       # fs-backed: list/load/save/slugify
  load.ts                        # loadClientWithDefaults (regenerates draft content on read)
  JsonLd.tsx                     # <script type="application/ld+json"> helper
  generators/
    seed.ts                      # industry-aware problem-space, FAQ, comparison, authority, tracker generators
    schema.ts                    # JSON-LD builders
    markdown.ts                  # markdown renderers (used by /export)

src/app/clients/[clientSlug]/
  ai-learn-about-us/page.tsx     # AI Learn About Us page (canonical, indexable)
  problems/[problemSlug]/page.tsx
  faq/page.tsx
  pricing/page.tsx
  compare/[comparisonSlug]/page.tsx

src/app/api/visibility/clients/
  route.ts                       # GET list / POST create
  [slug]/route.ts                # GET / PATCH client intake
  [slug]/generate/route.ts       # POST regenerate draft content (preserves approved items)
  [slug]/tracker/route.ts        # GET / PUT (replace) / PATCH (single row) prompt tracker
  [slug]/authority-checklist/route.ts  # GET / PUT authority checklist
  [slug]/export/route.ts         # GET portable markdown + JSON-LD bundle for client-owned sites

src/app/dashboard/admin/clients/visibility/
  page.tsx                       # client list + create form + status overview
  [slug]/page.tsx                # full kit review: pages, schema, tracker, checklist, gates
  _components/
    CreateClientForm.tsx         # client-side create form (writes via POST /api/visibility/clients)
    KitControls.tsx              # status select, gate toggles, regenerate + export buttons

data/visibility-kit/clients/
  sample-hvac.json               # example HVAC client (lazily generates content on first read)
  sample-property-mgmt.json      # example property-management client (proves industry routing)
```

## Routes

| Purpose | Route |
|---|---|
| Client overview (public, AI-readable) | `/clients/[slug]/ai-learn-about-us` |
| Problem-space page | `/clients/[slug]/problems/[problemSlug]` |
| FAQ | `/clients/[slug]/faq` |
| Pricing & Fit | `/clients/[slug]/pricing` |
| Comparison | `/clients/[slug]/compare/[comparisonSlug]` |
| Admin list (with create form) | `/dashboard/admin/clients/visibility` |
| Admin detail (with status/gate controls) | `/dashboard/admin/clients/visibility/[slug]` |
| Portable bundle (markdown + JSON-LD) | `GET /api/visibility/clients/[slug]/export` |

## How to onboard a new client

### Option A — drop-in JSON file

1. Copy `data/visibility-kit/clients/sample-hvac.json` to `data/visibility-kit/clients/<slug>.json`.
2. Replace company name, services, areas, pricing, reviews, competitors, contact.
3. Visit `/clients/<slug>/ai-learn-about-us` — content materializes on first read.
4. Open `/dashboard/admin/clients/visibility/<slug>` to review.

### Option B — POST to the API

```bash
curl -X POST http://localhost:3000/api/visibility/clients \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme HVAC",
    "mainService": "HVAC repair and installation",
    "serviceAreas": ["Orlando, FL", "Kissimmee, FL"],
    "industriesServed": ["HVAC"],
    "competitors": [{"name":"Big Box HVAC"}],
    "pricing": {"summary":"Diagnostic $89, waived on repair."},
    "contact": {"primaryPhone":"(407) 555-0100"}
  }'
```

The API auto-runs the seed pipeline and saves the JSON file.

### Workflow steps (matches the 10-step ask)

1. Create client profile (POST API or file).
2. AI Learn About Us page generated automatically.
3. 5–10 problem-space pages generated (industry-aware).
4. FAQ / pricing / comparison pages generated.
5. Schema injected on every page (JSON-LD).
6. All pages start as `draft`. Open the admin to advance to `in_review` → `approved` → `published`.
7. AI prompt tracker pre-populated with industry/city-specific prompts.
8. Run baseline AI tests manually and `PATCH /api/visibility/clients/<slug>/tracker` with results.
9. Work the authority checklist (`PUT /api/visibility/clients/<slug>/authority-checklist`).
10. Pull tasks into the client delivery dashboard.

## Admin / review gates

Every page carries a `ReviewGate`:

- `clientApprovalRequired`
- `legalConcernsCleared`
- `pricingVerified`
- `testimonialsVerified`
- `claimsVerified`
- `schemaValidated`

Pages render publicly regardless of gates in this MVP. To enforce "no publish without gates," gate the JSX on `client.aiLearnPageStatus === "published"` etc. — that's a one-line change per page.

## What still needs to be connected

These are out of scope for MVP. Each can be added without changing the data model.

- **Persistence to Supabase.** Replace `src/lib/visibility-kit/store.ts` with a Supabase-backed module (one table per shape, or a single `client_visibility_kits` JSONB row). All other code is store-agnostic.
- **Automated AI test runs.** The tracker stores results but does not call ChatGPT / Perplexity / Gemini / Claude / Google AI Overviews. Hook this into Hermes or a cron job that fills `results[<engine>]` and `clientMentioned` per row.
- **Auth on `/dashboard/admin/clients/visibility`.** Inherits whatever auth currently protects `/dashboard/admin/*`. If that's currently open in dev, add a check before any client review work goes live.
- **Auto-publish toggle.** Hardcoded to "manual review required." A `clientAutoPublish: true` flag on the intake could short-circuit gates for trusted clients.
- **Tracker / authority-checklist write UI.** Read-only in the dashboard today. The API supports PUT/PATCH; a small form layer can be added next to `KitControls.tsx`.

## What was just added (round 2)

- Admin **write UI**: `CreateClientForm` (list page) and `KitControls` (detail page) for status changes, gate toggles, regenerate, and export.
- **Export endpoint** at `GET /api/visibility/clients/[slug]/export` — returns markdown + JSON-LD per page so the kit can be published to any client-owned domain (a static site, a CMS, or a vendor site).
- Second sample client (`sample-property-mgmt.json`) to prove industry-aware page generation.
- Verified with `next build`: all 9 new routes compile and the visibility-kit code reports zero TS errors.

## Assumptions / blockers

- **No Supabase schema changes** in this MVP. If the team prefers DB-first, the data model in `types.ts` translates directly to one JSONB column or a normalized schema.
- **Sample client is fictional.** `sample-hvac` exists only to prove the pipeline. Delete or replace before going live.
- **Existing TS errors in the repo are pre-existing.** `tsc --noEmit` reports zero errors in the new `visibility-kit` code, but the repo has unrelated errors elsewhere (dashboard/deployments, growth, financials, etc.) — out of scope here.
- **Industry detection is heuristic** (string match on main service / industries). It's good enough for the listed verticals; for edge cases, set `industriesServed` explicitly.
- **No reCAPTCHA / spam protection** on the POST API. Add before exposing publicly.

## File header summary (for grep)

- Marker string: `AI Search / Answer Engine Optimization` appears in `types.ts`.
- All new files live under `src/lib/visibility-kit/`, `src/app/clients/`, `src/app/api/visibility/`, `src/app/dashboard/admin/clients/visibility/`, and `data/visibility-kit/`.
