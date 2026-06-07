-- =============================================================================
-- Front Office recording storage — POSTFLIGHT validation
-- Run after the schema migration. All results must match expected.
-- =============================================================================

-- 1. Table exists.
SELECT EXISTS (SELECT 1 FROM information_schema.tables
  WHERE table_schema='public' AND table_name='process_scan_recordings') AS table_present;
-- Expected: true

-- 2. Bucket exists and is PRIVATE.
SELECT id, public FROM storage.buckets WHERE id='process-scan-recordings';
-- Expected: public = false

-- 3. RLS enabled on the recordings table.
SELECT rowsecurity FROM pg_tables
WHERE schemaname='public' AND tablename='process_scan_recordings';
-- Expected: true

-- 4. NO anon/authenticated policies on the recordings table (service-role only).
SELECT count(*) AS unsafe_policies FROM pg_policies
WHERE schemaname='public' AND tablename='process_scan_recordings'
  AND ('anon' = ANY (roles) OR 'authenticated' = ANY (roles));
-- Expected: 0

-- 5. Unique idempotency + object indexes present.
SELECT indexname FROM pg_indexes
WHERE schemaname='public' AND tablename='process_scan_recordings'
  AND indexname IN ('process_scan_recordings_idem_uq','process_scan_recordings_object_uq');
-- Expected: both rows present

-- 6. Additive link column present on process_scans.
SELECT EXISTS (SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='process_scans' AND column_name='active_recording_id')
  AS link_column_present;
-- Expected: true

-- 7. updated_at trigger present.
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_schema='public' AND event_object_table='process_scan_recordings';
-- Expected: process_scan_recordings_updated_at

-- 8. No new public object URLs exist (bucket private confirmed in #2) and no
--    process_scans column leaks a recording URL on the public path.
-- (Manual: confirm the public report renders recording_status text only.)
