import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  upsertRevenueState,
  readRevenueState,
  revenueSupabaseConfigured,
} from "../src/lib/revenueEngineSupabaseStore.mjs";
import {
  readAutonomousRevenueState,
  readImplementationWorkOrders,
} from "../src/lib/revenueEngineReadAdapter.mjs";

const URL = "https://example.supabase.co";
const KEY = "service-key-test";

const SAMPLE_DOC = {
  status: "repair_first",
  generated_at: "2026-06-03T09:00:00.000Z",
  schedule: "Monday-Saturday morning and afternoon",
  plan: { run_date: "2026-06-03", revenue_risks: ["Cold-lead pipeline is empty."], broken_execution_rails: ["lead_discovery_rail"] },
  health: { status: "degraded", repair_count: 1, evidence_gap_count: 0, queue_counts: { calls: 0 }, errors: ["1 repair item open."] },
  repairPackets: [{ id: "r1", owner: "Codex", category: "Missing data", what_failed: "lead_discovery_rail", expected_behavior: "x", actual_behavior: "empty", verification_steps: [], status: "open" }],
  implementationWorkOrders: {
    orders: [
      {
        id: "WO-2026-00046",
        title: "Implementation: front office automation pilot — Harbor Point PM",
        client: "Harbor Point PM",
        status: "needs_approval",
        implementation_stage: "awaiting_pilot_scope_or_proposal",
        approvalRequired: true,
        approvalStatus: "pending",
        gated_actions: [{ action: "payment_link", approval_required: true, reason: "x" }],
        required_evidence: ["Report delivery proof."],
        success_criteria: ["Pilot booked."],
        automation_opportunities: ["missed-call recovery"],
        contactName: "Maya Ellis",
        contactEmail: "maya@harborpoint.com",
        contactPhone: "555-184-3301",
      },
    ],
  },
};

function withSupabaseEnv(fn) {
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevKey = process.env.SUPABASE_SERVICE_KEY;
  const prevFetch = global.fetch;
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
  process.env.SUPABASE_SERVICE_KEY = KEY;
  const calls = [];
  return Promise.resolve(fn(calls))
    .finally(() => {
      if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
      if (prevKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = prevKey;
      global.fetch = prevFetch;
    });
}

function stubFetch(calls, responder) {
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return responder(url, init);
  };
}

test("not configured: store no-ops and reports skipped (dev/local unchanged)", async () => {
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevKey = process.env.SUPABASE_SERVICE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
  const prevFetch = global.fetch;
  global.fetch = async () => { throw new Error("network must not be called when unconfigured"); };
  try {
    assert.equal(revenueSupabaseConfigured(), false);
    const res = await upsertRevenueState(SAMPLE_DOC);
    assert.equal(res.skipped, true);
    assert.equal(await readRevenueState(), null);
  } finally {
    if (prevUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    if (prevKey !== undefined) process.env.SUPABASE_SERVICE_KEY = prevKey;
    global.fetch = prevFetch;
  }
});

test("upsert posts the document with on_conflict=id merge-duplicates", async () => {
  await withSupabaseEnv(async (calls) => {
    stubFetch(calls, async () => ({ ok: true, status: 201, text: async () => "" }));
    const res = await upsertRevenueState(SAMPLE_DOC);
    assert.equal(res.ok, true);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/rest\/v1\/revenue_engine_state\?on_conflict=id/);
    assert.equal(calls[0].init.method, "POST");
    assert.match(calls[0].init.headers.Prefer, /merge-duplicates/);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.id, "latest");
    assert.equal(body.status, "repair_first");
    assert.deepEqual(body.document, SAMPLE_DOC);
  });
});

test("upsert never throws on a Supabase error", async () => {
  await withSupabaseEnv(async (calls) => {
    stubFetch(calls, async () => ({ ok: false, status: 500, text: async () => "boom" }));
    const res = await upsertRevenueState(SAMPLE_DOC);
    assert.equal(res.ok, false);
    assert.match(res.error, /500/);
  });
});

test("readRevenueState returns the stored document", async () => {
  await withSupabaseEnv(async (calls) => {
    stubFetch(calls, async () => ({ ok: true, json: async () => [{ document: SAMPLE_DOC, updated_at: "2026-06-03T09:05:00.000Z" }] }));
    const result = await readRevenueState();
    assert.deepEqual(result.document, SAMPLE_DOC);
    assert.match(calls[0].url, /id=eq\.latest/);
  });
});

test("adapter falls back to Supabase for revenue state when no local file (Vercel case)", async () => {
  const emptyDir = mkdtempSync(path.join(os.tmpdir(), "rev-vercel-"));
  await withSupabaseEnv(async (calls) => {
    stubFetch(calls, async () => ({ ok: true, json: async () => [{ document: SAMPLE_DOC, updated_at: "2026-06-03T09:05:00.000Z" }] }));
    const state = await readAutonomousRevenueState({ dataDir: emptyDir });
    assert.equal(state.available, true);
    assert.match(state.source.file, /^supabase:revenue_engine_state$/);
    assert.equal(state.status, "repair_first");
    assert.equal(state.health.repair_count, 1);
    assert.ok(state.revenueRisks.some((r) => /empty/i.test(r)));
  });
});

test("adapter falls back to Supabase for work orders and still redacts PII", async () => {
  const emptyDir = mkdtempSync(path.join(os.tmpdir(), "rev-vercel-"));
  await withSupabaseEnv(async (calls) => {
    stubFetch(calls, async () => ({ ok: true, json: async () => [{ document: SAMPLE_DOC, updated_at: "2026-06-03T09:05:00.000Z" }] }));
    const result = await readImplementationWorkOrders({ dataDir: emptyDir });
    assert.equal(result.available, true);
    assert.equal(result.summary.total, 1);
    const wo = result.workOrders[0];
    assert.equal(wo.client, "Harbor Point PM");
    assert.equal(wo.contactName, "[redacted]");
    assert.equal(wo.contactEmail, "[redacted]");
    assert.equal(wo.contactPhone, "[redacted]");
    const serialized = JSON.stringify(result.workOrders);
    assert.ok(!serialized.includes("maya@harborpoint.com"));
    assert.ok(!serialized.includes("555-184-3301"));
  });
});

test("adapter returns safe empty state when neither file nor Supabase is available", async () => {
  const emptyDir = mkdtempSync(path.join(os.tmpdir(), "rev-empty-"));
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevKey = process.env.SUPABASE_SERVICE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
  try {
    const state = await readAutonomousRevenueState({ dataDir: emptyDir });
    assert.equal(state.available, false);
    assert.equal(state.status, "unknown");
  } finally {
    if (prevUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    if (prevKey !== undefined) process.env.SUPABASE_SERVICE_KEY = prevKey;
  }
});
