import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizePhase6GAcceptanceRequest,
  buildPhase6GAcceptanceOptions,
  createPhase6GAcceptanceFixture,
  runRetellControlledTestCallAcceptance,
} from "../src/lib/retellControlledTestCallAcceptance.mjs";
import { createMockServiceDeliveryLiveClient } from "../src/lib/serviceDeliveryPersistence.mjs";

const NOW = "2026-06-11T21:00:00.000Z";
const RUN_ID = "PHASE6G_RETELL_TEST_20260611_CLEANME";

function request(headers = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (name) => map.get(String(name).toLowerCase()) || null } };
}

function env(overrides = {}) {
  return {
    ADMIN_API_TOKEN: "server-token",
    RETELL_CONTROLLED_TEST_CALL_ACCEPTANCE: "true",
    RETELL_API_KEY: "secret-retell-key",
    RETELL_AGENT_ID: "agent_phase6g",
    RETELL_PHONE_NUMBER_ID: "phone_phase6g",
    RETELL_CONTROLLED_TEST_TO_NUMBER: "+14075550199",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_KEY: "secret-service-key",
    ...overrides,
  };
}

function readinessOk() {
  return {
    ok: true,
    status: "retell_ready",
    env_present: {
      RETELL_API_KEY: true,
      RETELL_AGENT_ID: true,
      RETELL_PHONE_NUMBER_ID: true,
    },
    readiness: { ok: true, retell: { agent_exists: true, phone_number_owned: true } },
  };
}

function transport(calls = []) {
  return {
    calls,
    async placeCall(intent) {
      calls.push(intent);
      return {
        provider_call_id: "call_phase6g_real_fixture",
        status: "ended",
        outcome: "connected_test",
        started_at: NOW,
        ended_at: NOW,
        duration_seconds: 19,
        transcript_url: "",
        recording_url: "",
        summary: "Synthetic controlled test call completed.",
      };
    },
    async lookupCall(callId) {
      return {
        provider_call_id: callId,
        status: "ended",
        outcome: "connected_test",
        started_at: NOW,
        ended_at: NOW,
        duration_seconds: 19,
        summary: "Synthetic controlled test call completed.",
      };
    },
  };
}

test("Phase 6G route auth requires admin token", () => {
  assert.equal(authorizePhase6GAcceptanceRequest(request(), env()).ok, false);
  assert.equal(authorizePhase6GAcceptanceRequest(request({ "x-admin-token": "server-token" }), env()).ok, true);
  assert.equal(authorizePhase6GAcceptanceRequest(request({ authorization: "Bearer server-token" }), env()).ok, true);
});

test("Phase 6G route auth accepts existing OttoServ super-admin cookie", () => {
  const user = encodeURIComponent(JSON.stringify({
    email: "jonathan@ottoservco.com",
    role: "super_admin",
    isOttoServEmployee: true,
  }));
  const result = authorizePhase6GAcceptanceRequest(request({
    cookie: `ottoserv_token=super_admin_token; ottoserv_current_user=${user}`,
  }), {});

  assert.equal(result.ok, true);
  assert.equal(result.auth_method, "ottoserv_super_admin_cookie");
});

test("Phase 6G options fail closed without acceptance flag", async () => {
  const result = await buildPhase6GAcceptanceOptions({ run_id: RUN_ID, confirm: "PLACE_EXACTLY_ONE_PHASE6G_RETELL_TEST_CALL" }, env({ RETELL_CONTROLLED_TEST_CALL_ACCEPTANCE: "" }));

  assert.equal(result.ok, false);
  assert.equal(result.status, 423);
  assert.equal(result.reason, "retell_controlled_test_call_acceptance_disabled");
  assert.equal(result.env.RETELL_API_KEY, true);
});

test("Phase 6G options accept documented confirmation field", async () => {
  const result = await buildPhase6GAcceptanceOptions({ run_id: RUN_ID, confirmation: "PLACE_EXACTLY_ONE_PHASE6G_RETELL_TEST_CALL" }, env());

  assert.equal(result.ok, true);
  assert.equal(result.options.runId, RUN_ID);
});

