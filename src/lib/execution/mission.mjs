// ─── Hermes mission planner (objective → bounded mission) ─────────────────────
//
// Translates a high-level objective ("import these leads, enrich, score, and begin
// compliant outreach") into a BOUNDED operational mission with explicit stages,
// criteria, policy, evidence requirements, and monitoring thresholds. A mission is
// a PLAN — it is NOT execution. It carries execution_status:"planned" and links to
// the task that actually executes it, so a plan can never be mistaken for a run.

function clean(v) { return String(v ?? "").trim(); }

// Canonical stages for the revenue-operator mission, each with its own evidence
// contract and idempotency key shape. These mirror the real runners.
const REVENUE_MISSION_STAGES = [
  { id: "intake", name: "Spreadsheet intake + validation", start_evidence: "attachment persisted + schema detected", success_evidence: "row count parsed + dedupe report", failure_evidence: "parse/schema error", timeout_min: 5, retry: "idempotent", idempotency_key: "file_hash", partial: "resume_from_last_row", recovery: "re-parse from persisted file" },
  { id: "validate", name: "Lead validation", start_evidence: "validator invoked", success_evidence: "accepted/rejected counts", failure_evidence: "validation exception", timeout_min: 5, retry: "idempotent", idempotency_key: "lead_id", partial: "keep accepted", recovery: "re-validate remaining" },
  { id: "enrich", name: "Contact enrichment", start_evidence: "enrichment task queued to actor", success_evidence: "verified contact path + last_validated_at", failure_evidence: "enrichment actor error/credit-out", timeout_min: 60, retry: "idempotent", idempotency_key: "lead_id", partial: "enrich per-lead", recovery: "queue remaining until actor available" },
  { id: "score", name: "Intent scoring + tiering", start_evidence: "scorer invoked", success_evidence: "tier + score per lead", failure_evidence: "scorer exception", timeout_min: 5, retry: "idempotent", idempotency_key: "lead_id", partial: "score per lead", recovery: "re-score changed leads" },
  { id: "policy", name: "Policy classification + outreach eligibility", start_evidence: "policy classifier invoked", success_evidence: "per-lead eligibility (email/call/enrich/gated)", failure_evidence: "classifier exception", timeout_min: 5, retry: "idempotent", idempotency_key: "lead_id", partial: "classify per lead", recovery: "re-classify" },
  { id: "packet", name: "Approved packet creation", start_evidence: "packet builder invoked", success_evidence: "actor packet in durable queue", failure_evidence: "builder exception", timeout_min: 5, retry: "idempotent", idempotency_key: "task_id", partial: "per-packet", recovery: "rebuild invalid packets" },
  { id: "outreach", name: "Live outreach execution", start_evidence: "transport invoked under live mode", success_evidence: "production message_id / call_id receipt", failure_evidence: "transport error / no receipt", timeout_min: 30, retry: "idempotent_per_message", idempotency_key: "task_id+channel", partial: "per-message", recovery: "resume unsent only" },
  { id: "evidence", name: "Evidence recording + CRM update", start_evidence: "evidence intake invoked", success_evidence: "lifecycle advanced + CRM/db row", failure_evidence: "write error", timeout_min: 5, retry: "idempotent", idempotency_key: "task_id", partial: "per-record", recovery: "re-record missing" },
];

/**
 * Build a bounded mission from an objective + input artifacts. Returns a mission
 * descriptor with execution_status:"planned" (NOT executed). Pure.
 */
export function planMission(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const objective = clean(input.objective) || "Import, enrich, score, and begin compliant outreach on the provided leads.";
  const id = `mission-${now.replace(/[^0-9]/g, "").slice(0, 14)}`;
  return {
    mission_id: id,
    objective,
    execution_status: "planned", // a PLAN, not a run. The task executes it.
    bound_task_id: clean(input.task_id) || "",
    success_criteria: input.success_criteria || [
      "All usable rows imported and deduped with evidence.",
      "Each lead validated, enriched (or queued for enrichment), and scored.",
      "Eligible leads have approved packets; outreach sent ONLY with production receipts.",
      "Every outcome carries machine-verifiable evidence.",
    ],
    policy_constraints: input.policy_constraints || [
      "No per-item Jonathan approval for normal under-cap email/call (standing policy).",
      "DNC/blacklist/cooldown/business-hours/caps enforced.",
      "Upset/sensitive/custom-pricing/legal stay Jonathan-gated.",
      "No live send/dial without a wired, credentialed transport.",
    ],
    input_artifacts: input.input_artifacts || (clean(input.spreadsheet) ? [clean(input.spreadsheet)] : []),
    stages: REVENUE_MISSION_STAGES,
    dependencies: { enrich: ["intake", "validate"], score: ["validate"], policy: ["score"], packet: ["policy"], outreach: ["packet", "enrich"], evidence: ["outreach"] },
    actor_assignments: { intake: "Hermes", validate: "Hermes", enrich: "Cowork", score: "Hermes", policy: "Hermes", packet: "Hermes", outreach: "email_rail/Morgan", evidence: "Hermes" },
    budget_constraints: input.budget_constraints || { api: "fallback_only", calls: "credit_aware", email: "under_daily_cap" },
    completion_criteria: "All stages produce success evidence OR are truthfully reported partial/blocked with reasons.",
    monitoring_thresholds: { stall_minutes: 10, heartbeat_minutes: 10, max_attempts: 3 },
    evidence_requirements: "Each stage must emit start/success/failure evidence; outreach requires production transport receipts.",
    expected_business_result: clean(input.expected_business_result) || "Booked audits/demos → paid clients; movement toward $1M ARR.",
    next_best_action: "After outreach evidence, route replies (booked/follow-up/not-interested/DNC/handoff) and re-score.",
    created_at: now,
  };
}
