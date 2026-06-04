# Hermes production / Supabase state

Local runs print `supabase: { skipped: true, reason: "supabase_not_configured" }`
and the Vercel dashboard shows stale/empty Hermes state when the Supabase env is
not set. The revenue document (the same object written to `latest.json`, embedding
the approval/execution queue, work orders, and operating cycle) has no durable home
the dashboard can read.

Run `npm run hermes:state-check` to see what's missing (it prints env var **names**
only — never values/secrets).

## Required environment variables (names only)

| Purpose | Variable (either accepted) |
|---|---|
| Supabase project URL | `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` |
| Service-role key (server-side only) | `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` |
| Table name (optional) | `REVENUE_ENGINE_SUPABASE_TABLE` (default `revenue_engine_state`) |

## Where they are needed

- **Vercel project** → Settings → Environment Variables: needed for the dashboard
  **read path** (`readRevenueState`) so production reflects live Hermes state.
- **Host / cron running the Hermes scripts** (`revenue:daily-loop`,
  `hermes:operate`, `hermes:actor-queue`, `evidence:submit`): needed for the
  **write path** (`upsertRevenueState`).
- **Local `.env`** for manual runs (already git-ignored).

## One-time table setup

Apply `supabase/revenue_engine_schema.sql` in the Supabase SQL editor (creates the
`revenue_engine_state` table; the loop upserts a singleton row `id = "latest"`).

## Verify

```
npm run hermes:state-check          # configured? which names missing?
npm run hermes:operate              # check summary.persisted.supabase.ok === true
```

## Security

- The service-role key bypasses RLS — set it **server-side only**, never in client
  bundles, and never commit it. `getSupabaseConfig()` reads it from env at runtime.
- Persistence writes ONLY to the project-owned `revenue_engine_state` table. No
  emails, calls, payment links, n8n activations, deploys, or client-facing actions.
