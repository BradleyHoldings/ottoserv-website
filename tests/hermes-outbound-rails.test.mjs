// Priorities 4 + 5: email + call rail handoff. Produces send-ready drafts /
// call-ready packets from queued actor packets WITHOUT sending or dialing.
// Enforces caps, DNC/blacklist, cooldowns, business hours, contact path, evidence,
// and sensitive/upset/new-campaign gating.

import assert from "node:assert/strict";
import test from "node:test";

import {
  prepareEmailHandoff,
  prepareCallHandoff,
  prepareRailHandoffs,
} from "../src/lib/hermesOutboundRails.mjs";

const NOW = "2026-06-04T15:00:00.000Z"; // 15:00 UTC → within default business hours

function emailEntry(over = {}) {
  return {
    actor_packet: {
      task_id: "apx-b1", action_id: "na-b1", channel: "email", lead_id: "li-b1", company: "Bravo Plumbing",
      contact: { email: "owner@bravo.example" },
      packet: { kind: "email_packet", offer: "AI Receptionist" },
      evidence: { source_url: "https://reddit.com/x/b1", snippet: "missing after-hours calls", pain_point: "after-hours misses", offer_angle: "AI Receptionist" },
      policy: { materialized_via: "standing_outbound_policy", daily_cap: 50, tier: "B-tier" },
      required_evidence: ["Outbound email evidence: message id, timestamp, disposition/outcome, and next action."],
      mode: "no_send_no_call", no_send: true, no_call: true, status: "queued",
      ...over,
    },
  };
}
function callEntry(over = {}) {
  return {
    actor_packet: {
      task_id: "apx-a1", action_id: "na-a1", channel: "call", lead_id: "li-a1", company: "Acme Plumbing",
      contact: { phone: "14075550111" },
      packet: { kind: "call_packet", angle: "AI Receptionist" },
      evidence: { source_url: "https://reddit.com/x/a1", snippet: "loses jobs to voicemail", pain_point: "voicemail losses", offer_angle: "AI Receptionist" },
      policy: { materialized_via: "standing_outbound_policy", daily_cap: 20, tier: "A-tier" },
      required_evidence: ["Outbound call evidence: call id, timestamp, disposition/outcome, and next action."],
      mode: "no_send_no_call", no_send: true, no_call: true, status: "queued",
      ...over,
    },
  };
}

test("normal B-tier email packet under cap is send-ready, but not sent", () => {
  const r = prepareEmailHandoff(emailEntry(), { now: NOW, sentToday: { email: 0 } });
  assert.equal(r.status, "ready");
  assert.equal(r.would_send, false);
  assert.equal(r.sent, false);
  assert.ok(r.draft.subject && r.draft.body && r.draft.to);
  assert.ok(r.required_evidence.length > 0, "evidence contract known before completion");
  assert.doesNotMatch(r.draft.body, /\$|guarantee/i, "no pricing/guarantee in draft");
});

test("normal call under approved policy becomes a call-ready packet, but not dialed", () => {
  const r = prepareCallHandoff(callEntry(), { now: NOW, sentToday: { call: 0 }, localHour: 10 });
  assert.equal(r.status, "ready");
  assert.equal(r.would_dial, false);
  assert.ok(r.call_ready.opener && r.call_ready.to);
  assert.ok(r.required_evidence.length > 0);
});

test("over-cap stays gated (limit increase), not sent", () => {
  const r = prepareEmailHandoff(emailEntry({ policy: { daily_cap: 1 } }), { now: NOW, sentToday: { email: 1 } });
  assert.equal(r.status, "gated");
  assert.match(r.gate_reason, /cap|limit/i);
});

test("sensitive/upset/new-campaign content or flags stay gated", () => {
  const upset = prepareEmailHandoff(emailEntry(), { now: NOW, flags: { "apx-b1": { upset_customer: true } } });
  assert.equal(upset.status, "gated");
  const campaign = prepareCallHandoff(callEntry({ evidence: { source_url: "u", offer_angle: "new campaign blast" } }), { now: NOW, localHour: 10 });
  assert.equal(campaign.status, "gated");
});

test("missing contact path or evidence is blocked, never sent", () => {
  const noContact = prepareEmailHandoff(emailEntry({ contact: {} }), { now: NOW });
  assert.equal(noContact.status, "blocked");
  assert.match(noContact.block_reason, /contact/);

  const noEvidence = prepareEmailHandoff(emailEntry({ evidence: { source_url: "" } }), { now: NOW });
  assert.equal(noEvidence.status, "blocked");
  assert.match(noEvidence.block_reason, /evidence/);
});

test("DNC/blacklist, cooldown, business hours, and max attempts block execution", () => {
  const dnc = prepareEmailHandoff(emailEntry(), { now: NOW, dnc: ["owner@bravo.example"] });
  assert.equal(dnc.status, "blocked");
  assert.match(dnc.block_reason, /dnc|blacklist/);

  const cooldown = prepareCallHandoff(callEntry(), { now: NOW, localHour: 10, lastContactedAt: { "li-a1": NOW }, cooldownDays: 3 });
  assert.equal(cooldown.status, "blocked");
  assert.match(cooldown.block_reason, /cooldown/);

  const offHours = prepareCallHandoff(callEntry(), { now: NOW, localHour: 22 });
  assert.equal(offHours.status, "blocked");
  assert.match(offHours.block_reason, /business_hours/);

  const maxed = prepareCallHandoff(callEntry(), { now: NOW, localHour: 10, attempts: { "li-a1": 3 }, maxAttempts: 3 });
  assert.equal(maxed.status, "blocked");
  assert.match(maxed.block_reason, /attempts/);
});

test("prepareRailHandoffs summarizes both rails and sends/dials nothing", () => {
  const queue = [emailEntry(), callEntry()];
  const res = prepareRailHandoffs(queue, { now: NOW, localHour: 10, sentToday: { email: 0, call: 0 } });
  assert.equal(res.summary.email.ready, 1);
  assert.equal(res.summary.call.ready, 1);
  assert.equal(res.summary.sent, 0);
  assert.equal(res.summary.dialed, 0);
});
