-- =============================================================================
-- Front Office recording storage — READ-ONLY preflight
-- Run before the schema migration. Prints no secrets / no object contents.
-- =============================================================================

-- 0. Canonical dependency: process_scans must exist (the link column targets it).
SELECT EXISTS (SELECT 1 FROM information_schema.tables
  WHERE table_schema='public' AND table_name='process_scans') AS process_scans_present;
-- Expected: true.

-- 1. Does the recordings table already exist? (fresh install expects false)
SELECT EXISTS (SELECT 1 FROM information_schema.tables
  WHERE table_schema='public' AND table_name='process_scan_recordings') AS recordings_table_present;

-- 2. If present, inspect columns for compatibility.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='process_scan_recordings'
ORDER BY ordinal_position;

-- 3. Does the private bucket already exist, and is it private?
SELECT id, name, public FROM storage.buckets WHERE id='process-scan-recordings';
-- Expected: 0 rows (fresh) OR public=false. If public=true, the migration flips it
-- to private — confirm that is intended.

-- 4. Existing permissive storage policies that could expose this bucket (legacy).
-- Informational only — this migration does NOT modify legacy storage policies.
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
  AND ('anon' = ANY (roles) OR 'authenticated' = ANY (roles));
-- Review: none of these should grant access to 'process-scan-recordings'. If one
-- does, treat as a legacy finding (out of this migration's scope) and report it.

-- 5. Will the additive column collide?
SELECT EXISTS (SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='process_scans' AND column_name='active_recording_id')
  AS active_recording_id_already_present;
-- Expected: false (fresh). If true, the additive `add column if not exists` is a no-op.

-- 6. Existing active_recording_id values that would violate the FK.
SELECT count(*) AS active_recording_id_without_recording
FROM public.process_scans ps
WHERE ps.active_recording_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.process_scan_recordings r
    WHERE r.recording_id = ps.active_recording_id
  );
-- Expected: 0. The migration nulls these before adding/validating the FK.

-- 7. Existing CAS RPC, if any.
SELECT proname, pg_get_function_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'process_scan_recording_upsert_cas';

-- =============================================================================
-- DETERMINATION — SAFE TO APPLY when:
--   [ ] 0: process_scans_present = true
--   [ ] 1: recordings_table_present = false (or section 2 confirms compatible shape)
--   [ ] 3: bucket absent or already private
--   [ ] 4: no anon/authenticated policy grants access to this bucket
--   [ ] 6: no FK-blocking active_recording_id values, or nulling them is accepted
-- =============================================================================
