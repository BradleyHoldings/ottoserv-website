-- =============================================================================
-- Phase 1 Lead Rail — Full Migration Package
-- Prepared: 2026-06-07
--
-- STATUS: CONDITIONALLY SAFE — pending Step 1 live dependency audit.
-- The live dependency audit has NOT been run against the production database in
-- this environment (Supabase credentials were not available here). Nothing in
-- this file asserts that the audit passed. Step 1 MUST be run against the live
-- database and its DETERMINATION checklist satisfied before Step 2 is executed.
--
-- Run sections in ORDER. Each section is labelled. Do NOT run all at once;
-- read the DETERMINATION from Step 1 before proceeding.
--
-- Section map:
--   A = STEP 1   Read-only live dependency audit
--   B = STEP 2   Transactional rename-and-migration SQL
--   C = STEP 3   Post-migration validation SQL
--   D = STEP 4   Optional CAS smoke test
--   E = ROLLBACK Rollback SQL
-- =============================================================================


-- =============================================================================
-- STEP 1: READ-ONLY DEPENDENCY AUDIT
-- Run this block first (read-only; safe to run at any time).
-- Read every result before continuing.
-- =============================================================================

-- 1a. Confirm current table existence and shapes
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('hermes_pipeline', 'hermes_lead_aliases', 'hermes_enrichment_tasks')
ORDER BY table_name;

-- 1b. Columns in the existing hermes_pipeline (to confirm incompatible schema)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hermes_pipeline'
ORDER BY ordinal_position;

-- 1c. Primary key on hermes_pipeline
SELECT kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'hermes_pipeline'
  AND tc.constraint_type = 'PRIMARY KEY';
-- Expected after migration: lead_id
-- If this returns 'id', the old incompatible schema is still present.

-- 1d. RLS status on all three tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('hermes_pipeline', 'hermes_lead_aliases', 'hermes_enrichment_tasks');

-- 1e. Any views that depend on hermes_pipeline
SELECT v.table_name AS view_name, v.view_definition
FROM information_schema.views v
WHERE v.table_schema = 'public'
  AND v.view_definition ILIKE '%hermes_pipeline%';
-- Expected: 0 rows (safe to rename if 0)

-- 1f. Any materialized views referencing hermes_pipeline
SELECT schemaname, matviewname, definition
FROM pg_matviews
WHERE schemaname = 'public'
  AND definition ILIKE '%hermes_pipeline%';
-- Expected: 0 rows

-- 1g. Foreign keys FROM other tables INTO hermes_pipeline
SELECT
  tc.table_name AS child_table,
  kcu.column_name AS child_column,
  ccu.table_name AS parent_table,
  ccu.column_name AS parent_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'hermes_pipeline';
