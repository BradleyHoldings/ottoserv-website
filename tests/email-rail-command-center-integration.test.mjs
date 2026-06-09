import assert from "node:assert/strict";
import test from "node:test";

import { buildCommandCenterData } from "../src/lib/commandCenter.mjs";

test("admin command center exposes Phase 2 email queue, evidence, replies, and next actions", () => {
  const data = buildCommandCenterData(
    {
      emailRail: {
        summary: { queued: 1, sent: 1, failures: 1, replies: 1, watchdog_alerts: 1 },
        queues: {
          queued: [{ execution_id: "eex_q1", lead_id: "lead-q", recipient: "o***@example.com", state: "approved" }],
          approval_required: [],
          active_claims: [],
        },
        sent: [{ execution_id: "eex_s1", lead_id: "lead-s", provider_message_id: "msg_123", provider_thread_id: "thr_123", state: "completed" }],
        failures: [{ execution_id: "eex_f1", lead_id: "lead-f", state: "sent_unverified" }],
        replies: { total: 1, by_class: { positive_interest: 1 } },
        watchdog_alerts: [{ execution_id: "eex_f1", action: "escalate", reason: "missing_evidence", safe: true }],
        lead_next_actions: [{ lead_id: "lead-s", state: "completed", next_action: "await_reply" }],
      },
    },
    { role: "ottoserv_admin" },
  );

  assert.equal(data.emailRail.summary.sent, 1);
  assert.equal(data.emailRail.queues.queued[0].execution_id, "eex_q1");
  assert.equal(data.emailRail.replies.by_class.positive_interest, 1);
  assert.equal(data.emailRail.lead_next_actions[0].next_action, "await_reply");
  assert.equal(data.moduleCards.some((card) => card.id === "emailRail" && card.value === 3), true);
  assert.equal(data.alerts.some((alert) => alert.type === "email_rail_failure" && alert.href === "/os/hermes"), true);
});

test("client command center does not expose admin-only Phase 2 email rail payload", () => {
  const data = buildCommandCenterData(
    { emailRail: { summary: { queued: 1, sent: 1, failures: 1, replies: 1 } } },
    { role: "client_owner" },
  );

  assert.equal(data.emailRail, null);
  assert.equal(data.moduleCards.some((card) => card.id === "emailRail"), false);
});
