-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 1 lead persistence — MIGRATION PREFLIGHT (READ-ONLY)
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this BEFORE applying supabase/hermes_pipeline_schema.sql. It only SELECTs
-- catalog metadata; it creates/alters/drops nothing and prints no secrets or data.
--
--   psql "$DATABASE_URL" -f supabase/hermes_pipeline_preflight.sql
--
-- Read each section, then read the FINAL DETERMINATION at the bottom. Apply the
-- migration only when the determination is "SAFE TO APPLY (fresh install)" or you
-- have confirmed an explicitly compatible existing schema.
-- ─────────────────────────────────────────────────────────────────────────────

\echo '== 1. Table existence (expect 0 rows for a fresh install, or all 3 compatible) =='
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks')
order by table_name;

\echo '== 2. hermes_pipeline columns / types / nullability / defaults =='
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'hermes_pipeline'
order by ordinal_position;

\echo '== 3. hermes_lead_aliases columns =='
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'hermes_lead_aliases'
order by ordinal_position;

\echo '== 4. hermes_enrichment_tasks columns =='
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'hermes_enrichment_tasks'
order by ordinal_position;

\echo '== 5. Primary keys (expect: hermes_pipeline=lead_id, hermes_lead_aliases=alias_key, hermes_enrichment_tasks=task_id) =='
select tc.table_name, kcu.column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
where tc.table_schema = 'public'
  and tc.constraint_type = 'PRIMARY KEY'
  and tc.table_name in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks')
order by tc.table_name, kcu.ordinal_position;

\echo '== 6. Foreign keys (expect aliases.lead_id -> hermes_pipeline.lead_id, enrichment_tasks.lead_id -> hermes_pipeline.lead_id) =='
select tc.table_name, kcu.column_name, ccu.table_name as references_table, ccu.column_name as references_column, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name and tc.table_schema = rc.constraint_schema
where tc.table_schema = 'public'
  and tc.constraint_type = 'FOREIGN KEY'
  and tc.table_name in ('hermes_lead_aliases','hermes_enrichment_tasks')
order by tc.table_name;

\echo '== 7. Unique constraints (expect global-unique alias_key on hermes_lead_aliases) =='
select tc.table_name, tc.constraint_type, kcu.column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
where tc.table_schema = 'public'
  and tc.constraint_type in ('UNIQUE','PRIMARY KEY')
  and tc.table_name = 'hermes_lead_aliases'
order by kcu.column_name;

\echo '== 8. Check constraints (expect version >= 1 on hermes_pipeline) =='
select tc.table_name, cc.check_clause
from information_schema.check_constraints cc
join information_schema.table_constraints tc
  on cc.constraint_name = tc.constraint_name and cc.constraint_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks')
  and cc.check_clause not ilike '%IS NOT NULL%'
order by tc.table_name;

\echo '== 9. Indexes =='
select tablename, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks')
order by tablename, indexname;

\echo '== 10. RLS state (expect rowsecurity = true on all three) =='
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks')
order by tablename;

\echo '== 11. Policies (expect 0 — service-role only, zero anon/auth policies) =='
select schemaname, tablename, policyname, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('hermes_pipeline','hermes_lead_aliases','hermes_enrichment_tasks')
order by tablename, policyname;

\echo '== 12. Triggers (expect updated_at touch triggers on pipeline + enrichment_tasks) =='
select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('hermes_pipeline','hermes_enrichment_tasks')
order by event_object_table, trigger_name;

\echo '== 13. CAS function existence (expect one: hermes_upsert_pipeline_cas) =='
select routine_name, security_type, data_type as returns
from information_schema.routines
where routine_schema = 'public' and routine_name = 'hermes_upsert_pipeline_cas';

\echo '== 14. CAS function grants (expect EXECUTE granted to service_role only, NOT anon/authenticated/public) =='
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public' and routine_name = 'hermes_upsert_pipeline_cas'
order by grantee;

\echo '== 15. Incompatible prior schema probe =='
-- Flags a pre-existing alias table that still uses a composite (alias_key, lead_id)
-- primary key (the unsafe shape that does NOT enforce global alias ownership).
select 'hermes_lead_aliases' as table_name,
       count(*) filter (where kcu.column_name = 'alias_key') as alias_key_in_pk,
       count(*) as pk_columns,
       case when count(*) > 1 then 'INCOMPATIBLE: composite alias PK — global ownership NOT enforced'
            when count(*) = 0 then 'fresh-or-missing'
            else 'ok: alias_key sole PK' end as verdict
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
where tc.table_schema = 'public' and tc.table_name = 'hermes_lead_aliases'
  and tc.constraint_type = 'PRIMARY KEY';

\echo '== FINAL DETERMINATION =='
-- SAFE TO APPLY (fresh install): section 1 returns 0 rows.
-- COMPATIBLE EXISTING: sections 1-15 all match the expectations noted above
--   (3 tables; alias_key sole PK; FKs present; version>=1 check; RLS on; 0 policies;
--    CAS function present, security definer, EXECUTE to service_role only).
-- DO NOT APPLY: section 15 reports INCOMPATIBLE, or any table exists with a
--   different column/constraint/PK shape than schema.sql declares. Resolve the
--   incompatibility (migrate/rename/drop with authorization) before applying.
