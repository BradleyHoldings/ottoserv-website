// Priority 2: published next_actions must reconcile with the throughput result.
// A normal outbound action materialized under standing policy is shown as queued
// (required_approval:false) with materialized_via + task_id + pending-evidence
// next_step. Only genuinely gated proposals stay Jonathan approval blockers, and
// blocked-prerequisite actions are shown blocked (not approval, not sent).

import assert from "node:assert/strict";
import test from "node:test";

import {
  materializeActorPackets,
  reconcileNextActions,
  DEFAULT_STANDING_OUTBOUND_POLICY,
} from "../src/lib/hermesApprovalThroughput.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";

const NOW = "2026-06-04T12:00:00.000Z";

function leads() {
  return [
    { lead_id: "li-b1", company: "Bravo Plumbing", tier: "B-tier", email: "o@bravo.example", status: "ready_to_email", score: 66, source_url: "https://reddit.com/x/b1", created_at: NOW, intent: { recommended_offer: "AI Receptionist", source_urls: ["https://reddit.com/x/b1"] } },
    { lead_id: "li-a1", company: "Acme Plumbing", tier: "A-tier", normalized_phone: "4075550111", status: "ready_to_call", score: 82, source_url: "https://reddit.com/x/a1", created_at: NOW, intent: { likely_ottoserv_angle: "AI Receptionist", source_urls: ["https://reddit.com/x/a1"] } },
  ];
}

test("materialized normal outbound is reconciled to queued, not approval-required", () => {
  const actions = selectNextActions({ leads: leads(), document: {}, now: NOW }).actions;
  const throughput = materializeActorPackets(actions, { now: NOW, standingOutboundPolicy: DEFAULT_STANDING_OUTBOUND_POLICY });
  const reconciled = reconcileNextActions(actions, throughput);

  for (const type of ["recommend_approved_email", "recommend_approved_call"]) {
    const a = reconciled.find((x) => x.action_type === type);
    assert.ok(a, `${type} present`);
    assert.equal(a.required_approval, false, `${type} no longer approval-gated`);
    assert.equal(a.throughput_status, "queued");
    assert.equal(a.materialized, true);
    assert.ok(a.task_id, "carries a task_id");
    assert.match(a.materialized_via, /standing_outbound_policy/);
    assert.doesNotMatch(a.next_step, /request .*approval/i);
    assert.match(a.next_step, /evidence/i);
  }
});

test("genuinely gated outbound stays a Jonathan approval blocker after reconciliation", () => {
  const actions = selectNextActions({ leads: leads(), document: {}, now: NOW }).actions;
  // No standing policy → outbound is gated; reconciliation must keep it gated.
  const throughput = materializeActorPackets(actions, { now: NOW });
  const reconciled = reconcileNextActions(actions, throughput);
  const email = reconciled.find((a) => a.action_type === "recommend_approved_email");
  assert.equal(email.required_approval, true);
  assert.equal(email.throughput_status, "gated");
  assert.ok(email.gate_reason);
});

test("blocked-prerequisite outbound is shown blocked: not approval, not sent", () => {
  const base = selectNextActions({ leads: leads(), document: {}, now: NOW }).actions.find((a) => a.action_type === "recommend_approved_email");
  const blockedAction = { ...base, contact_path: false };
  const throughput = materializeActorPackets([blockedAction], { now: NOW, standingOutboundPolicy: DEFAULT_STANDING_OUTBOUND_POLICY });
  const [a] = reconcileNextActions([blockedAction], throughput);
  assert.equal(a.throughput_status, "blocked");
  assert.equal(a.required_approval, false);
  assert.match(a.block_reason, /contact/i);
  assert.match(a.next_step, /nothing is sent/i);
});

test("non-outbound proposals keep their stance and get a throughput_status label", () => {
  const research = selectNextActions({ leads: [], now: NOW }).actions.find((a) => a.action_type === "dispatch_lead_research");
  const throughput = materializeActorPackets([research], { now: NOW, standingOutboundPolicy: DEFAULT_STANDING_OUTBOUND_POLICY });
  const [a] = reconcileNextActions([research], throughput);
  // research is standing-policy internal → materialized → queued, no approval.
  assert.equal(a.required_approval, false);
  assert.equal(a.throughput_status, "queued");
});
