// Standing outbound policy: NORMAL B-tier cold email under cap and NORMAL
// approved-policy calls materialize WITHOUT a per-item Jonathan approval, while
// limit increases, new campaigns/segments, custom offers, payment links,
// client-facing sends, upset customers, and negative replies needing judgment stay
// GATED — and missing prerequisites (contact path / evidence) BLOCK execution.
// These tests trigger nothing: they only build descriptors + lifecycles.

import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyProposedAction,
  materializeActorPackets,
  DEFAULT_STANDING_OUTBOUND_POLICY,
  OUTBOUND_EVIDENCE_CONTRACT,
} from "../src/lib/hermesApprovalThroughput.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";
import { advanceExecutionStatus, attachExecutionEvidence, canCompleteExecution } from "../src/lib/approvalExecutionBridge.mjs";
import { computeScorecard } from "../src/lib/hermesAutonomyScorecard.mjs";

const NOW = "2026-06-04T12:00:00.000Z";
const POLICY = DEFAULT_STANDING_OUTBOUND_POLICY;

function bTierLead(i = 1) {
  return {
    lead_id: `li-b${i}`, company: `Bravo Plumbing ${i}`, tier: "B-tier",
    email: `owner${i}@bravo.example`, status: "ready_to_email", score: 70 - i,
    source_url: `https://reddit.com/r/x/b${i}`,
    intent: { recommended_offer: "AI Receptionist", source_urls: [`https://reddit.com/r/x/b${i}`] },
  };
}
function aTierLead(i = 1) {
  return {
    lead_id: `li-a${i}`, company: `Acme Plumbing ${i}`, tier: "A-tier",
    normalized_phone: `40755501${10 + i}`, status: "ready_to_call", score: 85 - i,
    source_url: `https://reddit.com/r/x/a${i}`,
    intent: { likely_ottoserv_angle: "AI Receptionist", source_urls: [`https://reddit.com/r/x/a${i}`] },
  };
}

function emailActionFor(lead) {
  const actions = selectNextActions({ leads: [lead], document: {}, now: NOW }).actions;
  return actions.find((a) => a.action_type === "recommend_approved_email");
}
function callActionFor(lead) {
  const actions = selectNextActions({ leads: [lead], document: {}, now: NOW }).actions;
  return actions.find((a) => a.action_type === "recommend_approved_call");
}

// 1) Normal B-tier email under cap is NOT Jonathan-gated — it materializes standing.
test("normal B-tier email under cap materializes under standing policy (no approval)", () => {
  const action = emailActionFor(bTierLead());
  assert.ok(action, "selector emits a B-tier email action");

  const c = classifyProposedAction(action, { standingOutboundPolicy: POLICY, outboundCounters: { email: 0 } });
  assert.equal(c.disposition, "standing");

  const res = materializeActorPackets([action], { now: NOW, standingOutboundPolicy: POLICY });
  const email = res.materialized.find((m) => m.via === "standing_outbound_policy" && m.channel === "email");
  assert.ok(email, "email is send-ready under standing policy");
  assert.equal(res.gated.length, 0, "nothing routed to Jonathan");
  // Without the standing policy it would have required approval (fail-safe default).
  assert.equal(materializeActorPackets([action], { now: NOW }).gated.length, 1);
});

// 2) Normal call under the approved calling policy is NOT Jonathan-gated.
test("normal approved-policy call materializes under standing policy (no approval)", () => {
  const action = callActionFor(aTierLead());
  assert.ok(action, "selector emits an A-tier call action");

  const c = classifyProposedAction(action, { standingOutboundPolicy: POLICY, outboundCounters: { call: 0 } });
  assert.equal(c.disposition, "standing");

  const res = materializeActorPackets([action], { now: NOW, standingOutboundPolicy: POLICY });
  const call = res.materialized.find((m) => m.via === "standing_outbound_policy" && m.channel === "call");
  assert.ok(call, "call is call-ready under standing policy");
  assert.equal(res.gated.length, 0);
});

// 3) A send/call LIMIT INCREASE (over cap) is gated for Jonathan.
test("outbound over the daily cap is gated as a limit increase", () => {
  const policy = { ...POLICY, email: { enabled: true, daily_cap: 1, tiers: ["B-tier"] } };
  const actions = [emailActionFor(bTierLead(1)), emailActionFor(bTierLead(2))];
  const res = materializeActorPackets(actions, { now: NOW, standingOutboundPolicy: policy });
  assert.equal(res.summary.materialized_standing_outbound, 1, "first email is within cap → standing");
  assert.equal(res.gated.length, 1, "second email exceeds the cap → gated");
  assert.match(res.gated[0].reason, /cap|limit/i);
});

