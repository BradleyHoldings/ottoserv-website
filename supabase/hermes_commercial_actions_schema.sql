-- Phase 5 Hermes commercial rail: approved offer, Stripe evidence, paid onboarding.
-- Additive only. Existing lead, opportunity, email, project, work-order, client,
-- onboarding, and Stripe systems remain authoritative.

create table if not exists public.hermes_commercial_actions (
  intent_id text primary key,
  idempotency_key text not null unique,
  lead_id text not null,
  lead_version integer not null,
  lifecycle_state text not null,
  selected_offer jsonb not null default '{}'::jsonb,
  booking_evidence jsonb not null default '{}'::jsonb,
  policy_receipt jsonb not null default '{}'::jsonb,
  payment jsonb,
  onboarding jsonb,
  provider_evidence jsonb not null default '[]'::jsonb,
  raw_intent jsonb not null,
  version integer not null default 1,
  lease_owner text,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hermes_commercial_actions_lead_idx
  on public.hermes_commercial_actions (lead_id, updated_at desc);

create index if not exists hermes_commercial_actions_state_idx
  on public.hermes_commercial_actions (lifecycle_state, updated_at desc);

alter table public.hermes_commercial_actions enable row level security;
revoke all on public.hermes_commercial_actions from anon, authenticated;
grant select, insert, update, delete on public.hermes_commercial_actions to service_role;

create table if not exists public.hermes_commercial_payment_evidence (
  evidence_id bigserial primary key,
  intent_id text not null references public.hermes_commercial_actions(intent_id),
  provider text not null default 'stripe',
  provider_event_id text,
  provider_link_id text not null,
  provider_session_id text,
  provider_payment_intent_id text,
  status text not null,
  amount_total integer,
  currency text,
  stripe_product_id text,
  stripe_price_id text,
  customer_id text,
  customer_email text,
  payment_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  verified_paid_at timestamptz,
  unique (intent_id, provider_link_id),
  unique nulls not distinct (provider_event_id),
  unique nulls not distinct (provider_session_id),
  unique nulls not distinct (provider_payment_intent_id)
);

create index if not exists hermes_commercial_payment_intent_idx
  on public.hermes_commercial_payment_evidence (intent_id, created_at desc);

alter table public.hermes_commercial_payment_evidence enable row level security;
revoke all on public.hermes_commercial_payment_evidence from anon, authenticated;
grant select, insert, update, delete on public.hermes_commercial_payment_evidence to service_role;

create or replace function public.hermes_commercial_upsert_cas(
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
  current_row public.hermes_commercial_actions%rowtype;
  duplicate_id text;
  target_version integer := coalesce((p_row->>'version')::integer, 1);
begin
  select * into current_row
  from public.hermes_commercial_actions
  where intent_id = p_intent_id
  for update;

  select intent_id into duplicate_id
  from public.hermes_commercial_actions
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
    insert into public.hermes_commercial_actions (
      intent_id, idempotency_key, lead_id, lead_version, lifecycle_state,
      selected_offer, booking_evidence, policy_receipt, payment, onboarding,
      provider_evidence, raw_intent, version, lease_owner, lease_expires_at,
      created_at, updated_at
    ) values (
      p_intent_id,
      p_idempotency_key,
      p_row #>> '{lead_ref,lead_id}',
      coalesce((p_row #>> '{lead_ref,version}')::integer, 1),
      p_row->>'lifecycle_state',
      coalesce(p_row->'selected_offer', '{}'::jsonb),
      coalesce(p_row->'booking_evidence', '{}'::jsonb),
      coalesce(p_row->'policy_receipt', '{}'::jsonb),
      p_row->'payment',
      p_row->'onboarding',
      coalesce(p_row->'provider_evidence', '[]'::jsonb),
      p_row,
      target_version,
      nullif(p_row->>'lease_owner', ''),
      nullif(p_row->>'lease_expires_at', '')::timestamptz,
      coalesce(nullif(p_row->>'created_at', '')::timestamptz, now()),
      coalesce(nullif(p_row->>'updated_at', '')::timestamptz, now())
    );
    return jsonb_build_object('ok', true, 'status', 'inserted', 'version', target_version);
  end if;

  if current_row.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'version_conflict', 'current_version', current_row.version);
  end if;

  update public.hermes_commercial_actions
  set lifecycle_state = p_row->>'lifecycle_state',
      selected_offer = coalesce(p_row->'selected_offer', '{}'::jsonb),
      booking_evidence = coalesce(p_row->'booking_evidence', '{}'::jsonb),
      policy_receipt = coalesce(p_row->'policy_receipt', '{}'::jsonb),
      payment = p_row->'payment',
      onboarding = p_row->'onboarding',
      provider_evidence = coalesce(p_row->'provider_evidence', '[]'::jsonb),
      raw_intent = p_row,
      version = target_version,
      lease_owner = nullif(p_row->>'lease_owner', ''),
      lease_expires_at = nullif(p_row->>'lease_expires_at', '')::timestamptz,
      updated_at = coalesce(nullif(p_row->>'updated_at', '')::timestamptz, now())
  where intent_id = p_intent_id;

  return jsonb_build_object('ok', true, 'status', 'updated', 'version', target_version);
end;
$$;
revoke all on function public.hermes_commercial_upsert_cas(text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.hermes_commercial_upsert_cas(text, text, integer, jsonb) to service_role;

create or replace function public.hermes_commercial_paid_onboarding_cas(
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'ok', true,
    'status', 'accepted',
    'idempotent', false,
    'client_record', p_payload->'client_record',
    'project', p_payload->'project',
    'work_order', p_payload->'work_order',
    'onboarding_invitation', p_payload->'onboarding_invitation'
  );
end;
$$;
revoke all on function public.hermes_commercial_paid_onboarding_cas(jsonb) from public, anon, authenticated;
grant execute on function public.hermes_commercial_paid_onboarding_cas(jsonb) to service_role;

-- Validation after application:
-- select count(*) from information_schema.tables where table_schema='public'
--   and table_name in ('hermes_commercial_actions','hermes_commercial_payment_evidence');
-- select tablename, rowsecurity from pg_tables where schemaname='public'
--   and tablename in ('hermes_commercial_actions','hermes_commercial_payment_evidence');
-- select count(*) from pg_policies where schemaname='public'
--   and tablename in ('hermes_commercial_actions','hermes_commercial_payment_evidence');

-- ROLLBACK (explicit authorization required; destroys Phase 5 commercial evidence):
-- BEGIN;
--   drop function if exists public.hermes_commercial_paid_onboarding_cas(jsonb);
--   drop function if exists public.hermes_commercial_upsert_cas(text, text, integer, jsonb);
--   drop table if exists public.hermes_commercial_payment_evidence cascade;
--   drop table if exists public.hermes_commercial_actions cascade;
-- COMMIT;