-- Expected: 0 rows on old schema (hermes_lead_aliases and hermes_enrichment_tasks
-- don't exist yet, so no FKs point into the old table).
-- If any rows appear, those child tables must be handled before rename.

-- 1h. Triggers on hermes_pipeline
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'hermes_pipeline';
-- Expected: 0 rows on old schema (no triggers yet)

-- 1i. Functions/procedures that reference hermes_pipeline by name in their body.
-- IMPORTANT: only ordinary functions ('f') and procedures ('p') are inspected.
-- Aggregate ('a') and window ('w') functions have no SQL body and calling
-- pg_get_functiondef on them raises "is an aggregate function" — so they are
-- excluded via prokind. This avoids the prior PostgreSQL error.
SELECT n.nspname AS schema_name, p.proname AS function_name,
       CASE p.prokind WHEN 'f' THEN 'function' WHEN 'p' THEN 'procedure' END AS kind
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind IN ('f', 'p')
  AND pg_get_functiondef(p.oid) ILIKE '%hermes_pipeline%';
-- Expected: 0 rows before migration (hermes_upsert_pipeline_cas not yet created).
-- After migration this should return hermes_upsert_pipeline_cas + hermes_set_updated_at.

-- 1i-alt. Catalog-based dependency check (no function-body parsing at all).
-- Lists every object that has a recorded dependency on the hermes_pipeline table
-- or any of its columns, via pg_depend — covers views, rules, triggers,
-- constraints, default expressions, and routine references.
SELECT DISTINCT
  dep.deptype,
  rewrite_cl.relname  AS dependent_via_rule_on,
  ref_cl.relname      AS referenced_table
FROM pg_depend dep
JOIN pg_class ref_cl ON ref_cl.oid = dep.refobjid
LEFT JOIN pg_rewrite rw ON rw.oid = dep.objid
LEFT JOIN pg_class rewrite_cl ON rewrite_cl.oid = rw.ev_class
WHERE ref_cl.relname = 'hermes_pipeline'
  AND ref_cl.relnamespace = 'public'::regnamespace
  AND dep.deptype <> 'i';  -- exclude internal (own index/constraint) dependencies
-- Expected: 0 external dependents on the old table.

-- 1j. Policies on hermes_pipeline (expect 0 even after rename)
SELECT policyname, tablename, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('hermes_pipeline', 'hermes_lead_aliases', 'hermes_enrichment_tasks');
-- Expected: 0 rows always (service-role-only, no policies defined)

-- 1k. Row count + synthetic row in old table
SELECT count(*) AS total_rows FROM public.hermes_pipeline;
SELECT lead_id, company, status, created_at
FROM public.hermes_pipeline
LIMIT 5;
-- Expected: 1 row, lead_id='supabase_live_pipeline_sync_001', company='Supabase Live Pipeline Sync Co'
-- This row is preserved in the renamed legacy table.

-- 1l. Indexes on old hermes_pipeline
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'hermes_pipeline';

-- =============================================================================
-- DETERMINATION (evaluate after reading all results above):
--
-- SAFE TO PROCEED if ALL of the following are true:
--   [ ] 1e: 0 views reference hermes_pipeline
--   [ ] 1f: 0 materialized views reference hermes_pipeline
--   [ ] 1g: 0 foreign keys point INTO hermes_pipeline from other tables
--   [ ] 1h: 0 triggers on hermes_pipeline (or only the updated_at trigger)
--   [ ] 1i: 0 functions reference hermes_pipeline (or only hermes_upsert_pipeline_cas)
--   [ ] 1j: 0 policies
--   [ ] 1k: exactly 1 synthetic row (not production data)
--
-- If any check fails, STOP and consult Jonathan before proceeding.
-- =============================================================================


-- =============================================================================
-- STEP 2: TRANSACTIONAL MIGRATION
-- Execute ONLY after Step 1 DETERMINATION is SAFE TO PROCEED.
-- Paste this entire block into the SQL Editor and run it as one transaction.
-- If any statement fails the entire block rolls back automatically.
-- =============================================================================

BEGIN;

  -- 2a. Rename incompatible old table to dated legacy name (preserves all data)
  ALTER TABLE public.hermes_pipeline
    RENAME TO hermes_pipeline_legacy_20260607;

  -- 2b. Rename any indexes that came with the old table so they don't collide
  --     (Postgres auto-renames the PK constraint on table rename but index names
  --      stay as-is; rename defensively.)
  DO $$
  DECLARE
    idx record;
  BEGIN
    FOR idx IN
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'hermes_pipeline_legacy_20260607'
        AND indexname NOT LIKE '%legacy%'
    LOOP
      EXECUTE format(
        'ALTER INDEX public.%I RENAME TO %I',
        idx.indexname,
        replace(idx.indexname, 'hermes_pipeline', 'hermes_pipeline_legacy_20260607')
      );
    END LOOP;
  END;
  $$;

  -- 2c. Create canonical Phase 1 hermes_pipeline (lead_id PRIMARY KEY)
  CREATE TABLE public.hermes_pipeline (
    lead_id             text primary key,
    company_name        text,
    contact_name        text,
    normalized_phone    text,
    email               text,
    website             text,
    industry            text,
    city                text,
    state               text,
    timezone            text,
    source_url          text,
    source_type         text,
    source_evidence     text,
    discovered_at       timestamptz,
    imported_at         timestamptz,
    last_validated_at   timestamptz,
    contact_validation  jsonb,
    fit_validation      jsonb,
    score               integer      not null default 0,
    tier                text,
    score_reasons       jsonb,
    pipeline_stage      text,
    eligibility         text,
    next_action         text,
    enrichment_status   text,
    record_status       text,
    quarantine_reasons  jsonb,
    schema_version      text         not null default 'phase1.v1',
    version             integer      not null default 1 check (version >= 1),
    raw_payload         jsonb        not null,
    created_at          timestamptz  not null default now(),
    updated_at          timestamptz  not null default now()
  );

  CREATE INDEX hermes_pipeline_record_status_idx   ON public.hermes_pipeline (record_status);
  CREATE INDEX hermes_pipeline_eligibility_idx      ON public.hermes_pipeline (eligibility);
  CREATE INDEX hermes_pipeline_phone_idx            ON public.hermes_pipeline (normalized_phone);
  CREATE INDEX hermes_pipeline_email_idx            ON public.hermes_pipeline (email);
  CREATE INDEX hermes_pipeline_tier_idx             ON public.hermes_pipeline (tier);
  CREATE INDEX hermes_pipeline_pipeline_stage_idx   ON public.hermes_pipeline (pipeline_stage);
  CREATE INDEX hermes_pipeline_created_at_idx       ON public.hermes_pipeline (created_at);
  CREATE INDEX hermes_pipeline_version_idx          ON public.hermes_pipeline (version);

  ALTER TABLE public.hermes_pipeline ENABLE ROW LEVEL SECURITY;

  -- 2d. Global alias ownership table
  --     alias_key is the SOLE PRIMARY KEY — one alias → exactly one lead, enforced at DB
  CREATE TABLE public.hermes_lead_aliases (
    alias_key   text        primary key,
    lead_id     text        not null references public.hermes_pipeline(lead_id) on delete cascade,
    created_at  timestamptz not null default now()
  );
  CREATE INDEX hermes_lead_aliases_lead_idx ON public.hermes_lead_aliases (lead_id);
  ALTER TABLE public.hermes_lead_aliases ENABLE ROW LEVEL SECURITY;

  -- 2e. Durable enrichment task table
  CREATE TABLE public.hermes_enrichment_tasks (
    task_id        text        primary key,
    lead_id        text        not null references public.hermes_pipeline(lead_id) on delete cascade,
    task_type      text        not null default 'enrich_lead_contact',
    actor          text        not null default 'Cowork',
    status         text        not null default 'queued',
    attempt        integer     not null default 0,
    payload        jsonb       not null,
    result         jsonb,
    blocked_reason text,
    created_at     timestamptz not null default now(),
    queued_at      timestamptz,
    updated_at     timestamptz not null default now(),
    completed_at   timestamptz
  );
  CREATE INDEX hermes_enrichment_tasks_lead_idx   ON public.hermes_enrichment_tasks (lead_id);
  CREATE INDEX hermes_enrichment_tasks_status_idx ON public.hermes_enrichment_tasks (status);
  CREATE INDEX hermes_enrichment_tasks_actor_idx  ON public.hermes_enrichment_tasks (actor);
  ALTER TABLE public.hermes_enrichment_tasks ENABLE ROW LEVEL SECURITY;

  -- 2f. updated_at trigger function
  CREATE OR REPLACE FUNCTION public.hermes_set_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    new.updated_at = now();
    RETURN new;
  END;
  $$;

  DROP TRIGGER IF EXISTS hermes_pipeline_updated_at ON public.hermes_pipeline;
  CREATE TRIGGER hermes_pipeline_updated_at
    BEFORE INSERT OR UPDATE ON public.hermes_pipeline
    FOR EACH ROW EXECUTE FUNCTION public.hermes_set_updated_at();

  DROP TRIGGER IF EXISTS hermes_enrichment_tasks_updated_at ON public.hermes_enrichment_tasks;
  CREATE TRIGGER hermes_enrichment_tasks_updated_at
    BEFORE INSERT OR UPDATE ON public.hermes_enrichment_tasks
    FOR EACH ROW EXECUTE FUNCTION public.hermes_set_updated_at();

  -- 2g. Atomic compare-and-swap RPC (service-role only)
  CREATE OR REPLACE FUNCTION public.hermes_upsert_pipeline_cas(
    p_lead_id          text,
    p_expected_version integer,
    p_row              jsonb
  ) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_current public.hermes_pipeline%rowtype;
    v_next    public.hermes_pipeline%rowtype;
    v_target  integer;
  BEGIN
    IF p_lead_id IS NULL OR btrim(p_lead_id) = '' OR p_row IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'invalid_cas_input');
    END IF;

    v_target := coalesce((p_row->>'version')::integer, 1);
    SELECT * INTO v_current FROM public.hermes_pipeline WHERE lead_id = p_lead_id FOR UPDATE;

    IF NOT FOUND THEN
      IF p_expected_version <> 0 OR v_target <> 1 THEN
        RETURN jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'first_insert_version_mismatch', 'current_version', 0);
      END IF;
      v_next := jsonb_populate_record(null::public.hermes_pipeline, p_row);
      IF v_next.lead_id IS DISTINCT FROM p_lead_id THEN
        RETURN jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'lead_id_mismatch');
      END IF;
      v_next.created_at := coalesce(v_next.created_at, now());
      INSERT INTO public.hermes_pipeline SELECT v_next.*;
      RETURN jsonb_build_object('ok', true, 'status', 'inserted', 'version', 1);
    END IF;

    IF v_current.version <> p_expected_version THEN
      IF v_current.version = v_target AND v_current.raw_payload = p_row->'raw_payload' THEN
        RETURN jsonb_build_object('ok', true, 'status', 'idempotent', 'version', v_current.version);
      END IF;
      RETURN jsonb_build_object(
        'ok', false,
        'status', CASE WHEN v_current.version > v_target THEN 'stale' ELSE 'conflict' END,
        'reason', 'compare_and_swap_failed',
        'current_version', v_current.version
      );
    END IF;

    IF v_target <> p_expected_version + 1 THEN
      RETURN jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'non_sequential_version', 'current_version', v_current.version);
    END IF;

    v_next := jsonb_populate_record(v_current, p_row);
    IF v_next.lead_id IS DISTINCT FROM p_lead_id THEN
      RETURN jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'lead_id_mismatch');
    END IF;

    UPDATE public.hermes_pipeline SET
      company_name       = v_next.company_name,
      contact_name       = v_next.contact_name,
      normalized_phone   = v_next.normalized_phone,
      email              = v_next.email,
      website            = v_next.website,
      industry           = v_next.industry,
      city               = v_next.city,
      state              = v_next.state,
      timezone           = v_next.timezone,
      source_url         = v_next.source_url,
      source_type        = v_next.source_type,
      source_evidence    = v_next.source_evidence,
      discovered_at      = v_next.discovered_at,
      imported_at        = v_next.imported_at,
      last_validated_at  = v_next.last_validated_at,
      contact_validation = v_next.contact_validation,
      fit_validation     = v_next.fit_validation,
      score              = v_next.score,
      tier               = v_next.tier,
      score_reasons      = v_next.score_reasons,
      pipeline_stage     = v_next.pipeline_stage,
      eligibility        = v_next.eligibility,
      next_action        = v_next.next_action,
      enrichment_status  = v_next.enrichment_status,
      record_status      = v_next.record_status,
      quarantine_reasons = v_next.quarantine_reasons,
      schema_version     = v_next.schema_version,
      version            = v_next.version,
      raw_payload        = v_next.raw_payload,
      created_at         = v_next.created_at
    WHERE lead_id = p_lead_id AND version = p_expected_version;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'compare_and_swap_failed');
    END IF;
    RETURN jsonb_build_object('ok', true, 'status', 'updated', 'version', v_target);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'status', 'conflict', 'reason', 'insert_unique_violation', 'current_version', 1);
  END;
  $$;

  REVOKE ALL ON FUNCTION public.hermes_upsert_pipeline_cas(text, integer, jsonb)
    FROM public, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.hermes_upsert_pipeline_cas(text, integer, jsonb)
    TO service_role;

