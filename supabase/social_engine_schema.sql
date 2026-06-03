-- ─── SocialEngine production storage (Supabase / Postgres) ───────────────────
-- Run this in the Supabase SQL Editor (or via `psql`) once per project.
--
-- Backs src/lib/socialSupabaseStore.mjs. Every SocialEngine record field is a
-- typed column for SQL visibility/indexing, and `raw_payload` holds the exact
-- engine item (jsonb) so the engine's shape round-trips losslessly.
--
-- The app connects with the SERVICE key (server-only, in API routes), which
-- bypasses RLS. Do NOT expose SUPABASE_SERVICE_KEY to the browser.

create table if not exists public.social_drafts (
  id                      text primary key,
  platform                text,
  content_type            text,
  post_text               text,
  asset_path              text,
  asset_url               text,
  status                  text,
  content_category        text,
  core_insight_or_reframe text,
  intended_audience       text,
  cta_status              text,
  billboard_risk_score    numeric default 0,
  social_strategy_review  jsonb,
  created_by              text,
  reviewed_by             text,
  approved_by             text,
  created_at              timestamptz,
  reviewed_at             timestamptz,
  approved_at             timestamptz,
  rejected_at             timestamptz,
  scheduled_for           timestamptz,
  handed_to_cowork_at     timestamptz,
  published_at            timestamptz,
  published_url           text,
  evidence_path           text,
  evidence_url            text,
  failure_reason          text,
  fallback_owner          text,
  next_action             text,
  learning_tags           jsonb default '[]'::jsonb,
  performance_notes       text,
  audit_log               jsonb default '[]'::jsonb,
  executor                text,
  executor_handoff        jsonb,
  raw_payload             jsonb,                 -- lossless copy of the engine item
  row_updated_at          timestamptz default now()
);

create index if not exists social_drafts_status_idx     on public.social_drafts (status);
create index if not exists social_drafts_platform_idx   on public.social_drafts (platform);
create index if not exists social_drafts_created_at_idx  on public.social_drafts (created_at);

-- Keep row_updated_at fresh on every write.
create or replace function public.social_drafts_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.row_updated_at = now();
  return new;
end;
$$;

drop trigger if exists social_drafts_touch on public.social_drafts;
create trigger social_drafts_touch
  before update on public.social_drafts
  for each row execute function public.social_drafts_touch_updated_at();

-- RLS: the server uses the service key (bypasses RLS). Enable RLS so the anon
-- key can never read/write this table from the browser; add no anon policies.
alter table public.social_drafts enable row level security;

-- Seeding is handled automatically by the app (hydrateIfEmpty) on first request,
-- inserting the committed Instagram/LinkedIn evidence + safe test draft only when
-- the table is empty. No manual seed step required.
