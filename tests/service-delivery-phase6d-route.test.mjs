import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizePhase6DAcceptanceRequest,
  buildPhase6DAcceptanceOptions,
  sanitizePhase6DAcceptanceReport,
} from "../src/lib/serviceDeliveryPhase6DAcceptanceRoute.mjs";

function request(headers = {}) {
  return {
    headers: {
      get(name) {
        return headers[name.toLowerCase()] || "";
      },
    },
  };
}

test("Phase 6D.1 route authorization fails closed without admin token", () => {
  const result = authorizePhase6DAcceptanceRequest(request(), { ADMIN_API_TOKEN: "server-token" });

  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
  assert.equal(result.reason, "unauthorized");
});

test("Phase 6D.1 route authorization accepts x-admin-token or Bearer admin token", () => {
  assert.equal(authorizePhase6DAcceptanceRequest(request({ "x-admin-token": "server-token" }), { ADMIN_API_TOKEN: "server-token" }).ok, true);
  assert.equal(authorizePhase6DAcceptanceRequest(request({ authorization: "Bearer server-token" }), { ADMIN_API_TOKEN: "server-token" }).ok, true);
});

test("Phase 6D.1 route authorization accepts existing OttoServ super-admin cookie", () => {
  const user = encodeURIComponent(JSON.stringify({
    email: "jonathan@ottoservco.com",
    role: "super_admin",
    isOttoServEmployee: true,
  }));
  const result = authorizePhase6DAcceptanceRequest(request({
    cookie: `ottoserv_token=super_admin_token; ottoserv_current_user=${user}`,
  }), {});

  assert.equal(result.ok, true);
  assert.equal(result.auth_method, "ottoserv_super_admin_cookie");
});

test("Phase 6D.1 options require explicit env flag and synthetic cleanup run id", async () => {
  const missingFlag = await buildPhase6DAcceptanceOptions(
    { run_id: "PHASE6D_CTRL_REAL_20260611_CLEANME" },
    { SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE: "" },
  );
  assert.equal(missingFlag.ok, false);
  assert.equal(missingFlag.status, 423);
  assert.equal(missingFlag.reason, "controlled_real_acceptance_disabled");

  const badRunId = await buildPhase6DAcceptanceOptions(
    { run_id: "real-client-run" },
    {
      SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_KEY: "secret-value",
    },
  );
  assert.equal(badRunId.ok, false);
  assert.equal(badRunId.status, 400);
  assert.equal(badRunId.reason, "synthetic_run_id_required");

  const ready = await buildPhase6DAcceptanceOptions(
    { run_id: "PHASE6D_CTRL_REAL_20260611_CLEANME" },
    {
      SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_KEY: "secret-value",
    },
  );
  assert.equal(ready.ok, true);
  assert.equal(ready.options.runId, "PHASE6D_CTRL_REAL_20260611_CLEANME");
  assert.equal(ready.env.NEXT_PUBLIC_SUPABASE_URL, true);
  assert.equal(ready.env.SUPABASE_SERVICE_KEY, true);
});

test("Phase 6D.1 report sanitizer keeps evidence but removes local paths", () => {
  const report = sanitizePhase6DAcceptanceReport({
    ok: true,
    dashboard_export: {
      latest_path: "C:\\server\\tmp\\latest.json",
      latest_has_service_delivery_execution: true,
      latest_mode: "live",
    },
    fixture_ids: { run_id: "PHASE6D_CTRL_REAL_20260611_CLEANME" },
  });

  assert.equal(report.ok, true);
  assert.equal(report.dashboard_export.latest_path, undefined);
  assert.equal(report.dashboard_export.latest_has_service_delivery_execution, true);
  assert.equal(report.fixture_ids.run_id, "PHASE6D_CTRL_REAL_20260611_CLEANME");
  assert.equal(report.no_live_retell_stripe_email_n8n, true);
});