COMMIT;


-- =============================================================================
-- STEP 3: VALIDATION QUERIES
-- Run after Step 2 COMMIT succeeds. All results must match expected values.
-- =============================================================================

-- 3a. Three canonical tables exist
SELECT count(*) AS tables_present
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('hermes_pipeline', 'hermes_lead_aliases', 'hermes_enrichment_tasks');
-- Expected: 3

-- 3b. Legacy table preserved with its synthetic row
SELECT count(*) AS legacy_rows FROM public.hermes_pipeline_legacy_20260607;
-- Expected: 1

-- 3c. New hermes_pipeline is empty (no rows; canonical write path not yet exercised)
SELECT count(*) AS new_pipeline_rows FROM public.hermes_pipeline;
-- Expected: 0

-- 3d. Primary key on new hermes_pipeline is lead_id (text)
SELECT kcu.column_name, c.data_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.columns c
  ON c.table_schema = kcu.table_schema AND c.table_name = kcu.table_name AND c.column_name = kcu.column_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'hermes_pipeline'
  AND tc.constraint_type = 'PRIMARY KEY';
-- Expected: column_name=lead_id, data_type=text

-- 3e. hermes_pipeline.version is NOT NULL DEFAULT 1
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hermes_pipeline'
  AND column_name = 'version';
