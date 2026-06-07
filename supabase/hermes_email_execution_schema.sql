-- Phase 2 controlled email execution rail (additive, reversible, service-role only)
-- Do not apply until the Phase 2 suites and controlled-real gate pass.
--
-- Depends on Phase 1: public.hermes_pipeline(lead_id) must exist (PR #26, merged).
-- Three tables + two RPCs. Database-enforced guarantees:
--   - unique idempotency_key (no duplicate sends)
--   - atomic one-winner claim with lease ownership + expiry
--   - FK to canonical lead (hermes_pipeline)
--   - unique provider message identity (evidence) + provider event identity (replies)
--   - RLS enabled, NO anon/auth policies, service-role-only execution
--
-- IMPORTANT: `create table if not exists` does NOT upgrade an incompatible older
-- table. Run supabase/hermes_email_execution_preflight.sql first. Wrap apply in a
-- transaction (BEGIN; \i schema.sql; COMMIT;).

-- ─── Durable email execution intents ─────────────────────────────────────────
create table if not exists public.hermes_email_executions (
  execution_id      text primary key,
  lead_id           text not null references public.hermes_pipeline(lead_id) on delete cascade,
  lead_version      integer not null default 0,
  correlation_id    text,
  idempotency_key   text not null,
  action_type       text not null default 'outbound_email',
  campaign_id       text,
  sequence_step     integer not null default 0,
  sender            text,
  recipient         text,
  template_ref      text,
  content_hash      text,
  subject           text,
  policy_version    text not null default 'phase2.v1',
  reason            text,
  scheduled_at      timestamptz,
  state             text not null default 'proposed',
  retry_count       integer not null default 0,
  lease_owner       text not null default '',
  lease_expires_at  timestamptz,
  provider_message_id text not null default '',
  provider_thread_id  text not null default '',
  policy_receipt    jsonb,
  provider_evidence jsonb,
  raw_intent        jsonb not null,
  schema_version    text not null default 'phase2.v1',
  version           integer not null default 1 check (version >= 1),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- Unique idempotency key: prevents two durable intents from claiming the same
-- logical send. The DB is the authority on "this exact action already exists".
create unique index if not exists hermes_email_exec_idem_uq on public.hermes_email_executions (idempotency_key);
create index if not exists hermes_email_exec_lead_idx on public.hermes_email_executions (lead_id);
create index if not exists hermes_email_exec_state_idx on public.hermes_email_executions (state);
create index if not exists hermes_email_exec_lease_idx on public.hermes_email_executions (lease_expires_at);
create index if not exists hermes_email_exec_campaign_idx on public.hermes_email_executions (campaign_id);
alter table public.hermes_email_executions enable row level security;
revoke all on public.hermes_email_executions from anon, authenticated;
grant select, insert, update, delete on public.hermes_email_executions to service_role;

-- ─── Provider evidence (one row per real provider message id) ────────────────
create table if not exists public.hermes_email_evidence (
  provider_message_id text primary key,
  execution_id        text not null references public.hermes_email_executions(execution_id) on delete cascade,
  lead_id             text not null,
  idempotency_key     text,
  provider_thread_id  text,
  sender              text,
  recipient           text,
  accepted_status     text not null default 'accepted',
  provider_timestamp  timestamptz,
  error_category      text,
  source              text not null default 'provider',
  recorded_at         timestamptz not null default now()
);
create index if not exists hermes_email_evidence_exec_idx on public.hermes_email_evidence (execution_id);
alter table public.hermes_email_evidence enable row level security;
revoke all on public.hermes_email_evidence from anon, authenticated;
grant select, insert, update, delete on public.hermes_email_evidence to service_role;

-- ─── Replies (deduplicated on provider_event_id) ─────────────────────────────
create table if not exists public.hermes_email_replies (
  provider_event_id   text primary key,
  execution_id        text references public.hermes_email_executions(execution_id) on delete set null,
  lead_id             text,
  in_reply_to_message_id text,
  provider_thread_id  text,
  from_address        text,
  subject             text,
  body_snippet        text,
  classification      text not null default 'ambiguous',
  confidence          text not null default 'low',
  stops_sequence      boolean not null default false,
  requires_review     boolean not null default false,
  provider_timestamp  timestamptz,
  received_at         timestamptz not null default now()
);
create index if not exists hermes_email_replies_exec_idx on public.hermes_email_replies (execution_id);
create index if not exists hermes_email_replies_lead_idx on public.hermes_email_replies (lead_id);
create index if not exists hermes_email_replies_class_idx on public.hermes_email_replies (classification);
alter table public.hermes_email_replies enable row level security;
revoke all on public.hermes_email_replies from anon, authenticated;
grant select, insert, update, delete on public.hermes_email_replies to service_role;

-- ─── updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.hermes_email_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists hermes_email_exec_updated_at on public.hermes_email_executions;
create trigger hermes_email_exec_updated_at before insert or update on public.hermes_email_executions
for each row execute function public.hermes_email_set_updated_at();

-- ─── Atomic intent upsert (CAS on version, unique idempotency enforced) ───────
-- expected_version=0 → first insert; otherwise version must equal expected (idempotent
-- replay) or expected+1 (sequential advance).
create or replace function public.hermes_email_upsert_cas(
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
  v_current public.hermes_email_executions%rowtype;
  v_next public.hermes_email_executions%rowtype;
  v_target integer;
begin
  if p_execution_id is null or btrim(p_execution_id) = '' or p_row is null then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'invalid_input');
  end if;
  v_target := coalesce((p_row->>'version')::integer, 1);
  select * into v_current from public.hermes_email_executions where execution_id = p_execution_id for update;

  if not found then
    if p_expected_version <> 0 or v_target <> 1 then
      return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'first_insert_version_mismatch', 'current_version', 0);
    end if;
    insert into public.hermes_email_executions (
      execution_id, lead_id, lead_version, correlation_id, idempotency_key,
      action_type, campaign_id, sequence_step, sender, recipient, template_ref,
      content_hash, subject, policy_version, reason, scheduled_at, state,
      retry_count, lease_owner, lease_expires_at, provider_message_id,
      provider_thread_id, policy_receipt, provider_evidence, raw_intent,
      schema_version, version, created_at, updated_at
    ) values (
      p_execution_id,
      p_row->>'lead_id',
      coalesce((p_row->>'lead_version')::integer, 0),
      p_row->>'correlation_id',
      p_idempotency_key,
      coalesce(p_row->>'action_type', 'outbound_email'),
      p_row->>'campaign_id',
      coalesce((p_row->>'sequence_step')::integer, 0),
      p_row->>'sender',
      p_row->>'recipient',
      p_row->>'template_ref',
      p_row->>'content_hash',
      p_row->>'subject',
      coalesce(p_row->>'policy_version', 'phase2.v1'),
      p_row->>'reason',
      nullif(p_row->>'scheduled_at', '')::timestamptz,
      coalesce(p_row->>'state', 'proposed'),
      coalesce((p_row->>'retry_count')::integer, 0),
      coalesce(p_row->>'lease_owner', ''),
      nullif(p_row->>'lease_expires_at', '')::timestamptz,
      coalesce(p_row->>'provider_message_id', ''),
      coalesce(p_row->>'provider_thread_id', ''),
      p_row->'policy_receipt',
      p_row->'provider_evidence',
      p_row,
      coalesce(p_row->>'schema_version', 'phase2.v1'),
      v_target,
      coalesce(nullif(p_row->>'created_at', '')::timestamptz, now()),
      coalesce(nullif(p_row->>'updated_at', '')::timestamptz, now())
    );
    return jsonb_build_object('ok', true, 'status', 'inserted', 'version', 1);
  end if;

  -- Idempotent replay of the same version + identical payload.
  if v_current.version = v_target and v_current.raw_intent = p_row then
    return jsonb_build_object('ok', true, 'status', 'idempotent', 'version', v_current.version);
  end if;

  if v_current.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'cas_version_mismatch', 'current_version', v_current.version);
  end if;
  if v_target <> p_expected_version + 1 then
    return jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'non_sequential_version', 'current_version', v_current.version);
  end if;

  update public.hermes_email_executions set
    lead_version = coalesce((p_row->>'lead_version')::integer, lead_version),
    correlation_id = p_row->>'correlation_id',
    action_type = coalesce(p_row->>'action_type', action_type),
    campaign_id = p_row->>'campaign_id',
    sequence_step = coalesce((p_row->>'sequence_step')::integer, sequence_step),
    sender = p_row->>'sender',
    recipient = p_row->>'recipient',
    template_ref = p_row->>'template_ref',
    content_hash = p_row->>'content_hash',
    subject = p_row->>'subject',
    policy_version = coalesce(p_row->>'policy_version', policy_version),
    reason = p_row->>'reason',
    scheduled_at = nullif(p_row->>'scheduled_at', '')::timestamptz,
    state = coalesce(p_row->>'state', state),
    retry_count = coalesce((p_row->>'retry_count')::integer, retry_count),
    lease_owner = coalesce(p_row->>'lease_owner', ''),
    lease_expires_at = nullif(p_row->>'lease_expires_at', '')::timestamptz,
    provider_message_id = coalesce(p_row->>'provider_message_id', ''),
    provider_thread_id = coalesce(p_row->>'provider_thread_id', ''),
    policy_receipt = p_row->'policy_receipt',
    provider_evidence = p_row->'provider_evidence',
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
    -- Duplicate idempotency_key from a concurrent first insert: exactly one wins.
    return jsonb_build_object('ok', false, 'status', 'duplicate', 'reason', 'duplicate_idempotency_key');
