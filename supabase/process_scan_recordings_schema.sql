-- Front Office Leak Check — durable recording storage (additive, reversible)
-- Scope: ONE table + a PRIVATE storage bucket + RLS + one additive column on
-- process_scans. Service-role server access only. No anon/authenticated policies.
-- Does NOT touch emailRail tables or any unrelated legacy object.
--
-- Run supabase/process_scan_recordings_preflight.sql first. Wrap in a transaction.

-- ─── 1. Private storage bucket (NEVER public) ────────────────────────────────
-- public=false makes every object private; access is only via short-lived signed
-- URLs minted server-side with the service role.
insert into storage.buckets (id, name, public)
values ('process-scan-recordings', 'process-scan-recordings', false)
on conflict (id) do update set public = false;  -- enforce private even if it pre-existed

-- ─── 2. Recording metadata table ─────────────────────────────────────────────
create table if not exists public.process_scan_recordings (
  recording_id      text primary key,
  scan_id           text not null references public.process_scans(id) on delete cascade,
  idempotency_key   text not null,
  attempt           integer not null default 0,
  object_path       text not null default '',
  bucket            text not null default 'process-scan-recordings',
  mime_type         text not null default 'video/webm',
  size_bytes        bigint not null default 0,
  checksum_sha256   text not null default '',
  audio_included    boolean not null default false,
  upload_state      text not null default 'not_started',
  recording_status  text not null default 'not_provided',
  retry_count       integer not null default 0,
  verified_at       timestamptz,
  deleted_at        timestamptz,
  fail_reason       text not null default '',
  consent_json      jsonb,
  history_json      jsonb not null default '[]'::jsonb,
  verification_json jsonb not null default '{}'::jsonb,
  schema_version    text not null default 'recstore.v1',
  version           integer not null default 1 check (version >= 1),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- Deterministic idempotency: one object per (scan, content fingerprint).
create unique index if not exists process_scan_recordings_idem_uq
  on public.process_scan_recordings (scan_id, idempotency_key);
create index if not exists process_scan_recordings_scan_idx on public.process_scan_recordings (scan_id);
create index if not exists process_scan_recordings_state_idx on public.process_scan_recordings (upload_state);
create unique index if not exists process_scan_recordings_object_uq
  on public.process_scan_recordings (object_path) where object_path <> '';

alter table public.process_scan_recordings
  add column if not exists verification_json jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'process_scan_recordings_scan_id_fkey'
      and conrelid = 'public.process_scan_recordings'::regclass
  ) then
    alter table public.process_scan_recordings
      add constraint process_scan_recordings_scan_id_fkey
      foreign key (scan_id) references public.process_scans(id) on delete cascade not valid;
    alter table public.process_scan_recordings validate constraint process_scan_recordings_scan_id_fkey;
  end if;
end $$;

alter table public.process_scan_recordings enable row level security;
-- No anon/authenticated policies: only the service role (which bypasses RLS) may
-- read/write. Browsers reach recordings exclusively via signed URLs minted server-side.

-- ─── 3. updated_at trigger ───────────────────────────────────────────────────
create or replace function public.process_scan_recordings_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists process_scan_recordings_updated_at on public.process_scan_recordings;
create trigger process_scan_recordings_updated_at before insert or update on public.process_scan_recordings
for each row execute function public.process_scan_recordings_set_updated_at();

create or replace function public.process_scan_recording_upsert_cas(p_record jsonb, p_expected_version integer)
returns setof public.process_scan_recordings
language plpgsql
set search_path = public
as $$
declare
  v_id text := nullif(p_record->>'recording_id', '');
  v_row public.process_scan_recordings%rowtype;
  v_current_version integer;
