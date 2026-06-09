// ─── Phase 2 email execution rail: policy gate ────────────────────────────────
//
// Before any send, every email intent passes this gate. It is PURE and produces a
// durable POLICY RECEIPT for every decision (pass or block) so the dashboard and
// auditors can see exactly why an action was or wasn't permitted. It reuses the
// Phase 1 eligibility vocabulary (ELIGIBILITY) and never sends anything itself.

import { ELIGIBILITY } from "../leadRail/eligibility.mjs";
import { EMAIL_ACTION } from "./intent.mjs";

export const POLICY_VERSION = "phase2.v1";

// Approved sender domains and template/message classes. New sender domains are out
// of Phase 2 scope, so the approved set is fixed and explicit.
export const APPROVED_TEMPLATE_CLASSES = new Set([
  "intro_v1", "follow_up_v1", "ack_receipt_v1", "ack_followup_promise_v1",
  "demo_info_v1", "scheduling_link_v1", "unsubscribe_confirm_v1",
]);

// Template classes Hermes may send autonomously (approved low-risk). Everything
// else requires explicit human approval.
export const AUTONOMOUS_TEMPLATE_CLASSES = new Set([
  "ack_receipt_v1", "ack_followup_promise_v1", "demo_info_v1",
  "scheduling_link_v1", "unsubscribe_confirm_v1",
]);

function clean(v) { return String(v ?? "").trim(); }
function lower(v) { return clean(v).toLowerCase(); }
function asSet(v) { return v instanceof Set ? v : new Set((Array.isArray(v) ? v : []).map((x) => lower(x))); }

// Default caps and quiet hours. Conservative; can be overridden per run.
export const DEFAULT_POLICY = {
  sender_daily_cap: 50,
  campaign_daily_cap: 200,
  quiet_hours: { start: 20, end: 8 },     // local hours [20:00, 08:00) are quiet
  send_days: new Set([1, 2, 3, 4, 5]),     // Mon–Fri (0=Sun)
  min_follow_up_spacing_hours: 48,
  max_attempts: 4,
};

// Build the durable policy receipt for one decision.
function receipt(intent, passed, checks, reason, now) {
  return {
    receipt_type: "email_policy_decision",
    execution_id: clean(intent.execution_id),
    lead_id: clean(intent.lead_id),
    idempotency_key: clean(intent.idempotency_key),
    policy_version: POLICY_VERSION,
    passed,
    decision: passed ? "pass" : "block",
    block_reason: passed ? "" : reason,
    checks,
    decided_at: now,
  };
}

/**
 * Evaluate the policy gate. PURE.
 *
 * @param {object} intent  durable email intent
 * @param {object} ctx {
 *   lead,                      // canonical Phase 1 lead (authoritative copy)
 *   now,
 *   dnc, suppression, blacklist, // Set|string[] of recipients/domains
 *   approvedSenders,           // Set|string[] of approved sender addresses/domains
 *   sentTodayBySender,         // { [sender]: count }
 *   sentTodayByCampaign,       // { [campaign_id]: count }
 *   activeIntentExists,        // boolean: another active (non-terminal) intent for this lead+action
 *   priorSuccessIdemKeys,      // Set of idempotency_keys with a prior successful send
 *   lastContactAt,             // ISO of last contact for spacing
 *   replyStopsSequence,        // boolean: a reply already halted the sequence
 *   approvalPresent,           // boolean: explicit human approval recorded
 *   policy                     // overrides for DEFAULT_POLICY
 * }
 * @returns { ok, requires_approval, reason, receipt }
 */
