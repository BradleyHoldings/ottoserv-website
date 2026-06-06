-- Phase 1 canonical lead persistence (additive, reversible, service-role only)
-- Do not apply until the repository persistence suites and controlled-real gate pass.

create table if not exists public.hermes_pipeline (
  lead_id text primary key,
  company_name text,
  contact_name text,
  normalized_phone text,
  email text,
  website text,
  industry text,
  city text,
  state text,
  timezone text,
  source_url text,
  source_type text,
  source_evidence text,
  discovered_at timestamptz,
  imported_at timestamptz,
  last_validated_at timestamptz,
  contact_validation jsonb,
  fit_validation jsonb,
  score integer not null default 0,
  tier text,
  score_reasons jsonb,
  pipeline_stage text,
  eligibility text,
  next_action text,
  enrichment_status text,
  record_status text,
  quarantine_reasons jsonb,
  schema_version text not null default 'phase1.v1',
  version integer not null default 1 check (version >= 1),
  raw_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hermes_pipeline_record_status_idx on public.hermes_pipeline (record_status);
create index if not exists hermes_pipeline_eligibility_idx on public.hermes_pipeline (eligibility);
create index if not exists hermes_pipeline_phone_idx on public.hermes_pipeline (normalized_phone);
create index if not exists hermes_pipeline_email_idx on public.hermes_pipeline (email);
create index if not exists hermes_pipeline_tier_idx on public.hermes_pipeline (tier);
create index if not exists hermes_pipeline_pipeline_stage_idx on public.hermes_pipeline (pipeline_stage);
create index if not exists hermes_pipeline_created_at_idx on public.hermes_pipeline (created_at);
create index if not exists hermes_pipeline_version_idx on public.hermes_pipeline (version);
alter table public.hermes_pipeline enable row level security;

create table if not exists public.hermes_lead_aliases (
  alias_key text not null,
  lead_id text not null references public.hermes_pipeline(lead_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (alias_key, lead_id)
);
create index if not exists hermes_lead_aliases_lead_idx on public.hermes_lead_aliases (lead_id);
create index if not exists hermes_lead_aliases_alias_idx on public.hermes_lead_aliases (alias_key);
alter table public.hermes_lead_aliases enable row level security;

create table if not exists public.hermes_enrichment_tasks (
  task_id text primary key,
  lead_id text not null references public.hermes_pipeline(lead_id) on delete cascade,
  task_type text not null default 'enrich_lead_contact',
  actor text not null default 'Cowork',
  status text not null default 'queued',
  attempt integer not null default 0,
  payload jsonb not null,
  result jsonb,
  blocked_reason text,
  created_at timestamptz not null default now(),
  queued_at timestamptz,
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists hermes_enrichment_tasks_lead_idx on public.hermes_enrichment_tasks (lead_id);
create index if not exists hermes_enrichment_tasks_status_idx on public.hermes_enrichment_tasks (status);
create index if not exists hermes_enrichment_tasks_actor_idx on public.hermes_enrichment_tasks (actor);
alter table public.hermes_enrichment_tasks enable row level security;

create or replace function public.hermes_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hermes_pipeline_updated_at on public.hermes_pipeline;
create trigger hermes_pipeline_updated_at before insert or update on public.hermes_pipeline
for each row execute function public.hermes_set_updated_at();

drop trigger if exists hermes_enrichment_tasks_updated_at on public.hermes_enrichment_tasks;
create trigger hermes_enrichment_tasks_updated_at before insert or update on public.hermes_enrichment_tasks
for each row execute function public.hermes_set_updated_at();

-- Atomic compare-and-swap persistence. The service-role REST client calls this RPC.
-- expected_version=0 means first insert; otherwise target version must equal expected+1.
create or replace function public.hermes_upsert_pipeline_cas(
  p_lead_id text,
  p_expected_version integer,
  p_row jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.hermes_pipeline%rowtype;
  v_next public.hermes_pipeline%rowtype;
  v_target integer;
begin
  if p_lead_id is null or btrim(p_lead_id) = '' or p_row is null then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'invalid_cas_input');
  end if;

  v_target := coalesce((p_row->>'version')::integer, 1);
  select * into v_current from public.hermes_pipeline where lead_id = p_lead_id for update;

  if not found then
    if p_expected_version <> 0 or v_target <> 1 then
      return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'first_insert_version_mismatch', 'current_version', 0);
    end if;
    v_next := jsonb_populate_record(null::public.hermes_pipeline, p_row);
    if v_next.lead_id is distinct from p_lead_id then
      return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'lead_id_mismatch');
    end if;
    insert into public.hermes_pipeline select v_next.*;
    return jsonb_build_object('ok', true, 'status', 'inserted', 'version', 1);
  end if;

  if v_current.version <> p_expected_version then
    if v_current.version = v_target and v_current.raw_payload = p_row->'raw_payload' then
      return jsonb_build_object('ok', true, 'status', 'idempotent', 'version', v_current.version);
    end if;
    return jsonb_build_object(
      'ok', false,
      'status', case when v_current.version > v_target then 'stale' else 'conflict' end,
      'reason', 'compare_and_swap_failed',
      'current_version', v_current.version
    );
  end if;

  if v_target <> p_expected_version + 1 then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'non_sequential_version', 'current_version', v_current.version);
  end if;

  v_next := jsonb_populate_record(v_current, p_row);
  if v_next.lead_id is distinct from p_lead_id then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'lead_id_mismatch');
  end if;

  update public.hermes_pipeline set
    company_name = v_next.company_name,
    contact_name = v_next.contact_name,
    normalized_phone = v_next.normalized_phone,
    email = v_next.email,
    website = v_next.website,
    industry = v_next.industry,
    city = v_next.city,
    state = v_next.state,
    timezone = v_next.timezone,
    source_url = v_next.source_url,
    source_type = v_next.source_type,
    source_evidence = v_next.source_evidence,
    discovered_at = v_next.discovered_at,
    imported_at = v_next.imported_at,
    last_validated_at = v_next.last_validated_at,
    contact_validation = v_next.contact_validation,
    fit_validation = v_next.fit_validation,
    score = v_next.score,
    tier = v_next.tier,
    score_reasons = v_next.score_reasons,
    pipeline_stage = v_next.pipeline_stage,
    eligibility = v_next.eligibility,
    next_action = v_next.next_action,
    enrichment_status = v_next.enrichment_status,
    record_status = v_next.record_status,
    quarantine_reasons = v_next.quarantine_reasons,
    schema_version = v_next.schema_version,
    version = v_next.version,
    raw_payload = v_next.raw_payload,
    created_at = v_next.created_at
  where lead_id = p_lead_id and version = p_expected_version;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'compare_and_swap_failed');
  end if;
  return jsonb_build_object('ok', true, 'status', 'updated', 'version', v_target);
