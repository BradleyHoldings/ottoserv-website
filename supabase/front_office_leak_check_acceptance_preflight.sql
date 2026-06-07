-- Front Office Leak Check acceptance preflight.
-- Read-only: verifies current schema state before applying the additive migration.

select
  'process_scans table exists' as check_name,
  to_regclass('public.process_scans') is not null as passed;

select
  'new process scan report columns currently absent or already additive' as check_name,
  count(*) filter (
    where column_name in (
      'revenue_risks_json',
      'priority_ranking_json',
      'practical_next_actions_json'
    )
  ) as existing_new_column_count
from information_schema.columns
where table_schema = 'public'
  and table_name = 'process_scans';

select
  'pilot conversion table current state' as check_name,
  to_regclass('public.process_scan_conversion_events') as relation_name;

select
  'process scans rls current state' as check_name,
  coalesce(c.relrowsecurity, false) as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'process_scans';
