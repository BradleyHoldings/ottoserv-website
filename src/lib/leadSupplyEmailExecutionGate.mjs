export const CONTROLLED_EMAIL_EXECUTION_VERSION = "phase7d_controlled_email_execution_prep_v1";

const DEFAULT_DAILY_CAP = 3;
const NY_TIME_ZONE = "America/New_York";
const WINDOW_START_MINUTES = 9 * 60;
const WINDOW_END_MINUTES = 16 * 60 + 30;
const RECENT_CONTACT_HOURS = 48;

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

function domainFromEmail(value) {
  const email = lower(value);
  return email.includes("@") ? email.split("@").pop() : "";
}

function minutesOfDay(parts) {
  return Number(parts.hour || 0) * 60 + Number(parts.minute || 0);
}

function nyParts(iso) {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const out = {};
  for (const part of parts) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    weekday: out.weekday,
    hour: Number(out.hour),
    minute: Number(out.minute),
  };
}

function isWeekday(parts) {
  return !["Sat", "Sun"].includes(parts.weekday);
}

export function isApprovedSendWindow(iso = new Date().toISOString()) {
  const parts = nyParts(iso);
  const minute = minutesOfDay(parts);
  return isWeekday(parts) && minute >= WINDOW_START_MINUTES && minute <= WINDOW_END_MINUTES;
}

function offsetMinutesFor(utcMs) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TIME_ZONE,
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(utcMs));
  const label = clean(parts.find((part) => part.type === "timeZoneName")?.value);
  const match = label.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return -new Date(utcMs).getTimezoneOffset();
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
}

function localNyToUtcIso(year, month, day, hour, minute) {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let utc = localAsUtc - offsetMinutesFor(localAsUtc) * 60_000;
  utc = localAsUtc - offsetMinutesFor(utc) * 60_000;
  return new Date(utc).toISOString();
}

function addCalendarDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function weekdayForLocalDate(year, month, day) {
  return nyParts(localNyToUtcIso(year, month, day, 12, 0)).weekday;
}

export function nextEligibleSendTime(iso = new Date().toISOString()) {
  if (isApprovedSendWindow(iso)) return new Date(iso).toISOString();
  const parts = nyParts(iso);
  const minute = minutesOfDay(parts);
  if (isWeekday(parts) && minute < WINDOW_START_MINUTES) {
    return localNyToUtcIso(parts.year, parts.month, parts.day, 9, 0);
  }
  let next = addCalendarDays(parts, 1);
  while (["Sat", "Sun"].includes(weekdayForLocalDate(next.year, next.month, next.day))) {
    next = addCalendarDays(next, 1);
  }
  return localNyToUtcIso(next.year, next.month, next.day, 9, 0);
}

function isQueuedEmailAction(item = {}) {
  return clean(item.status) === "queued" && Boolean(item.raw_action?.email?.intent);
}

function copyApprovalStatus(item = {}) {
  const policy = item.raw_action?.email?.policy || {};
  if (policy.ok === true) return "approved";
  if (policy.requires_approval) return "approval_required";
  return "unknown";
}

function recentContactBlocked(item = {}, now) {
  const last = clean(item.last_contact_at || item.lead?.last_contact_at || item.raw_action?.last_contact_at);
  if (!last) return false;
  const age = Date.parse(now) - Date.parse(last);
  return Number.isFinite(age) && age >= 0 && age < RECENT_CONTACT_HOURS * 3600_000;
}

function senderApproved(sender, approvedSenderDomains) {
  const senderDomain = domainFromEmail(sender);
  return asArray(approvedSenderDomains).map(lower).includes(senderDomain) || asArray(approvedSenderDomains).map(lower).includes(lower(sender));
}

function dncBlocked(recipient, doNotContact) {
  const email = lower(recipient);
  const domain = domainFromEmail(email);
  const dnc = new Set(asArray(doNotContact).map(lower));
  return dnc.has(email) || dnc.has(domain);
}

