-- Phase 3 controlled calling rail (additive, reversible, service-role only)
-- Depends on Phase 1 public.hermes_pipeline(lead_id).
-- Guarantees:
--   - durable deterministic call intents
--   - unique idempotency_key, one controlled call per logical action
--   - atomic claim/lease with expiry
--   - provider evidence required before completion
--   - service-role-only RLS, no anon/auth policies

create table if not exists public.hermes_call_executions (
  execution_id       text primary key,
  lead_id            text not null references public.hermes_pipeline(lead_id) on delete cascade,
  lead_version       integer not null default 0,
  correlation_id     text,
  idempotency_key    text not null,
  action_type        text not null default 'outbound_call',
  provider           text not null default 'retell',
  phone              text,
  approved_script_ref text,
  approved_angle     text,
  approval_id        text,
  policy_version     text not null default 'phase3.v1',
  scheduled_at       timestamptz,
  state              text not null default 'proposed',
  retry_count        integer not null default 0,
  lease_owner        text not null default '',
  lease_expires_at   timestamptz,
  provider_call_id   text not null default '',
  provider_status    text not null default '',
  provider_outcome   text not null default '',
  duration_seconds   integer not null default 0,
  recording_url      text,
  transcript_url     text,
  policy_receipt     jsonb,
  provider_evidence  jsonb,
  sanitized_error    text,
  next_action        text,
  raw_intent         jsonb not null,
  schema_version     text not null default 'phase3.v1',
  version            integer not null default 1 check (version >= 1),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index if not exists hermes_call_exec_idem_uq on public.hermes_call_executions (idempotency_key);
create index if not exists hermes_call_exec_lead_idx on public.hermes_call_executions (lead_id);
create index if not exists hermes_call_exec_state_idx on public.hermes_call_executions (state);
create index if not exists hermes_call_exec_lease_idx on public.hermes_call_executions (lease_expires_at);
alter table public.hermes_call_executions enable row level security;
revoke all on public.hermes_call_executions from anon, authenticated;
grant select, insert, update, delete on public.hermes_call_executions to service_role;

create table if not exists public.hermes_call_evidence (
  provider_call_id   text primary key,
  execution_id       text not null references public.hermes_call_executions(execution_id) on delete cascade,
  lead_id            text not null,
  provider           text not null default 'retell',
  provider_status    text,
  outcome            text not null default 'ambiguous',
  outcome_confidence text not null default 'low',
  duration_seconds   integer not null default 0,
  started_at         timestamptz,
  ended_at           timestamptz,
  recording_url      text,
  transcript_url     text,
  transcript_summary text,
  next_action        text,
  sanitized_error    text,
  raw_receipt        jsonb,
  received_at        timestamptz not null default now()
);
create index if not exists hermes_call_evidence_exec_idx on public.hermes_call_evidence (execution_id);
create index if not exists hermes_call_evidence_lead_idx on public.hermes_call_evidence (lead_id);
create index if not exists hermes_call_evidence_outcome_idx on public.hermes_call_evidence (outcome);
alter table public.hermes_call_evidence enable row level security;
revoke all on public.hermes_call_evidence from anon, authenticated;
grant select, insert, update, delete on public.hermes_call_evidence to service_role;

create or replace function public.hermes_call_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists hermes_call_exec_updated_at on public.hermes_call_executions;
create trigger hermes_call_exec_updated_at before insert or update on public.hermes_call_executions
for each row execute function public.hermes_call_set_updated_at();

create or replace function public.hermes_call_upsert_cas(
  p_execution_id text,
  p_idempotency_key text,
  p_expected_version integer,
  p_row jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.hermes_call_executions%rowtype;
  v_target integer;
begin
  if p_execution_id is null or btrim(p_execution_id) = '' or p_row is null then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'invalid_input');
  end if;
  v_target := coalesce((p_row->>'version')::integer, 1);
  select * into v_current from public.hermes_call_executions where execution_id = p_execution_id for update;

  if not found then
    if p_expected_version <> 0 or v_target <> 1 then
      return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'first_insert_version_mismatch', 'current_version', 0);
    end if;
    insert into public.hermes_call_executions (
      execution_id, lead_id, lead_version, correlation_id, idempotency_key,
      action_type, provider, phone, approved_script_ref, approved_angle,
      approval_id, policy_version, scheduled_at, state, retry_count,
      lease_owner, lease_expires_at, provider_call_id, provider_status,
      provider_outcome, duration_seconds, recording_url, transcript_url,
      policy_receipt, provider_evidence, sanitized_error, next_action,
      raw_intent, schema_version, version, created_at, updated_at
    ) values (
      p_execution_id,
      p_row->>'lead_id',
      coalesce((p_row->>'lead_version')::integer, 0),
      p_row->>'correlation_id',
      p_idempotency_key,
      coalesce(p_row->>'action_type', 'outbound_call'),
      coalesce(p_row->>'provider', 'retell'),
      p_row->>'phone',
      p_row->>'approved_script_ref',
      p_row->>'approved_angle',
      p_row->>'approval_id',
      coalesce(p_row->>'policy_version', 'phase3.v1'),
      nullif(p_row->>'scheduled_at', '')::timestamptz,
      coalesce(p_row->>'state', 'proposed'),
      coalesce((p_row->>'retry_count')::integer, 0),
      coalesce(p_row->>'lease_owner', ''),
      nullif(p_row->>'lease_expires_at', '')::timestamptz,
      coalesce(p_row->>'provider_call_id', ''),
      coalesce(p_row->>'provider_status', ''),
      coalesce(p_row->>'provider_outcome', ''),
      coalesce((p_row->>'duration_seconds')::integer, 0),
      p_row->>'recording_url',
      p_row->>'transcript_url',
      p_row->'policy_receipt',
      p_row->'provider_evidence',
      p_row->>'sanitized_error',
      p_row->>'next_action',
      p_row,
      coalesce(p_row->>'schema_version', 'phase3.v1'),
      v_target,
      coalesce(nullif(p_row->>'created_at', '')::timestamptz, now()),
      coalesce(nullif(p_row->>'updated_at', '')::timestamptz, now())
    );
    return jsonb_build_object('ok', true, 'status', 'inserted', 'version', 1);
  end if;

  if v_current.version = v_target and v_current.raw_intent = p_row then
    return jsonb_build_object('ok', true, 'status', 'idempotent', 'version', v_current.version);
  end if;
  if v_current.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'cas_version_mismatch', 'current_version', v_current.version);
  end if;
  if v_target <> p_expected_version + 1 then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'non_sequential_version', 'current_version', v_current.version);
  end if;

  update public.hermes_call_executions set
    lead_version = coalesce((p_row->>'lead_version')::integer, lead_version),
    correlation_id = p_row->>'correlation_id',
    provider = coalesce(p_row->>'provider', provider),
    phone = p_row->>'phone',
    approved_script_ref = p_row->>'approved_script_ref',
    approved_angle = p_row->>'approved_angle',
    approval_id = p_row->>'approval_id',
    policy_version = coalesce(p_row->>'policy_version', policy_version),
    scheduled_at = nullif(p_row->>'scheduled_at', '')::timestamptz,
    state = coalesce(p_row->>'state', state),
    retry_count = coalesce((p_row->>'retry_count')::integer, retry_count),
    lease_owner = coalesce(p_row->>'lease_owner', ''),
    lease_expires_at = nullif(p_row->>'lease_expires_at', '')::timestamptz,
    provider_call_id = coalesce(p_row->>'provider_call_id', ''),
    provider_status = coalesce(p_row->>'provider_status', ''),
    provider_outcome = coalesce(p_row->>'provider_outcome', ''),
    duration_seconds = coalesce((p_row->>'duration_seconds')::integer, 0),
    recording_url = p_row->>'recording_url',
    transcript_url = p_row->>'transcript_url',
    policy_receipt = p_row->'policy_receipt',
    provider_evidence = p_row->'provider_evidence',
    sanitized_error = p_row->>'sanitized_error',
    next_action = p_row->>'next_action',
    raw_intent = p_row,
    schema_version = coalesce(p_row->>'schema_version', schema_version),
    version = v_target
  where execution_id = p_execution_id and version = p_expected_version;
  if not found then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'cas_lost');
  end if;
  return jsonb_build_object('ok', true, 'status', 'updated', 'version', v_target);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'status', 'duplicate', 'reason', 'duplicate_idempotency_key');
