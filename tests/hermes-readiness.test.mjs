// Autonomy readiness step 3: a single readiness report for acquisition, delivery,
// and client success, with true blockers, next actions, and the persistence gap.

import assert from "node:assert/strict";
import test from "node:test";

import { computeReadiness } from "../src/lib/hermesReadiness.mjs";
import { simulatePaidHandoff } from "../src/lib/hermesHandoffSimulator.mjs";

const NOW = "2026-06-04T12:00:00.000Z";

function freshLeads() {
  return [
    { lead_id: "li-b1", company: "Bravo Plumbing", tier: "B-tier", email: "o@bravo.example", status: "ready_to_email", score: 66, source_url: "https://reddit.com/x/b1", created_at: NOW, intent: { recommended_offer: "AI Receptionist", source_urls: ["https://reddit.com/x/b1"] } },
    { lead_id: "li-a1", company: "Acme Plumbing", tier: "A-tier", normalized_phone: "4075550111", status: "ready_to_call", score: 82, source_url: "https://reddit.com/x/a1", created_at: NOW, intent: { likely_ottoserv_angle: "AI Receptionist", source_urls: ["https://reddit.com/x/a1"] } },
  ];
}

test("empty pipeline → acquisition blocked, not ready to acquire", () => {
  const r = computeReadiness({ document: {}, leads: [], now: NOW }, { now: NOW });
  assert.equal(r.acquisition.status, "blocked");
  assert.equal(r.overall.ready_for_acquisition, false);
  assert.ok(r.overall.top_blockers.some((b) => b.type === "empty_pipeline"));
});

test("fresh leads → acquisition not blocked, normal outbound NOT per-item gated", () => {
  const r = computeReadiness({ document: {}, leads: freshLeads(), pipeline: { summary: { low_recent_intent: false } }, now: NOW }, { now: NOW });
  assert.notEqual(r.acquisition.status, "blocked");
  assert.equal(r.acquisition.normal_outbound_gated, 0, "normal email/call is materialized, not gated");
  assert.ok(r.acquisition.outbound_materialized_standing >= 1);
  assert.equal(r.overall.ready_for_acquisition, true);
});

test("delivery chain reports build packets from work orders in the document", () => {
  const sim = simulatePaidHandoff({ lead: { lead_id: "li-acme", company: "Acme", pain_point: "missed calls", intent: { recommended_offer: "AI Receptionist", automation_opportunities: ["Missed-call recovery"] } } }, { now: NOW });
  const document = { implementationWorkOrders: { orders: [sim.work_order] } };
  const r = computeReadiness({ document, leads: freshLeads(), now: NOW }, { now: NOW });
  assert.equal(r.delivery.work_orders, 1);
  // Unapproved WO → packet is blocked on approval (a correct gate, not a failure).
  assert.equal(r.delivery.build_packets_blocked_on_approval, 1);
  assert.notEqual(r.delivery.status, "blocked");
  assert.equal(r.overall.ready_for_delivery, true);
});

test("approved work order → delivery shows a ready build packet", () => {
  const sim = simulatePaidHandoff({ lead: { lead_id: "li-acme", company: "Acme", pain_point: "missed calls", intent: { recommended_offer: "AI Receptionist" } } }, { now: NOW });
  const document = { implementationWorkOrders: { orders: [{ ...sim.work_order, approvalStatus: "approved" }] } };
  const r = computeReadiness({ document, leads: freshLeads(), now: NOW }, { now: NOW });
  assert.equal(r.delivery.build_packets_ready, 1);
});

test("report carries persistence gap (env names only) and overall readiness flags", () => {
  const r = computeReadiness({ document: {}, leads: freshLeads(), now: NOW }, { now: NOW });
  assert.ok("configured" in r.persistence);
  assert.ok(Array.isArray(r.persistence.missing_env));
  for (const k of ["ready_for_acquisition", "ready_for_delivery", "ready_for_client_success", "durable_persistence", "top_blockers", "next_actions"]) {
    assert.ok(k in r.overall, `overall.${k} present`);
  }
});

test("client success loop is wired even with no clients yet (partial, not blocked)", () => {
  const r = computeReadiness({ document: {}, leads: freshLeads(), clients: [], now: NOW }, { now: NOW });
  assert.equal(r.client_success.status, "partial");
  assert.equal(r.overall.ready_for_client_success, true);
});
