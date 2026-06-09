// ─── Phase 2 email-rail heartbeat integration — cycle proofs ──────────────────
import assert from "node:assert/strict";
import test from "node:test";
import { runHeartbeat } from "../src/lib/emailRail/heartbeat.mjs";
import { EMAIL_MODE, EMAIL_CONFIG_STATE } from "../src/lib/emailRail/config.mjs";
import { EMAIL_STATES } from "../src/lib/emailRail/intent.mjs";

const NOW = "2026-06-08T14:00:00.000Z";

function fakeEmailClient() {
  const intents = new Map(); const idemKeys = new Set(); const evidence = new Map(); const replies = new Map();
  return {
    configured: true, intents, evidence, replies,
    async readIntent(id) { const e = intents.get(id); return e ? { raw_intent: e.row, version: e.version, state: e.row.state } : null; },
    async upsertIntent(intent, expectedVersion) {
      const existing = intents.get(intent.execution_id); const target = Number(intent.version ?? 1);
      if (!existing) { if (expectedVersion !== 0 || target !== 1) return { ok: false, status: "conflict", reason: "vm" }; if (idemKeys.has(intent.idempotency_key)) return { ok: false, status: "duplicate", reason: "dup" }; idemKeys.add(intent.idempotency_key); intents.set(intent.execution_id, { row: { ...intent }, version: 1 }); return { ok: true, status: "inserted", version: 1 }; }
      if (existing.version !== expectedVersion) return { ok: false, status: "conflict", reason: "cas", current_version: existing.version };
      if (target !== expectedVersion + 1) return { ok: false, status: "conflict", reason: "nonseq", current_version: existing.version };
      intents.set(intent.execution_id, { row: { ...intent }, version: target }); return { ok: true, status: "updated", version: target };
    },
    async claim(id, owner, leaseSeconds, now) { const e = intents.get(id); if (!e) return { ok: false, reason: "nf" }; const row = e.row; const expires = new Date(Date.parse(now) + leaseSeconds * 1000).toISOString(); row.lease_owner = owner; row.lease_expires_at = expires; e.version += 1; row.version = e.version; return { ok: true, lease_expires_at: expires }; },
    async writeEvidence(row) { evidence.set(row.provider_message_id, { ...row }); return { ok: true, rows: [row] }; },
    async readEvidence(id) { return evidence.get(id) || null; },
    async writeReply(row) { if (replies.has(row.provider_event_id)) return { ok: true, rows: [], deduped: true }; replies.set(row.provider_event_id, { ...row }); return { ok: true, rows: [row], deduped: false }; },
    async listActiveIntents() { return [...intents.values()].map(e => ({ raw_intent: e.row, version: e.version, state: e.row.state })); },
  };
}

const LEAD = { lead_id: "lid_v1_hb01", company_name: "HB Co", email: "owner@hb.acceptance-run.io", record_status: "accepted", eligibility: "email_eligible", version: 1 };

test("heartbeat: live mode without Supabase stops truthfully (no local authority)", async () => {
  const r = await runHeartbeat({
    now: NOW, mode: EMAIL_MODE.LIVE, client: null,
    emailConfig: { mode: EMAIL_MODE.LIVE, state: EMAIL_CONFIG_STATE.PERSISTENCE_PENDING, reason: "persistence_pending" },
    leads: [LEAD],
  });
  assert.equal(r.ok, false);
  assert.equal(r.stopped, true);
  assert.equal(r.reason, "email_rail_unconfigured");
  assert.equal(r.no_transport, true);
});

test("heartbeat: no_send mode prepares without sending (no_transport flagged)", async () => {
  const client = fakeEmailClient();
  const r = await runHeartbeat({
    now: NOW, mode: EMAIL_MODE.NO_SEND, client, leads: [LEAD],
    emailConfig: { mode: EMAIL_MODE.NO_SEND, state: EMAIL_CONFIG_STATE.CONFIGURED },
    template_ref: "intro_v1", subject: "hi", body: "body", sender: "jonathan@ottoservco.com",
    policyCtx: { lead: LEAD, now: NOW, approvedSenders: ["jonathan@ottoservco.com"], approvalPresent: true },
  });
  assert.equal(r.ok, true);
  assert.equal(r.no_transport, true);
  assert.equal(r.summary.sent, 0);
});

test("heartbeat: live mode with transport executes one controlled send", async () => {
  const client = fakeEmailClient();
  const transport = async (d) => ({ message_id: "pm_hb_1", thread_id: "th_hb_1", to: d.to, from: d.from, status: "accepted", accepted: true });
  const r = await runHeartbeat({
    now: NOW, mode: EMAIL_MODE.LIVE, client, leads: [LEAD], transport, max_to_send: 1,
    emailConfig: { mode: EMAIL_MODE.LIVE, state: EMAIL_CONFIG_STATE.CONFIGURED },
    template_ref: "intro_v1", subject: "hi", body: "body", sender: "jonathan@ottoservco.com",
    policyCtx: { lead: LEAD, now: NOW, approvedSenders: ["jonathan@ottoservco.com"], approvalPresent: true },
    updateLead: false,
  });
  assert.equal(r.ok, true);
  assert.equal(r.summary.sent, 1);
  assert.equal(r.mode, EMAIL_MODE.LIVE);
  assert.equal(r.no_transport, false);
});

test("heartbeat: respects per-cycle send cap (controlled = 1)", async () => {
  const client = fakeEmailClient();
  const leads = [LEAD, { ...LEAD, lead_id: "lid_v1_hb02", email: "two@hb.acceptance-run.io" }];
  const transport = async (d) => ({ message_id: `pm_${d.to}`, to: d.to, from: d.from, status: "accepted", accepted: true });
  const r = await runHeartbeat({
    now: NOW, mode: EMAIL_MODE.LIVE, client, leads, transport, max_to_send: 1,
    emailConfig: { mode: EMAIL_MODE.LIVE, state: EMAIL_CONFIG_STATE.CONFIGURED },
    template_ref: "intro_v1", subject: "hi", body: "body", sender: "jonathan@ottoservco.com",
    policyCtx: { lead: LEAD, now: NOW, approvedSenders: ["jonathan@ottoservco.com"], approvalPresent: true },
    actions: leads.map(l => ({ lead: l, action_type: "outbound_email", template_ref: "intro_v1", subject: "hi", body: "body", sender: "jonathan@ottoservco.com", policyCtx: { lead: l, now: NOW, approvedSenders: ["jonathan@ottoservco.com"], approvalPresent: true } })),
    updateLead: false,
  });
  assert.equal(r.summary.sent, 1, "cap limits to one send per cycle");
});
