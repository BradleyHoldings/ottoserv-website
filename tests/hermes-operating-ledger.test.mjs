import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { bridgeApprovalToExecution } from "../src/lib/approvalExecutionBridge.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";
import { submitActorEvidence } from "../src/lib/actorEvidenceIntake.mjs";
import {
  makeLedgerEntry,
  entriesFromNextActions,
  entriesFromEvidenceResult,
  entriesFromRepairPackets,
  appendLedgerEntries,
  summarizeLedger,
  recordLedgerEvents,
  loadOperatingLedger,
  LEDGER_ROW_ID,
} from "../src/lib/hermesOperatingLedger.mjs";

const NOW = "2026-06-03T12:00:00.000Z";

function approvedTask(action = "Send approved follow-up email to warm lead", id = "appr-001") {
  return bridgeApprovalToExecution(
    { decision: "approved", approval_item_id: id, original_requested_action: action, risk_level: "low" },
    { now: NOW },
  );
}

test("makeLedgerEntry normalizes, redacts PII, and is deterministic by dedupe key", () => {
  const e1 = makeLedgerEntry({ event_type: "evidence_submitted", source_id: "t1", detail: "Emailed maya@x.com at 555-184-3301", dedupe_key: "ev-1" }, { now: NOW });
  const e2 = makeLedgerEntry({ event_type: "evidence_submitted", source_id: "t1", detail: "different text", dedupe_key: "ev-1" }, { now: NOW });
  assert.equal(e1.entry_id, e2.entry_id, "same dedupe key → same id");
  assert.ok(!e1.detail.includes("maya@x.com"));
  assert.ok(e1.detail.includes("[redacted-email]"));
  assert.ok(e1.detail.includes("[redacted-phone]"));
});

test("entriesFromNextActions records one action_proposed per action (idempotent ids)", () => {
  const out = selectNextActions({ leads: [], now: NOW });
  const entries = entriesFromNextActions(out, { now: NOW });
  assert.ok(entries.length >= 1);
  assert.ok(entries.every((e) => e.event_type === "action_proposed"));
  // Stable: re-deriving yields identical ids.
  const again = entriesFromNextActions(out, { now: NOW });
  assert.deepEqual(entries.map((e) => e.entry_id), again.map((e) => e.entry_id));
});

test("appendLedgerEntries dedupes by entry_id and keeps chronological order", () => {
  const a = makeLedgerEntry({ event_type: "action_proposed", source_id: "s", dedupe_key: "a", ts: "2026-06-03T10:00:00.000Z" });
  const b = makeLedgerEntry({ event_type: "action_proposed", source_id: "s", dedupe_key: "b", ts: "2026-06-03T09:00:00.000Z" });
  const first = appendLedgerEntries([], [a, b]);
  assert.equal(first.added, 2);
  assert.equal(first.entries[0].entry_id, b.entry_id, "earlier ts first");
  const second = appendLedgerEntries(first.entries, [a]);
  assert.equal(second.added, 0, "duplicate not re-added");
});

test("appendLedgerEntries bounds to max (keeps newest tail)", () => {
  const many = Array.from({ length: 10 }, (_, i) =>
    makeLedgerEntry({ event_type: "action_proposed", source_id: `s${i}`, dedupe_key: `k${i}`, ts: `2026-06-03T0${i}:00:00.000Z` }));
  const res = appendLedgerEntries([], many, { max: 5 });
  assert.equal(res.total, 5);
  assert.equal(res.entries[0].source_id, "s5", "oldest dropped, newest tail kept");
});

test("summarizeLedger derives actor performance, action-type outcomes, and rail reliability", () => {
  const entries = [
    makeLedgerEntry({ event_type: "action_proposed", actor: "Cowork", action_type: "dispatch_lead_research", source_id: "r", dedupe_key: "p1" }),
    makeLedgerEntry({ event_type: "evidence_submitted", actor: "Cowork", source_id: "t1", dedupe_key: "e1" }),
    makeLedgerEntry({ event_type: "status_changed", actor: "Cowork", source_id: "t1", to_status: "completed", outcome: "success", action_type: "request_actor_evidence", dedupe_key: "s1" }),
    makeLedgerEntry({ event_type: "rail_broken", source_type: "repair_packet", source_id: "rail-x", outcome: "blocked", dedupe_key: "rb" }),
    makeLedgerEntry({ event_type: "rail_repaired", source_type: "repair_packet", source_id: "rail-x", outcome: "success", dedupe_key: "rr" }),
  ];
  const s = summarizeLedger(entries);
  assert.equal(s.actors.Cowork.proposed, 1);
  assert.equal(s.actors.Cowork.evidence_submitted, 1);
  assert.equal(s.actors.Cowork.completed, 1);
  assert.equal(s.actors.Cowork.completion_rate, 1);
  assert.equal(s.rails["rail-x"].broken, 1);
  assert.equal(s.rails["rail-x"].repaired, 1);
});

