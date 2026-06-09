-- =============================================================================
-- Phase 2 Email Execution Rail — Read-only preflight
-- Run BEFORE applying hermes_email_execution_schema.sql. Prints no secrets / no row
-- data. Read the FINAL DETERMINATION before applying.
-- =============================================================================

-- 0. Phase 1 dependency MUST exist (FK target). This is a hard prerequisite.
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema='public' AND table_name='hermes_pipeline'
) AS phase1_hermes_pipeline_present;
-- Expected: true. If false, STOP — Phase 1 (PR #26) must be applied first.

SELECT kcu.column_name AS phase1_pk
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema='public' AND tc.table_name='hermes_pipeline' AND tc.constraint_type='PRIMARY KEY';
-- Expected: lead_id (the FK target). If 'id', Phase 1 schema is the old incompatible shape.

-- 1. Do the Phase 2 tables already exist? (fresh install expects 0)
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('hermes_email_executions','hermes_email_evidence','hermes_email_replies')
ORDER BY table_name;
-- Expected: 0 rows on a fresh install.

-- 2. If they exist, inspect columns for incompatibility.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('hermes_email_executions','hermes_email_evidence','hermes_email_replies')
ORDER BY table_name, ordinal_position;

-- 3. Existing RPC signatures that would be replaced.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.prokind='f'
  AND p.proname IN ('hermes_email_upsert_cas','hermes_email_claim_cas','hermes_email_set_updated_at');
-- Expected: 0 rows on a fresh install.

-- 4. Name collisions with any existing object on the three table names.
SELECT c.relname, c.relkind
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('hermes_email_executions','hermes_email_evidence','hermes_email_replies');
-- relkind: r=table, v=view, m=matview, i=index. Expected: 0 rows fresh.

-- 5. Catalog dependents on Phase 1 hermes_pipeline (informational — the new FK adds one).
SELECT DISTINCT dep.deptype, ref_cl.relname AS referenced
FROM pg_depend dep
JOIN pg_class ref_cl ON ref_cl.oid = dep.refobjid
WHERE ref_cl.relname='hermes_pipeline'
  AND ref_cl.relnamespace='public'::regnamespace
  AND dep.deptype <> 'i';

-- =============================================================================
-- FINAL DETERMINATION:
-- SAFE TO APPLY (fresh install) if:
--   [ ] 0: phase1_hermes_pipeline_present = true AND phase1_pk = lead_id
--   [ ] 1: 0 Phase 2 tables already exist
--   [ ] 3: 0 Phase 2 RPCs already exist
--   [ ] 4: 0 name collisions
-- If any Phase 2 object already exists, review section 2/3 for compatibility
-- before applying; `create table if not exists` will NOT upgrade an incompatible
-- prior shape. If Phase 1 is absent, STOP and apply Phase 1 first.
-- =============================================================================
