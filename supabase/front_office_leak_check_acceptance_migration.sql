-- Front Office Leak Check acceptance migration.
-- Scope: new report fields on process_scans and pilot-start conversion persistence.
-- Additive and idempotent. Rollback: front_office_leak_check_acceptance_rollback.sql.

alter table public.process_scans
  add column if not exists revenue_risks_json jsonb not null default '[]'::jsonb,
  add column if not exists priority_ranking_json jsonb not null default '[]'::jsonb,
  add column if not exists practical_next_actions_json jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'process_scans_revenue_risks_json_is_array'
      and conrelid = 'public.process_scans'::regclass
  ) then
    alter table public.process_scans
      add constraint process_scans_revenue_risks_json_is_array
      check (jsonb_typeof(revenue_risks_json) = 'array') not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'process_scans_priority_ranking_json_is_array'
      and conrelid = 'public.process_scans'::regclass
  ) then
    alter table public.process_scans
      add constraint process_scans_priority_ranking_json_is_array
      check (jsonb_typeof(priority_ranking_json) = 'array') not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'process_scans_practical_next_actions_json_is_array'
      and conrelid = 'public.process_scans'::regclass
  ) then
    alter table public.process_scans
      add constraint process_scans_practical_next_actions_json_is_array
      check (jsonb_typeof(practical_next_actions_json) = 'array') not valid;
  end if;
end$$;

alter table public.process_scans validate constraint process_scans_revenue_risks_json_is_array;
alter table public.process_scans validate constraint process_scans_priority_ranking_json_is_array;
alter table public.process_scans validate constraint process_scans_practical_next_actions_json_is_array;

create table if not exists public.process_scan_conversion_events (
  id text primary key,
  event_type varchar(80) not null,
  scan_id text null,
  name varchar(255) not null,
  email varchar(255) not null,
  company varchar(255) not null,
  phone varchar(60),
  workflow text not null,
  preferred_start_date varchar(60),
  notes text,
  consent_to_contact boolean not null default false,
  source_page varchar(120) not null default 'front_office_leak_check_start_pilot',
  created_at timestamp with time zone not null default now(),
  constraint process_scan_conversion_events_event_type_check
    check (event_type in ('pilot_start_requested')),
  constraint process_scan_conversion_events_consent_required_check
    check (consent_to_contact is true),
  constraint process_scan_conversion_events_email_shape_check
    check (position('@' in email) > 1 and position('.' in split_part(email, '@', 2)) > 1),
  constraint process_scan_conversion_events_scan_fk
    foreign key (scan_id) references public.process_scans(id) on delete set null
);

create index if not exists idx_process_scan_conversion_events_created_at
  on public.process_scan_conversion_events(created_at desc);

create index if not exists idx_process_scan_conversion_events_scan_id
  on public.process_scan_conversion_events(scan_id)
  where scan_id is not null;

create index if not exists idx_process_scan_conversion_events_email
  on public.process_scan_conversion_events(email);

alter table public.process_scan_conversion_events enable row level security;

revoke all on table public.process_scan_conversion_events from anon, authenticated;
grant select, insert, update, delete on table public.process_scan_conversion_events to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'process_scan_conversion_events'
      and policyname = 'Service role can manage process scan conversion events'
  ) then
    create policy "Service role can manage process scan conversion events"
      on public.process_scan_conversion_events
      for all
      to service_role
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;