test("Phase 6G readiness absent fails closed without placing Retell call", async () => {
  const calls = [];
  const result = await runRetellControlledTestCallAcceptance({
    runId: RUN_ID,
    now: NOW,
    env: env({ RETELL_API_KEY: "" }),
    liveClient: createMockServiceDeliveryLiveClient(),
    transport: transport(calls),
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "retell_readiness_failed");
  assert.equal(calls.length, 0);
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("Phase 6G unapproved synthetic work order is blocked before Retell call", async () => {
  const calls = [];
  const fixture = createPhase6GAcceptanceFixture({ runId: RUN_ID, now: NOW, approvalStatus: "pending" });
  const result = await runRetellControlledTestCallAcceptance({
    runId: RUN_ID,
    now: NOW,
    env: env(),
    liveClient: createMockServiceDeliveryLiveClient(),
    readinessReport: readinessOk(),
    transport: transport(calls),
    fixture,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "approved_voice_work_order_required");
  assert.equal(calls.length, 0);
});

test("Phase 6G controlled Retell acceptance writes evidence and latest export", async () => {
  const calls = [];
  const liveClient = createMockServiceDeliveryLiveClient();
  const result = await runRetellControlledTestCallAcceptance({
    runId: RUN_ID,
    now: NOW,
    env: env(),
    liveClient,
    readinessReport: readinessOk(),
    transport: transport(calls),
  });

  assert.equal(result.ok, true);
  assert.equal(result.accepted, true);
  assert.equal(calls.length, 1);
  assert.equal(result.synthetic_ids.work_order_id, "PHASE6G-RETELL-TEST-20260611-CLEANME-WO");
  assert.equal(result.retell_evidence.retell_call_id, "call_phase6g_real_fixture");
  assert.equal(result.writeback.status, "test_call_completed");
  assert.equal(result.latest_json_export.voice_service_status.summary.test_call_completed, 1);
  assert.ok([...liveClient.tables.techops_ticket_events.values()].some((event) => event.event_type === "service_delivery_retell_test_call_completed"));
});

test("Phase 6G repeat run is idempotent and does not place another call", async () => {
  const calls = [];
  const liveClient = createMockServiceDeliveryLiveClient();
  await runRetellControlledTestCallAcceptance({
    runId: RUN_ID,
    now: NOW,
    env: env(),
    liveClient,
    readinessReport: readinessOk(),
    transport: transport(calls),
  });
  const second = await runRetellControlledTestCallAcceptance({
    runId: RUN_ID,
    now: NOW,
    env: env(),
    liveClient,
    readinessReport: readinessOk(),
    transport: transport(calls),
  });

  assert.equal(second.ok, true);
  assert.equal(second.duplicate_prevented, true);
  assert.equal(calls.length, 1);
  assert.equal(liveClient.tables.techops_tickets.size, 1);
  assert.equal([...liveClient.tables.techops_ticket_events.values()].filter((event) => event.event_type === "service_delivery_retell_test_call_completed").length, 1);
});

test("Phase 6G reserved run can complete from supplied Retell evidence without another call", async () => {
  const calls = [];
  const liveClient = createMockServiceDeliveryLiveClient();
  await runRetellControlledTestCallAcceptance({
    runId: RUN_ID,
    now: NOW,
    env: env(),
    liveClient,
    readinessReport: readinessOk(),
    transport: {
      async placeCall(intent) {
        calls.push(intent);
        return { provider_call_id: "call_reserved_recovery", status: "registered", outcome: "unknown", started_at: NOW };
      },
    },
  });
  const recovered = await runRetellControlledTestCallAcceptance({
    runId: RUN_ID,
    now: NOW,
    env: env(),
    liveClient,
    readinessReport: readinessOk(),
    transport: transport(calls),
    retellEvidence: {
      retell_call_id: "call_reserved_recovery",
      call_status: "ended",
      call_result: "connected_test",
      transcript_unavailable_reason: "retell transcript not available yet",
      occurred_at: NOW,
    },
  });

  assert.equal(recovered.ok, true);
  assert.equal(recovered.accepted, true);
  assert.equal(recovered.duplicate_prevented, true);
  assert.equal(calls.length, 1);
  assert.equal(recovered.ticket_event_writeback.event_type, "service_delivery_retell_test_call_completed");
});
