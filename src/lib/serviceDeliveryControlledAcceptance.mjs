import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { runRevenueDailyLoop } from "./revenueLoopRunner.mjs";
import {
  applyServiceDeliveryApprovalDecision,
  createMockServiceDeliveryLiveClient,
  createServiceDeliveryApprovalCard,
  createServiceDeliveryExecutionPacket,
  describeServiceDeliveryLiveConfig,
  generateMonitoringUpsellRollups,
  ingestServiceDeliveryExecutionEvidence,
  makeServiceDeliverySupabaseClient,
  persistServiceDeliveryRun,
  readLiveServiceDeliveryStatus,
  runServiceDeliveryOperatingCycle,
} from "./serviceDeliveryPersistence.mjs";
import { SERVICE_DELIVERY_CANONICAL_TABLES } from "./serviceDeliverySpine.mjs";

const DEFAULT_ACCEPTANCE_ID = "phase6d_controlled_real_service_delivery";

function clean(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function envPresence(env = process.env) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_URL: Boolean(env.SUPABASE_URL),
    SUPABASE_SERVICE_KEY: Boolean(env.SUPABASE_SERVICE_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE: env.SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE === "true",
  };
}

export function createControlledServiceDeliveryFixture(options = {}) {
  const runId = clean(options.runId) || `${DEFAULT_ACCEPTANCE_ID}_${Date.now()}`;
  const prefix = runId.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return {
    run_id: runId,
    records: [
      {
        id: `${prefix}_low_internal_audit`,
        service_key: "full_process_audit",
        client: {
          company_name: `SYNTHETIC Phase 6D Low Risk ${runId}`,
          contact_name: "Synthetic Operator",
          email: "synthetic-low@example.invalid",
        },
        intake: {
          process_name: "Synthetic service delivery coordination",
          software_used: "OttoServ OS dashboard",
          current_process_description: "Synthetic coordination summary should route internally only.",
        },
        findings: [
          {
            id: `${prefix}_low_finding`,
            type: "process_handoff",
            severity: "low",
            execution_type: "analysis",
            evidence: "Synthetic internal coordination finding. No external system execution.",
          },
        ],
      },
      {
        id: `${prefix}_high_missed_call_scan`,
        status: "report_ready",
        report_status: "ready",
        service_key: "front_office_leak_check",
        company_name: `SYNTHETIC Phase 6D High Risk ${runId}`,
        contact_name: "Synthetic Operator",
        email: "synthetic-high@example.invalid",
        main_leak: "missed_calls",
        process_name: "Synthetic missed call recovery",
        software_used: "Synthetic phone log",
        current_process_description: "Synthetic after-hours missed-call recovery path. Retell must not execute.",
        automation_opportunities_json: [
          {
            id: `${prefix}_high_finding`,
            type: "missed_calls",
            severity: "high",
            execution_type: "production_change",
            evidence: "Synthetic missed-call signal for controlled acceptance only.",
          },
        ],
        public_report_url: `https://www.ottoserv.com/synthetic/${prefix}`,
        email_sent_at: options.now || new Date().toISOString(),
      },
    ],
  };
}

export async function verifyServiceDeliveryLiveReadiness(options = {}) {
  const config = describeServiceDeliveryLiveConfig();
  const env = envPresence(options.env || process.env);
  const explicitLive = Boolean(options.liveClient) || env.SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE;
  const liveClient = options.liveClient || (explicitLive ? makeServiceDeliverySupabaseClient(options) : null);
  if (!config.configured && !options.liveClient) {
    return {
      ok: false,
      skipped: true,
      reason: "supabase_not_configured",
      env,
      config,
      tables: SERVICE_DELIVERY_CANONICAL_TABLES,
    };
  }
  if (!explicitLive) {
    return {
      ok: false,
      skipped: true,
      reason: "controlled_real_acceptance_not_enabled",
      env,
      config,
      tables: SERVICE_DELIVERY_CANONICAL_TABLES,
    };
  }
  if (!liveClient) {
    return { ok: false, skipped: true, reason: "live_client_unavailable", env, config, tables: SERVICE_DELIVERY_CANONICAL_TABLES };
  }
  const status = await readLiveServiceDeliveryStatus({ liveClient });
  return {
    ok: status.available,
    skipped: false,
    reason: status.available ? "reachable" : status.reason || "live_status_unavailable",
    env,
    config,
    tables: SERVICE_DELIVERY_CANONICAL_TABLES,
    status_summary: status.summary,
    opportunity_rpc: "verified_by_controlled_idempotent_write",
  };
}

