import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createControlledServiceDeliveryFixture,
  createMockServiceDeliveryLiveClient,
  runControlledRealServiceDeliveryAcceptance,
  verifyServiceDeliveryLiveReadiness,
} from "../src/lib/serviceDeliveryControlledAcceptance.mjs";

const NOW = "2026-06-11T15:00:00.000Z";

test("controlled real acceptance skips safely without explicit live rails", async () => {
  const result = await verifyServiceDeliveryLiveReadiness({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE: "",
    },
  });

  assert.equal(result.skipped, true);
  assert.equal(result.reason, "supabase_not_configured");
  assert.equal(result.env.NEXT_PUBLIC_SUPABASE_URL, false);
  assert.equal(result.env.SUPABASE_SERVICE_KEY, false);
  assert.equal(result.tables.implementation_work_orders, "techops_tickets");
});

test("controlled fixture uses synthetic low-risk and high-risk service records", () => {
  const fixture = createControlledServiceDeliveryFixture({ now: NOW, runId: "phase6d_test_run" });

  assert.equal(fixture.run_id, "phase6d_test_run");
  assert.equal(fixture.records.length, 2);
  assert.match(fixture.records[0].client.company_name, /^SYNTHETIC Phase 6D Low Risk/);
  assert.match(fixture.records[1].company_name, /^SYNTHETIC Phase 6D High Risk/);
  assert.equal(fixture.records[0].findings[0].severity, "low");
  assert.equal(fixture.records[1].automation_opportunities_json[0].severity, "high");
});

test("controlled real acceptance persists, reconciles approval, ingests evidence, and exports rollups", async () => {
  const liveClient = createMockServiceDeliveryLiveClient();
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "phase6d-acceptance-out-"));
  const result = await runControlledRealServiceDeliveryAcceptance({
    liveClient,
    now: NOW,
    runId: "phase6d_test_run",
    outputDir,
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
  assert.equal(result.tables_added.length, 0);
  assert.equal(result.tables_reused.hermes_actions, "hermes_opportunity_actions");
  assert.ok(result.fixture_ids.opportunity_ids.length >= 2);
  assert.ok(result.fixture_ids.work_order_ids.length >= 2);

  assert.equal(result.write_read_acceptance.first_persist.mode, "live");
  assert.ok(result.write_read_acceptance.first_persist.opportunities.created >= 2);
  assert.equal(result.write_read_acceptance.second_persist.opportunities.created, 0);
  assert.ok(result.write_read_acceptance.second_persist.opportunities.skipped_existing >= 2);
  assert.equal(result.write_read_acceptance.recoverable, true);
  assert.ok(result.write_read_acceptance.live_status.opportunities.persisted >= 2);
  assert.ok(result.write_read_acceptance.live_status.work_orders.persisted >= 2);

  assert.equal(result.approval_reconciliation.approved.ok, true);
  assert.equal(result.approval_reconciliation.approved.status, "sandbox_execution_ready");
  assert.equal(result.approval_reconciliation.rejected.ok, true);
  assert.equal(result.approval_reconciliation.rejected.status, "blocked_rejected");

  assert.equal(result.actor_evidence_ingestion.missing_evidence_refused, true);
  assert.equal(result.actor_evidence_ingestion.results.length, 3);
  assert.ok(result.actor_evidence_ingestion.results.every((item) => item.ok));

  assert.ok(result.monitoring_upsell_rollups.length >= 2);
  assert.ok(result.monitoring_upsell_rollups.some((rollup) => rollup.latest_evidence?.evidence_reference));
  assert.equal(result.dashboard_export.latest_has_service_delivery_execution, true);
  assert.equal(result.dashboard_export.latest_mode, "live");
});

test("controlled acceptance report exposes env presence only", async () => {
  const result = await runControlledRealServiceDeliveryAcceptance({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_KEY: "secret-value",
      SUPABASE_SERVICE_ROLE_KEY: "",
      SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE: "",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.deepEqual(result.env, {
    NEXT_PUBLIC_SUPABASE_URL: true,
    SUPABASE_URL: false,
    SUPABASE_SERVICE_KEY: true,
    SUPABASE_SERVICE_ROLE_KEY: false,
    SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE: false,
  });
});

test("controlled acceptance uses a resolved live client when env gate is enabled", async () => {
  const liveClient = createMockServiceDeliveryLiveClient();
  const result = await runControlledRealServiceDeliveryAcceptance({
    createLiveClient: () => liveClient,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_KEY: "secret-value",
      SUPABASE_SERVICE_ROLE_KEY: "",
      SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE: "true",
    },
    now: NOW,
    runId: "phase6d_resolved_live_client",
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
  assert.equal(result.write_read_acceptance.first_persist.mode, "live");
  assert.ok(result.write_read_acceptance.live_status.opportunities.persisted >= 2);
});
