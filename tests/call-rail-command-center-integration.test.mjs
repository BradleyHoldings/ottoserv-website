import assert from "node:assert/strict";
import test from "node:test";

import { buildCommandCenterData } from "../src/lib/commandCenter.mjs";
import { buildCallRailDashboard } from "../src/lib/callRail/dashboard.mjs";
import { createCallIntent, CALL_STATES } from "../src/lib/callRail/intent.mjs";

const NOW = "2026-06-08T16:00:00.000Z";

function callIntent(state, over = {}) {
  return {
    ...createCallIntent({
      lead_id: over.lead_id || `lead-${state}`,
      lead_version: 1,
      phone: "+14075550123",
      approved_script_ref: "phase3-script",
      approved_angle: "Leak Check",
      approval_id: "approval-1",
      scheduled_slot: "2026-06-08T16",
    }, { now: NOW }),
    state,
    ...over,
  };
}

test("admin command center exposes Phase 3 call queues, outcomes, evidence, failures, and next actions", () => {
  const callRail = buildCallRailDashboard({
    now: NOW,
    intents: [
      callIntent(CALL_STATES.APPROVED, { execution_id: "cex_q1", lead_id: "lead-q" }),
      callIntent(CALL_STATES.COMPLETED, {
        execution_id: "cex_c1",
        lead_id: "lead-c",
        provider_call_id: "retell_call_123",
        provider_outcome: "interested",
        duration_seconds: 44,
        recording_url: "https://retell.example/r",
        transcript_url: "https://retell.example/t",
        next_action: "route_to_leak_check",
      }),
      callIntent(CALL_STATES.STARTED_UNVERIFIED, { execution_id: "cex_u1", lead_id: "lead-u", provider_call_id: "retell_timeout" }),
    ],
  }, { now: NOW });

  const data = buildCommandCenterData({ callRail }, { role: "ottoserv_admin" });

  assert.equal(data.callRail.summary.completed, 1);
  assert.equal(data.callRail.queues.queued[0].execution_id, "cex_q1");
  assert.equal(data.callRail.completed[0].provider_call_id, "retell_call_123");
  assert.equal(data.callRail.completed[0].recording_ref, "present");
  assert.equal(data.callRail.lead_next_actions.find((a) => a.lead_id === "lead-c").next_action, "route_to_leak_check");
  assert.equal(data.moduleCards.some((card) => card.id === "callRail" && card.value === 3), true);
  assert.equal(data.alerts.some((alert) => alert.type === "call_rail_watchdog" && alert.href === "/os/hermes"), true);
});

test("client command center does not expose admin-only Phase 3 call rail payload", () => {
  const data = buildCommandCenterData(
    { callRail: { summary: { queued: 1, completed: 1, failures: 1 } } },
    { role: "client_owner" },
  );

  assert.equal(data.callRail, null);
  assert.equal(data.moduleCards.some((card) => card.id === "callRail"), false);
});
