import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizePhase7CAcceptanceRequest,
  authorizePhase7CInternalTriggerRequest,
  buildPhase7CAcceptanceOptions,
  createPhase7CAcceptanceFixture,
  PHASE7C_CONTROLLED_RUN_ID,
  runRevenueQueueControlledAcceptance,
  sanitizePhase7CAcceptanceReport,
} from "../src/lib/revenueQueueControlledAcceptance.mjs";

const NOW = "2026-06-11T18:00:00.000Z";
const RUN_ID = "PHASE7C_REVENUE_QUEUE_20260611_CLEANME";

function request(headers = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (name) => map.get(String(name).toLowerCase()) || null } };
}

function env(overrides = {}) {
  return {
    ADMIN_API_TOKEN: "server-token",
    REVENUE_QUEUE_CONTROLLED_REAL_ACCEPTANCE: "true",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_KEY: "secret-service-key",
    ...overrides,
  };
}

function fakeRevenueState() {
  const rows = new Map();
  return {
    rows,
    async upsert(document, options = {}) {
      rows.set(options.id || "latest", {
        document: JSON.parse(JSON.stringify(document)),
        updated_at: NOW,
      });
      return { ok: true, id: options.id || "latest" };
    },
    async read(options = {}) {
      return rows.get(options.id || "latest") || null;
    },
  };
}

test("Phase 7C route auth requires admin token and accepts super-admin cookie", () => {
  assert.equal(authorizePhase7CAcceptanceRequest(request(), env()).ok, false);
  assert.equal(authorizePhase7CAcceptanceRequest(request({ "x-admin-token": "server-token" }), env()).ok, true);
  assert.equal(authorizePhase7CAcceptanceRequest(request({ authorization: "Bearer server-token" }), env()).ok, true);

  const user = encodeURIComponent(JSON.stringify({
    email: "jonathan@ottoservco.com",
    role: "super_admin",
    isOttoServEmployee: true,
  }));
  const cookieAuth = authorizePhase7CAcceptanceRequest(request({
    cookie: `ottoserv_token=super_admin_token; ottoserv_current_user=${user}`,
  }), {});
  assert.equal(cookieAuth.ok, true);
  assert.equal(cookieAuth.auth_method, "ottoserv_super_admin_cookie");
});

test("Phase 7C internal trigger requires real super-admin session and uses fixed run id", async () => {
  assert.equal(authorizePhase7CInternalTriggerRequest(request({ "x-admin-token": "server-token" })).ok, false);
  assert.equal(authorizePhase7CInternalTriggerRequest(request({ authorization: "Bearer server-token" })).ok, false);

  const user = encodeURIComponent(JSON.stringify({
    email: "jonathan@ottoservco.com",
    role: "super_admin",
    isOttoServEmployee: true,
  }));
  const result = authorizePhase7CInternalTriggerRequest(request({
    cookie: `ottoserv_token=super_admin_token; ottoserv_current_user=${user}`,
  }));

  assert.equal(result.ok, true);
  assert.equal(PHASE7C_CONTROLLED_RUN_ID, RUN_ID);
});

test("Phase 7C internal trigger aligns with Hermes admin console localStorage guard", () => {
  const adminUser = JSON.stringify({
    email: "jonathan@ottoservco.com",
    role: "super_admin",
    isOttoServEmployee: true,
  });
  const allowed = authorizePhase7CInternalTriggerRequest(request({
    origin: "https://www.ottoserv.com",
    "x-ottoserv-token": "super_admin_token",
    "x-ottoserv-current-user": encodeURIComponent(adminUser),
  }));
  const crossOrigin = authorizePhase7CInternalTriggerRequest(request({
    origin: "https://example.com",
    "x-ottoserv-token": "super_admin_token",
    "x-ottoserv-current-user": encodeURIComponent(adminUser),
  }));
  const demoUser = authorizePhase7CInternalTriggerRequest(request({
    origin: "https://www.ottoserv.com",
    "x-ottoserv-token": "demo_token",
    "x-ottoserv-current-user": encodeURIComponent(JSON.stringify({ role: "demo", isOttoServEmployee: false })),
  }));

  assert.equal(allowed.ok, true);
  assert.equal(allowed.auth_method, "ottoserv_admin_session_headers");
  assert.equal(crossOrigin.ok, false);
  assert.equal(demoUser.ok, false);
});

