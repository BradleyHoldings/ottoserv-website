-- Phase 4 opportunity progression preflight.
select
  'hermes_opportunity_actions_absent_or_ready' as check_name,
  to_regclass('public.hermes_opportunity_actions') is null
    or exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'hermes_opportunity_actions'
        and column_name = 'idempotency_key'
    ) as ok;

select
  'hermes_opportunity_booking_evidence_absent_or_ready' as check_name,
  to_regclass('public.hermes_opportunity_booking_evidence') is null
    or exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'hermes_opportunity_booking_evidence'
        and column_name = 'provider_event_id'
    ) as ok;
