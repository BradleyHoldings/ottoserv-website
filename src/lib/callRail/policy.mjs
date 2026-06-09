export const CALL_POLICY_VERSION = "phase3.v1";

const STOPPING_REPLY_STATES = new Set(["positive_interest", "meeting_requested", "unsubscribe", "not_interested", "wrong_person", "bounce"]);
const APPROVED_PROVIDERS = new Set(["retell"]);

export const DEFAULT_CALL_POLICY = {
  quiet_hours: { start: 20, end: 8 },
  call_days: new Set([1, 2, 3, 4, 5]),
  max_attempts: 3,
  min_spacing_hours: 48,
};

function clean(v) { return String(v ?? "").trim(); }
function lower(v) { return clean(v).toLowerCase(); }
function asSet(v) { return v instanceof Set ? v : new Set((Array.isArray(v) ? v : []).map(clean)); }
function normalizePhone(v) { return clean(v).replace(/[^\d+]/g, ""); }

function receipt(intent, decision, checks, reason, now) {
  return {
    receipt_type: "call_policy_decision",
    execution_id: clean(intent.execution_id),
    lead_id: clean(intent.lead_id),
    idempotency_key: clean(intent.idempotency_key),
    policy_version: CALL_POLICY_VERSION,
    passed: decision === "pass",
    decision,
    block_reason: decision === "pass" ? "" : reason,
    checks,
    decided_at: now,
  };
}

export function evaluateCallPolicy(intent = {}, ctx = {}) {
  const now = ctx.now || new Date().toISOString();
  const policy = { ...DEFAULT_CALL_POLICY, ...(ctx.policy || {}) };
  const lead = ctx.lead || {};
  const checks = {};
  const pass = (k) => { checks[k] = true; };
  const fail = (k, reason, decision = "block") => {
    checks[k] = false;
    return { ok: false, requires_approval: decision === "approval_required", reason, receipt: receipt(intent, decision, checks, reason, now) };
  };

  if (!clean(lead.lead_id)) return fail("lead_exists", "lead_not_found");
  pass("lead_exists");
  if (clean(lead.record_status) === "quarantined" || clean(lead.status) === "rejected") return fail("lead_eligible", "lead_rejected_or_quarantined");
  pass("lead_eligible");

  const phone = normalizePhone(intent.phone || lead.normalized_phone || lead.phone);
  if (!phone || !lead.phone_verified) return fail("phone_verified", "phone_unverified");
  if (normalizePhone(lead.normalized_phone || lead.phone) && normalizePhone(lead.normalized_phone || lead.phone) !== phone) return fail("phone_identity_match", "phone_identity_conflict");
  pass("phone_verified"); pass("phone_identity_match");

  const dnc = asSet(ctx.dnc), suppression = asSet(ctx.suppression), blacklist = asSet(ctx.blacklist);
  if (dnc.has(phone)) return fail("not_dnc", "phone_on_dnc");
  if (suppression.has(phone)) return fail("not_suppressed", "phone_suppressed");
  if (blacklist.has(phone)) return fail("not_blacklisted", "phone_blacklisted");
  pass("not_dnc"); pass("not_suppressed"); pass("not_blacklisted");

  if (Number(intent.lead_version ?? -1) !== Number(lead.version ?? 0)) {
    return fail("lead_version_current", `stale_lead_version:${intent.lead_version}!=${lead.version}`);
  }
  pass("lead_version_current");

  if (STOPPING_REPLY_STATES.has(lower(ctx.activeReplyState))) return fail("no_active_positive_reply", "active_positive_reply");
  pass("no_active_positive_reply");

  const attempts = Number(ctx.attempts?.[intent.lead_id] ?? ctx.attempts?.[lead.lead_id] ?? 0);
  if (attempts >= Number(policy.max_attempts)) return fail("attempt_cap", "attempt_cap_reached");
  pass("attempt_cap");

  if (clean(ctx.lastAttemptAt)) {
    const last = Date.parse(ctx.lastAttemptAt);
    const at = Date.parse(clean(intent.scheduled_at) || now);
    if (!Number.isNaN(last) && !Number.isNaN(at) && (at - last) < Number(policy.min_spacing_hours) * 3600 * 1000) {
      return fail("spacing", "attempt_spacing_too_short");
    }
  }
  pass("spacing");

  const provider = lower(intent.provider || "retell");
  if (!APPROVED_PROVIDERS.has(provider)) return fail("retell_provider_approved", "provider_not_approved");
  pass("retell_provider_approved");

  const hour = Number.isFinite(Number(ctx.localHour)) ? Number(ctx.localHour) : new Date(clean(intent.scheduled_at) || now).getUTCHours();
  const { start, end } = policy.quiet_hours;
  const inQuiet = start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
  if (inQuiet) return fail("quiet_hours", "within_quiet_hours");
  pass("quiet_hours");

  const when = new Date(clean(intent.scheduled_at) || now);
  const days = policy.call_days instanceof Set ? policy.call_days : new Set(policy.call_days);
  if (!Number.isNaN(when.getTime()) && !days.has(when.getUTCDay())) return fail("call_day", "not_a_call_day");
  pass("call_day");

  if (!clean(intent.approved_script_ref) || !clean(intent.approved_angle)) return fail("script_approved", "missing_approved_script_or_angle");
  pass("script_approved");

  if (!clean(intent.approval_id) || ctx.approvalPresent === false) return fail("approval_boundary", "approval_required", "approval_required");
  pass("approval_boundary");

  return { ok: true, requires_approval: false, reason: "", receipt: receipt(intent, "pass", checks, "", now) };
}
