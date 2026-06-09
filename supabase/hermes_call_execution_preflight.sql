-- Phase 3 controlled call rail preflight (READ-ONLY).
-- Run before supabase/hermes_call_execution_schema.sql.
-- Expected before first apply:
--   dependency public.hermes_pipeline exists
--   hermes_call_* tables/functions may be absent
--   no anon/auth policies exist for hermes_call_* tables

select
  'dependency_hermes_pipeline' as check_name,
  count(*) = 1 as ok,
  count(*) as observed
from information_schema.tables
where table_schema = 'public'
  and table_name = 'hermes_pipeline';

select
  'existing_call_tables' as check_name,
  count(*) as observed
from information_schema.tables
where table_schema = 'public'
  and table_name in ('hermes_call_executions', 'hermes_call_evidence');

select
  'existing_call_functions' as check_name,
  count(*) as observed
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('hermes_call_upsert_cas', 'hermes_call_claim_cas');

select
  'existing_call_policies' as check_name,
  count(*) as observed
from pg_policies
where schemaname = 'public'
  and tablename in ('hermes_call_executions', 'hermes_call_evidence');

select
  'service_role_available' as check_name,
  count(*) = 1 as ok,
  count(*) as observed
from pg_roles
where rolname = 'service_role';
