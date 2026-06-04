import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyProposedAction,
  materializeActorPackets,
  STANDING_POLICY_ACTION_TYPES,
} from "../src/lib/hermesApprovalThroughput.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";

const NOW = "2026-06-04T12:00:00.000Z";

function aTierLead() {
  return {
    lead_id: "li-acme", company: "Acme Plumbing", tier: "A-tier", normalized_phone: "4075550101",
    status: "ready_to_call", score: 81, source_url: "https://reddit.com/r/x/abc",
    intent: { likely_ottoserv_angle: "AI Receptionist", source_urls: ["https://reddit.com/r/x/abc"] },
  };
}

test("standing-policy low-risk action classifies as 'standing'", () => {
  const action = { action_type: "dispatch_lead_research", required_approval: false, risk_level: "low" };
  const c = classifyProposedAction(action);
  assert.equal(c.disposition, "standing");
  assert.ok(STANDING_POLICY_ACTION_TYPES.has("dispatch_lead_research"));
});

test("high-risk call action classifies as 'gated'", () => {
  const action = { action_type: "recommend_approved_call", required_approval: true, risk_level: "high" };
  assert.equal(classifyProposedAction(action).disposition, "gated");
});

test("empty pipeline: research action auto-materializes; nothing gated", () => {
  const actions = selectNextActions({ leads: [], now: NOW }).actions;
  const res = materializeActorPackets(actions, { now: NOW });
  assert.ok(res.summary.materialized >= 1);
  assert.ok(res.materialized.some((m) => m.via === "standing_policy"));
  assert.equal(res.summary.gated, 0);
});

test("A-tier lead: call recommendation is GATED (no approval) but research is materialized", () => {
  const actions = selectNextActions({ leads: [aTierLead()], document: {}, now: NOW }).actions;
  const res = materializeActorPackets(actions, { now: NOW });
  // The call stays gated...
  const gatedCall = res.gated.find((g) => g.approval_packet.action_type === "recommend_approved_call");
  assert.ok(gatedCall, "call must be gated without approval");
  assert.ok(gatedCall.approval_packet.standing_grant_hint, "gated packet offers a standing-grant path");
  // ...while low-risk standing actions (e.g. repair_call_rail) materialize.
  assert.ok(res.materialized.some((m) => m.via === "standing_policy"));
});

test("a scoped standing GRANT materializes the call without a fresh approval", () => {
  const actions = selectNextActions({ leads: [aTierLead()], document: {}, now: NOW }).actions;
  const grants = [{ grant_id: "grant-a-calls", action_type: "recommend_approved_call", scope: "li-acme", max_uses: 5, used: 0, approved_by: "Jonathan" }];
  const res = materializeActorPackets(actions, { now: NOW, standingApprovals: grants });
  const call = res.materialized.find((m) => m.via === "standing_grant");
  assert.ok(call, "expected the call to materialize via the standing grant");
  assert.equal(res.gated.find((g) => g.approval_packet.action_type === "recommend_approved_call"), undefined);
});

test("expired or used-up grant does NOT materialize a high-risk action", () => {
  const actions = selectNextActions({ leads: [aTierLead()], document: {}, now: NOW }).actions;
  const expired = [{ grant_id: "g1", action_type: "recommend_approved_call", scope: "li-acme", max_uses: 5, used: 0, approved_by: "Jonathan", expires_at: "2026-06-01T00:00:00.000Z" }];
  const usedUp = [{ grant_id: "g2", action_type: "recommend_approved_call", scope: "li-acme", max_uses: 1, used: 1, approved_by: "Jonathan" }];
  const noAuth = [{ grant_id: "g3", action_type: "recommend_approved_call", scope: "li-acme", max_uses: 5, used: 0 }]; // no approved_by
  for (const grants of [expired, usedUp, noAuth]) {
    const res = materializeActorPackets(actions, { now: NOW, standingApprovals: grants });
    assert.ok(res.gated.some((g) => g.approval_packet.action_type === "recommend_approved_call"), "call must remain gated");
  }
});

test("idempotent: an action already in the execution queue is not re-materialized", () => {
  const actions = selectNextActions({ leads: [], now: NOW }).actions;
  const first = materializeActorPackets(actions, { now: NOW });
  const taskId = first.materialized[0].task_id;
  const document = { approvalExecutionQueue: { items: [{ taskPacket: { task_id: taskId }, lifecycle: { assigned_task_id: taskId } }] } };
  const second = materializeActorPackets(actions, { now: NOW, document });
  assert.ok(second.already_enqueued.some((a) => a.task_id === taskId));
  assert.ok(!second.materialized.some((m) => m.task_id === taskId));
});
