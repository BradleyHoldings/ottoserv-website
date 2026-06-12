import {
  isApprovedSendWindow,
  nextEligibleSendTime,
  prepareControlledEmailExecution,
} from "./leadSupplyEmailExecutionGate.mjs";
import {
  completeRevenueExecutionAction,
  updateRevenueExecutionActionStatus,
} from "./leadSupplyExecutionPersistence.mjs";
import { runEmailAction } from "./emailRail/pipeline.mjs";

export const CONTROLLED_EMAIL_EXECUTION_ACCEPTANCE_VERSION = "phase9b_controlled_email_execution_acceptance_v1";

const DEFAULT_DAILY_CAP = 3;
const DEFAULT_INITIAL_CAP = 1;

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function contentEvidenceRef(intent = {}) {
  return clean(intent.template_ref) || clean(intent.content_hash);
}

function offerKey(item = {}) {
  return clean(item.offer_match?.service_key || item.raw_action?.offer?.service_key || item.raw_action?.email?.intent?.campaign_id || "email_offer");
}

function recipientOfferKey(item = {}) {
  const intent = item.raw_action?.email?.intent || {};
  return `${lower(intent.recipient)}|${offerKey(item)}`;
}

function existingSentRecipientOfferKeys(queue = {}) {
  const out = new Set();
  for (const item of asArray(queue.items)) {
    if (!["completed_with_evidence", "executed"].includes(clean(item.status))) continue;
    const key = recipientOfferKey(item);
    if (!key.startsWith("|")) out.add(key);
  }
  return out;
}

function priorSuccessfulIdempotencyKeys(queue = {}, extra = []) {
  const out = new Set(asArray(extra).map(clean).filter(Boolean));
  for (const item of asArray(queue.items)) {
    if (!["completed_with_evidence", "executed"].includes(clean(item.status))) continue;
    const key = clean(item.raw_action?.email?.intent?.idempotency_key);
    if (key) out.add(key);
  }
  return out;
}

function actionById(queue = {}) {
  return new Map(asArray(queue.items).map((item) => [clean(item.action_id), item]));
}

function leadFor(item = {}) {
  const intent = item.raw_action?.email?.intent || {};
  return {
    ...(item.lead || {}),
    lead_id: clean(item.lead_id || intent.lead_id),
    company_name: clean(item.client || item.lead?.company_name),
    website: clean(item.lead?.website),
    email: clean(intent.recipient || item.lead?.email),
    eligibility: clean(item.lead?.eligibility) || "email_eligible",
    record_status: clean(item.lead?.record_status) || "accepted",
    pipeline_stage: clean(item.lead?.pipeline_stage) || "contact_ready",
    version: Number(intent.lead_version || item.lead?.version || 1),
  };
}

function emailActionInput(item = {}) {
  const intent = item.raw_action?.email?.intent || {};
  return {
    lead: leadFor(item),
    action_type: clean(intent.action_type),
    campaign_id: clean(intent.campaign_id),
    sequence_step: Number(intent.sequence_step || 0),
    scheduled_slot: clean(intent.scheduled_slot),
    sender: clean(intent.sender),
    template_ref: clean(intent.template_ref),
    subject: clean(intent.subject),
    body: clean(intent.body),
    content_hash: clean(intent.content_hash),
    policy_version: clean(intent.policy_version),
    reason: clean(intent.reason),
    eligibility_evidence: intent.eligibility_evidence,
    scheduled_at: clean(intent.scheduled_at),
  };
}

function revenueEvidence(result = {}, item = {}, now) {
  const evidence = result.evidence || {};
  const intent = item.raw_action?.email?.intent || {};
  return {
    evidence_type: "controlled_email_sent",
    evidence_reference: clean(evidence.provider_message_id),
    evidence_summary: [
      `Controlled email sent for action ${clean(item.action_id)}`,
      `lead=${clean(item.lead_id)}`,
      `recipient=${clean(evidence.recipient || intent.recipient)}`,
      `sender=${clean(evidence.sender || intent.sender)}`,
      `content=${contentEvidenceRef(intent)}`,
      `provider_message_id=${clean(evidence.provider_message_id)}`,
    ].join("; "),
    submitted_at: clean(evidence.recorded_at) || now,
  };
}

function failureEvidence(reason, item = {}, now) {
  return {
    evidence_type: "email_send_failure",
    evidence_reference: `phase9b-failed:${clean(item.action_id)}`,
    evidence_summary: `Controlled email action ${clean(item.action_id)} failed before completion: ${clean(reason)}.`,
    submitted_at: now,
  };
}

function markAction(store, actionId, patch = {}) {
  const action = store?.tables?.revenue_actions?.get(clean(actionId));
  if (!action) return null;
  const next = { ...action, ...patch };
  store.tables.revenue_actions.set(clean(actionId), next);
  return next;
}