end;
$$;
revoke all on function public.hermes_email_upsert_cas(text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.hermes_email_upsert_cas(text, text, integer, jsonb) to service_role;

-- ─── Atomic claim (one-winner lease with expiry) ─────────────────────────────
-- Sets lease_owner + lease_expires_at ONLY if the intent is currently unclaimed
-- (empty lease_owner) OR its existing lease has expired. Exactly one concurrent
-- caller wins; stale workers (expired or non-owner) are rejected.
create or replace function public.hermes_email_claim_cas(
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
  v_current public.hermes_email_executions%rowtype;
  v_expires timestamptz;
begin
  if p_execution_id is null or btrim(coalesce(p_owner,'')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_claim_input');
  end if;
  select * into v_current from public.hermes_email_executions where execution_id = p_execution_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'intent_not_found');
  end if;

  -- Only claimable from approved/scheduled/retry_waiting (or re-claim an expired lease).
  if v_current.state not in ('approved','scheduled','retry_waiting','claimed','executing') then
    return jsonb_build_object('ok', false, 'reason', 'not_claimable_state', 'state', v_current.state);
  end if;

  if btrim(v_current.lease_owner) <> '' and v_current.lease_expires_at is not null and v_current.lease_expires_at > p_now then
    -- A live lease is held by someone. The same owner may refresh; others are rejected.
    if v_current.lease_owner <> p_owner then
      return jsonb_build_object('ok', false, 'reason', 'lease_held_by_other', 'owner', v_current.lease_owner);
    end if;
  end if;

  v_expires := p_now + make_interval(secs => coalesce(p_lease_seconds, 120));
  update public.hermes_email_executions
    set lease_owner = p_owner, lease_expires_at = v_expires, version = version + 1
    where execution_id = p_execution_id;
  return jsonb_build_object('ok', true, 'status', 'claimed', 'owner', p_owner, 'lease_expires_at', v_expires);
end;
$$;
revoke all on function public.hermes_email_claim_cas(text, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.hermes_email_claim_cas(text, text, integer, timestamptz) to service_role;

-- Validation after application:
-- select count(*) from information_schema.tables where table_schema='public'
--   and table_name in ('hermes_email_executions','hermes_email_evidence','hermes_email_replies'); -- 3
-- select tablename, rowsecurity from pg_tables where schemaname='public'
--   and tablename like 'hermes_email_%'; -- all true
-- select count(*) from pg_policies where schemaname='public' and tablename like 'hermes_email_%'; -- 0
-- select indexname from pg_indexes where indexname='hermes_email_exec_idem_uq'; -- present (unique idempotency)

-- ROLLBACK (explicit authorization required; destroys Phase 2 data):
-- BEGIN;
--   drop function if exists public.hermes_email_claim_cas(text, text, integer, timestamptz);
--   drop function if exists public.hermes_email_upsert_cas(text, text, integer, jsonb);
--   drop trigger if exists hermes_email_exec_updated_at on public.hermes_email_executions;
--   drop function if exists public.hermes_email_set_updated_at() cascade;
--   drop table if exists public.hermes_email_replies cascade;
--   drop table if exists public.hermes_email_evidence cascade;
--   drop table if exists public.hermes_email_executions cascade;
-- COMMIT;
