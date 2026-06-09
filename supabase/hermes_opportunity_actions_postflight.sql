-- Phase 4 opportunity progression postflight.
select
  'hermes_opportunity_actions_table' as check_name,
  to_regclass('public.hermes_opportunity_actions') is not null as ok;

select
  'hermes_opportunity_booking_evidence_table' as check_name,
  to_regclass('public.hermes_opportunity_booking_evidence') is not null as ok;

select
  'hermes_opportunity_upsert_rpc' as check_name,
  to_regprocedure('public.hermes_opportunity_upsert_cas(text,text,integer,jsonb)') is not null as ok;

select
  'hermes_opportunity_claim_rpc' as check_name,
  to_regprocedure('public.hermes_opportunity_claim_cas(text,text,integer,timestamp with time zone)') is not null as ok;
