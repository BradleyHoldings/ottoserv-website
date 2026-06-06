-- ─── Phase 1 canonical lead store: hermes_pipeline (Supabase / Postgres) ─────
-- Run once per project in the Supabase SQL Editor (or via psql). ADDITIVE: it does
-- not touch revenue_engine_state or any existing table, so it is compatible with
-- the existing live adapter.
--
-- Backs src/lib/leadRail/store.mjs. hermes_pipeline is the AUTHORITATIVE lead/CRM
-- record. Typed columns give SQL visibility/indexing; `raw_payload` jsonb stores the
-- exact canonical record losslessly so schema drift never loses data. The table
-- carries contact PII, so it is SERVICE-KEY ONLY: RLS is enabled with NO policies,
-- so the anon/auth keys cannot read or write. Never expose SUPABASE_SERVICE_KEY to
-- the browser.

create table if not exists public.hermes_pipeline (
  lead_id           text primary key,          -- deterministic id (lid_v1_<sha256>)
  company_name      text,
  contact_name      text,
  normalized_phone  text,
  email             text,
  website           text,
  industry          text,
  city              text,
  state             text,
  timezone          text,
  source_url        text,
  source_type       text,
  source_evidence   text,
  discovered_at     timestamptz,               -- SIGNAL/discovery time
  imported_at       timestamptz,               -- INTAKE time (kept distinct)
  last_validated_at timestamptz,
  contact_validation jsonb,
  fit_validation    jsonb,
  score             integer default 0,
  tier              text,
  score_reasons     jsonb,
  pipeline_stage    text,
  eligibility       text,                       -- enrich|email_eligible|call_eligible|manual_review|gated|rejected
  next_action       text,
  enrichment_status text,
  record_status     text,                       -- accepted|quarantined|rejected
  schema_version    text,
  version           integer not null default 1, -- optimistic concurrency counter
  raw_payload       jsonb not null,             -- lossless canonical record
  created_at        timestamptz,
  updated_at        timestamptz default now()
);

create index if not exists hermes_pipeline_record_status_idx on public.hermes_pipeline (record_status);
create index if not exists hermes_pipeline_eligibility_idx   on public.hermes_pipeline (eligibility);
create index if not exists hermes_pipeline_phone_idx         on public.hermes_pipeline (normalized_phone);
create index if not exists hermes_pipeline_email_idx         on public.hermes_pipeline (email);

-- PII-bearing: deny anon/auth; only the server-side service key (RLS-bypassing) may
-- read/write.
alter table public.hermes_pipeline enable row level security;

-- Optional companion: durable enrichment queue (enrich_lead_contact tasks). The
-- rail can also keep these in the durable task store; this table is for SQL
-- visibility of outstanding Cowork enrichment work.
create table if not exists public.hermes_enrichment_tasks (
  task_id      text primary key,                -- enr-<lead_id> (idempotent)
  lead_id      text not null,
  task_type    text not null default 'enrich_lead_contact',
  actor        text default 'Cowork',
  status       text not null default 'queued',  -- queued|in_progress|completed|blocked|stalled
  attempt      integer not null default 0,
  payload      jsonb not null,
  created_at   timestamptz,
  queued_at    timestamptz,
  updated_at   timestamptz default now()
);
create index if not exists hermes_enrichment_tasks_lead_idx   on public.hermes_enrichment_tasks (lead_id);
create index if not exists hermes_enrichment_tasks_status_idx on public.hermes_enrichment_tasks (status);
alter table public.hermes_enrichment_tasks enable row level security;

-- Keep updated_at fresh on every upsert.
create or replace function public.hermes_pipeline_touch()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists hermes_pipeline_touch on public.hermes_pipeline;
create trigger hermes_pipeline_touch
  before insert or update on public.hermes_pipeline
  for each row execute function public.hermes_pipeline_touch();