begin
  if v_id is null then
    raise exception 'missing_recording_id';
  end if;

  v_row := jsonb_populate_record(null::public.process_scan_recordings, p_record);
  select version into v_current_version
  from public.process_scan_recordings
  where recording_id = v_id
  for update;

  if not found then
    if coalesce(p_expected_version, 0) <> 0 then
      raise sqlstate 'PT409' using message = 'version_conflict';
    end if;
    return query
      insert into public.process_scan_recordings (
        recording_id, scan_id, idempotency_key, attempt, object_path, bucket,
        mime_type, size_bytes, checksum_sha256, audio_included, upload_state,
        recording_status, retry_count, verified_at, deleted_at, fail_reason,
        consent_json, history_json, verification_json, schema_version, version,
        created_at, updated_at
      )
      values (
        v_row.recording_id, v_row.scan_id, v_row.idempotency_key, coalesce(v_row.attempt, 0),
        coalesce(v_row.object_path, ''), coalesce(v_row.bucket, 'process-scan-recordings'),
        coalesce(v_row.mime_type, 'video/webm'), coalesce(v_row.size_bytes, 0),
        coalesce(v_row.checksum_sha256, ''), coalesce(v_row.audio_included, false),
        coalesce(v_row.upload_state, 'not_started'), coalesce(v_row.recording_status, 'not_provided'),
        coalesce(v_row.retry_count, 0), v_row.verified_at, v_row.deleted_at,
        coalesce(v_row.fail_reason, ''), v_row.consent_json,
        coalesce(v_row.history_json, '[]'::jsonb), coalesce(v_row.verification_json, '{}'::jsonb),
        coalesce(v_row.schema_version, 'recstore.v1'), coalesce(v_row.version, 1),
        coalesce(v_row.created_at, now()), coalesce(v_row.updated_at, now())
      )
      returning *;
    return;
  end if;

  if v_current_version <> coalesce(p_expected_version, -1) then
    raise sqlstate 'PT409' using message = 'version_conflict';
  end if;

  return query
    update public.process_scan_recordings as target
    set
      scan_id = v_row.scan_id,
      idempotency_key = v_row.idempotency_key,
      attempt = coalesce(v_row.attempt, target.attempt),
      object_path = coalesce(v_row.object_path, target.object_path),
      bucket = coalesce(v_row.bucket, target.bucket),
      mime_type = coalesce(v_row.mime_type, target.mime_type),
      size_bytes = coalesce(v_row.size_bytes, target.size_bytes),
      checksum_sha256 = coalesce(v_row.checksum_sha256, target.checksum_sha256),
      audio_included = coalesce(v_row.audio_included, target.audio_included),
      upload_state = coalesce(v_row.upload_state, target.upload_state),
      recording_status = coalesce(v_row.recording_status, target.recording_status),
      retry_count = coalesce(v_row.retry_count, target.retry_count),
      verified_at = v_row.verified_at,
      deleted_at = v_row.deleted_at,
      fail_reason = coalesce(v_row.fail_reason, target.fail_reason),
      consent_json = v_row.consent_json,
      history_json = coalesce(v_row.history_json, target.history_json),
      verification_json = coalesce(v_row.verification_json, target.verification_json),
      schema_version = coalesce(v_row.schema_version, target.schema_version),
      version = v_row.version,
      created_at = coalesce(v_row.created_at, target.created_at),
      updated_at = coalesce(v_row.updated_at, now())
    where target.recording_id = v_id
    returning *;
end $$;

-- ─── 4. Additive link column on process_scans (canonical reference) ──────────
-- Points at the latest verified recording for quick admin lookup. Additive only.
alter table if exists public.process_scans
  add column if not exists active_recording_id text;

update public.process_scans ps
set active_recording_id = null
where active_recording_id is not null
  and not exists (
    select 1 from public.process_scan_recordings r
    where r.recording_id = ps.active_recording_id
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'process_scans_active_recording_id_fkey'
      and conrelid = 'public.process_scans'::regclass
  ) then
    alter table public.process_scans
      add constraint process_scans_active_recording_id_fkey
      foreign key (active_recording_id)
      references public.process_scan_recordings(recording_id)
      on delete set null
      not valid;
    alter table public.process_scans validate constraint process_scans_active_recording_id_fkey;
  end if;
end $$;

revoke all on public.process_scan_recordings from anon, authenticated;
grant select, insert, update, delete on public.process_scan_recordings to service_role;
revoke all on function public.process_scan_recording_upsert_cas(jsonb, integer) from anon, authenticated;
grant execute on function public.process_scan_recording_upsert_cas(jsonb, integer) to service_role;

-- ─── 5. Storage RLS: deny anon/authenticated; service-role only ──────────────
-- storage.objects has RLS enabled by Supabase. We add NO permissive anon/auth
-- policy for this bucket, so only the service role can touch these objects.
-- (If a prior permissive policy exists globally, it is a legacy concern out of
-- this migration's scope and flagged by the preflight — not modified here.)

-- Validation: see process_scan_recordings_postflight.sql

-- ROLLBACK (explicit authorization required; destroys recording metadata; objects
-- in the bucket should be deleted separately if retention requires):
-- BEGIN;
--   drop trigger if exists process_scan_recordings_updated_at on public.process_scan_recordings;
--   drop function if exists public.process_scan_recording_upsert_cas(jsonb, integer);
--   drop function if exists public.process_scan_recordings_set_updated_at() cascade;
--   alter table if exists public.process_scans drop constraint if exists process_scans_active_recording_id_fkey;
--   alter table if exists public.process_scans drop column if exists active_recording_id;
--   drop table if exists public.process_scan_recordings cascade;
--   -- Optionally remove the bucket (only if empty / authorized):
--   -- delete from storage.buckets where id = 'process-scan-recordings';
-- COMMIT;