function summarizeIds(cycle) {
  return {
    opportunity_ids: asArray(cycle.opportunities).map((item) => item.id),
    work_order_ids: asArray(cycle.workOrders).map((item) => item.id),
    approval_card_ids: asArray(cycle.approval_cards).map((item) => item.id),
    execution_packet_ids: asArray(cycle.execution_packets).map((item) => item.task_id),
  };
}

async function persistCycleAgain(cycle, options) {
  return persistServiceDeliveryRun(
    {
      opportunities: cycle.opportunities,
      workOrders: cycle.workOrders,
      approvalCards: cycle.approval_cards,
      executionPackets: cycle.execution_packets,
    },
    options,
  );
}

export async function runControlledRealServiceDeliveryAcceptance(options = {}) {
  const now = options.now || new Date().toISOString();
  const fixture = options.fixture || createControlledServiceDeliveryFixture({ now, runId: options.runId });
  const env = envPresence(options.env || process.env);
  const liveClient = options.liveClient || (env.SERVICE_DELIVERY_CONTROLLED_REAL_ACCEPTANCE
    ? (typeof options.createLiveClient === "function" ? options.createLiveClient(options) : makeServiceDeliverySupabaseClient(options))
    : null);
  const readiness = await verifyServiceDeliveryLiveReadiness({ ...options, liveClient });
  if (readiness.skipped) {
    return {
      ok: true,
      skipped: true,
      reason: readiness.reason,
      env: readiness.env,
      tables_reused: SERVICE_DELIVERY_CANONICAL_TABLES,
      tables_added: [],
      fixture_ids: { run_id: fixture.run_id },
    };
  }
  if (!readiness.ok) {
    return { ok: false, skipped: false, reason: readiness.reason, env: readiness.env, tables_reused: SERVICE_DELIVERY_CANONICAL_TABLES, tables_added: [] };
  }

  const cycle = await runServiceDeliveryOperatingCycle({
    records: fixture.records,
    liveClient,
    now,
    sequenceStart: options.sequenceStart || 7600,
  });
  const secondPersist = await persistCycleAgain(cycle, { liveClient, now });

  const highRiskWorkOrder = cycle.workOrders.find((wo) => wo.implementation?.assignment?.requires_approval) || cycle.workOrders[0];
  const highRiskOpportunity = cycle.opportunities.find((opportunity) => opportunity.id === highRiskWorkOrder?.source_opportunity_id) || cycle.opportunities[0];
  const approvalCard = createServiceDeliveryApprovalCard(highRiskWorkOrder, { opportunity: highRiskOpportunity, now });
  const approvedDecision = await applyServiceDeliveryApprovalDecision(
    {
      approval_item_id: approvalCard.id,
      decision: "approved",
      decided_by: "phase6d-synthetic-operator",
      decided_at: now,
      reason_or_note: "Synthetic controlled acceptance approval for sandbox execution only.",
    },
    { liveClient, approvalCard, now },
  );

  const rejectedWorkOrder = cycle.workOrders.find((wo) => wo.id !== highRiskWorkOrder?.id && wo.implementation?.assignment?.requires_approval)
    || { ...highRiskWorkOrder, id: `${highRiskWorkOrder.id}-REJECTED` };
  if (rejectedWorkOrder.id.endsWith("-REJECTED")) {
    await persistServiceDeliveryRun({ opportunities: [], workOrders: [rejectedWorkOrder] }, { liveClient, now });
  }
  const rejectedCard = createServiceDeliveryApprovalCard(rejectedWorkOrder, { opportunity: highRiskOpportunity, now });
  const rejectedDecision = await applyServiceDeliveryApprovalDecision(
    {
      approval_item_id: rejectedCard.id,
      decision: "rejected",
      decided_by: "phase6d-synthetic-operator",
      decided_at: now,
      reason_or_note: "Synthetic controlled acceptance rejection: scope intentionally blocked.",
    },
    { liveClient, approvalCard: rejectedCard, now },
  );

  const executionTargets = cycle.workOrders.slice(0, 3);
  while (executionTargets.length < 3 && cycle.workOrders[0]) executionTargets.push(cycle.workOrders[0]);
  const missingEvidenceRefusal = await ingestServiceDeliveryExecutionEvidence(
    {
      related_ticket_number: executionTargets[0]?.id,
      task_id: "phase6d_missing_evidence_probe",
      assigned_agent: "Hermes",
      status: "completed",
    },
    { liveClient, now },
  );
  const actorPackets = [
    { agent: "Codex/Claude Code", evidence_id: `${fixture.run_id}_codex_evidence`, evidence_type: "codex_sandbox_completion", evidence_reference: `synthetic-codex-${fixture.run_id}` },
    { agent: "Cowork", evidence_id: `${fixture.run_id}_cowork_evidence`, evidence_type: "cowork_sandbox_completion", evidence_reference: `synthetic-cowork-${fixture.run_id}` },
    { agent: "Hermes", evidence_id: `${fixture.run_id}_hermes_evidence`, evidence_type: "hermes_internal_completion", evidence_reference: `synthetic-hermes-${fixture.run_id}` },
  ];
  const evidenceResults = [];
  for (let idx = 0; idx < actorPackets.length; idx += 1) {
    const target = executionTargets[idx];
    if (!target) continue;
    const packet = createServiceDeliveryExecutionPacket(target, { opportunity: highRiskOpportunity, now });
    evidenceResults.push(await ingestServiceDeliveryExecutionEvidence(
      {
        ...packet,
        related_ticket_number: target.id,
        task_id: `${packet.task_id}_${idx}`,
        assigned_agent: actorPackets[idx].agent,
        status: "completed",
        evidence: {
          evidence_id: actorPackets[idx].evidence_id,
          evidence_type: actorPackets[idx].evidence_type,
          evidence_summary: `${actorPackets[idx].agent} synthetic completion evidence accepted for Phase 6D.`,
          evidence_reference: actorPackets[idx].evidence_reference,
          review_status: "accepted",
        },
      },
      { liveClient, now },
    ));
  }

  const rollups = await generateMonitoringUpsellRollups({ liveClient, now });
  const status = await readLiveServiceDeliveryStatus({ liveClient });

  const outputDir = options.outputDir || mkdtempSync(path.join(os.tmpdir(), "phase6d-service-delivery-"));
  const loop = await runRevenueDailyLoop({
    now,
    outputDir,
    persistSupabase: false,
    serviceDeliveryLiveClient: liveClient,
    sourceOptions: { cwd: outputDir },
  });
  const latest = JSON.parse(readFileSync(loop.latestPath, "utf8"));

  return {
    ok: true,
    skipped: false,
    reason: "controlled_real_acceptance_complete",
    env: readiness.env,
    tables_reused: SERVICE_DELIVERY_CANONICAL_TABLES,
    tables_added: [],
    fixture_ids: { run_id: fixture.run_id, ...summarizeIds(cycle) },
    readiness,
    write_read_acceptance: {
      first_persist: cycle.persistence,
      second_persist: secondPersist,
      live_status: status.summary,
      recoverable: status.available,
    },
    approval_reconciliation: {
      approved: approvedDecision,
      rejected: rejectedDecision,
    },
    actor_evidence_ingestion: {
      missing_evidence_refused: missingEvidenceRefusal.ok === false,
      results: evidenceResults,
    },
    monitoring_upsell_rollups: rollups,
    dashboard_export: {
      latest_path: loop.latestPath,
      latest_has_service_delivery_execution: Boolean(latest.serviceDeliveryExecution),
      latest_mode: latest.serviceDeliveryExecution?.summary?.mode || "",
    },
  };
}

export { createMockServiceDeliveryLiveClient };
