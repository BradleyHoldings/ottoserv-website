-- Rollback for front_office_leak_check_acceptance_migration.sql.
-- Reverses only the acceptance migration objects.

drop table if exists public.process_scan_conversion_events;

alter table public.process_scans
  drop constraint if exists process_scans_revenue_risks_json_is_array,
  drop constraint if exists process_scans_priority_ranking_json_is_array,
  drop constraint if exists process_scans_practical_next_actions_json_is_array,
  drop column if exists revenue_risks_json,
  drop column if exists priority_ranking_json,
  drop column if exists practical_next_actions_json;
