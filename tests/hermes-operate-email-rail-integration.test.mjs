import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { runOperatingCycle } from "../src/lib/hermesOrchestrator.mjs";

const NOW = "2026-06-08T14:00:00.000Z";

test("operating cycle invokes the Phase 2 email rail from the real heartbeat", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "operate-email-rail-"));
  let called = false;

  const res = await runOperatingCycle({
    now: NOW,
    dataDir: dir,
    state: { document: {}, leads: [] },
    persistSupabase: false,
    emailRailRunner: async (ctx) => {
      called = true;
      assert.equal(ctx.now, NOW);
      assert.equal(ctx.mode, "no_send");
      return {
        ok: true,
        stopped: false,
        mode: "no_send",
        summary: {
          eligible_leads: 0,
          attempted: 0,
          sent: 0,
          replies: 0,
          reconciliations: 0,
          watchdog_actions: 0,
          watchdog_escalations: 0,
        },
        phases: { execute: { attempted: 0, sent: 0, results: [] } },
      };
    },
  });

  assert.equal(called, true);
  assert.equal(res.cycle.execution.email_rail.summary.sent, 0);
  assert.equal(res.summary.execution.email_rail_sent, 0);
});
