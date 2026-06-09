-- Phase 5 commercial rail preflight. READ-ONLY.
-- Run before applying hermes_commercial_actions_schema.sql.

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'hermes_pipeline',
    'hermes_opportunity_actions',
    'hermes_opportunity_booking_evidence',
    'hermes_commercial_actions',
    'hermes_commercial_payment_evidence'
  )
order by table_name;

select routine_schema, routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'hermes_commercial_upsert_cas',
    'hermes_commercial_paid_onboarding_cas'
  )
order by routine_name;
