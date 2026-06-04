// Sprint integration: the operating cycle now CLOSES THE LOOP inside one heartbeat
// (queued -> execute -> evidence -> status -> re-score). Safe by default (no_send/
// no_dial); live execution requires an explicitly wired transport via options.
//   - default operate run sends nothing and fabricates no evidence
//   - operate with live mode + a STUB transport executes queued outbound, records
//     evidence, completes the lifecycle, and the re-scored cycle reflects it

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { runOperatingCycle } from "../src/lib/hermesOrchestrator.mjs";

const NOW = "2026-06-04T15:00:00.000Z";

// A revenue document whose queue already holds a ready, materialized B-tier email
// packet (as the actor queue produces it) — queued, evidence required, not sent.
function seedDirWithEmailPacket() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "operate-exec-"));
  const ap = {
    task_id: "apx-e1", channel: "email", lead_id: "li-e1", company: "Echo HVAC",
    contact: { email: "owner@echo.example" },
    packet: { kind: "email_packet", offer: "AI Receptionist" },
    evidence: { source_url: "https://example.com/e1", pain_point: "after-hours misses", offer_angle: "AI Receptionist" },
    policy: { materialized_via: "standing_outbound_policy", daily_cap: 50, tier: "B-tier" },
    required_evidence: ["Outbound email evidence: message id, timestamp, outcome."],
    mode: "no_send_no_call", status: "queued",
  };
  const document = {
    approvalExecutionQueue: { count: 1, items: [{
      taskPacket: { task_id: ap.task_id, actor_packet: ap },
      lifecycle: { assigned_task_id: ap.task_id, execution_status: "queued", evidence_status: "required", required_evidence: ap.required_evidence, submitted_evidence: [] },
    }] },
    implementationWorkOrders: { orders: [] },
    repairPackets: [],
  };
  writeFileSync(path.join(dir, "latest.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return dir;
}

test("default operate cycle sends nothing and fabricates no evidence", async () => {
  const dir = seedDirWithEmailPacket();
  const res = await runOperatingCycle({ now: NOW, dataDir: dir, state: { leads: [] }, persistSupabase: false });
  assert.equal(res.cycle.execution.email.sent, 0);
  assert.equal(res.summary.execution.emails_sent, 0);
  // The packet stays queued with no evidence.
  const doc = JSON.parse(readFileSync(path.join(dir, "latest.json"), "utf8"));
  const lc = doc.approvalExecutionQueue.items[0].lifecycle;
  assert.equal(lc.execution_status, "queued");
  assert.equal(lc.submitted_evidence.length, 0);
});

test("operate cycle with live mode + stub transport closes the queued packet end to end", async () => {
  const dir = seedDirWithEmailPacket();
  const sent = [];
  const res = await runOperatingCycle({
    now: NOW, dataDir: dir, state: { leads: [] }, persistSupabase: false,
    executionMode: "live",
    emailTransport: (draft) => { sent.push(draft); return { message_id: "msg-e1-xyz", status: "sent", to: draft.to, provider: "stub", sent_at: NOW }; },
  });

  assert.equal(sent.length, 1, "exactly one send via the wired transport");
  assert.equal(res.cycle.execution.email.sent, 1);
  assert.equal(res.summary.execution.emails_sent, 1);
  assert.equal(res.summary.persisted.document, true, "executed document persisted durably");

  // The lifecycle is now completed with real message evidence (loop closed).
  const doc = JSON.parse(readFileSync(path.join(dir, "latest.json"), "utf8"));
  const lc = doc.approvalExecutionQueue.items[0].lifecycle;
  assert.equal(lc.execution_status, "completed");
  assert.equal(lc.submitted_evidence[0].evidence_reference, "msg-e1-xyz");

  // The re-scored cycle reflects a closed, evidenced loop.
  assert.equal(res.cycle.grades.loop_closure, "pass");
  assert.equal(res.cycle.grades.evidence_discipline, "pass");
});