function blockStoreAction(store, item = {}, reason, now) {
  if (!store?.tables?.revenue_actions) return;
  markAction(store, item.action_id, {
    status: reason === "duplicate_email" || reason === "already_completed_or_executed" ? "skipped_duplicate" : "blocked",
    revenue_status: reason === "duplicate_email" || reason === "already_completed_or_executed" ? "skipped_duplicate" : "blocked",
    block_reason: reason,
    updated_at: now,
  });
}

function resultBase(action = {}, item = {}) {
  return {
    action_id: clean(action.action_id),
    lead_id: clean(action.lead_id),
    email_execution_id: clean(action.email_execution_id),
    recipient: clean(item.raw_action?.email?.intent?.recipient),
    sender: clean(item.raw_action?.email?.intent?.sender),
    template_ref: clean(action.template_ref),
    content_hash: clean(item.raw_action?.email?.intent?.content_hash),
    provider_message_id: "",
    evidence_id: "",
  };
}

function emptyReport({ now, mode, dailyCap, initialCap, prep, actions = [] }) {
  return {
    version: CONTROLLED_EMAIL_EXECUTION_ACCEPTANCE_VERSION,
    generated_at: now,
    mode,
    approved_window: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      start_local: "09:00",
      end_local: "16:30",
      time_zone: "America/New_York",
      in_window: isApprovedSendWindow(now),
      next_eligible_send_time: nextEligibleSendTime(now),
    },
    daily_cap: dailyCap,
    initial_cap: initialCap,
    summary: {
      candidates_seen: actions.length,
      attempted: 0,
      sent: 0,
      failed: 0,
      blocked: 0,
      skipped_duplicate: 0,
      held: 0,
      prepared: 0,
      provider_message_ids: [],
      evidence_ids: [],
    },
    actions: [],
    evidence_summary: {
      provider_message_ids: [],
      evidence_ids: [],
      evidence_events_recorded: 0,
      no_completion_without_evidence: true,
    },
    prep_report: prep,
    idempotency: {
      no_resend_on_rerun: true,
      action_ids_sent_once: true,
      recipient_offer_dedupe_enforced: true,
    },
    revenue_updates: [],
    safety: {
      no_live_call_placed: true,
      no_retell_production_activation: true,
      no_stripe_triggered: true,
      no_n8n_triggered: true,
      no_browser_automation: true,
      no_new_email_domain: true,
      no_bulk_sending: true,
      no_completion_without_evidence: true,
    },
    next_operator_action: "wait_until_next_approved_send_window",
  };
}