test("Phase 7C options fail closed without env flag, Supabase env, or synthetic run id", async () => {
  const missingFlag = await buildPhase7CAcceptanceOptions({ run_id: RUN_ID }, env({ REVENUE_QUEUE_CONTROLLED_REAL_ACCEPTANCE: "" }));
  assert.equal(missingFlag.ok, false);
  assert.equal(missingFlag.status, 423);
  assert.equal(missingFlag.reason, "revenue_queue_controlled_real_acceptance_disabled");

  const missingSupabase = await buildPhase7CAcceptanceOptions({ run_id: RUN_ID }, env({ NEXT_PUBLIC_SUPABASE_URL: "", SUPABASE_SERVICE_KEY: "" }));
  assert.equal(missingSupabase.ok, false);
  assert.equal(missingSupabase.status, 424);
  assert.equal(missingSupabase.reason, "supabase_runtime_env_missing");

  const badRunId = await buildPhase7CAcceptanceOptions({ run_id: "real-client" }, env());
  assert.equal(badRunId.ok, false);
  assert.equal(badRunId.status, 400);
  assert.equal(badRunId.reason, "synthetic_run_id_required");

  const ready = await buildPhase7CAcceptanceOptions({ run_id: RUN_ID }, env());
  assert.equal(ready.ok, true);
  assert.equal(ready.options.runId, RUN_ID);
  assert.equal(ready.env.SUPABASE_SERVICE_KEY, true);
});

test("Phase 7C fixture uses required synthetic lead classes", () => {
  const fixture = createPhase7CAcceptanceFixture({ runId: RUN_ID, now: NOW });
  const ids = fixture.sources[0].records.map((lead) => lead.lead_id);

  assert.equal(fixture.run_id, RUN_ID);
  assert.ok(ids.some((id) => id.endsWith("CONTACT_READY_EMAIL")));
  assert.ok(ids.some((id) => id.endsWith("NEEDS_ENRICHMENT")));
  assert.ok(ids.some((id) => id.endsWith("DO_NOT_CONTACT")));
  assert.ok(ids.some((id) => id.endsWith("DUPLICATE")));
  assert.ok(ids.some((id) => id.endsWith("ACTIVE_INTENT_APPROVAL")));
  assert.ok(ids.some((id) => id.endsWith("STALE_FOLLOW_UP")));
});

test("Phase 7C controlled acceptance persists, reads back, proves idempotency, evidence rules, and latest visibility", async () => {
  const state = fakeRevenueState();
  const report = await runRevenueQueueControlledAcceptance({
    runId: RUN_ID,
    now: NOW,
    env: env(),
    upsertRevenueState: state.upsert,
    readRevenueState: state.read,
  });

  assert.equal(report.ok, true);
  assert.equal(report.accepted, true);
  assert.equal(report.persistence_readback.row_id, RUN_ID);
  assert.equal(report.persistence_readback.read.has_lead_supply_daily_loop, true);
  assert.equal(report.persistence_readback.read.has_durable_revenue_execution_queue, true);
  assert.equal(report.source_loop_proof.sources_seen, 8);
  assert.equal(report.source_loop_proof.leads_ingested, 6);
  assert.equal(report.source_loop_proof.duplicates_blocked, 1);
  assert.equal(report.source_loop_proof.actions_by_type.approved_cold_email >= 1, true);
  assert.equal(report.source_loop_proof.actions_by_type.policy_approved_call_queued, 1);
  assert.equal(report.source_loop_proof.actions_by_type.approval_required, 1);
  assert.equal(report.idempotency.no_duplicate_actions, true);
  assert.equal(report.idempotency.no_duplicate_email_intents, true);
  assert.equal(report.idempotency.no_duplicate_call_intents, true);
  assert.equal(report.duplicate_prevention.do_not_contact_skipped, 1);
  assert.equal(report.duplicate_prevention.duplicate_conflicts.length, 1);
  assert.equal(report.evidence_rules.missing_evidence_refused, true);
  assert.equal(report.evidence_rules.refusal_reason, "completion_requires_evidence");
  assert.equal(report.evidence_rules.completed_with_evidence, true);
  assert.equal(report.evidence_rules.failed_status_written, true);
  assert.equal(report.evidence_rules.stale_status_written, true);
  assert.equal(report.evidence_rules.repaired_status_written, true);
  assert.equal(report.latest_json_export.latest_has_lead_supply_daily_loop, true);
  assert.equal(report.latest_json_export.latest_has_durable_revenue_execution_queue, true);
  assert.equal(report.read_adapter.has_durable_revenue_execution_queue, true);
  assert.equal(report.safety.no_live_email_sent, true);
  assert.equal(report.safety.no_live_call_placed, true);
  assert.equal(state.rows.size, 1);
});

test("Phase 7C report sanitizer removes local paths and never reports secrets", async () => {
  const state = fakeRevenueState();
  const report = await runRevenueQueueControlledAcceptance({
    runId: RUN_ID,
    now: NOW,
    env: env(),
    upsertRevenueState: state.upsert,
    readRevenueState: state.read,
  });
  const sanitized = sanitizePhase7CAcceptanceReport(report);
  const json = JSON.stringify(sanitized);

  assert.equal(sanitized.local_run?.latest_path, undefined);
  assert.equal(json.includes("secret-service-key"), false);
  assert.equal(json.includes("server-token"), false);
  assert.equal(sanitized.safety.no_stripe_triggered, true);
});
