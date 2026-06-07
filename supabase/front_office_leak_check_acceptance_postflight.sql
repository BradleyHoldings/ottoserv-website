-- Front Office Leak Check acceptance post-migration validation.
-- Read-only: verifies fields, constraints, indexes, RLS, and service-role policy.

select
  'process scan report fields exist' as check_name,
  count(*) = 3 as passed,
  array_agg(column_name order by column_name) as columns_found
from information_schema.columns
where table_schema = 'public'
  and table_name = 'process_scans'
  and column_name in (
    'revenue_risks_json',
    'priority_ranking_json',
    'practical_next_actions_json'
  );

select
  'pilot conversion table exists' as check_name,
  to_regclass('public.process_scan_conversion_events') is not null as passed;

select
  'pilot conversion rls enabled' as check_name,
  coalesce(c.relrowsecurity, false) as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'process_scan_conversion_events';

select
  'pilot conversion service-role policy exists' as check_name,
  count(*) = 1 as passed
from pg_policies
where schemaname = 'public'
  and tablename = 'process_scan_conversion_events'
  and policyname = 'Service role can manage process scan conversion events';

select
  'pilot conversion indexes exist' as check_name,
  count(*) = 3 as passed,
  array_agg(indexname order by indexname) as indexes_found
from pg_indexes
where schemaname = 'public'
  and tablename = 'process_scan_conversion_events'
  and indexname in (
    'idx_process_scan_conversion_events_created_at',
    'idx_process_scan_conversion_events_scan_id',
    'idx_process_scan_conversion_events_email'
  );

select
  'pilot conversion constraints exist' as check_name,
  count(*) >= 4 as passed,
  array_agg(conname order by conname) as constraints_found
from pg_constraint
where conrelid = 'public.process_scan_conversion_events'::regclass
  and conname in (
    'process_scan_conversion_events_event_type_check',
    'process_scan_conversion_events_consent_required_check',
    'process_scan_conversion_events_email_shape_check',
    'process_scan_conversion_events_scan_fk'
  );
