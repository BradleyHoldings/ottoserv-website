-- ─── Autonomous revenue loop state (Supabase / Postgres) ─────────────────────
-- Run this in the Supabase SQL Editor (or via `psql`) once per project.
--
-- Backs src/lib/revenueEngineSupabaseStore.mjs. The revenue loop (run on a
-- persistent host: droplet/dev) upserts the singleton `latest` row; the
-- Vercel-served Hermes dashboard reads it via the read adapter when no local
-- file is present.
--
-- The full loop document (the same object written to data/revenue-engine/
-- latest.json) is stored as jsonb in `document`. It EMBEDS the implementation
-- work orders, which contain client contact PII — so this table must never be
-- exposed to the browser/anon key. The app connects with the SERVICE key
-- (server-only), which bypasses RLS. RLS is enabled with NO policies so the anon
-- key cannot read or write. Do NOT expose SUPABASE_SERVICE_KEY to the browser.

create table if not exists public.revenue_engine_state (
  id            text primary key,        -- 'latest' singleton
  status        text,                    -- ready | repair_first | ...
  generated_at  timestamptz,             -- loop document generated_at
  document      jsonb not null,          -- full loop document (latest.json shape)
  updated_at    timestamptz default now()
);

-- Deny anon/auth access; only the server-side service key (RLS-bypassing) reads
-- or writes this PII-bearing table.
alter table public.revenue_engine_state enable row level security;

-- Optional: keep `updated_at` fresh on every upsert.
create or replace function public.revenue_engine_state_touch()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists revenue_engine_state_touch on public.revenue_engine_state;
create trigger revenue_engine_state_touch
  before insert or update on public.revenue_engine_state
  for each row execute function public.revenue_engine_state_touch();