export function evaluatePolicy(intent = {}, ctx = {}) {
  const now = ctx.now || new Date().toISOString();
  const policy = { ...DEFAULT_POLICY, ...(ctx.policy || {}) };
  const lead = ctx.lead || {};
  const recipient = lower(intent.recipient);
  const recipientDomain = recipient.includes("@") ? recipient.split("@")[1] : "";
  const sender = lower(intent.sender);
  const senderDomain = sender.includes("@") ? sender.split("@")[1] : "";
  const checks = {};
  const fail = (key, reason) => { checks[key] = false; return { ok: false, requires_approval: false, reason, receipt: receipt(intent, false, checks, reason, now) }; };
  const pass = (key) => { checks[key] = true; };

  // 1. Canonical lead exists and is eligible (not rejected/quarantined).
  if (!clean(lead.lead_id)) return fail("lead_exists", "lead_not_found");
  pass("lead_exists");
  const recordStatus = lower(lead.record_status);
  if (recordStatus === "quarantined" || recordStatus === "rejected") return fail("not_quarantined", `lead_${recordStatus}`);
  pass("not_quarantined");
  const eligibility = lower(lead.eligibility);
  if (![ELIGIBILITY.EMAIL, "engaged", "contacted"].includes(eligibility) && intent.action_type === EMAIL_ACTION.OUTBOUND) {
    return fail("eligible", `not_email_eligible:${eligibility || "(none)"}`);
  }
  pass("eligible");

  // 2. Recipient sufficiently verified + no identity conflict.
  if (!recipient || !recipient.includes("@")) return fail("recipient_verified", "recipient_unverified");
  if (clean(lead.email) && lower(lead.email) !== recipient) return fail("identity_match", "recipient_identity_conflict");
  pass("recipient_verified"); pass("identity_match");

  // 3. DNC / unsubscribe / suppression / invalid-contact.
  const dnc = asSet(ctx.dnc), suppression = asSet(ctx.suppression), blacklist = asSet(ctx.blacklist);
  if (dnc.has(recipient) || dnc.has(recipientDomain)) return fail("not_dnc", "recipient_on_dnc");
  if (suppression.has(recipient) || suppression.has(recipientDomain)) return fail("not_suppressed", "recipient_suppressed");
  if (blacklist.has(recipient) || blacklist.has(recipientDomain)) return fail("not_blacklisted", "recipient_blacklisted");
  pass("not_dnc"); pass("not_suppressed"); pass("not_blacklisted");

  // 4. Lead version is current (no stale-version send).
  if (Number(intent.lead_version ?? -1) !== Number(lead.version ?? 0)) {
    return fail("lead_version_current", `stale_lead_version:${intent.lead_version}!=${lead.version}`);
  }
  pass("lead_version_current");

  // 5. No duplicate active intent; no prior successful send with same idem key.
  if (ctx.activeIntentExists) return fail("no_duplicate_active", "duplicate_active_intent");
  pass("no_duplicate_active");
  if (asSet(ctx.priorSuccessIdemKeys).has(lower(intent.idempotency_key)) || (ctx.priorSuccessIdemKeys instanceof Set && ctx.priorSuccessIdemKeys.has(intent.idempotency_key))) {
    return fail("idempotent_not_sent", "prior_successful_send_exists");
  }
  pass("idempotent_not_sent");

  // 6. A reply already stopped the sequence → no further outreach.
  if (ctx.replyStopsSequence) return fail("sequence_active", "reply_stopped_sequence");
  pass("sequence_active");

  // 7. Sender / domain / template class approved.
  const approvedSenders = asSet(ctx.approvedSenders);
  if (approvedSenders.size && !approvedSenders.has(sender) && !approvedSenders.has(senderDomain)) {
    return fail("sender_approved", "sender_not_approved");
  }
  pass("sender_approved");
  if (clean(intent.template_ref) && !APPROVED_TEMPLATE_CLASSES.has(clean(intent.template_ref))) {
    return fail("template_approved", `template_class_not_approved:${intent.template_ref}`);
  }
  pass("template_approved");

  // 8. Caps (sender + campaign).
  const senderCount = Number(ctx.sentTodayBySender?.[intent.sender] ?? ctx.sentTodayBySender?.[sender] ?? 0);
  if (senderCount >= policy.sender_daily_cap) return fail("sender_cap", "sender_daily_cap_reached");
  pass("sender_cap");
  if (clean(intent.campaign_id)) {
    const campCount = Number(ctx.sentTodayByCampaign?.[intent.campaign_id] ?? 0);
    if (campCount >= policy.campaign_daily_cap) return fail("campaign_cap", "campaign_daily_cap_reached");
  }
  pass("campaign_cap");

  // 9. Quiet hours + send-day policy (deterministic from scheduled_at).
  const when = new Date(clean(intent.scheduled_at) || now);
  if (!Number.isNaN(when.getTime())) {
    const hour = when.getUTCHours();
    const day = when.getUTCDay();
    const { start, end } = policy.quiet_hours;
    const inQuiet = start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
    if (inQuiet) return fail("quiet_hours", "within_quiet_hours");
    const sendDays = policy.send_days instanceof Set ? policy.send_days : new Set(policy.send_days);
    if (!sendDays.has(day)) return fail("send_day", "not_a_send_day");
  }
  pass("quiet_hours"); pass("send_day");

  // 10. Follow-up spacing (only for follow-ups).
  if (intent.action_type === EMAIL_ACTION.FOLLOW_UP && clean(ctx.lastContactAt)) {
    const last = Date.parse(ctx.lastContactAt);
    const sched = when.getTime();
    if (!Number.isNaN(last) && !Number.isNaN(sched) && (sched - last) < policy.min_follow_up_spacing_hours * 3600 * 1000) {
      return fail("spacing", "follow_up_spacing_too_short");
    }
  }
  pass("spacing");

  // 11. Approval requirement. Autonomous classes may proceed without human approval;
  // everything else requires it.
  const isAutonomous = AUTONOMOUS_TEMPLATE_CLASSES.has(clean(intent.template_ref));
  const requires_approval = !isAutonomous;
  if (requires_approval && !ctx.approvalPresent) {
    const rcpt = receipt(intent, false, { ...checks, approval: false }, "approval_required", now);
    return { ok: false, requires_approval: true, reason: "approval_required", receipt: rcpt };
  }
  pass("approval");

  return { ok: true, requires_approval, reason: "", receipt: receipt(intent, true, checks, "", now) };
}
