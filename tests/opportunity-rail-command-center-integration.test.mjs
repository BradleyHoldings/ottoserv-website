import assert from "node:assert/strict";
import test from "node:test";

import { buildCommandCenterData } from "../src/lib/commandCenter.mjs";
import { buildOpportunityDashboard } from "../src/lib/opportunityRail/dashboard.mjs";

test("admin command center exposes Phase 4 opportunity stages, actions, booking evidence, retries, failures, approvals, and blockers", () => {
  const opportunityRail = buildOpportunityDashboard({
    intents: [
      {
        intent_id: "oppact_booked",
        lead_ref: { lead_id: "lead-1", version: 4 },
        lifecycle_state: "booked",
        selected_action: "send_meeting_link",
        booking_evidence: { provider_event_id: "cal_evt_1", scheduled_start_at: "2026-06-10T15:00:00.000Z", status: "confirmed" },
      },
      {
        intent_id: "oppact_retry",
        lead_ref: { lead_id: "lead-2", version: 2 },
        lifecycle_state: "retry_waiting",
        selected_action: "recover_no_connect",
        retries: { attempt: 1, max_attempts: 3 },
        next_attempt_at: "2026-06-09T18:00:00.000Z",
      },
      {
        intent_id: "oppact_blocked",
        lead_ref: { lead_id: "lead-3", version: 1 },
        lifecycle_state: "blocked",
        selected_action: "prepare_human_review_packet",
        blockers: ["unresolved_approval"],
        approval_boundary: "jonathan_required",
      },
      {
        intent_id: "oppact_failed",
        lead_ref: { lead_id: "lead-4", version: 1 },
        lifecycle_state: "failed",
        selected_action: "send_full_process_audit_invitation",
        failures: [{ reason: "transport_timeout" }],
      },
    ],
  });

  const data = buildCommandCenterData({ opportunityRail }, { role: "ottoserv_admin" });

  assert.equal(data.opportunityRail.summary.booked, 1);
  assert.equal(data.opportunityRail.summary.retry_waiting, 1);
  assert.equal(data.opportunityRail.booking_evidence[0].provider_event_id, "cal_evt_1");
  assert.equal(data.opportunityRail.lead_next_actions.find((a) => a.lead_id === "lead-1").opportunity_stage, "booked");
  assert.equal(data.moduleCards.some((card) => card.id === "opportunityRail" && card.value === 4), true);
  assert.equal(data.alerts.some((alert) => alert.type === "opportunity_rail_blocker" && alert.href === "/os/hermes"), true);
  assert.equal(data.alerts.some((alert) => alert.type === "opportunity_rail_failure" && alert.href === "/os/hermes"), true);
});

test("client command center does not expose admin-only Phase 4 opportunity payload", () => {
  const data = buildCommandCenterData(
    { opportunityRail: { summary: { booked: 1, failures: 1 } } },
    { role: "client_owner" },
  );

  assert.equal(data.opportunityRail, null);
  assert.equal(data.moduleCards.some((card) => card.id === "opportunityRail"), false);
});
