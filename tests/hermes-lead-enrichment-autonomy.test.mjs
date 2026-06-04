// Sprint priority 5 (continuous autonomy): a lead with public evidence but no
// contact path must produce an ENRICHMENT action routed to Cowork that materializes
// under standing policy (no per-item Jonathan approval) — so seed leads do not sit
// idle and do not create false approval blockers.

import assert from "node:assert/strict";
import test from "node:test";

import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";
import { materializeActorPackets, DEFAULT_STANDING_OUTBOUND_POLICY } from "../src/lib/hermesApprovalThroughput.mjs";

const NOW = "2026-06-04T15:00:00.000Z";

function noContactLead(over = {}) {
  return {
    lead_id: "li-demo", company: "Demo HVAC", tier: "C-tier", status: "needs_enrichment",
    email: "", normalized_phone: "", phone: "",
    source_url: "https://example.com/job/demo-hvac", notes: "missing after-hours calls",
    score: 40, created_at: NOW,
    intent: { source_urls: ["https://example.com/job/demo-hvac"], intent_type: "operational_pain" },
    ...over,
  };
}

test("a no-contact, evidenced lead yields an enrich_lead_contact action (Cowork, no approval)", () => {
  const sel = selectNextActions({ leads: [noContactLead()], document: {}, now: NOW }, { now: NOW });
  const enrich = sel.actions.find((a) => a.action_type === "enrich_lead_contact");
  assert.ok(enrich, "enrichment action proposed");
  assert.equal(enrich.actor, "Cowork");
  assert.equal(enrich.required_approval, false);
  assert.equal(enrich.suggested_prompt_or_packet.kind, "lead_enrichment");
});

test("enrichment materializes under standing policy — not gated, not a Jonathan blocker", () => {
  const sel = selectNextActions({ leads: [noContactLead()], document: {}, now: NOW }, { now: NOW });
  const out = materializeActorPackets(sel.actions, { document: {}, now: NOW, standingOutboundPolicy: DEFAULT_STANDING_OUTBOUND_POLICY });
  assert.equal(out.gated.length, 0, "enrichment is not gated");
  assert.ok(out.materialized.length >= 1, "enrichment materializes");
});

test("a lead WITHOUT public evidence is not auto-enriched (evidence rules preserved)", () => {
  const sel = selectNextActions({ leads: [noContactLead({ source_url: "", notes: "", intent: {} })], document: {}, now: NOW }, { now: NOW });
  assert.ok(!sel.actions.some((a) => a.action_type === "enrich_lead_contact"), "no evidence → no enrichment");
});

test("a lead that already has a contact path is not queued for enrichment", () => {
  const sel = selectNextActions({ leads: [noContactLead({ email: "owner@demo.example" })], document: {}, now: NOW }, { now: NOW });
  assert.ok(!sel.actions.some((a) => a.action_type === "enrich_lead_contact"));
});
