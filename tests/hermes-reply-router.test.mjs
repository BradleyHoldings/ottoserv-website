// Acquisition step 8: replies/outcomes route leads to the right stage with
// mandatory evidence; buyer-ready signals seed a (gated) paid-client handoff;
// question/objection/negative route to human_review.

import assert from "node:assert/strict";
import test from "node:test";

import { routeReplyOrOutcome, routeOutcomes, LEAD_ROUTES } from "../src/lib/hermesReplyRouter.mjs";

const NOW = "2026-06-04T15:00:00.000Z";
const lead = { lead_id: "li-a1", company: "Acme Plumbing", email: "o@acme.example", normalized_phone: "14075550111", pain_point: "missed calls", intent: { recommended_offer: "AI Receptionist", likely_ottoserv_angle: "AI Receptionist" }, source_url: "https://reddit.com/x/a1" };

function outcome(status, over = {}) {
  return { lead_id: "li-a1", status, call_id: "call-001", timestamp: NOW, summary: "spoke with owner", ...over };
}

test("booked meeting → booked_audit_demo with a handoff seed", () => {
  const r = routeReplyOrOutcome({ lead, outcome: outcome("booked_meeting") }, { now: NOW });
  assert.equal(r.ok, true);
  assert.equal(r.route, "booked_audit_demo");
  assert.equal(r.new_status, "demo_booked");
  assert.ok(r.handoff_seed, "buyer-ready → handoff seed");
  assert.equal(r.handoff_seed.approval_required, true, "handoff stays proposal/payment gated");
});

test("interested → paid_client_handoff (seeded, still gated)", () => {
  const r = routeReplyOrOutcome({ lead, outcome: outcome("connected_interested") }, { now: NOW });
  assert.equal(r.route, "paid_client_handoff");
  assert.ok(r.handoff_seed);
  assert.equal(r.evidence.reference, "call-001");
  assert.ok(r.evidence.timestamp && r.evidence.outcome && r.evidence.next_action, "full evidence carried");
});

test("not interested / DNC / disqualified route terminally", () => {
  assert.equal(routeReplyOrOutcome({ lead, outcome: outcome("connected_not_interested") }, { now: NOW }).route, "not_interested");
  assert.equal(routeReplyOrOutcome({ lead, outcome: outcome("do_not_contact") }, { now: NOW }).route, "dnc");
  assert.equal(routeReplyOrOutcome({ lead, outcome: outcome("bad_number") }, { now: NOW }).route, "disqualified");
});

test("no-answer / voicemail / callback route to follow_up", () => {
  for (const s of ["called_no_answer", "voicemail_left", "call_back_requested", "needs_follow_up"]) {
    assert.equal(routeReplyOrOutcome({ lead, outcome: outcome(s) }, { now: NOW }).route, "follow_up");
  }
});

test("needs_human_review and email question/negative route to human_review (gated)", () => {
  const hr = routeReplyOrOutcome({ lead, outcome: outcome("needs_human_review") }, { now: NOW });
  assert.equal(hr.route, "human_review");
  assert.equal(hr.requires_approval, true);

  const q = routeReplyOrOutcome({ lead, reply: { lead_id: "li-a1", intent: "question", message_id: "msg-9", timestamp: NOW, body: "what's the price?" } }, { now: NOW });
  assert.equal(q.route, "human_review");
  assert.equal(q.requires_approval, true);
});

test("email interested reply → paid_client_handoff; unsubscribe → dnc", () => {
  const interested = routeReplyOrOutcome({ lead, reply: { lead_id: "li-a1", intent: "interested", message_id: "msg-1", timestamp: NOW, body: "yes let's talk" } }, { now: NOW });
  assert.equal(interested.route, "paid_client_handoff");
  const unsub = routeReplyOrOutcome({ lead, reply: { lead_id: "li-a1", intent: "unsubscribe", message_id: "msg-2", timestamp: NOW } }, { now: NOW });
  assert.equal(unsub.route, "dnc");
});

test("missing evidence (id/timestamp/outcome) blocks the stage move", () => {
  const noId = routeReplyOrOutcome({ lead, outcome: { lead_id: "li-a1", status: "booked_meeting", timestamp: NOW } }, { now: NOW });
  assert.equal(noId.ok, false);
  assert.match(noId.blocked_reason, /missing_evidence/);
});

test("unknown status is reported, not silently routed", () => {
  const r = routeReplyOrOutcome({ lead, outcome: outcome("teleported") }, { now: NOW });
  assert.equal(r.ok, false);
  assert.match(r.blocked_reason, /unknown_call_status/);
});

test("routeOutcomes batches by route and collects handoff seeds", () => {
  const leadsById = new Map([["li-a1", lead]]);
  const signals = [outcome("booked_meeting"), outcome("connected_not_interested", { call_id: "c2" }), outcome("called_no_answer", { call_id: "c3" })];
  const res = routeOutcomes(signals, leadsById, { now: NOW });
  assert.equal(res.routed.length, 3);
  assert.equal(res.by_route.booked_audit_demo, 1);
  assert.equal(res.by_route.not_interested, 1);
  assert.equal(res.by_route.follow_up, 1);
  assert.equal(res.handoff_seeds.length, 1);
  assert.ok(LEAD_ROUTES.includes(res.routed[0].route));
});
