import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { bridgeApprovalToExecution } from "../src/lib/approvalExecutionBridge.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";
import { submitActorEvidence } from "../src/lib/actorEvidenceIntake.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

function approvedTask(action = "Send approved follow-up email to warm lead", id = "appr-001") {
  return bridgeApprovalToExecution(
    { decision: "approved", approval_item_id: id, original_requested_action: action, risk_level: "low" },
    { now: NOW },
  );
}

function aTierLead() {
  return {
    lead_id: "li-acme", company: "Acme Plumbing", tier: "A-tier", normalized_phone: "4075550101",
    email: "office@acme.example.com", status: "ready_to_call", score: 78, source_url: "https://reddit.com/x",
    intent: { likely_ottoserv_angle: "AI Receptionist for missed calls", source_urls: ["https://reddit.com/x"] },
  };
}

test("empty lead pipeline → critical lead research action", () => {
  const res = selectNextActions({ leads: [], now: NOW });
  const a = res.actions.find((x) => x.action_type === "dispatch_lead_research");
  assert.ok(a);
  assert.equal(a.priority, "critical");
  assert.equal(a.required_approval, false);
  assert.equal(a.actor, "Cowork");
});

test("ingest report with needs_verification → redispatch with gaps (no outreach)", () => {
  const ingestReport = { rows: [{ ref: "NoProof HVAC", ingest_status: "needs_verification", fixes: ["Add source_url + snippet + date"] }] };
  const res = selectNextActions({ leads: [aTierLead()], ingestReport, now: NOW });
  const a = res.actions.find((x) => x.action_type === "redispatch_lead_research_with_gaps");
  assert.ok(a);
  assert.equal(a.required_approval, false);
  assert.ok(a.suggested_prompt_or_packet.rows[0].fixes.length);
});

test("A-tier lead with phone+evidence → approval-gated call recommendation", () => {
  const res = selectNextActions({ leads: [aTierLead()], now: NOW });
  const a = res.actions.find((x) => x.action_type === "recommend_approved_call");
  assert.ok(a);
  assert.equal(a.required_approval, true);
  assert.equal(a.risk_level, "high");
  assert.equal(a.actor, "Morgan/Retell");
  assert.ok(a.forbidden_actions.some((f) => /approval/i.test(f)));
});

test("B-tier lead with email+evidence → approval-gated email recommendation", () => {
  const lead = { ...aTierLead(), lead_id: "li-bteam", company: "B Team HVAC", tier: "B-tier", normalized_phone: "", status: "ready_to_email", score: 52 };
  const res = selectNextActions({ leads: [lead], now: NOW });
  const a = res.actions.find((x) => x.action_type === "recommend_approved_email");
  assert.ok(a);
  assert.equal(a.required_approval, true);
});

test("queued approved task → request actor evidence", () => {
  const document = { approvalExecutionQueue: { items: [approvedTask()] } };
  const res = selectNextActions({ document, now: NOW });
  const a = res.actions.find((x) => x.action_type === "request_actor_evidence");
  assert.ok(a);
  assert.equal(a.source_type, "execution_task");
  assert.ok(a.required_evidence.length);
});

test("insufficient submitted evidence → request revision; sufficient → review_and_complete", () => {
  const t1 = approvedTask("Update CRM lead status", "appr-insuff");
  t1.lifecycle = { ...t1.lifecycle, execution_status: "evidence_submitted", evidence_status: "submitted", submitted_evidence: [{ evidence_id: "e1", evidence_summary: "", evidence_reference: "" }] };
  const r1 = selectNextActions({ document: { approvalExecutionQueue: { items: [t1] } }, now: NOW });
  assert.ok(r1.actions.find((x) => x.action_type === "request_evidence_revision"));

  const t2 = approvedTask("Update CRM lead status", "appr-suff");
  t2.lifecycle = { ...t2.lifecycle, execution_status: "evidence_submitted", evidence_status: "submitted", submitted_evidence: [{ evidence_id: "e2", evidence_summary: "done", evidence_reference: "ref-1" }] };
  const r2 = selectNextActions({ document: { approvalExecutionQueue: { items: [t2] } }, now: NOW });
  assert.ok(r2.actions.find((x) => x.action_type === "review_and_complete_evidence"));
});

test("completed task → select follow-up", () => {
  const t = approvedTask();
  t.lifecycle = { ...t.lifecycle, execution_status: "completed", evidence_status: "accepted" };
  const res = selectNextActions({ document: { approvalExecutionQueue: { items: [t] } }, now: NOW });
  assert.ok(res.actions.find((x) => x.action_type === "select_follow_up"));
});

