#!/usr/bin/env node

import { createOpportunityIntent } from "../src/lib/opportunityRail/intent.mjs";
import { executeOpportunityIntent, reconcileBookingEvidence } from "../src/lib/opportunityRail/executor.mjs";
import { buildOpportunityDashboard } from "../src/lib/opportunityRail/dashboard.mjs";

const now = process.env.PHASE4_NOW || new Date().toISOString();
const controlledEmail = process.env.PHASE4_CONTROLLED_EMAIL || "jonathan+phase4-controlled@ottoserv.example";
const controlledEventId = process.env.PHASE4_CONTROLLED_EVENT_ID || "controlled_calendar_event_phase4";
const live = process.env.PHASE4_LIVE_CONTROLLED === "1";

const lead = {
  lead_id: process.env.PHASE4_CONTROLLED_LEAD_ID || "phase4-controlled-jonathan-lead",
  version: 1,
  company_name: "Jonathan Controlled Phase 4 Lead",
  email: controlledEmail,
  normalized_phone: "+14075550100",
  timezone: "America/New_York",
  pipeline_stage: "meeting_requested",
  eligibility: "engaged",
  next_action: "book_meeting",
  fit_validation: { leak_check_fit: true },
};

let canonicalLead = { ...lead };
const leadStore = {
  client: {
    async readAll() { return [canonicalLead]; },
    async read(id) { return canonicalLead.lead_id === id ? canonicalLead : null; },
    async atomicWrite(row, expectedVersion) {
      const next = row.raw_payload || row;
      if (Number(canonicalLead.version) !== Number(expectedVersion)) {
        return { ok: false, status: "conflict", current_version: canonicalLead.version };
      }
      canonicalLead = next;
      return { ok: true };
    },
    async readBack(id) { return canonicalLead.lead_id === id ? canonicalLead : null; },
  },
};

const source = {
  source_type: "email_reply",
  provider_event_id: process.env.PHASE4_CONTROLLED_REPLY_ID || "controlled_gmail_reply_phase4",
  classification: "meeting_requested",
  confidence: "high",
  received_at: now,
  lead_id: lead.lead_id,
};

const sentMessages = [];
const transport = {
  async send(payload) {
    if (!live) {
      sentMessages.push({ ...payload, controlled: true, no_external_contact: true });
      return { ok: true, provider_message_id: "controlled_invitation_message_phase4" };
    }
    if (!/@/.test(controlledEmail) || !/jonathan|controlled|test/i.test(controlledEmail)) {
      return { ok: false, reason: "controlled_recipient_guard_failed" };
    }
    sentMessages.push({ ...payload, controlled: true });
    return { ok: true, provider_message_id: process.env.PHASE4_CONTROLLED_PROVIDER_MESSAGE_ID || "controlled_invitation_message_phase4" };
  },
};

const intent = createOpportunityIntent({ lead, source }, { now });
const firstExecution = await executeOpportunityIntent(intent, { now, lead, leadStore, transport });
const secondExecution = await executeOpportunityIntent(firstExecution.intent, {
  now,
  lead: canonicalLead,
  leadStore,
  activeIntents: [firstExecution.intent],
  transport,
});

const booking = await reconcileBookingEvidence(firstExecution.intent, {
  now,
  leadStore,
  bookingEvidence: {
    provider_event_id: controlledEventId,
    scheduled_start_at: process.env.PHASE4_CONTROLLED_START_AT || "2026-06-10T15:00:00.000Z",
    scheduled_end_at: process.env.PHASE4_CONTROLLED_END_AT || "2026-06-10T15:30:00.000Z",
    attendee: controlledEmail,
    status: "confirmed",
  },
});

const recovery = await executeOpportunityIntent({
  ...intent,
  intent_id: "controlled_no_connect_recovery_phase4",
  selected_action: "recover_no_connect",
  recovery_plan: { next_action: "retry_later", retry_after: "2026-06-09T18:00:00.000Z" },
}, { now, lead, leadStore, transport });

const dashboard = buildOpportunityDashboard({ intents: [booking.intent, recovery.intent] });

const report = {
  ok: firstExecution.ok && secondExecution.ok === false && booking.ok && recovery.contacted === false,
  mode: live ? "live_controlled" : "dry_run_controlled",
  controlled_lead_id: lead.lead_id,
  selected_action: intent.selected_action,
  invitation_messages_sent: sentMessages.length,
  duplicate_rerun_blocked: secondExecution.reason === "policy_blocked",
  booking_event_id: booking.intent?.booking_evidence?.provider_event_id,
  lead_stage: canonicalLead.pipeline_stage,
  lead_next_action: canonicalLead.next_action,
  recovery_contacted_prospect: recovery.contacted,
  dashboard_summary: dashboard.summary,
  uncontrolled_contact_confirmed_absent: !live,
  stripe_payment_attempted: false,
  pricing_or_terms_generated: false,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