test("entriesFromRepairPackets distinguishes broken vs repaired", () => {
  const e = entriesFromRepairPackets([
    { id: "r1", owner: "Codex", status: "open", actual_behavior: "rail down" },
    { id: "r2", owner: "Cowork", status: "verified", actual_behavior: "fixed" },
  ]);
  assert.equal(e[0].event_type, "rail_broken");
  assert.equal(e[1].event_type, "rail_repaired");
});

test("recordLedgerEvents persists locally and is idempotent across runs", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ledger-"));
  const events = [{ event_type: "action_proposed", actor: "Cowork", source_id: "s1", dedupe_key: "k1" }];
  const r1 = await recordLedgerEvents(events, { dataDir: dir, now: NOW, persistSupabase: false });
  assert.equal(r1.added, 1);
  assert.equal(r1.persisted.local, true);

  // Re-recording the same event adds nothing.
  const r2 = await recordLedgerEvents(events, { dataDir: dir, now: NOW, persistSupabase: false });
  assert.equal(r2.added, 0);
  assert.equal(r2.total, 1);

  const onDisk = JSON.parse(readFileSync(path.join(dir, "operating-ledger.json"), "utf8"));
  assert.equal(onDisk.id, LEDGER_ROW_ID);
  assert.equal(onDisk.entries.length, 1);
  assert.ok(onDisk.summary.actors.Cowork);
});

test("loadOperatingLedger reads the local mirror back", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ledger-"));
  await recordLedgerEvents([{ event_type: "action_proposed", source_id: "s", dedupe_key: "k" }], { dataDir: dir, now: NOW, persistSupabase: false });
  const loaded = await loadOperatingLedger({ dataDir: dir });
  assert.equal(loaded.available, true);
  assert.equal(loaded.source.kind, "local_file");
  assert.equal(loaded.entries.length, 1);
});

// ─── v2 MEMORY: ledger accumulates the real loop across runs and learns ───────

test("v2 MEMORY: selector → evidence → ledger accumulates outcomes over two runs", async () => {
  const stateDir = mkdtempSync(path.join(os.tmpdir(), "v2-state-"));
  const ledgerDir = mkdtempSync(path.join(os.tmpdir(), "v2-ledger-"));
  const { taskPacket, lifecycle } = approvedTask();
  const document = {
    status: "ready",
    generated_at: NOW,
    approvalExecutionQueue: { count: 1, items: [{ taskPacket, lifecycle }] },
    repairPackets: [{ id: "repair-leads", owner: "Cowork", status: "open", actual_behavior: "Only 1 high-intent lead" }],
  };
  writeFileSync(path.join(stateDir, "latest.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8");

  // Run 1: record proposed actions + the open rail.
  const run1 = selectNextActions({ document, now: NOW });
  await recordLedgerEvents(
    [...entriesFromNextActions(run1), ...entriesFromRepairPackets(document.repairPackets)],
    { dataDir: ledgerDir, now: NOW, persistSupabase: false },
  );

  // Actor executes → submits evidence → status completes (real intake/write path).
  const submit = await submitActorEvidence(
    { task_id: taskPacket.task_id, actor: "OttoServ Outreach", evidence_text: "Sent approved follow-up", evidence_reference: "msg-1", advance_to: "completed" },
    { now: NOW, dataDir: stateDir, persistSupabase: false },
  );
  assert.equal(submit.status, "completed");

  // Run 2: record the evidence + status outcome into the SAME ledger.
  const rec2 = await recordLedgerEvents(
    entriesFromEvidenceResult(submit, { task_id: taskPacket.task_id, actor: "OttoServ Outreach" }),
    { dataDir: ledgerDir, now: NOW, persistSupabase: false },
  );

  // Memory now spans the whole loop: a proposal, a rail break, evidence, and a
  // completed status — and the learning summary reflects it.
  assert.ok(rec2.total >= 4);
  assert.equal(rec2.summary.totals.by_event_type.status_changed, 1);
  assert.equal(rec2.summary.actors["OttoServ Outreach"].completed, 1, "Hermes now remembers who delivered");
  assert.equal(rec2.summary.rails["repair-leads"].broken, 1, "and which rail was broken");
});