-- Expected: is_nullable=NO, column_default contains '1'

-- 3f. hermes_pipeline.raw_payload is NOT NULL
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hermes_pipeline'
  AND column_name = 'raw_payload';
-- Expected: is_nullable=NO

-- 3g. discovered_at and imported_at are distinct columns
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hermes_pipeline'
  AND column_name IN ('discovered_at', 'imported_at');
-- Expected: 2 rows

-- 3h. RLS enabled on all three canonical tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('hermes_pipeline', 'hermes_lead_aliases', 'hermes_enrichment_tasks');
-- Expected: rowsecurity=true for all three

-- 3i. Zero policies (service-key-only write path)
SELECT count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('hermes_pipeline', 'hermes_lead_aliases', 'hermes_enrichment_tasks');
-- Expected: 0

-- 3j. hermes_lead_aliases alias_key is sole PRIMARY KEY (global alias ownership)
SELECT tc.constraint_type, string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS pk_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'hermes_lead_aliases'
  AND tc.constraint_type = 'PRIMARY KEY'
GROUP BY tc.constraint_type;
-- Expected: constraint_type=PRIMARY KEY, pk_columns=alias_key (not composite)

-- 3k. hermes_lead_aliases FK to hermes_pipeline ON DELETE CASCADE
SELECT
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'hermes_lead_aliases'
  AND tc.constraint_type = 'FOREIGN KEY';