export async function runControlledEmailExecutionAcceptance(input = {}) {
  const now = clean(input.now) || new Date().toISOString();
  const mode = clean(input.mode || input.executionMode || "no_send");
  const dailyCap = Math.min(Number(input.dailyCap || DEFAULT_DAILY_CAP), DEFAULT_DAILY_CAP);
  const initialCap = Math.min(Number(input.initialCap || DEFAULT_INITIAL_CAP), dailyCap);
  const queue = input.queue || {};
  const store = input.store;
  const prep = prepareControlledEmailExecution(queue, {
    now,
    dailyCap,
    doNotContact: input.doNotContact || input.dnc,
    approvedSenderDomains: input.approvedSenderDomains || ["ottoserv.com"],
  });
  const byId = actionById(queue);
  const report = emptyReport({ now, mode, dailyCap, initialCap, prep, actions: prep.actions });
  const sentRecipientOffers = existingSentRecipientOfferKeys(queue);
  const priorIdemKeys = priorSuccessfulIdempotencyKeys(queue, input.priorSuccessfulIdempotencyKeys);

  if (!isApprovedSendWindow(now)) {
    report.actions = asArray(prep.actions).map((action) => ({
      ...resultBase(action, byId.get(clean(action.action_id)) || {}),
      status: "held_until_send_window",
      reason: "outside_approved_send_window",
      next_eligible_send_time: prep.approved_window.next_eligible_send_time,
    }));
    report.summary.held = report.actions.length;
    return report;
  }

  let sent = 0;
  let attempted = 0;
  let firstClean = false;
  for (const action of asArray(prep.actions)) {
    const item = byId.get(clean(action.action_id)) || {};
    const base = resultBase(action, item);
    const key = recipientOfferKey(item);
    const idemKey = clean(item.raw_action?.email?.intent?.idempotency_key);

    if (action.status === "blocked") {
      const duplicate = ["duplicate_email", "already_completed_or_executed"].includes(clean(action.block_reason));
      blockStoreAction(store, item, clean(action.block_reason), now);
      report.actions.push({ ...base, status: duplicate ? "skipped_duplicate" : "blocked", reason: clean(action.block_reason) });
      continue;
    }
    if (action.status === "held_until_send_window") {
      report.actions.push({ ...base, status: "held_until_send_window", reason: clean(action.held_reason), next_eligible_send_time: clean(action.next_eligible_send_time) });
      continue;
    }
    if (sentRecipientOffers.has(key) || priorIdemKeys.has(idemKey)) {
      blockStoreAction(store, item, "already_completed_or_executed", now);
      report.actions.push({ ...base, status: "skipped_duplicate", reason: "prior_successful_send_exists" });
      continue;
    }
    if (sent >= dailyCap) {
      blockStoreAction(store, item, "daily_cap_reached", now);
      report.actions.push({ ...base, status: "blocked", reason: "daily_cap_reached" });
      continue;
    }
    if (attempted >= initialCap && !firstClean) {
      report.actions.push({ ...base, status: "held", reason: "initial_send_not_clean" });
      continue;
    }
    if (mode !== "live") {
      report.actions.push({ ...base, status: "prepared", reason: "no_send_mode" });
      continue;
    }

    attempted += 1;
    const emailInput = emailActionInput(item);
    const result = await runEmailAction({
      ...emailInput,
      policyCtx: {
        lead: emailInput.lead,
        now,
        dnc: input.doNotContact || input.dnc,
        suppression: input.suppression,
        blacklist: input.blacklist,
        approvedSenders: input.approvedSenders || input.approvedSenderDomains || ["ottoserv.com"],
        approvalPresent: true,
        priorSuccessIdemKeys: priorIdemKeys,
        sentTodayBySender: input.sentTodayBySender,
        sentTodayByCampaign: input.sentTodayByCampaign,
      },
    }, {
      now,
      client: input.emailClient,
      transport: input.transport,
      worker_id: input.workerId || "Hermes-phase9b",
      updateLead: false,
    });

    if (!result.ok) {
      const reason = clean(result.reason || result.step || "send_failed");
      updateRevenueExecutionActionStatus(clean(item.action_id), "failed", {
        store,
        now,
        evidence: failureEvidence(reason, item, now),
      });
      markAction(store, item.action_id, { revenue_status: "failed", failure_reason: reason, updated_at: now });
      report.actions.push({ ...base, status: "failed", reason });
      continue;
    }

    const completed = completeRevenueExecutionAction(clean(item.action_id), revenueEvidence(result, item, now), { store, now });
    if (!completed.ok) {
      updateRevenueExecutionActionStatus(clean(item.action_id), "failed", {
        store,
        now,
        evidence: failureEvidence(completed.reason, item, now),
      });
      report.actions.push({ ...base, status: "failed", reason: clean(completed.reason) });
      continue;
    }

    sent += 1;
    firstClean = true;
    sentRecipientOffers.add(key);
    priorIdemKeys.add(clean(result.intent?.idempotency_key));
    markAction(store, item.action_id, {
      revenue_status: "follow_up_due",
      crm_status: "contacted",
      last_contact_at: now,
      provider_message_id: clean(result.evidence?.provider_message_id),
      provider_thread_id: clean(result.evidence?.provider_thread_id),
      updated_at: now,
    });
    const evidenceId = clean(completed.evidence?.evidence_id);
    const providerMessageId = clean(result.evidence?.provider_message_id);
    report.actions.push({
      ...base,
      status: "sent",
      provider_message_id: providerMessageId,
      evidence_id: evidenceId,
      sent_at: clean(result.evidence?.provider_timestamp) || now,
    });
    report.revenue_updates.push({
      action_id: clean(item.action_id),
      lead_id: clean(item.lead_id),
      crm_status: "contacted",
      revenue_status: "follow_up_due",
      evidence_id: evidenceId,
    });
  }

  const sentActions = report.actions.filter((item) => item.status === "sent");
  const failedActions = report.actions.filter((item) => item.status === "failed");
  const blockedActions = report.actions.filter((item) => item.status === "blocked");
  const skipped = report.actions.filter((item) => item.status === "skipped_duplicate");
  const held = report.actions.filter((item) => item.status === "held_until_send_window" || item.status === "held");
  const prepared = report.actions.filter((item) => item.status === "prepared");
  report.summary = {
    ...report.summary,
    candidates_seen: report.actions.length,
    attempted,
    sent: sentActions.length,
    failed: failedActions.length,
    blocked: blockedActions.length,
    skipped_duplicate: skipped.length,
    held: held.length,
    prepared: prepared.length,
    provider_message_ids: sentActions.map((item) => item.provider_message_id).filter(Boolean),
    evidence_ids: sentActions.map((item) => item.evidence_id).filter(Boolean),
  };
  report.evidence_summary = {
    provider_message_ids: report.summary.provider_message_ids,
    evidence_ids: report.summary.evidence_ids,
    evidence_events_recorded: report.summary.evidence_ids.length,
    failed_evidence_recorded: failedActions.length,
    no_completion_without_evidence: true,
  };
  report.idempotency = {
    no_resend_on_rerun: report.summary.sent === 0 ? true : report.summary.provider_message_ids.length === new Set(report.summary.provider_message_ids).size,
    action_ids_sent_once: sentActions.length === new Set(sentActions.map((item) => item.action_id)).size,
    recipient_offer_dedupe_enforced: true,
    skipped_duplicate: skipped.length,
  };
  report.next_operator_action = report.summary.failed
    ? "review_failed_controlled_email_send"
    : report.summary.sent ? "verify_controlled_email_evidence_and_replies" : report.summary.blocked ? "clear_controlled_email_blocks" : "continue_controlled_email_monitoring";
  return clone(report);
}
