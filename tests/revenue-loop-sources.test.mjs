import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assembleRevenueLoopInput,
  detectFailures,
  detectRevenueRisks,
  buildImplementationWorkOrders,
} from "../src/lib/revenueLoopSources.mjs";
import { createDailyLoopRun } from "../src/lib/revenueEngine.mjs";

const NOW = "2026-06-03T09:00:00.000Z";

function makeFixtureDir(files = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "rev-loop-src-"));
  const callImportDir = path.join(root, "call-imports");
  const socialDir = path.join(root, "social-engine");
  mkdirSync(callImportDir, { recursive: true });
  mkdirSync(socialDir, { recursive: true });
  if (files.leads) writeFileSync(path.join(callImportDir, "leads.json"), JSON.stringify(files.leads));
  if (files.callOutcomes) writeFileSync(path.join(callImportDir, "call_outcomes.json"), JSON.stringify(files.callOutcomes));
  if (files.social) writeFileSync(path.join(socialDir, "social_drafts.json"), JSON.stringify(files.social));
  if (files.scans) writeFileSync(path.join(root, "process_scans.json"), JSON.stringify(files.scans));
  return {
    callImportDir,
    socialDir,
    processScansPath: path.join(root, "process_scans.json"),
    now: NOW,
  };
}

test("empty data dir flips the loop to repair_first with a lead-discovery repair packet", async () => {
  const opts = makeFixtureDir({});
  const { input, sources } = await assembleRevenueLoopInput(opts);

  assert.equal(sources.leads_count, 0);
  assert.ok(input.failures.some((f) => f.item_id === "lead_discovery_rail"));
  assert.ok(input.revenueRisks.some((r) => /empty/i.test(r)));

  const run = createDailyLoopRun(input);
  assert.equal(run.status, "repair_first");
  assert.ok(run.health.repair_count >= 1);
  assert.equal(run.health.status, "degraded");
});

test("real leads produce real call/email/enrich queues through the engine", async () => {
  const opts = makeFixtureDir({
    leads: [
      { lead_id: "l1", company: "Acme PM", tier: "A-tier", normalized_phone: "+15551234567", status: "ready_to_call", created_at: NOW },
      { lead_id: "l2", company: "Bolt HVAC", tier: "B-tier", email: "ops@bolt.com", status: "ready_to_email", created_at: NOW },
      { lead_id: "l3", company: "Gray Co", tier: "C-tier", status: "needs_enrichment", created_at: NOW },
    ],
    callOutcomes: [{ outcome_id: "o1", lead_id: "l1", phone: "+15551234567", status: "booked_meeting", timestamp: NOW }],
  });
  const { input, sources } = await assembleRevenueLoopInput(opts);

  assert.equal(sources.leads_count, 3);
  assert.equal(sources.booked_calls, 1);

  const run = createDailyLoopRun(input);
  assert.equal(run.queues.calls.length, 1, "A-tier lead becomes a call queue item");
  assert.equal(run.queues.outreach.length, 1, "B-tier lead becomes an email queue item");
  assert.ok(run.queues.coworkExecution.length >= 1, "C-tier lead routes to Cowork enrichment");
  // A-tier ready + at least one outcome recorded → call rail is NOT flagged idle.
  assert.ok(!input.failures.some((f) => f.item_id === "call_rail_idle"));
});

test("A-tier leads with no recorded outcomes flag the call rail as idle", () => {
  const failures = detectFailures({
    leads: [{ lead_id: "l1", tier: "A-tier", normalized_phone: "+15550000000" }],
    callOutcomes: [],
    paths: { leads: "/x/leads.json", callOutcomes: "/x/call_outcomes.json" },
    now: NOW,
  });
  assert.ok(failures.some((f) => f.item_id === "call_rail_idle"));
});

test("report-ready process scan becomes an implementation work-order seed", () => {
  const orders = buildImplementationWorkOrders([
    {
      id: "ps_1",
      status: "report_ready",
      company_name: "Acme PM",
      contact_name: "Dana",
      email: "dana@acme.com",
      main_leak: "missed_calls",
      pilot_recommendation: "Start AI receptionist pilot for 30 days.",
      automation_opportunities_json: ["missed-call recovery", "after-hours coverage"],
      public_report_url: "https://ottoserv.com/r/abc",
      email_sent_at: "2026-06-02T10:00:00.000Z",
    },
    { id: "ps_2", status: "draft" },
  ]);
  assert.equal(orders.length, 1);
  assert.equal(orders[0].source, "front_office_leak_check");
  assert.equal(orders[0].company, "Acme PM");
  assert.equal(orders[0].stage, "awaiting_pilot_scope_or_proposal");
  assert.equal(orders[0].approval_required, true);
  assert.ok(orders[0].automation_opportunities.length === 2);
});

test("revenue risks flag stale leads, empty content, and undelivered reports", () => {
  const risks = detectRevenueRisks({
    leads: [{ lead_id: "l1", created_at: "2026-05-01T00:00:00.000Z" }],
    callOutcomes: [],
    social: [],
    scans: [{ status: "report_ready", email_sent_at: "" }],
    now: NOW,
  });
  assert.ok(risks.some((r) => /stale/i.test(r)));
  assert.ok(risks.some((r) => /content rail/i.test(r)));
  assert.ok(risks.some((r) => /service-delivery hand-off/i.test(r)));
});
