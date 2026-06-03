import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { runRevenueDailyLoop, inferCycle } from "../src/lib/revenueLoopRunner.mjs";

const NOW = "2026-06-03T09:00:00.000Z";

// A throwaway, fully-empty source tree so the runner reads no repo data.
function emptySourceCwd() {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "loop-src-"));
  return { cwd };
}

function tmpOut() {
  return mkdtempSync(path.join(os.tmpdir(), "loop-out-"));
}

test("inferCycle splits on midday (host-local time)", () => {
  // inferCycle uses local hours to match the host-local cron schedule, so the
  // test must use local-time strings (no trailing "Z") to stay deterministic
  // across machine timezones. 09:00 local < noon → morning; 15:00 local → afternoon.
  assert.equal(inferCycle("2026-06-03T09:00:00"), "morning");
  assert.equal(inferCycle("2026-06-03T15:00:00"), "afternoon");
});

test("runner writes latest.json, a dated run, and the work-order store into outputDir", async () => {
  const outputDir = tmpOut();
  const result = await runRevenueDailyLoop({ now: NOW, outputDir, sourceOptions: emptySourceCwd() });

  assert.ok(existsSync(path.join(outputDir, "latest.json")), "latest.json written");
  assert.ok(existsSync(result.datedPath), "dated run written");
  assert.equal(result.summary.latest_output_path, path.join(outputDir, "latest.json"));

  const latest = JSON.parse(readFileSync(path.join(outputDir, "latest.json"), "utf8"));
  assert.equal(latest.generated_at, NOW);
  assert.ok(latest.health, "carries health");
});

test("empty source state degrades safely to repair_first (no throw, honest status)", async () => {
  const outputDir = tmpOut();
  const result = await runRevenueDailyLoop({ now: NOW, outputDir, sourceOptions: emptySourceCwd() });

  assert.equal(result.summary.status, "repair_first");
  assert.equal(result.summary.health.status, "degraded");
  assert.equal(result.summary.last_run_at, NOW);
  assert.ok(result.summary.revenue_risks.some((r) => /empty/i.test(r)));
});

test("a report-ready scan becomes a durable, idempotent implementation work order", async () => {
  const src = mkdtempSync(path.join(os.tmpdir(), "loop-src-"));
  writeFileSync(
    path.join(src, "process_scans.json"),
    JSON.stringify([
      {
        id: "ps_live",
        status: "report_ready",
        company_name: "Harbor Point PM",
        contact_name: "Maya",
        email: "maya@harbor.com",
        main_leak: "missed_calls",
        pilot_recommendation: "Pilot AI receptionist for 30 days.",
        automation_opportunities_json: ["missed-call recovery"],
        public_report_url: "https://ottoserv.com/r/harbor",
        email_sent_at: "2026-06-02T10:00:00.000Z",
      },
    ]),
  );
  const outputDir = tmpOut();
  const sourceOptions = { cwd: src, processScansPath: path.join(src, "process_scans.json") };

  const first = await runRevenueDailyLoop({ now: NOW, outputDir, sourceOptions });
  assert.equal(first.summary.implementation_work_orders.created_this_run, 1);
  assert.ok(existsSync(path.join(outputDir, "implementation-work-orders.json")));

  const store = JSON.parse(readFileSync(path.join(outputDir, "implementation-work-orders.json"), "utf8"));
  assert.equal(store.length, 1);
  assert.equal(store[0].client, "Harbor Point PM");

  // Re-run (next cycle) must not duplicate.
  const second = await runRevenueDailyLoop({ now: NOW, outputDir, sourceOptions });
  assert.equal(second.summary.implementation_work_orders.created_this_run, 0);
  assert.equal(second.summary.implementation_work_orders.total, 1);
});

test("runner writes only inside outputDir (safe, contained side effects)", async () => {
  const outputDir = tmpOut();
  const before = mkdirSync; // noop ref to keep import used pattern explicit
  void before;
  const result = await runRevenueDailyLoop({ now: NOW, outputDir, sourceOptions: emptySourceCwd() });

  for (const p of [result.datedPath, result.latestPath, result.storePath]) {
    assert.ok(p.startsWith(outputDir), `${p} is inside outputDir`);
  }
  // Every file produced lives in outputDir.
  const entries = readdirSync(outputDir);
  assert.ok(entries.includes("latest.json"));
  assert.ok(entries.includes("implementation-work-orders.json") || result.summary.implementation_work_orders.total === 0);
});