-- Expected: delete_rule=CASCADE

-- 3l. CAS function exists and is SECURITY DEFINER
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'hermes_upsert_pipeline_cas';
-- Expected: security_type=DEFINER

-- 3m. CAS function grants: only service_role has EXECUTE
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND specific_name LIKE 'hermes_upsert_pipeline_cas%';
-- Expected: only service_role with EXECUTE (no public/anon/authenticated)

-- 3n. Triggers on new canonical tables
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('hermes_pipeline', 'hermes_enrichment_tasks');
-- Expected: hermes_pipeline_updated_at on hermes_pipeline,
--           hermes_enrichment_tasks_updated_at on hermes_enrichment_tasks


-- =============================================================================
-- STEP 4 (OPTIONAL): SMOKE TEST THE CAS FUNCTION
-- Insert one synthetic canary row, verify it, then delete it.
-- Safe to run — does not affect the acceptance fixture.
-- =============================================================================

-- 4a. Insert canary at version 1
SELECT public.hermes_upsert_pipeline_cas(
  'lid_v1_canary_migration_test',
  0,
  '{
    "lead_id": "lid_v1_canary_migration_test",
    "company_name": "Canary Migration Test Co",
    "version": 1,
    "schema_version": "phase1.v1",
    "score": 0,
    "raw_payload": {"_canary": true}
  }'::jsonb
);
-- Expected: {"ok":true,"status":"inserted","version":1}

