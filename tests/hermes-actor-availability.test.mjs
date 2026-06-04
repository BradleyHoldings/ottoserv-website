// Sprint priority 4: actor availability + cost-aware routing.
//   - temporary credit/window exhaustion is detected as TEMPORARY (queue, not break)
//   - elapsed reset windows recover automatically
//   - cost-aware routing prefers subscription/browser; API is fallback only
//   - self-repair DEFERS work owned by an exhausted actor instead of minting a
//     broken-rail packet (so reliability is not reduced by a credit outage)

import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveActorAvailability,
  isTemporarilyUnavailable,
  chooseActor,
} from "../src/lib/hermesActorAvailability.mjs";
import { generateRepairPackets } from "../src/lib/hermesSelfRepair.mjs";

const NOW = "2026-06-04T15:00:00.000Z";

test("credit exhaustion is temporary (queue until reset), not a defect", () => {
  const avail = { Cowork: { state: "credit_exhausted", resets_at: "2026-06-04T20:00:00.000Z" } };
  const r = resolveActorAvailability("Cowork", avail, NOW);
  assert.equal(r.available, false);
  assert.equal(r.temporary, true);
  assert.equal(r.resets_at, "2026-06-04T20:00:00.000Z");
  assert.equal(isTemporarilyUnavailable("Cowork", avail, NOW), true);
});

test("a reset window in the past recovers the actor automatically", () => {
  const avail = { Cowork: { state: "credit_exhausted", resets_at: "2026-06-04T09:00:00.000Z" } };
  const r = resolveActorAvailability("Cowork", avail, NOW);
  assert.equal(r.available, true);
  assert.equal(r.temporary, false);
});

test("a non-temporary state (disabled/broken) is a genuine defect", () => {
  const r = resolveActorAvailability("Codex", { Codex: { state: "disabled" } }, NOW);
  assert.equal(r.available, false);
  assert.equal(r.temporary, false);
});

test("cost-aware routing prefers cheaper rails; API is fallback only", () => {
  // Cowork (subscription) available → chosen over API even if API is allowed.
  assert.equal(chooseActor(["Cowork", "API"], {}, { now: NOW, apiBudgetAvailable: true }), "Cowork");
  // Cowork exhausted, no API budget → nothing cheaper available → null (queue it).
  const avail = { Cowork: { state: "credit_exhausted", resets_at: "2026-06-04T20:00:00.000Z" } };
  assert.equal(chooseActor(["Cowork", "API"], avail, { now: NOW, apiBudgetAvailable: false }), null);
  // Same, but API budget approved → fall back to API.
  assert.equal(chooseActor(["Cowork", "API"], avail, { now: NOW, apiBudgetAvailable: true }), "API");
});

// The reliability-critical case: a repairable blocker whose owner is temporarily
// out of credits must NOT become a broken-rail packet.
function scorecardWithBlocker() {
  return {
    top_blockers: [
      { type: "stale_pipeline", id: "lead_discovery_rail", priority: "high", detail: "No leads imported recently." },
    ],
  };
}

test("actor credit outage does not reduce reliability (deferred, not repaired)", () => {
  const scorecard = scorecardWithBlocker();
  // First, with no availability info → behaves as before: a repair packet is minted.
  const baseline = generateRepairPackets({ scorecard, now: NOW });
  assert.equal(baseline.new_packets.length, 1);
  const owner = baseline.new_packets[0].owner;

  // Now mark that owner temporarily credit-exhausted → it must be DEFERRED, not a
  // broken-rail repair packet, so rail reliability is not dragged down.
  const availability = { [owner]: { state: "credit_exhausted", resets_at: "2026-06-04T22:00:00.000Z" } };
  const out = generateRepairPackets({ scorecard, now: NOW, availability });
  assert.equal(out.new_packets.length, 0, "no broken-rail packet for an exhausted actor");
  assert.equal(out.deferred.length, 1);
  assert.equal(out.deferred[0].owner, owner);
  assert.equal(out.deferred[0].reason, "credit_exhausted");
  assert.equal(out.deferred[0].resets_at, "2026-06-04T22:00:00.000Z");
  assert.equal(out.summary.deferred_until_reset, 1);
});

test("a genuinely disabled owner still produces a repair packet", () => {
  const scorecard = scorecardWithBlocker();
  const owner = generateRepairPackets({ scorecard, now: NOW }).new_packets[0].owner;
  const out = generateRepairPackets({ scorecard, now: NOW, availability: { [owner]: { state: "disabled" } } });
  assert.equal(out.new_packets.length, 1, "non-temporary defect is still repaired");
  assert.equal(out.deferred.length, 0);
});