end;
$$;
revoke all on function public.hermes_call_upsert_cas(text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.hermes_call_upsert_cas(text, text, integer, jsonb) to service_role;

create or replace function public.hermes_call_claim_cas(
  p_execution_id text,
  p_owner text,
  p_lease_seconds integer,
  p_now timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.hermes_call_executions%rowtype;
  v_expires timestamptz;
begin
  if p_execution_id is null or btrim(coalesce(p_owner,'')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_claim_input');
  end if;
  select * into v_current from public.hermes_call_executions where execution_id = p_execution_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'intent_not_found');
  end if;
  if v_current.state not in ('approved','scheduled','retry_waiting','claimed','executing') then
    return jsonb_build_object('ok', false, 'reason', 'not_claimable_state', 'state', v_current.state);
  end if;
  if btrim(v_current.lease_owner) <> '' and v_current.lease_expires_at is not null and v_current.lease_expires_at > p_now and v_current.lease_owner <> p_owner then
    return jsonb_build_object('ok', false, 'reason', 'lease_held_by_other', 'owner', v_current.lease_owner);
  end if;
  v_expires := p_now + make_interval(secs => coalesce(p_lease_seconds, 120));
  update public.hermes_call_executions
    set lease_owner = p_owner, lease_expires_at = v_expires, version = version + 1
    where execution_id = p_execution_id;
  return jsonb_build_object('ok', true, 'status', 'claimed', 'owner', p_owner, 'lease_expires_at', v_expires);
end;
$$;
revoke all on function public.hermes_call_claim_cas(text, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.hermes_call_claim_cas(text, text, integer, timestamptz) to service_role;

-- Rollback, explicit authorization required:
-- drop function if exists public.hermes_call_claim_cas(text, text, integer, timestamptz);
-- drop function if exists public.hermes_call_upsert_cas(text, text, integer, jsonb);
-- drop trigger if exists hermes_call_exec_updated_at on public.hermes_call_executions;
-- drop function if exists public.hermes_call_set_updated_at() cascade;
-- drop table if exists public.hermes_call_evidence cascade;
-- drop table if exists public.hermes_call_executions cascade;