function evaluateBlock(item, context) {
  const intent = item.raw_action?.email?.intent || {};
  const recipient = lower(intent.recipient);
  if (clean(item.status) === "completed_with_evidence" || clean(item.status) === "executed") return "already_completed_or_executed";
  if (!recipient) return "missing_email";
  if (dncBlocked(recipient, context.doNotContact)) return "recipient_on_dnc";
  if (context.duplicateEmails.has(recipient)) return "duplicate_email";
  if (copyApprovalStatus(item) !== "approved") return "unapproved_copy";
  if (recentContactBlocked(item, context.now)) return "prior_recent_contact";
  if (!senderApproved(intent.sender, context.approvedSenderDomains)) return "unsafe_sender_config";
  if (!clean(item.evidence_source_reference || item.lead?.evidence_source_reference)) return "missing_evidence_path";
  return "";
}

function duplicateEmailSet(items) {
  const seen = new Map();
  const duplicates = new Set();
  for (const item of items) {
    const recipient = lower(item.raw_action?.email?.intent?.recipient);
    if (!recipient) continue;
    if (seen.has(recipient)) duplicates.add(recipient);
    seen.set(recipient, item.action_id);
  }
  return duplicates;
}

export function prepareControlledEmailExecution(queue = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const dailyCap = Number(options.dailyCap || DEFAULT_DAILY_CAP);
  const approvedSenderDomains = options.approvedSenderDomains || ["ottoserv.com"];
  const queuedEmailItems = asArray(queue.items).filter((item) => item.raw_action?.email?.intent);
  const candidates = queuedEmailItems.filter((item) => isQueuedEmailAction(item) || ["completed_with_evidence", "executed"].includes(clean(item.status)));
  const duplicateEmails = duplicateEmailSet(candidates);
  const inWindow = isApprovedSendWindow(now);
  const nextWindow = nextEligibleSendTime(now);
  const actions = [];
  let eligibleCount = 0;

  for (const item of candidates) {
    const intent = item.raw_action?.email?.intent || {};
    const base = {
      action_id: clean(item.action_id),
      lead_id: clean(item.lead_id),
      email_execution_id: clean(intent.execution_id),
      recipient_domain: domainFromEmail(intent.recipient),
      offer_matched: item.offer_match || item.raw_action?.offer || {},
      template_ref: clean(intent.template_ref),
      template_copy_approval_status: copyApprovalStatus(item),
      evidence_source_reference: clean(item.evidence_source_reference || item.lead?.evidence_source_reference),
      live_send_attempted: false,
      provider_message_id: "",
      evaluated_at: now,
    };
    const blockReason = evaluateBlock(item, {
      now,
      doNotContact: options.doNotContact,
      approvedSenderDomains,
      duplicateEmails,
    });
    if (blockReason) {
      actions.push({ ...base, status: "blocked", block_reason: blockReason });
      continue;
    }
    if (!inWindow) {
      actions.push({
        ...base,
        status: "held_until_send_window",
        held_reason: "outside_approved_send_window",
        next_eligible_send_time: nextWindow,
      });
      continue;
    }
    if (eligibleCount >= dailyCap) {
      actions.push({ ...base, status: "blocked", block_reason: "daily_cap_reached" });
      continue;
    }
    eligibleCount += 1;
    actions.push({
      ...base,
      status: "send_eligible",
      next_eligible_send_time: now,
      send_window: "monday_friday_0900_1630_america_new_york",
    });
  }

  return {
    version: CONTROLLED_EMAIL_EXECUTION_VERSION,
    generated_at: now,
    mode: "prep_only_no_live_send",
    approved_window: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      start_local: "09:00",
      end_local: "16:30",
      time_zone: NY_TIME_ZONE,
      in_window: inWindow,
      next_eligible_send_time: nextWindow,
    },
    daily_cap: dailyCap,
    summary: {
      candidates_seen: candidates.length,
      send_eligible: actions.filter((item) => item.status === "send_eligible").length,
      held_until_send_window: actions.filter((item) => item.status === "held_until_send_window").length,
      blocked: actions.filter((item) => item.status === "blocked").length,
      live_emails_sent: 0,
    },
    actions: actions.map(clone),
    safety: {
      no_live_email_sent: true,
      no_live_call_placed: true,
      no_retell_production_activation: true,
      no_stripe_n8n_browser_automation: true,
    },
    next_operator_action: inWindow
      ? "review_send_eligible_controlled_email_actions_before_execution"
      : "wait_until_next_approved_send_window",
  };
}
