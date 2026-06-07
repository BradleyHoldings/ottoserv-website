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
  scan_id           text not null,
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

-- ─── 4. Additive link column on process_scans (canonical reference) ──────────
-- Points at the latest verified recording for quick admin lookup. Additive only.
alter table if exists public.process_scans
  add column if not exists active_recording_id text;

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
--   drop function if exists public.process_scan_recordings_set_updated_at() cascade;
--   alter table if exists public.process_scans drop column if exists active_recording_id;
--   drop table if exists public.process_scan_recordings cascade;
--   -- Optionally remove the bucket (only if empty / authorized):
--   -- delete from storage.buckets where id = 'process-scan-recordings';
-- COMMIT;
