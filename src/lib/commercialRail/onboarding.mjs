import { buildProject } from "../projects.mjs";
import { buildWorkOrder } from "../workOrders.mjs";
import { COMMERCIAL_STATES } from "./intent.mjs";

function clean(v) { return String(v ?? "").trim(); }
function slug(v) { return clean(v).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function leadKey(lead = {}, intent = {}) {
  return clean(lead.lead_id || intent.lead_ref?.lead_id);
}

export function buildPaidClientOnboardingPayload(intent = {}, { lead = {}, now = new Date().toISOString() } = {}) {
  const key = leadKey(lead, intent);
  const suffix = slug(key.replace(/^lead[_-]?/i, "")) || "CLIENT";
  const clientName = clean(lead.company_name || intent.payment?.customer_name || "Paid OttoServ Client");
  const clientId = `client_${key}`;
  const projectId = `PRJ-${suffix}`;
  const workOrderId = `WO-${suffix}`;
  const invitationId = `onboard_${intent.intent_id}`;
  const amount = Number(intent.payment?.amount_total || intent.selected_offer?.amount_total || 0);

  const client_record = {
    client_id: clientId,
    source_lead_id: key,
    company_name: clientName,
    contact_name: clean(lead.contact_name || intent.payment?.customer_name),
    email: clean(lead.email || intent.payment?.customer_email),
    status: "active_onboarding",
    created_from_commercial_intent_id: intent.intent_id,
    stripe_customer_id: clean(intent.payment?.customer_id),
    created_at: now,
    updated_at: now,
  };

  const project = buildProject({
    id: projectId,
    projectName: `${clientName} - ${clean(intent.selected_offer?.name || "OttoServ Onboarding")}`,
    clientName,
    clientId,
    projectType: "Service Call",
    status: "planning",
    stage: "Approved",
    contractValue: amount / 100,
    projectManager: "OttoServ",
    priority: "normal",
    nextMilestone: "Onboarding intake",
    linkedWorkOrders: [workOrderId],
    notes: `Created from verified Stripe payment ${clean(intent.payment?.provider_payment_intent_id)}.`,
  }, { now, sequence: 1 });

  const work_order = buildWorkOrder({
    id: workOrderId,
    title: `Initial delivery work order - ${clean(intent.selected_offer?.name || "OttoServ onboarding")}`,
    client: clientName,
    project: project.id,
    property: clientName,
    description: "Initial delivery work order created after verified payment. Implementation delivery remains outside Phase 5.",
    category: "Other",
    priority: "medium",
    source: "ai_created",
    contactName: client_record.contact_name,
    contactEmail: client_record.email,
    preferredContactMethod: "email",
    approvalRequired: false,
    approvalStatus: "not_required",
  }, { now, actor: "Hermes Phase 5" });

  const onboarding_invitation = {
    invitation_id: invitationId,
    commercial_intent_id: intent.intent_id,
    client_id: clientId,
    project_id: project.id,
    work_order_id: work_order.id,
    recipient: client_record.email,
    provider: "gmail",
    provider_message_id: "",
    status: "pending_send",
    queued_at: now,
    sent_at: "",
    subject: `Welcome to OttoServ: ${clean(intent.selected_offer?.name)}`,
  };

  return { client_record, project, work_order, onboarding_invitation };
}

export async function atomicallyCreatePaidClientOnboarding(intent = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  if (intent.lifecycle_state !== COMMERCIAL_STATES.PAID_VERIFIED || intent.payment?.status !== "paid") {
    return { ok: false, reason: "verified_payment_required", intent };
  }
  const payload = buildPaidClientOnboardingPayload(intent, { lead: options.lead, now });
  const result = await options.client?.atomicPaidClientOnboarding?.(payload);
  if (!result?.ok) return { ok: false, reason: result?.reason || "atomic_onboarding_failed", intent };

  const next = {
    ...intent,
    lifecycle_state: COMMERCIAL_STATES.CLIENT_ONBOARDING_CREATED,
    onboarding: {
      client_id: payload.client_record.client_id,
      project_id: payload.project.id,
      work_order_id: payload.work_order.id,
      invitation_id: payload.onboarding_invitation.invitation_id,
      invitation_status: payload.onboarding_invitation.status,
      invitation_provider: payload.onboarding_invitation.provider,
      invitation_provider_message_id: payload.onboarding_invitation.provider_message_id,
      queued_at: now,
    },
    updated_at: now,
    version: Number(intent.version || 1) + (result.idempotent ? 0 : 1),
  };
  await options.client?.upsertIntent?.(next);

  return { ok: true, idempotent: Boolean(result.idempotent), intent: next, ...payload };
}