end;
$$;

revoke all on function public.hermes_upsert_pipeline_cas(text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.hermes_upsert_pipeline_cas(text, integer, jsonb) to service_role;

-- Validation after application:
-- select count(*) from information_schema.tables where table_schema='public'
--   and table_name in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks'); -- 3
-- select tablename, rowsecurity from pg_tables where schemaname='public'
--   and tablename in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks'); -- all true
-- select routine_name from information_schema.routines where routine_schema='public'
--   and routine_name='hermes_upsert_pipeline_cas'; -- one row
-- select count(*) from pg_policies where schemaname='public'
--   and tablename in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks'); -- 0

-- ROLLBACK (explicit authorization required; destroys data):
-- BEGIN;
--   drop function if exists public.hermes_upsert_pipeline_cas(text, integer, jsonb);
--   drop trigger if exists hermes_enrichment_tasks_updated_at on public.hermes_enrichment_tasks;
--   drop trigger if exists hermes_pipeline_updated_at on public.hermes_pipeline;
--   drop function if exists public.hermes_set_updated_at() cascade;
--   drop table if exists public.hermes_enrichment_tasks cascade;
--   drop table if exists public.hermes_lead_aliases cascade;
--   drop table if exists public.hermes_pipeline cascade;
-- COMMIT;