test("work order awaiting approval → request approval; approved → build packet", () => {
  const waiting = { id: "impl-1", implementation_stage: "awaiting_pilot_scope_or_proposal", approvalRequired: true, approvalStatus: "pending", next_action: "Scope pilot" };
  const r1 = selectNextActions({ document: { implementationWorkOrders: { orders: [waiting] } }, now: NOW });
  const a1 = r1.actions.find((x) => x.source_id === "impl-1");
  assert.equal(a1.action_type, "request_approval_or_client_input");
  assert.equal(a1.required_approval, true);

  const approved = { id: "impl-2", implementation_stage: "paid_awaiting_implementation", approvalRequired: true, approvalStatus: "approved", automation_opportunities: ["missed-call recovery"], required_evidence: ["commit hash"] };
  const r2 = selectNextActions({ document: { implementationWorkOrders: { orders: [approved] } }, now: NOW });
  const a2 = r2.actions.find((x) => x.source_id === "impl-2");
  assert.equal(a2.action_type, "create_build_packet");
  assert.equal(a2.actor, "Codex");
  assert.ok(a2.suggested_prompt_or_packet.test_plan);
});

test("repair packet → critical routed repair to its owner", () => {
  const document = { repairPackets: [{ id: "repair-leads", owner: "Cowork", category: "Low recent-intent lead volume", actual_behavior: "Only 1 high-intent lead", verification_steps: ["Re-run intake"] }] };
  const res = selectNextActions({ document, now: NOW });
  const a = res.actions.find((x) => x.source_type === "repair_packet");
  assert.equal(a.priority, "critical");
  assert.equal(a.actor, "Cowork");
  assert.equal(a.action_type, "route_repair");
});

test("output is sorted by priority and every action carries the full schema", () => {
  const document = {
    repairPackets: [{ id: "r1", owner: "Codex", actual_behavior: "rail down" }],
    approvalExecutionQueue: { items: [approvedTask()] },
  };
  const res = selectNextActions({ document, leads: [aTierLead()], now: NOW });
  assert.equal(res.actions[0].priority, "critical"); // repair first
  for (const a of res.actions) {
    for (const k of ["action_id", "source_type", "source_id", "priority", "actor", "action_type", "reason", "required_approval", "required_evidence", "risk_level", "forbidden_actions", "status", "next_step"]) {
      assert.ok(k in a, `missing ${k}`);
    }
  }
});

// ─── AUTONOMY v1 PASS/FAIL: full loop end to end ──────────────────────────────

test("AUTONOMY v1: opportunity → next action → packet → evidence → status → next follow-up", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "autonomy-"));
  const { taskPacket, lifecycle } = approvedTask();
  const document = {
    status: "ready",
    generated_at: NOW,
    approvalExecutionQueue: { count: 1, skipped_not_approved: 0, items: [{ taskPacket, lifecycle }] },
    implementationWorkOrders: { orders: [] },
    repairPackets: [],
  };
  writeFileSync(path.join(dir, "latest.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8");

  // 1. An opportunity (approved execution packet) exists → selector picks the next action.
  const leads = [aTierLead()];
  const step1 = selectNextActions({ document, leads, now: NOW });
  const evidenceAction = step1.actions.find((a) => a.action_type === "request_actor_evidence");
  assert.ok(evidenceAction, "selector must request actor evidence for the queued task");
  // 1b. The approval/execution packet exists for that task.
  assert.equal(document.approvalExecutionQueue.items[0].taskPacket.task_id, taskPacket.task_id);
  // 1c. A revenue-moving lead action stays approval-gated.
  assert.ok(step1.actions.find((a) => a.action_type === "recommend_approved_call" && a.required_approval === true));

  // 2. Actor submits evidence and the status updates + persists (the write path).
  const submit = await submitActorEvidence(
    { task_id: taskPacket.task_id, actor: "OttoServ Outreach", evidence_text: "Sent approved follow-up", evidence_reference: "msg-1", advance_to: "completed" },
    { now: NOW, dataDir: dir, persistSupabase: false },
  );
  assert.equal(submit.ok, true);
  assert.equal(submit.status, "completed");

  // 3. Hermes re-reads the persisted state and selects the NEXT follow-up action.
  const updated = JSON.parse(readFileSync(path.join(dir, "latest.json"), "utf8"));
  const step2 = selectNextActions({ document: updated, leads, now: NOW });
  const followUp = step2.actions.find((a) => a.source_id === taskPacket.task_id);
  assert.ok(followUp, "selector must still address the task");
  assert.equal(followUp.action_type, "select_follow_up", "completed task → follow-up action");
  // The autonomy loop closed: detect → decide → (approval-gated) → evidence → status → next action.
});
