// ─── Phase 2 email-rail dashboard adapter — redaction + shape proofs ──────────
import assert from "node:assert/strict";
import test from "node:test";
import { buildEmailRailDashboard } from "../src/lib/emailRail/dashboard.mjs";
import { EMAIL_STATES } from "../src/lib/emailRail/intent.mjs";

const NOW = "2026-06-08T14:00:00.000Z";

const INTENTS = [
  { execution_id: "e1", lead_id: "L1", state: EMAIL_STATES.PROPOSED, sender: "hermes@ottoserv.com", recipient: "owner@acme.io", subject: "hi", body: "secret body content", updated_at: "2026-06-08T13:00:00.000Z" },
  { execution_id: "e2", lead_id: "L2", state: EMAIL_STATES.APPROVAL_REQUIRED, sender: "hermes@ottoserv.com", recipient: "a@b.io", policy_receipt: { passed: false, block_reason: "approval_required" }, updated_at: NOW },
  { execution_id: "e3", lead_id: "L3", state: EMAIL_STATES.COMPLETED, sender: "hermes@ottoserv.com", recipient: "c@d.io", provider_message_id: "pm_3", updated_at: NOW },
  { execution_id: "e4", lead_id: "L4", state: EMAIL_STATES.SENT_UNVERIFIED, sender: "hermes@ottoserv.com", recipient: "e@f.io", updated_at: NOW },
  { execution_id: "e5", lead_id: "L5", state: EMAIL_STATES.COMPLETED, sender: "hermes@ottoserv.com", recipient: "g@h.io", provider_message_id: "", updated_at: NOW }, // missing evidence → watchdog escalate
];
const REPLIES = [
  { provider_event_id: "r1", classification: "positive_interest" },
  { provider_event_id: "r2", classification: "unsubscribe" },
];

test("dashboard: redacts bodies + masks emails, never leaks raw content", () => {
  const d = buildEmailRailDashboard({ intents: INTENTS, replies: REPLIES, now: NOW });
  const json = JSON.stringify(d);
  assert.ok(!json.includes("secret body content"), "raw body must not appear");
  assert.ok(!json.includes("owner@acme.io"), "full recipient must be masked");
  assert.ok(json.includes("o***@acme.io"), "masked recipient present");
  assert.equal(d.access, "admin_only");
  assert.equal(d.redacted, true);
});

test("dashboard: summary counts and queues are correct", () => {
  const d = buildEmailRailDashboard({ intents: INTENTS, replies: REPLIES, now: NOW });
  assert.equal(d.summary.total_intents, 5);
  assert.equal(d.summary.queued, 1);
  assert.equal(d.summary.approval_required, 1);
  assert.equal(d.summary.sent, 2);
  assert.equal(d.summary.failures, 1); // sent_unverified
  assert.equal(d.replies.total, 2);
  assert.equal(d.replies.by_class.positive_interest, 1);
});

test("dashboard: watchdog alerts surface a completed-without-evidence escalation", () => {
  const d = buildEmailRailDashboard({ intents: INTENTS, replies: REPLIES, now: NOW });
  const escalation = d.watchdog_alerts.find(a => a.execution_id === "e5");
  assert.ok(escalation, "e5 should raise a watchdog alert");
  assert.equal(escalation.safe, false);
  assert.equal(escalation.reason, "completed_without_evidence");
});

test("dashboard: per-lead next actions map states to actions", () => {
  const d = buildEmailRailDashboard({ intents: INTENTS, replies: REPLIES, now: NOW });
  const l3 = d.lead_next_actions.find(x => x.lead_id === "L3");
  assert.equal(l3.next_action, "await_reply");
  const l4 = d.lead_next_actions.find(x => x.lead_id === "L4");
  assert.equal(l4.next_action, "reconcile_with_provider");
});
