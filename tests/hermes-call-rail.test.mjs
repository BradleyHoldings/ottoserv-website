import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  detectCallRailState,
  callReadyATierLeads,
  buildCallPacket,
  simulateCallOutcome,
  isCallTask,
} from "../src/lib/hermesCallRail.mjs";
import { bridgeApprovalToExecution } from "../src/lib/approvalExecutionBridge.mjs";
import { submitActorEvidence, loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";
import { computeScorecard } from "../src/lib/hermesAutonomyScorecard.mjs";

const NOW = "2026-06-04T12:00:00.000Z";
const daysAgo = (n) => new Date(Date.parse(NOW) - n * 86_400_000).toISOString();

function aTierLead(overrides = {}) {
  return {
    lead_id: "li-acme", company: "Acme Plumbing", tier: "A-tier", normalized_phone: "4075550101",
    email: "office@acme.example.com", status: "ready_to_call", score: 81, source_url: "https://reddit.com/r/x/abc",
    intent: { likely_ottoserv_angle: "AI Receptionist for missed calls", recommended_offer: "AI Lead Handler pilot", source_urls: ["https://reddit.com/r/x/abc"] },
    ...overrides,
  };
}

// A morgan-rail execution task carrying (optionally) a recorded call outcome.
function callTask({ status = "queued", evidence = false, ts = NOW } = {}) {
  const { taskPacket, lifecycle } = bridgeApprovalToExecution(
    { decision: "approved", approval_item_id: "appr-call-1", original_requested_action: "Place approved call to Acme Plumbing", recommended_actor: "Morgan/Retell", risk_level: "high" },
    { now: ts },
  );
  lifecycle.execution_status = status;
  lifecycle.last_status_update_at = ts;
  if (evidence) lifecycle.submitted_evidence = [{ evidence_id: "ev-call", evidence_reference: "retell-123", evidence_summary: "booked demo" }];
  return { taskPacket, lifecycle };
}

test("call task detection matches the Morgan/Retell rail and call actions", () => {
  assert.equal(isCallTask(callTask()), true);
  assert.equal(isCallTask({ taskPacket: { execution_rail: "email", requested_action: "send follow-up email" }, lifecycle: { execution_rail: "email" } }), false);
});

test("call-ready A-tier leads require tier + phone + evidence and sort by score", () => {
  const ready = callReadyATierLeads([
    aTierLead(),
    aTierLead({ lead_id: "li-no-phone", normalized_phone: "" }),
    aTierLead({ lead_id: "li-no-evidence", source_url: "", intent: { source_urls: [] } }),
    aTierLead({ lead_id: "li-rejected", status: "rejected" }),
    aTierLead({ lead_id: "li-high", score: 95 }),
  ]);
  assert.deepEqual(ready.map((l) => l.lead_id), ["li-high", "li-acme"]);
});

test("A-tier lead ready but no outcomes → rail is IDLE", () => {
  const rail = detectCallRailState({ leads: [aTierLead()], document: {}, now: NOW });
  assert.equal(rail.status, "idle");
  assert.equal(rail.call_ready_a_tier, 1);
  assert.equal(rail.recorded_outcomes, 0);
});

test("no call-ready leads and no outcomes → no_demand (rail not flagged)", () => {
  const rail = detectCallRailState({ leads: [{ lead_id: "b", tier: "B-tier", created_at: NOW }], document: {}, now: NOW });
  assert.equal(rail.status, "no_demand");
});

test("recorded recent call outcome → rail is HEALTHY", () => {
  const document = { approvalExecutionQueue: { items: [callTask({ status: "evidence_submitted", evidence: true })] } };
  const rail = detectCallRailState({ leads: [aTierLead()], document, now: NOW });
  assert.equal(rail.status, "healthy");
  assert.equal(rail.recorded_outcomes, 1);
  assert.equal(rail.recent_outcomes, 1);
});

test("only stale outcomes (older than window) with ready leads → STALE", () => {
  const document = { approvalExecutionQueue: { items: [callTask({ status: "completed", evidence: true, ts: daysAgo(30) })] } };
  const rail = detectCallRailState({ leads: [aTierLead()], document, now: NOW });
  assert.equal(rail.status, "stale");
});

test("buildCallPacket produces an approval-gated Retell/Morgan packet (no dial)", () => {
  const packet = buildCallPacket(aTierLead(), { now: NOW });
  assert.equal(packet.kind, "retell_morgan_call_packet");
  assert.equal(packet.execution_rail, "morgan");
  assert.equal(packet.requires_recorded_approval, true);
  assert.equal(packet.phone, "4075550101");
  assert.ok(packet.guardrails.some((g) => /approval/i.test(g)));
  assert.ok(packet.guardrails.some((g) => /do-not-call|do not call/i.test(g)));
  assert.ok(/do not dial/i.test(packet.safety_note));
  assert.ok(packet.qualification_questions.length >= 3);
});

test("simulateCallOutcome is clearly flagged and yields an evidence-intake submission", () => {
  const packet = buildCallPacket(aTierLead(), { now: NOW });
  const sim = simulateCallOutcome(packet, { disposition: "booked_demo" }, { now: NOW });
  assert.equal(sim.simulated, true);
  assert.equal(sim.disposition, "booked_demo");
  assert.ok(/SIMULATED/.test(sim.outcome_summary));
  assert.equal(sim.submission.evidence.evidence_type, "simulated_call_outcome");
  assert.equal(sim.submission.actor, "Morgan");
  assert.ok(sim.submission.task_id);
});

test("selector emits repair_call_rail when idle, not when healthy", () => {
  const idle = selectNextActions({ leads: [aTierLead()], document: {}, now: NOW });
  const repair = idle.actions.find((a) => a.action_type === "repair_call_rail");
  assert.ok(repair, "expected a repair_call_rail action when idle");
  assert.equal(repair.required_approval, false);
  assert.equal(repair.priority, "high");
  assert.ok(repair.forbidden_actions.some((f) => /dial/i.test(f)));

  const document = { approvalExecutionQueue: { items: [callTask({ status: "evidence_submitted", evidence: true })] } };
  const healthy = selectNextActions({ leads: [aTierLead()], document, now: NOW });
  assert.equal(healthy.actions.find((a) => a.action_type === "repair_call_rail"), undefined);
});

test("scorecard flags call_rail_idle and clears it once an outcome is recorded", () => {
  const idleSc = computeScorecard({ document: {}, leads: [aTierLead()], now: NOW });
  assert.equal(idleSc.grades.call_rail, "fail");
  assert.equal(idleSc.dimensions.call_rail.status, "idle");
  assert.ok(idleSc.top_blockers.some((b) => b.type === "call_rail_idle"));

  const document = { approvalExecutionQueue: { items: [callTask({ status: "evidence_submitted", evidence: true })] } };
  const healthySc = computeScorecard({ document, leads: [aTierLead()], now: NOW });
  assert.equal(healthySc.grades.call_rail, "pass");
  assert.ok(!healthySc.top_blockers.some((b) => b.type === "call_rail_idle"));
});

test("end-to-end close-the-loop: idle → packet → simulated outcome → evidence write-back → not idle", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "callrail-"));
  // Seed a revenue document that has an approved, queued CALL task on the Morgan rail.
  const { taskPacket, lifecycle } = callTask({ status: "queued" });
  const document = { approvalExecutionQueue: { items: [{ taskPacket, lifecycle }] } };
  writeFileSync(path.join(dir, "latest.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8");

  const leads = [aTierLead()];
  const before = detectCallRailState({ leads, document, now: NOW });
  assert.equal(before.status, "idle");

  // Build the packet and a simulated outcome, then write it back via the real intake path.
  const packet = buildCallPacket(leads[0], { now: NOW, task_id: taskPacket.task_id });
  const sim = simulateCallOutcome(packet, { disposition: "booked_demo", task_id: taskPacket.task_id }, { now: NOW });
  const res = await submitActorEvidence(sim.submission, { now: NOW, dataDir: dir, persistSupabase: false });
  assert.equal(res.ok, true);
  assert.equal(res.changed, true);

  // Reload the persisted document and re-detect: the rail is no longer idle.
  const reloaded = (await loadRevenueDocument({ dataDir: dir })).document;
  const after = detectCallRailState({ leads, document: reloaded, now: NOW });
  assert.notEqual(after.status, "idle");
  assert.ok(after.recorded_outcomes >= 1);
});
