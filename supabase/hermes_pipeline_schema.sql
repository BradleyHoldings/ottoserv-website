-- ─── Phase 1 canonical lead store: hermes_pipeline ──────────────────────────
-- Migration: phase1.v1
-- Applied to: public schema (Supabase / Postgres)
--
-- ADDITIVE: creates new tables and triggers only. Does not alter, drop, or
-- rename any existing production table (revenue_engine_state, social_drafts, etc.).
--
-- REVERSIBLE: a full rollback procedure is at the bottom of this file.
--
-- SAFE IF PARTIALLY APPLIED: every statement is idempotent (CREATE IF NOT EXISTS,
-- CREATE OR REPLACE, DROP IF EXISTS). Partial application leaves the schema in a
-- coherent, usable state.
--
-- DETERMINISTIC IDENTITY: lead_id is the primary key, derived deterministically
-- by src/lib/leadRail/identity.mjs (lid_v1_<sha256[:16]>). The alias table
-- (hermes_lead_aliases) provides secondary lookup across renamed contact paths.
--
-- OPTIMISTIC CONCURRENCY: the `version` column is a monotonically increasing
-- integer. The application layer (store.mjs) reads the current version before
-- writing and refuses to overwrite a row whose stored version is newer.
--
-- TIMESTAMPS: discovered_at (signal/discovery time) and imported_at (intake time)
-- are distinct columns — never conflated.
--
-- PII POLICY: contact data lives here. RLS is ENABLED with NO policies, so the
-- anon key and auth key CANNOT read or write. Only the service-role key (which
-- bypasses RLS) may access this data. Never expose SUPABASE_SERVICE_KEY to the
-- browser or any client-side code.
--
-- HOW TO APPLY: paste into Supabase SQL Editor or run via psql:
--   psql "$DATABASE_URL" -f supabase/hermes_pipeline_schema.sql
--
-- HOW TO ROLL BACK: execute the ROLLBACK block at the bottom of this file.

-- ─── 1. HERMES_PIPELINE (canonical lead/CRM record) ──────────────────────────

