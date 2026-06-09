import { ACTION_KIND } from "./intent.mjs";

const QUIET_START = 20;
const QUIET_END = 8;
const TERMINAL_LEAD_STAGES = new Set(["booked_next_step", "not_interested", "do_not_contact", "invalid_contact", "wrong_number"]);
const HUMAN_HANDLING_STAGES = new Set(["human_review", "review_required", "active_human_handling"]);
const CONTACT_REQUIRED = {
  [ACTION_KIND.SEND_MEETING_LINK]: "email",
  [ACTION_KIND.SEND_LEAK_CHECK_INVITATION]: "email",
  [ACTION_KIND.SEND_FULL_PROCESS_AUDIT_INVITATION]: "email",
  [ACTION_KIND.SCHEDULE_APPROVED_CALLBACK]: "phone",
};

function clean(v) { return String(v ?? "").trim(); }
function lower(v) { return clean(v).toLowerCase(); }
function asArray(v) { return Array.isArray(v) ? v : []; }

export function evaluateOpportunityPolicy(intent = {}, ctx = {}) {
  const lead = ctx.lead || {};
  const blockers = [];
  const stage = lower(lead.pipeline_stage);
  const selected = clean(intent.selected_action);
  const leadVersion = Number(lead.version || 0);
  const intentLeadVersion = Number(intent.lead_ref?.version || 0);

  if (leadVersion && intentLeadVersion && leadVersion !== intentLeadVersion) blockers.push("stale_lead_version");
  if (ctx.suppressions?.dnc || ctx.dnc === true || lower(lead.pipeline_stage) === "do_not_contact") blockers.push("suppression_dnc");
  if (ctx.suppressions?.suppressed || lead.suppressed === true) blockers.push("suppression");
  const localHour = Number(ctx.localHour);
  if (Number.isFinite(localHour) && (localHour >= QUIET_START || localHour < QUIET_END)) blockers.push("quiet_hours");
  if (Number(intent.attempts || intent.retries?.attempt || 0) >= Number(intent.retries?.max_attempts || ctx.maxAttempts || 3)) blockers.push("attempt_cap");
  if (TERMINAL_LEAD_STAGES.has(stage)) blockers.push("terminal_lead_stage");
  if (HUMAN_HANDLING_STAGES.has(stage) && selected !== ACTION_KIND.PREPARE_HUMAN_REVIEW_PACKET) blockers.push("active_human_handling");

  const duplicate = asArray(ctx.activeIntents).find((item) => {
    if (clean(item.lead_ref?.lead_id) !== clean(intent.lead_ref?.lead_id)) return false;
    if (clean(item.selected_action) !== selected) return false;
    return !["failed", "cancelled", "booked", "rejected"].includes(lower(item.lifecycle_state));
  });
  if (duplicate) blockers.push("duplicate_action");

  if (intent.approval_boundary === "jonathan_required" && !clean(intent.approval_id)) blockers.push("unresolved_approval");
  if (/stripe|payment/.test(selected)) blockers.push("stripe_forbidden_phase4");
  if (/pricing|guarantee|contract|proposal/.test(`${selected} ${intent.action_text || ""}`.toLowerCase()) && !clean(intent.approval_id)) {
    blockers.push("jonathan_approval_required_for_terms");
  }

  const requiredPath = CONTACT_REQUIRED[selected];
  const hasExplicitTarget = intent.target && typeof intent.target === "object";
  if (requiredPath === "email" && !clean(hasExplicitTarget ? intent.target.email : lead.email)) blockers.push("invalid_contact_path");
  if (requiredPath === "phone" && !clean(hasExplicitTarget ? intent.target.phone : (lead.normalized_phone || lead.phone))) blockers.push("invalid_contact_path");

  return {
    allowed: blockers.length === 0,
    blocked_reasons: [...new Set(blockers)],
    evaluated_at: ctx.now || new Date().toISOString(),
    policy_ref: "hermes_phase4_opportunity_policy_v1",
  };
}
