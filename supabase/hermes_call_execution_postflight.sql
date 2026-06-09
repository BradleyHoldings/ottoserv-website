-- Phase 3 controlled call rail postflight (READ-ONLY).
-- Run after supabase/hermes_call_execution_schema.sql.
-- Expected after apply:
--   both tables exist
--   RLS is enabled
--   no anon/auth policies exist
--   unique idempotency and provider evidence indexes exist
--   CAS upsert and atomic claim RPCs exist

select
  'call_tables_present' as check_name,
  count(*) = 2 as ok,
  count(*) as observed
from information_schema.tables
where table_schema = 'public'
  and table_name in ('hermes_call_executions', 'hermes_call_evidence');

select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('hermes_call_executions', 'hermes_call_evidence')
order by tablename;

select
  'no_call_rls_policies' as check_name,
  count(*) = 0 as ok,
  count(*) as observed
from pg_policies
where schemaname = 'public'
  and tablename in ('hermes_call_executions', 'hermes_call_evidence');

select
  indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'hermes_call_exec_idem_uq',
    'hermes_call_evidence_exec_idx',
    'hermes_call_evidence_lead_idx',
    'hermes_call_evidence_outcome_idx'
  )
order by indexname;

select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('hermes_call_upsert_cas', 'hermes_call_claim_cas')
order by p.proname;

select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('hermes_call_executions', 'hermes_call_evidence')
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;
