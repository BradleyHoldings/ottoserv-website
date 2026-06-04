// Priority 8: Hermes must report only TRUE blockers, not misleading wording.
// Distinguish "no fresh imports" (truly stale) from "fresh imports but low recent
// high-intent volume" so a freshly imported pipeline is never called stale.

import assert from "node:assert/strict";
import test from "node:test";

import { computeScorecard } from "../src/lib/hermesAutonomyScorecard.mjs";

const NOW = "2026-06-04T12:00:00.000Z";
const daysAgo = (n) => new Date(Date.parse(NOW) - n * 86_400_000).toISOString();

test("fresh leads + low recent-intent volume → low_recent_intent (NOT stale_pipeline)", () => {
  const leads = [
    { lead_id: "li-1", tier: "A-tier", created_at: NOW, source_url: "u", normalized_phone: "1" },
    { lead_id: "li-2", tier: "B-tier", created_at: NOW, source_url: "u", email: "b@x.com" },
  ];
  const sc = computeScorecard({ document: {}, leads, pipeline: { summary: { low_recent_intent: true } }, now: NOW });
  assert.equal(sc.dimensions.lead_pipeline.status, "degraded");
  assert.equal(sc.dimensions.lead_pipeline.degraded_reason, "low_recent_intent_volume");
  assert.equal(sc.dimensions.lead_pipeline.stale_imports, false);
  assert.equal(sc.dimensions.lead_pipeline.fresh_leads, 2);

  const blocker = sc.top_blockers.find((b) => b.id === "lead_discovery_rail");
  assert.equal(blocker.type, "low_recent_intent");
  assert.doesNotMatch(blocker.detail, /no fresh leads/i, "must not falsely claim no fresh leads");
});

test("no fresh imports → stale_pipeline with accurate wording", () => {
  const leads = [{ lead_id: "li-old", tier: "B-tier", created_at: daysAgo(10), source_url: "u", email: "b@x.com" }];
  const sc = computeScorecard({ document: {}, leads, pipeline: { summary: { low_recent_intent: false } }, now: NOW });
  assert.equal(sc.dimensions.lead_pipeline.status, "degraded");
  assert.equal(sc.dimensions.lead_pipeline.degraded_reason, "no_fresh_imports");
  assert.equal(sc.dimensions.lead_pipeline.stale_imports, true);
  const blocker = sc.top_blockers.find((b) => b.id === "lead_discovery_rail");
  assert.equal(blocker.type, "stale_pipeline");
  assert.match(blocker.detail, /stale/i);
});

test("fresh + healthy recent-intent → no pipeline blocker", () => {
  const leads = [{ lead_id: "li-1", tier: "A-tier", created_at: NOW, source_url: "u", normalized_phone: "1" }];
  const sc = computeScorecard({ document: {}, leads, pipeline: { summary: { low_recent_intent: false } }, now: NOW });
  assert.equal(sc.dimensions.lead_pipeline.status, "healthy");
  assert.ok(!sc.top_blockers.some((b) => b.id === "lead_discovery_rail"));
});
