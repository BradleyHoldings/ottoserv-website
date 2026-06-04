import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";
import { runOperatingCycle } from "../src/lib/hermesOrchestrator.mjs";

const NOW = "2026-06-04T12:00:00.000Z";
const daysAgo = (n) => new Date(Date.parse(NOW) - n * 86_400_000).toISOString();

test("selector surfaces a churn-risk opportunity as an approval-gated next action", () => {
  const clients = [{ client_id: "c1", name: "Acme Plumbing", usage_trend: "declining", sentiment: "negative", last_contact_at: daysAgo(45) }];
  const res = selectNextActions({ clients, leads: [{ lead_id: "l", tier: "B-tier", created_at: NOW }], now: NOW });
  const a = res.actions.find((x) => x.action_type === "client_retention_checkin");
  assert.ok(a, "expected a churn-risk retention check-in action");
  assert.equal(a.required_approval, true);
  assert.equal(a.source_type, "client_success");
  assert.equal(a.suggested_prompt_or_packet.opportunity_type, "churn_risk");
});

test("selector surfaces an expansion opportunity for a succeeding client", () => {
  const clients = [{ client_id: "c2", name: "PeakAir", usage_trend: "growing", sentiment: "positive", last_contact_at: NOW, pilot_baseline: 10, pilot_current: 30, pilot_target: 20 }];
  const res = selectNextActions({ clients, leads: [], now: NOW });
  const a = res.actions.find((x) => x.action_type === "propose_expansion");
  assert.ok(a);
  assert.equal(a.required_approval, true);
  assert.equal(a.suggested_prompt_or_packet.opportunity_type, "expansion");
});

test("internal optimization opportunity is NOT approval-gated and routes to Codex", () => {
  const clients = [{ client_id: "c4", name: "Harbor Point", usage_trend: "steady", sentiment: "neutral", last_contact_at: NOW, workflow_signals: [{ id: "w1", kind: "inefficiency", optimization: "Batch the nightly sync", detail: "sync runs per-record" }] }];
  const res = selectNextActions({ clients, leads: [], now: NOW });
  const a = res.actions.find((x) => x.action_type === "internal_optimization");
  assert.ok(a);
  assert.equal(a.required_approval, false);
  assert.equal(a.actor, "Codex");
});

test("operating cycle senses a client-success store file and surfaces the opportunity", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "cs-"));
  writeFileSync(path.join(dir, "latest.json"), `${JSON.stringify({}, null, 2)}\n`, "utf8");
  const clientsPath = path.join(dir, "clients.json");
  writeFileSync(clientsPath, `${JSON.stringify([{ client_id: "c1", name: "Acme", usage_trend: "declining", sentiment: "negative", last_contact_at: daysAgo(45) }], null, 2)}\n`, "utf8");

  const res = await runOperatingCycle({ now: NOW, dataDir: dir, leadsPath: path.join(dir, "nope.json"), leadIntentDir: dir, clientsPath, persistSupabase: false });
  assert.equal(res.cycle.sense.clients, 1);
  assert.ok(res.cycle.next_actions.some((a) => a.action_type === "client_retention_checkin"));
});