create table if not exists public.hermes_pipeline (
  -- Identity
  lead_id           text primary key,          -- deterministic (lid_v1_<sha256[:16]>)
  -- Contact
  company_name      text,
  contact_name      text,
  normalized_phone  text,
  email             text,
  website           text,
  -- Geography / fit
  industry          text,
  city              text,
  state             text,
  timezone          text,
  -- Source provenance
  source_url        text,
  source_type       text,
  source_evidence   text,
  -- Timestamps (KEPT DISTINCT — signal ≠ intake ≠ validation)
  discovered_at     timestamptz,               -- SIGNAL/discovery time
  imported_at       timestamptz,               -- INTAKE time
  last_validated_at timestamptz,               -- last validator pass
  -- Validation blobs
  contact_validation jsonb,
  fit_validation    jsonb,
  -- Scoring
  score             integer not null default 0,
  tier              text,
  score_reasons     jsonb,
  -- Pipeline state
  pipeline_stage    text,
  eligibility       text,                       -- enrich|email_eligible|call_eligible|manual_review|gated|rejected
  next_action       text,
  enrichment_status text,
  record_status     text,                       -- accepted|quarantined|rejected
  quarantine_reasons jsonb,
  -- Schema + concurrency
  schema_version    text not null default 'phase1.v1',
  version           integer not null default 1, -- optimistic concurrency counter
  -- Lossless record (round-trips the exact canonical shape regardless of column drift)
  raw_payload       jsonb not null,
  -- Audit timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Indexes for common query patterns.
create index if not exists hermes_pipeline_record_status_idx  on public.hermes_pipeline (record_status);
create index if not exists hermes_pipeline_eligibility_idx    on public.hermes_pipeline (eligibility);
create index if not exists hermes_pipeline_phone_idx          on public.hermes_pipeline (normalized_phone);
create index if not exists hermes_pipeline_email_idx          on public.hermes_pipeline (email);
create index if not exists hermes_pipeline_tier_idx           on public.hermes_pipeline (tier);
create index if not exists hermes_pipeline_pipeline_stage_idx on public.hermes_pipeline (pipeline_stage);
create index if not exists hermes_pipeline_created_at_idx     on public.hermes_pipeline (created_at);
create index if not exists hermes_pipeline_version_idx        on public.hermes_pipeline (version);

-- PII-bearing: deny anon/auth. Only service-role (RLS-bypassing) may read/write.
alter table public.hermes_pipeline enable row level security;
-- No policies intentionally — zero-trust: service key only.

-- ─── 2. LEAD_ALIASES (secondary identity lookup) ─────────────────────────────
--
-- Stores every alternate identity key observed for a lead (domain, phone, email,
-- company_geo). Used by the dedupe/reconcile stage to match records that arrive
-- under a different contact path (e.g. new phone number, added email).
--
-- alias_key format: "<kind>:<value>"  e.g. "domain:example.com", "phone:5551234567"

create table if not exists public.hermes_lead_aliases (
  alias_key   text not null,                   -- "kind:value" (indexed for lookup)
  lead_id     text not null references public.hermes_pipeline(lead_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (alias_key, lead_id)
);

create index if not exists hermes_lead_aliases_lead_idx  on public.hermes_lead_aliases (lead_id);
create index if not exists hermes_lead_aliases_alias_idx on public.hermes_lead_aliases (alias_key);

alter table public.hermes_lead_aliases enable row level security;

-- ─── 3. HERMES_ENRICHMENT_TASKS (durable Cowork work queue) ──────────────────
--
-- Durable enrichment queue visible in SQL. task_id = "enr-<lead_id>" (idempotent).
-- status: queued | in_progress | completed | blocked | stalled

create table if not exists public.hermes_enrichment_tasks (
  task_id       text primary key,               -- enr-<lead_id> (deterministic)
  lead_id       text not null,
  task_type     text not null default 'enrich_lead_contact',
  actor         text not null default 'Cowork',
  status        text not null default 'queued', -- queued|in_progress|completed|blocked|stalled
  attempt       integer not null default 0,
  payload       jsonb not null,
  result        jsonb,
  blocked_reason text,
  created_at    timestamptz not null default now(),
  queued_at     timestamptz,
  updated_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists hermes_enrichment_tasks_lead_idx   on public.hermes_enrichment_tasks (lead_id);
create index if not exists hermes_enrichment_tasks_status_idx on public.hermes_enrichment_tasks (status);
create index if not exists hermes_enrichment_tasks_actor_idx  on public.hermes_enrichment_tasks (actor);

alter table public.hermes_enrichment_tasks enable row level security;

-- ─── 4. TRIGGERS (keep updated_at current on every upsert) ───────────────────

create or replace function public.hermes_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hermes_pipeline_updated_at on public.hermes_pipeline;
create trigger hermes_pipeline_updated_at
  before insert or update on public.hermes_pipeline
  for each row execute function public.hermes_set_updated_at();

drop trigger if exists hermes_enrichment_tasks_updated_at on public.hermes_enrichment_tasks;
create trigger hermes_enrichment_tasks_updated_at
  before insert or update on public.hermes_enrichment_tasks
  for each row execute function public.hermes_set_updated_at();

-- ─── 5. MIGRATION VALIDATION QUERIES ─────────────────────────────────────────
-- Run these after applying to confirm the schema landed correctly.
--
-- 5a. Three tables present:
--   select count(*) from information_schema.tables
--     where table_schema='public'
--       and table_name in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks');
--   -- Expected: 3
--
-- 5b. RLS enabled on all three:
--   select tablename, rowsecurity from pg_tables
--     where schemaname='public'
--       and tablename in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks');
--   -- Expected: rowsecurity=true for all three.
--
-- 5c. Primary key and version column on hermes_pipeline:
--   select column_name, column_default, is_nullable
--     from information_schema.columns
--     where table_schema='public' and table_name='hermes_pipeline'
--       and column_name in ('lead_id','version','raw_payload','discovered_at','imported_at');
--   -- lead_id: NOT NULL, no default (PK); version: NOT NULL default 1; raw_payload: NOT NULL.
--
-- 5d. Alias table FK to hermes_pipeline:
--   select constraint_name from information_schema.table_constraints
--     where table_schema='public' and table_name='hermes_lead_aliases'
--       and constraint_type='FOREIGN KEY';
--   -- Expected: at least one FK constraint.
--
-- 5e. No policies (service-key-only write path confirmed):
--   select count(*) from pg_policies
--     where schemaname='public'
--       and tablename in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks');
--   -- Expected: 0

-- ─── ROLLBACK PROCEDURE ───────────────────────────────────────────────────────
-- Reverses this migration completely. All data in the tables below is LOST.
-- Get explicit authorization from Jonathan before running in production.
-- Run as a single transaction to prevent partial rollback:
--
-- BEGIN;
--   drop trigger if exists hermes_enrichment_tasks_updated_at on public.hermes_enrichment_tasks;
--   drop trigger if exists hermes_pipeline_updated_at on public.hermes_pipeline;
--   drop function if exists public.hermes_set_updated_at() cascade;
--   drop table if exists public.hermes_enrichment_tasks cascade;
--   drop table if exists public.hermes_lead_aliases cascade;
--   drop table if exists public.hermes_pipeline cascade;
-- COMMIT;
-- After rollback, verify:
--   select count(*) from information_schema.tables
--     where table_schema='public'
--       and table_name in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks');
--   -- Expected: 0
