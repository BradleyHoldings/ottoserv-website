import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  generateRepairPackets,
  closeRepairPacketWithEvidence,
  blockerToFailure,
  REPAIRABLE_BLOCKER_TYPES,
} from "../src/lib/hermesSelfRepair.mjs";
import { computeScorecard } from "../src/lib/hermesAutonomyScorecard.mjs";
import { runOperatingCycle } from "../src/lib/hermesOrchestrator.mjs";

const NOW = "2026-06-04T12:00:00.000Z";

function aTierLead() {
  return { lead_id: "li-acme", company: "Acme Plumbing", tier: "A-tier", normalized_phone: "4075550101", status: "ready_to_call", score: 81, created_at: NOW, source_url: "https://reddit.com/x", intent: { source_urls: ["https://reddit.com/x"] } };
}

test("an idle call rail blocker becomes an owned repair packet with verification + evidence", () => {
  const scorecard = computeScorecard({ document: {}, leads: [aTierLead()], now: NOW });
  assert.ok(scorecard.top_blockers.some((b) => b.type === "call_rail_idle"));
  const res = generateRepairPackets({ scorecard, document: {}, now: NOW });
  const packet = res.new_packets.find((p) => /call_rail|retell|calling/i.test(`${p.what_failed} ${p.category}`));
  assert.ok(packet, "expected a repair packet for the idle call rail");
  assert.ok(clean(packet.owner).length > 0);
  assert.ok(Array.isArray(packet.verification_steps) && packet.verification_steps.length >= 1);
  assert.ok(Array.isArray(packet.required_evidence) && packet.required_evidence.length >= 1);
  assert.equal(packet.status, "open");
  function clean(v) { return String(v ?? "").trim(); }
});

test("empty-pipeline blocker maps to a missing-data failure and packet", () => {
  const f = blockerToFailure({ type: "empty_pipeline", id: "lead_discovery_rail", detail: "No leads." });
  assert.ok(/missing data|lead_discovery/i.test(f.channel));
  assert.ok(REPAIRABLE_BLOCKER_TYPES.has("empty_pipeline"));
  const scorecard = computeScorecard({ document: {}, leads: [], now: NOW });
  const res = generateRepairPackets({ scorecard, document: {}, now: NOW });
  assert.ok(res.new_packets.some((p) => /lead_discovery/.test(p.what_failed)));
});

test("a human-approval bottleneck is NOT turned into a repair packet", () => {
  // pending Jonathan approval surfaces a jonathan_approval blocker, which is not a rail defect.
  const document = {
    approvalExecutionQueue: { items: [] },
    implementationWorkOrders: { orders: [{ id: "impl-1", implementation_stage: "awaiting_pilot_scope_or_proposal", approvalRequired: true, approvalStatus: "pending" }] },
  };
  const scorecard = computeScorecard({ document, leads: [aTierLead()], now: NOW });
  const res = generateRepairPackets({ scorecard, document, now: NOW });
  assert.ok(!res.new_packets.some((p) => /approval_queue|jonathan/i.test(p.what_failed)));
});

test("idempotent: a rail that already has a repair packet is not duplicated", () => {
  const scorecard = computeScorecard({ document: {}, leads: [], now: NOW });
  const existing = generateRepairPackets({ scorecard, document: {}, now: NOW }).new_packets;
  const second = generateRepairPackets({ scorecard, document: { repairPackets: existing }, now: NOW });
  assert.equal(second.new_packets.length, 0);
  assert.ok(second.skipped_existing >= 1);
});

test("closing a repair packet requires evidence and emits a rail_repaired ledger event", () => {
  const scorecard = computeScorecard({ document: {}, leads: [], now: NOW });
  const packet = generateRepairPackets({ scorecard, document: {}, now: NOW }).new_packets[0];

  const noEvidence = closeRepairPacketWithEvidence(packet, {}, { now: NOW });
  assert.equal(noEvidence.ok, false);

  const closed = closeRepairPacketWithEvidence(packet, { evidence_summary: "Pipeline refilled; intake green", evidence_reference: "commit abc123" }, { now: NOW });
  assert.equal(closed.ok, true);
  assert.equal(closed.packet.status, "verified");
  assert.equal(closed.ledger_event.event_type, "rail_repaired");
  assert.equal(closed.ledger_event.outcome, "success");
});

test("operating cycle generates repair packets for detected broken rails and routes them", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "selfrepair-"));
  writeFileSync(path.join(dir, "latest.json"), `${JSON.stringify({}, null, 2)}\n`, "utf8");
  // empty leads → empty_pipeline broken rail detected
  const res = await runOperatingCycle({ now: NOW, dataDir: dir, leadsPath: path.join(dir, "none.json"), leadIntentDir: dir, clientsPath: path.join(dir, "noclients.json"), persistSupabase: false });
  assert.ok(res.summary.self_repair_packets >= 1, "cycle generates >=1 repair packet");
  assert.ok(res.cycle.self_repair.packets.some((p) => /lead_discovery/.test(p.what_failed)));
  // the selector routes the generated packet
  assert.ok(res.cycle.next_actions.some((a) => a.action_type === "route_repair" || a.action_type === "hold_for_owner_assignment"));
});
