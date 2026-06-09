// ─── Phase 2 email execution rail: follow-up scheduler ───────────────────────
//
// Deterministic next-action scheduling with spacing enforcement, max-attempts cap,
// cancellation on reply/DNC, and no duplicate scheduled actions. Pure — callers
// persist. Restart-safe: same inputs → same scheduled_at slot.

import { EMAIL_ACTION } from "./intent.mjs";
import { SEQUENCE_STOPPING_CLASSES } from "./reply.mjs";

function clean(v) { return String(v ?? "").trim(); }

export const SCHEDULE_POLICY = {
  max_attempts: 4,
  spacing_hours: [0, 72, 120, 168], // initial + follow-up delays (hours from first send)
  send_hour_utc: 14, // 14:00 UTC default slot
};

/**
 * Derive the deterministic next scheduled_at for a follow-up action.
 * Returns null when no further attempts should be scheduled.
 */
export function deriveNextScheduledAt(input = {}, policy = SCHEDULE_POLICY) {
  const attempt = Number(input.attempt_number ?? 0); // 0 = initial, 1 = first follow-up, …
  const spacings = policy.spacing_hours || SCHEDULE_POLICY.spacing_hours;
  if (attempt >= policy.max_attempts) return null; // exhausted

  const baseMs = Date.parse(clean(input.first_sent_at) || new Date().toISOString());
  const offsetHours = spacings[attempt] ?? spacings[spacings.length - 1];
  const slotMs = baseMs + offsetHours * 3600 * 1000;
  // Snap to next available send-day slot at send_hour_utc.
  const slot = snapToSendSlot(new Date(slotMs), policy.send_hour_utc ?? 14);
  return slot.toISOString();
}

function snapToSendSlot(date, sendHourUtc) {
  const d = new Date(date.getTime());
  d.setUTCHours(sendHourUtc, 0, 0, 0);
  if (d.getTime() <= date.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  // Skip weekends (Sat=6, Sun=0).
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Evaluate whether a follow-up should be scheduled.
 * Returns { should_schedule, reason, scheduled_at? }.
 */
export function evaluateFollowUp(input = {}, policy = SCHEDULE_POLICY) {
  const replyClass = clean(input.reply_classification);
  const sequenceStopped = Boolean(input.sequence_stopped) || (replyClass && SEQUENCE_STOPPING_CLASSES.has(replyClass));
  if (sequenceStopped) return { should_schedule: false, reason: `sequence_stopped:${replyClass || "explicit"}` };

  const isDnc = Boolean(input.is_dnc);
  if (isDnc) return { should_schedule: false, reason: "dnc" };

  const attempt = Number(input.attempt_number ?? 0);
  if (attempt >= (policy.max_attempts ?? SCHEDULE_POLICY.max_attempts)) {
    return { should_schedule: false, reason: "max_attempts_reached" };
  }

  const scheduled_at = deriveNextScheduledAt(input, policy);
  if (!scheduled_at) return { should_schedule: false, reason: "no_next_slot" };

  // Spacing enforcement: ensure we're not scheduling within the minimum window.
  if (clean(input.last_contact_at)) {
    const last = Date.parse(clean(input.last_contact_at));
    const next = Date.parse(scheduled_at);
    const minSpacingMs = (policy.spacing_hours?.[1] ?? 72) * 3600 * 1000;
    if (!Number.isNaN(last) && !Number.isNaN(next) && (next - last) < minSpacingMs) {
      return { should_schedule: false, reason: "spacing_too_short" };
    }
  }

  return { should_schedule: true, scheduled_at, reason: "follow_up_eligible", attempt_number: attempt + 1 };
}

/**
 * Cancel any pending follow-up for a lead when a sequence-stopping reply arrives.
 * Returns a list of execution_ids to cancel. Pure — callers persist the cancellations.
 */
export function selectIntentsToCancel(pendingIntents = [], replyClassification) {
  if (!SEQUENCE_STOPPING_CLASSES.has(replyClassification)) return [];
  return pendingIntents
    .filter(i => [
      "proposed", "approval_required", "approved", "scheduled", "retry_waiting",
    ].includes(clean(i.state)))
    .map(i => clean(i.execution_id))
    .filter(Boolean);
}
