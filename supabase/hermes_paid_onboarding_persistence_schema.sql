-- Phase 5 paid onboarding persistence.
-- Additive: reuse existing canonical Supabase authority where present:
--   client: techops_clients
--   project/deployment: client_deployments
--   initial work order: techops_tickets + techops_ticket_events
--   onboarding state: onboarding_sessions
-- This replaces the Phase 5 onboarding RPC stub with real idempotent writes.

create or replace function public.hermes_commercial_uuid_from_text(p_value text)
returns uuid
language sql
immutable
as $$
  select (
    substr(md5(coalesce(p_value, '')), 1, 8) || '-' ||
    substr(md5(coalesce(p_value, '')), 9, 4) || '-' ||
    substr(md5(coalesce(p_value, '')), 13, 4) || '-' ||
    substr(md5(coalesce(p_value, '')), 17, 4) || '-' ||
    substr(md5(coalesce(p_value, '')), 21, 12)
  )::uuid;
$$;

revoke all on function public.hermes_commercial_uuid_from_text(text) from public, anon, authenticated;
grant execute on function public.hermes_commercial_uuid_from_text(text) to service_role;

create or replace function public.hermes_commercial_paid_onboarding_cas(
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client jsonb := coalesce(p_payload->'client_record', '{}'::jsonb);
  v_project jsonb := coalesce(p_payload->'project', '{}'::jsonb);
  v_work_order jsonb := coalesce(p_payload->'work_order', '{}'::jsonb);
  v_invitation jsonb := coalesce(p_payload->'onboarding_invitation', '{}'::jsonb);
  v_intent_id text := coalesce(nullif(v_client->>'created_from_commercial_intent_id', ''), nullif(v_invitation->>'commercial_intent_id', ''));
  v_source_lead_id text := coalesce(nullif(v_client->>'source_lead_id', ''), v_intent_id);
  v_client_id uuid := public.hermes_commercial_uuid_from_text('phase5:client:' || v_source_lead_id);
  v_company_id uuid := public.hermes_commercial_uuid_from_text('phase5:company:' || v_source_lead_id);
  v_project_id uuid := public.hermes_commercial_uuid_from_text('phase5:project:' || coalesce(nullif(v_project->>'id', ''), v_intent_id));
  v_ticket_id uuid := public.hermes_commercial_uuid_from_text('phase5:work_order:' || coalesce(nullif(v_work_order->>'id', ''), v_intent_id));
  v_event_id uuid := public.hermes_commercial_uuid_from_text('phase5:work_order_event:' || coalesce(nullif(v_work_order->>'id', ''), v_intent_id));
  v_session_id text := coalesce(nullif(v_invitation->>'invitation_id', ''), 'onboard_' || v_intent_id);
  v_ticket_number text := coalesce(nullif(v_work_order->>'id', ''), 'WO-' || upper(substr(replace(v_intent_id, '_', '-'), 1, 24)));
  v_client_existed boolean;
  v_project_existed boolean;
  v_ticket_existed boolean;
  v_session_existed boolean;
begin
  if v_intent_id is null or v_intent_id = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_commercial_intent_id');
  end if;

  select exists(select 1 from public.techops_clients where id = v_client_id) into v_client_existed;
  select exists(select 1 from public.client_deployments where id = v_project_id) into v_project_existed;
  select exists(select 1 from public.techops_tickets where id = v_ticket_id or ticket_number = v_ticket_number) into v_ticket_existed;
  select exists(select 1 from public.onboarding_sessions where id = v_session_id) into v_session_existed;

  insert into public.techops_clients (
    id, company_id, client_name, industry, plan, support_hours,
    escalation_contacts, dispatch_enabled, remote_support_enabled, billing_model,
    created_at, updated_at
  ) values (
    v_client_id,
    v_company_id,
    coalesce(nullif(v_client->>'company_name', ''), 'Paid OttoServ Client'),
    'controlled_phase5',
    coalesce(nullif(v_project->>'projectType', ''), nullif(v_client->>'plan', ''), 'phase5_paid_onboarding'),
    'business',
    jsonb_build_array(jsonb_build_object(
      'name', nullif(v_client->>'contact_name', ''),
      'email', nullif(v_client->>'email', ''),
      'source', 'phase5_paid_onboarding',
      'commercial_intent_id', v_intent_id
    )),
    true,
    true,
    'paid_onboarding',
    now(),
    now()
  )
  on conflict (id) do update set
    client_name = excluded.client_name,
    plan = excluded.plan,
    escalation_contacts = excluded.escalation_contacts,
    updated_at = now();

  insert into public.client_deployments (
    id, company_id, deployment_model, selector_inputs, selector_reasoning,
    infrastructure_ownership, handoff_status, handoff_package, created_at, updated_at
  ) values (
    v_project_id,
    v_company_id,
    'ottoserv_managed',
    jsonb_build_object(
      'commercial_intent_id', v_intent_id,
      'project_id', v_project->>'id',
      'source_lead_id', v_source_lead_id
    ),
    'Created from verified Phase 5 Stripe test payment evidence.',
    jsonb_build_array('ottoserv'),
    'intake',
    jsonb_build_object(
      'project', v_project,
      'work_order', v_work_order,
      'client_record', v_client,
      'onboarding_invitation', v_invitation,
      'commercial_intent_id', v_intent_id
    ),
    now(),
    now()
  )
  on conflict (id) do update set
    selector_inputs = excluded.selector_inputs,
    handoff_package = excluded.handoff_package,
    updated_at = now();

  insert into public.techops_tickets (
    id, ticket_number, client_id, contact_name, contact_email, source_channel,
    category, issue_summary, description, urgency, priority, risk_level, status,
    agent_handled, human_escalated, dispatch_required, billing_category,
    approval_required, created_at, updated_at
  ) values (
    v_ticket_id,
    v_ticket_number,
    v_client_id,
    nullif(v_client->>'contact_name', ''),
    nullif(v_client->>'email', ''),
    'phase5_commercial',
    'Onboarding',
    coalesce(nullif(v_work_order->>'title', ''), 'Initial delivery work order'),
    coalesce(nullif(v_work_order->>'description', ''), 'Initial delivery work order created after verified payment.'),
    'medium',
    coalesce(nullif(v_work_order->>'priority', ''), 'medium'),
    'low',
    'new',
    false,
    false,
    false,
    'paid_onboarding',
    false,
    now(),
    now()
  )
  on conflict (ticket_number) do update set
    client_id = excluded.client_id,
    contact_name = excluded.contact_name,
    contact_email = excluded.contact_email,
    issue_summary = excluded.issue_summary,
    description = excluded.description,
    priority = excluded.priority,
    updated_at = now()
  returning id into v_ticket_id;

  insert into public.techops_ticket_events (
    id, ticket_id, event_type, actor_type, actor_id, summary, details_json, created_at
  ) values (
    v_event_id,
    v_ticket_id,
    'phase5_paid_onboarding_created',
    'system',
    'hermes_phase5',
    'Initial delivery work order opened from verified Phase 5 payment evidence.',
    jsonb_build_object(
      'commercial_intent_id', v_intent_id,
      'project_id', v_project->>'id',
      'work_order_id', v_work_order->>'id',
      'invitation_status', coalesce(nullif(v_invitation->>'status', ''), 'pending_send')
    ),
    now()
  )
  on conflict (id) do update set
    ticket_id = excluded.ticket_id,
    details_json = excluded.details_json;

  insert into public.onboarding_sessions (
    id, company_id, client_token, client_email, client_name, client_company_name,
    status, current_step, business_profile, submission_method, expires_at,
    created_at, updated_at
  ) values (
    v_session_id,
    v_company_id::text,
    'phase5_' || v_intent_id,
    nullif(v_client->>'email', ''),
    nullif(v_client->>'contact_name', ''),
    coalesce(nullif(v_client->>'company_name', ''), 'Paid OttoServ Client'),
    coalesce(nullif(v_invitation->>'status', ''), 'pending_send'),
    'invitation_pending',
    jsonb_build_object(
      'commercial_intent_id', v_intent_id,
      'client_id', v_client_id,
      'project_uuid', v_project_id,
      'work_order_ticket_id', v_ticket_id,
      'project', v_project,
      'work_order', v_work_order,
      'invitation', v_invitation
    ),
    'phase5_paid_onboarding',
    now() + interval '30 days',
    now(),
    now()
  )
  on conflict (id) do update set
    company_id = excluded.company_id,
    client_email = excluded.client_email,
    client_name = excluded.client_name,
    client_company_name = excluded.client_company_name,
    status = excluded.status,
    current_step = excluded.current_step,
    business_profile = excluded.business_profile,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'status', 'persisted',
    'idempotent', v_client_existed and v_project_existed and v_ticket_existed and v_session_existed,
    'client_record', v_client || jsonb_build_object('canonical_table', 'techops_clients', 'canonical_id', v_client_id),
    'project', v_project || jsonb_build_object('canonical_table', 'client_deployments', 'canonical_id', v_project_id),
    'work_order', v_work_order || jsonb_build_object('canonical_table', 'techops_tickets', 'canonical_id', v_ticket_id, 'ticket_number', v_ticket_number),
    'onboarding_invitation', v_invitation || jsonb_build_object('canonical_table', 'onboarding_sessions', 'canonical_id', v_session_id),
    'canonical_ids', jsonb_build_object(
      'client_id', v_client_id,
      'project_id', v_project_id,
      'work_order_id', v_ticket_id,
      'ticket_event_id', v_event_id,
      'onboarding_session_id', v_session_id
    )
  );
end;
$$;

revoke all on function public.hermes_commercial_paid_onboarding_cas(jsonb) from public, anon, authenticated;
grant execute on function public.hermes_commercial_paid_onboarding_cas(jsonb) to service_role;