// 4) High-emotion / upset-customer outbound stays gated even inside the policy.
test("upset-customer / high-emotion outbound is gated, not auto-sent", () => {
  const base = emailActionFor(bTierLead());
  const upset = { ...base, upset_customer: true, action_id: `${base.action_id}-upset` };
  const c = classifyProposedAction(upset, { standingOutboundPolicy: POLICY, outboundCounters: { email: 0 } });
  assert.equal(c.disposition, "gated");
  assert.match(c.reason, /exceptional|sensitive|approval/i);

  // A negative-reply email needing judgment (detected from content) is also gated.
  const negative = { ...base, action_id: `${base.action_id}-neg`, reason: "Negative reply needing judgment from owner about a refund." };
  assert.equal(classifyProposedAction(negative, { standingOutboundPolicy: POLICY }).disposition, "gated");

  const res = materializeActorPackets([upset, negative], { now: NOW, standingOutboundPolicy: POLICY });
  assert.equal(res.materialized.length, 0);
  assert.equal(res.gated.length, 2);
});

// 5) Missing contact path or evidence requirement BLOCKS execution (not approval).
test("missing contact path or evidence requirement blocks execution", () => {
  const base = emailActionFor(bTierLead());
  const noContact = { ...base, action_id: `${base.action_id}-nc`, contact_path: false };
  const noEvidence = { ...callActionFor(aTierLead()), action_id: "call-no-evidence", required_evidence: [], contact_path: true };

  const res = materializeActorPackets([noContact, noEvidence], { now: NOW, standingOutboundPolicy: POLICY });
  assert.equal(res.materialized.length, 0, "nothing materializes");
  assert.equal(res.gated.length, 0, "blocking is not an approval ask");
  assert.equal(res.blocked.length, 2);
  assert.ok(res.blocked.some((b) => /contact/i.test(b.block_reason)));
  assert.ok(res.blocked.some((b) => /evidence/i.test(b.block_reason)));
});

// 6) Evidence is REQUIRED before a materialized outbound action can complete.
test("a standing-materialized outbound action requires evidence before completion", () => {
  const res = materializeActorPackets([emailActionFor(bTierLead())], { now: NOW, standingOutboundPolicy: POLICY });
  const { lifecycle } = res.materialized[0];

  // Packet carries the outbound evidence contract (id + timestamp + disposition + next action).
  assert.deepEqual(lifecycle.required_evidence, OUTBOUND_EVIDENCE_CONTRACT.email);
  assert.equal(lifecycle.evidence_status, "required");
  assert.equal(canCompleteExecution(lifecycle), false);
  assert.equal(advanceExecutionStatus(lifecycle, "completed", { now: NOW }).ok, false, "cannot complete without evidence");

  // After real evidence (message id + outcome) it can complete.
  const withEvidence = attachExecutionEvidence(lifecycle, { evidence_reference: "msg-abc-123", evidence_summary: "delivered; no reply yet; next: follow-up D+3" }, { now: NOW });
  assert.equal(canCompleteExecution(withEvidence), true);
  assert.equal(advanceExecutionStatus(withEvidence, "completed", { now: NOW }).ok, true);
});

// 7) The Jonathan bottleneck / autonomy score IMPROVES when normal outbound is
//    standing-materialized instead of gated.
test("bottleneck + score improve when normal outbound is standing-materialized", () => {
  const leads = [bTierLead(1), bTierLead(2), bTierLead(3)];
  const actions = leads.map((l) => emailActionFor(l));
  const ledger = []; // no actor history either way (fair comparison)

  // OLD policy: every email gated → Jonathan bottleneck.
  const gatedThroughput = materializeActorPackets(actions, { now: NOW });
  assert.equal(gatedThroughput.gated.length, 3);
  const gatedScore = computeScorecard({ document: {}, leads, ledger, throughput: gatedThroughput, now: NOW });

  // NEW policy: emails materialize standing → open execution tasks, not approvals.
  const standingThroughput = materializeActorPackets(actions, { now: NOW, standingOutboundPolicy: POLICY });
  assert.equal(standingThroughput.summary.materialized_standing_outbound, 3);
  const document = { approvalExecutionQueue: { items: standingThroughput.materialized.map((m) => ({ taskPacket: m.taskPacket, lifecycle: m.lifecycle })) } };
  const standingScore = computeScorecard({ document, leads, ledger, throughput: standingThroughput, now: NOW });

  assert.ok(
    standingScore.dimensions.jonathan_bottleneck.bottleneck_rate < gatedScore.dimensions.jonathan_bottleneck.bottleneck_rate,
    "standing-materialized outbound lowers the bottleneck rate",
  );
  assert.equal(standingScore.dimensions.jonathan_bottleneck.gated_actions, 0);
  assert.ok(standingScore.autonomy_score > gatedScore.autonomy_score, "operating score improves");
});
