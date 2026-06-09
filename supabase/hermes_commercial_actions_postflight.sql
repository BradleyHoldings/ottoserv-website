-- Phase 5 commercial rail postflight. READ-ONLY.

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'hermes_commercial_actions',
    'hermes_commercial_payment_evidence'
  )
order by tablename;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'hermes_commercial_actions',
    'hermes_commercial_payment_evidence'
  )
order by tablename, policyname;

select routine_schema, routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'hermes_commercial_upsert_cas',
    'hermes_commercial_paid_onboarding_cas'
  )
order by routine_name;
