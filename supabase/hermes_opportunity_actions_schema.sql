-- Phase 4 Hermes opportunity progression: durable next-step actions and booking evidence.
-- Additive only. Existing Phase 1/2/3 tables remain authoritative for leads, email, and calls.

create table if not exists public.hermes_opportunity_actions (
  intent_id text primary key,
  idempotency_key text not null unique,
  lead_id text not null,
  lead_version integer not null,
  selected_action text not null,
  lifecycle_state text not null,
  approval_boundary text,
  policy_receipt jsonb not null default '{}'::jsonb,
  source_evidence jsonb not null default '{}'::jsonb,
  raw_intent jsonb not null,
  version integer not null default 1,
  attempts integer not null default 0,
  lease_owner text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hermes_opportunity_actions_lead_idx
  on public.hermes_opportunity_actions (lead_id, updated_at desc);

create index if not exists hermes_opportunity_actions_state_idx
  on public.hermes_opportunity_actions (lifecycle_state, updated_at desc);

alter table public.hermes_opportunity_actions enable row level security;
revoke all on public.hermes_opportunity_actions from anon, authenticated;
grant select, insert, update, delete on public.hermes_opportunity_actions to service_role;

create table if not exists public.hermes_opportunity_booking_evidence (
  booking_id text primary key,
  provider_event_id text not null unique,
  intent_id text not null references public.hermes_opportunity_actions(intent_id),
  lead_id text not null,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz,
  attendee text not null,
  status text not null,
  source_action text,
  raw_evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists hermes_opportunity_booking_lead_idx
  on public.hermes_opportunity_booking_evidence (lead_id, scheduled_start_at desc);

alter table public.hermes_opportunity_booking_evidence enable row level security;
revoke all on public.hermes_opportunity_booking_evidence from anon, authenticated;
grant select, insert, update, delete on public.hermes_opportunity_booking_evidence to service_role;

create or replace function public.hermes_opportunity_upsert_cas(
  p_intent_id text,
  p_idempotency_key text,
  p_expected_version integer,
  p_row jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.hermes_opportunity_actions%rowtype;
  duplicate_id text;
  target_version integer := coalesce((p_row->>'version')::integer, 1);
begin
  select * into current_row
  from public.hermes_opportunity_actions
  where intent_id = p_intent_id
  for update;

  select intent_id into duplicate_id
  from public.hermes_opportunity_actions
  where idempotency_key = p_idempotency_key
    and intent_id <> p_intent_id
  limit 1;

  if duplicate_id is not null then
    return jsonb_build_object('ok', false, 'status', 'duplicate', 'reason', 'duplicate_idempotency_key', 'existing_intent_id', duplicate_id);
  end if;

  if current_row.intent_id is null then
    if p_expected_version <> 0 or target_version <> 1 then
      return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'first_insert_must_be_v1', 'current_version', 0);
    end if;
    insert into public.hermes_opportunity_actions (
      intent_id, idempotency_key, lead_id, lead_version, selected_action, lifecycle_state,
      approval_boundary, policy_receipt, source_evidence, raw_intent, version, attempts,
      lease_owner, lease_expires_at, next_attempt_at, created_at, updated_at
    ) values (
      p_intent_id,
      p_idempotency_key,
      p_row #>> '{lead_ref,lead_id}',
      coalesce((p_row #>> '{lead_ref,version}')::integer, 1),
      p_row->>'selected_action',
      p_row->>'lifecycle_state',
      p_row->>'approval_boundary',
      coalesce(p_row->'policy_receipt', '{}'::jsonb),
      coalesce(p_row->'source_evidence', '{}'::jsonb),
      p_row,
      target_version,
      coalesce((p_row->>'attempts')::integer, 0),
      nullif(p_row->>'lease_owner', ''),
      nullif(p_row->>'lease_expires_at', '')::timestamptz,
      nullif(p_row->>'next_attempt_at', '')::timestamptz,
      coalesce(nullif(p_row->>'created_at', '')::timestamptz, now()),
      coalesce(nullif(p_row->>'updated_at', '')::timestamptz, now())
    );
    return jsonb_build_object('ok', true, 'status', 'inserted', 'version', target_version);
  end if;

  if current_row.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'version_conflict', 'current_version', current_row.version);
  end if;

  update public.hermes_opportunity_actions
  set lifecycle_state = p_row->>'lifecycle_state',
      selected_action = p_row->>'selected_action',
      approval_boundary = p_row->>'approval_boundary',
      policy_receipt = coalesce(p_row->'policy_receipt', '{}'::jsonb),
      source_evidence = coalesce(p_row->'source_evidence', '{}'::jsonb),
      raw_intent = p_row,
      version = target_version,
      attempts = coalesce((p_row->>'attempts')::integer, attempts),
      lease_owner = nullif(p_row->>'lease_owner', ''),
      lease_expires_at = nullif(p_row->>'lease_expires_at', '')::timestamptz,
      next_attempt_at = nullif(p_row->>'next_attempt_at', '')::timestamptz,
      updated_at = coalesce(nullif(p_row->>'updated_at', '')::timestamptz, now())
  where intent_id = p_intent_id;

  return jsonb_build_object('ok', true, 'status', 'updated', 'version', target_version);
end;
$$;
revoke all on function public.hermes_opportunity_upsert_cas(text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.hermes_opportunity_upsert_cas(text, text, integer, jsonb) to service_role;

create or replace function public.hermes_opportunity_claim_cas(
  p_intent_id text,
  p_owner text,
  p_lease_seconds integer,
  p_now timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.hermes_opportunity_actions%rowtype;
  next_raw jsonb;
  next_expires timestamptz := p_now + make_interval(secs => greatest(coalesce(p_lease_seconds, 300), 1));
begin
  select * into current_row
  from public.hermes_opportunity_actions
  where intent_id = p_intent_id
  for update;

  if current_row.intent_id is null then
    return jsonb_build_object('ok', false, 'status', 'missing', 'reason', 'intent_not_found');
  end if;

  if current_row.lease_owner is not null and current_row.lease_expires_at > p_now then
    return jsonb_build_object('ok', false, 'status', 'leased', 'lease_owner', current_row.lease_owner, 'lease_expires_at', current_row.lease_expires_at);
  end if;

  next_raw := current_row.raw_intent
    || jsonb_build_object(
      'lifecycle_state', 'claimed',
      'lease_owner', p_owner,
      'lease_expires_at', next_expires,
      'version', current_row.version + 1,
      'updated_at', p_now
    );

  update public.hermes_opportunity_actions
  set lifecycle_state = 'claimed',
      lease_owner = p_owner,
      lease_expires_at = next_expires,
      version = current_row.version + 1,
      raw_intent = next_raw,
      updated_at = p_now
  where intent_id = p_intent_id;

  return jsonb_build_object('ok', true, 'status', 'claimed', 'intent', next_raw, 'lease_expires_at', next_expires);
end;
$$;
revoke all on function public.hermes_opportunity_claim_cas(text, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.hermes_opportunity_claim_cas(text, text, integer, timestamptz) to service_role;

-- Validation after application:
-- select count(*) from information_schema.tables where table_schema='public'
--   and table_name in ('hermes_opportunity_actions','hermes_opportunity_booking_evidence'); -- 2
-- select tablename, rowsecurity from pg_tables where schemaname='public'
--   and tablename in ('hermes_opportunity_actions','hermes_opportunity_booking_evidence'); -- all true
-- select count(*) from pg_policies where schemaname='public'
--   and tablename in ('hermes_opportunity_actions','hermes_opportunity_booking_evidence'); -- 0

-- ROLLBACK (explicit authorization required; destroys Phase 4 opportunity data):
-- BEGIN;
--   drop function if exists public.hermes_opportunity_claim_cas(text, text, integer, timestamptz);
--   drop function if exists public.hermes_opportunity_upsert_cas(text, text, integer, jsonb);
--   drop table if exists public.hermes_opportunity_booking_evidence cascade;
--   drop table if exists public.hermes_opportunity_actions cascade;
-- COMMIT;