-- 4b. Read it back
SELECT lead_id, company_name, version, schema_version FROM public.hermes_pipeline
WHERE lead_id = 'lid_v1_canary_migration_test';
-- Expected: 1 row, version=1

-- 4c. Idempotent replay (same version, same payload)
SELECT public.hermes_upsert_pipeline_cas(
  'lid_v1_canary_migration_test',
  0,
  '{
    "lead_id": "lid_v1_canary_migration_test",
    "company_name": "Canary Migration Test Co",
    "version": 1,
    "schema_version": "phase1.v1",
    "score": 0,
    "raw_payload": {"_canary": true}
  }'::jsonb
);
-- Expected: {"ok":true,"status":"idempotent","version":1}

-- 4d. Advance to version 2
SELECT public.hermes_upsert_pipeline_cas(
  'lid_v1_canary_migration_test',
  1,
  '{
    "lead_id": "lid_v1_canary_migration_test",
    "company_name": "Canary Migration Test Co (v2)",
    "version": 2,
    "schema_version": "phase1.v1",
    "score": 0,
    "raw_payload": {"_canary": true, "_v": 2}
  }'::jsonb
);
-- Expected: {"ok":true,"status":"updated","version":2}

-- 4e. Stale write attempt (expected_version=1, but current is 2)
SELECT public.hermes_upsert_pipeline_cas(
  'lid_v1_canary_migration_test',
  1,
  '{
    "lead_id": "lid_v1_canary_migration_test",
    "version": 2,
    "schema_version": "phase1.v1",
    "score": 0,
    "raw_payload": {"_canary": true}
  }'::jsonb
);
-- Expected: {"ok":false,"status":"stale","reason":"compare_and_swap_failed","current_version":2}

-- 4f. Clean up canary row
DELETE FROM public.hermes_pipeline WHERE lead_id = 'lid_v1_canary_migration_test';
-- Expected: DELETE 1


-- =============================================================================
-- ROLLBACK (requires explicit authorization from Jonathan)
-- Run this block ONLY if migration must be reversed.
-- This is DESTRUCTIVE: destroys all data in the three canonical tables.
-- Legacy table (hermes_pipeline_legacy_20260607) is NOT touched by rollback.
-- =============================================================================

-- BEGIN;
--   DROP FUNCTION IF EXISTS public.hermes_upsert_pipeline_cas(text, integer, jsonb);
--   DROP TRIGGER IF EXISTS hermes_enrichment_tasks_updated_at ON public.hermes_enrichment_tasks;
--   DROP TRIGGER IF EXISTS hermes_pipeline_updated_at ON public.hermes_pipeline;
--   DROP FUNCTION IF EXISTS public.hermes_set_updated_at() CASCADE;
--   DROP TABLE IF EXISTS public.hermes_enrichment_tasks CASCADE;
--   DROP TABLE IF EXISTS public.hermes_lead_aliases CASCADE;
--   DROP TABLE IF EXISTS public.hermes_pipeline CASCADE;
-- COMMIT;

-- Verify rollback:
-- SELECT count(*) FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks');
-- Expected: 0

-- To also remove the legacy table (requires separate explicit authorization):
-- DROP TABLE IF EXISTS public.hermes_pipeline_legacy_20260607;
