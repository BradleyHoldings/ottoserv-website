import assert from "node:assert/strict";
import test from "node:test";

import { detectClientOpportunities, OPPORTUNITY_TYPES } from "../src/lib/hermesClientSuccess.mjs";

const NOW = "2026-06-03T12:00:00.000Z";
const daysAgo = (n) => new Date(Date.parse(NOW) - n * 86_400_000).toISOString();

test("churn-risk is detected and is approval-gated + high priority", () => {
  const res = detectClientOpportunities({
    clients: [{ client_id: "c1", name: "Acme Plumbing", usage_trend: "declining", sentiment: "negative", last_contact_at: daysAgo(45) }],
    now: NOW,
  });
  const o = res.opportunities.find((x) => x.type === "churn_risk");
  assert.ok(o);
  assert.equal(o.priority, "high");
  assert.equal(o.required_approval, true);
  assert.equal(o.client, "Acme Plumbing");
  assert.ok(o.forbidden_actions.some((f) => /approval/i.test(f)));
});

test("expansion is detected when the pilot exceeds target", () => {
  const res = detectClientOpportunities({
    clients: [{ client_id: "c2", name: "PeakAir", usage_trend: "growing", sentiment: "positive", last_contact_at: NOW, pilot_baseline: 10, pilot_current: 30, pilot_target: 20 }],
    now: NOW,
  });
  const o = res.opportunities.find((x) => x.type === "expansion");
  assert.ok(o);
  assert.equal(o.required_approval, true);
  assert.match(o.reason, /expansion|upsell/i);
});

test("churn risk takes precedence over expansion for the same client", () => {
  const res = detectClientOpportunities({
    clients: [{ client_id: "c3", name: "Mixed", usage_trend: "declining", sentiment: "positive", pilot_current: 5, pilot_baseline: 10, pilot_target: 8, last_contact_at: NOW }],
    now: NOW,
  });
  assert.ok(res.opportunities.some((o) => o.type === "churn_risk"));
  assert.ok(!res.opportunities.some((o) => o.type === "expansion" && o.client === "Mixed"));
});

test("optimization signal → internal Codex action, not client-facing", () => {
  const res = detectClientOpportunities({
    clients: [{ client_id: "c4", name: "Harbor Point", usage_trend: "steady", sentiment: "neutral", last_contact_at: NOW, workflow_signals: [{ id: "w1", kind: "inefficiency", optimization: "Batch the nightly sync", detail: "sync runs per-record" }] }],
    now: NOW,
  });
  const o = res.opportunities.find((x) => x.type === "optimization");
  assert.ok(o);
  assert.equal(o.actor, "Codex");
  assert.equal(o.required_approval, false);
  assert.ok(o.forbidden_actions.some((f) => /production/i.test(f)));
});

test("delivered work order becomes an expansion candidate", () => {
  const res = detectClientOpportunities({
    document: { implementationWorkOrders: { orders: [{ id: "impl-9", client: "Summit Roofing", implementation_stage: "completed" }] } },
    now: NOW,
  });
  const o = res.opportunities.find((x) => x.opportunity_id.includes("wo-impl-9"));
  assert.ok(o);
  assert.equal(o.type, "expansion");
  assert.equal(o.required_approval, true);
});

test("no client PII (email/phone) appears in opportunities; types are valid", () => {
  const res = detectClientOpportunities({
    clients: [{ client_id: "c5", name: "Acme", contactEmail: "x@acme.com", contactPhone: "555-111-2222", usage_trend: "declining", last_contact_at: daysAgo(60) }],
    now: NOW,
  });
  const blob = JSON.stringify(res);
  assert.ok(!blob.includes("x@acme.com"));
  assert.ok(!blob.includes("555-111-2222"));
  assert.ok(res.opportunities.every((o) => OPPORTUNITY_TYPES.includes(o.type)));
});
