import assert from "node:assert/strict";
import test from "node:test";

import { bridgeApprovalToExecution } from "../src/lib/approvalExecutionBridge.mjs";
import { makeLedgerEntry, summarizeLedger } from "../src/lib/hermesOperatingLedger.mjs";
import { deriveLearningWeights, applyLearning, selectNextActionsWithLearning } from "../src/lib/hermesLearningWeights.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

function approvedTask(id = "appr-1") {
  return bridgeApprovalToExecution(
    { decision: "approved", approval_item_id: id, original_requested_action: "Send approved follow-up email", risk_level: "low" },
    { now: NOW },
  );
}

test("deriveLearningWeights classifies reliable / unreliable / unproven actors", () => {
  const summary = {
    actors: {
      Reliable: { proposed: 3, evidence_submitted: 3, completed: 3, completion_rate: 1 },
      Flaky: { proposed: 4, evidence_submitted: 4, completed: 1, completion_rate: 0.25 },
      New: { proposed: 1, evidence_submitted: 0, completed: 0, completion_rate: null, evidence_rate: 0 },
    },
    action_types: { recommend_approved_call: { count: 5, success: 1 } },
    rails: { "rail-x": { broken: 3, repaired: 1 } },
  };
  const w = deriveLearningWeights(summary);
  assert.equal(w.actors.Reliable.status, "reliable");
  assert.equal(w.actors.Flaky.status, "unreliable");
  assert.equal(w.actors.New.status, "unproven");
  assert.equal(w.action_types.recommend_approved_call.success_rate, 0.2);
  assert.equal(w.rails["rail-x"].chronic, true);
});

test("unreliable actor raises priority + adds reroute suggestion, gates intact", () => {
  const selectorOutput = {
    actions: [{
      action_id: "na-1", source_type: "lead", source_id: "li-1", priority: "medium", actor: "Cowork",
      action_type: "redispatch_lead_research_with_gaps", reason: "gaps", required_approval: false,
      required_evidence: [], risk_level: "low", forbidden_actions: ["x"], status: "proposed", next_step: "go",
    }],
  };
  const weights = deriveLearningWeights({ actors: { Cowork: { proposed: 4, evidence_submitted: 4, completed: 0, completion_rate: 0 } } });
  const res = applyLearning(selectorOutput, weights, { now: NOW });
  const a = res.actions[0];
  assert.equal(a.priority, "high", "medium bumped to high");
  assert.equal(a.learning.actor_status, "unreliable");
  assert.ok(a.learning.reroute_to);
  // Gate untouched.
  assert.equal(a.required_approval, false);
  assert.deepEqual(a.forbidden_actions, ["x"]);
});

test("chronic broken rail is escalated to critical", () => {
  const selectorOutput = {
    actions: [{
      action_id: "na-rail", source_type: "repair_packet", source_id: "rail-x", priority: "high", actor: "Codex",
      action_type: "route_repair", reason: "down", required_approval: false, required_evidence: [], risk_level: "medium",
      forbidden_actions: [], status: "proposed", next_step: "fix",
    }],
  };
  const weights = deriveLearningWeights({ rails: { "rail-x": { broken: 3, repaired: 0 } } });
  const res = applyLearning(selectorOutput, weights, { now: NOW });
  assert.equal(res.actions[0].priority, "critical");
  assert.equal(res.actions[0].learning.adjustment, "escalated_chronic_rail");
});

test("reliable actor is annotated and not bumped", () => {
  const selectorOutput = {
    actions: [{
      action_id: "na-2", source_type: "execution_task", source_id: "t1", priority: "medium", actor: "OttoServ Outreach (email rail)",
      action_type: "request_actor_evidence", reason: "x", required_approval: false, required_evidence: [], risk_level: "low",
      forbidden_actions: [], status: "proposed", next_step: "y",
    }],
  };
  const weights = deriveLearningWeights({ actors: { "OttoServ Outreach (email rail)": { proposed: 5, evidence_submitted: 5, completed: 4, completion_rate: 0.8 } } });
  const res = applyLearning(selectorOutput, weights, { now: NOW });
  assert.equal(res.actions[0].priority, "medium");
  assert.equal(res.actions[0].learning.actor_status, "reliable");
});

test("selectNextActionsWithLearning composes selector + weights end to end", () => {
  // A queued task whose assigned actor (the email rail) has been unreliable.
  const { taskPacket, lifecycle } = approvedTask();
  const document = { approvalExecutionQueue: { items: [{ taskPacket, lifecycle }] } };
  const ledger = [
    makeLedgerEntry({ event_type: "evidence_submitted", actor: lifecycle.assigned_agent, source_id: "x1", dedupe_key: "e1" }),
    makeLedgerEntry({ event_type: "evidence_submitted", actor: lifecycle.assigned_agent, source_id: "x2", dedupe_key: "e2" }),
  ];
  const ledgerSummary = summarizeLedger(ledger);
  const res = selectNextActionsWithLearning({ document, leads: [{ lead_id: "l", created_at: NOW }], ledgerSummary, now: NOW });
  assert.equal(res.weights_applied, true);
  const taskAction = res.actions.find((a) => a.source_id === taskPacket.task_id);
  assert.ok(taskAction);
  assert.ok("learning" in taskAction, "every action carries a learning annotation");
});
