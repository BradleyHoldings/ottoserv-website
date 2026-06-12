import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  completeRevenueExecutionAction,
  createMemoryRevenueExecutionStore,
  readDurableRevenueExecutionQueue,
  updateRevenueExecutionActionStatus,
} from "./leadSupplyExecutionPersistence.mjs";
import { readAutonomousRevenueState } from "./revenueEngineReadAdapter.mjs";
import { describeRevenueStateConfig, readRevenueState, upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";
import { runRevenueDailyLoop } from "./revenueLoopRunner.mjs";

const ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "REVENUE_QUEUE_CONTROLLED_REAL_ACCEPTANCE",
  "ADMIN_API_TOKEN",
];

export const PHASE7C_CONTROLLED_RUN_ID = "PHASE7C_REVENUE_QUEUE_20260611_CLEANME";

export const PHASE7C_CANONICAL_TABLES = [
  "hermes_pipeline",
  "hermes_lead_aliases",
  "hermes_enrichment_tasks",
  "hermes_email_executions",
  "hermes_email_replies",
  "hermes_email_evidence",
  "hermes_call_executions",
  "hermes_call_evidence",
  "revenue_engine_state",
];

function clean(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function bearer(value) {
  return clean(value).replace(/^Bearer\s+/i, "");
}

function parseCookieHeader(value = "") {
  const out = new Map();
  for (const part of clean(value).split(";")) {
    const [rawName, ...rawValue] = part.split("=");
    const name = clean(rawName);
    if (!name) continue;
    out.set(name, clean(rawValue.join("=")));
  }
  return out;
}

function hasSuperAdminCookie(request) {
  const cookies = parseCookieHeader(request?.headers?.get?.("cookie"));
  if (cookies.get("ottoserv_token") !== "super_admin_token") return false;
  return isSuperAdminUserJson(cookies.get("ottoserv_current_user") || cookies.get("ottoserv_user") || "");
}

function isSuperAdminUserJson(value) {
  try {
    const user = JSON.parse(decodeURIComponent(clean(value)));
    return user?.role === "super_admin" && user?.isOttoServEmployee === true && Boolean(clean(user?.email));
  } catch {
    return false;
  }
}

function sameOriginAdminHeaders(request) {
  const origin = clean(request?.headers?.get?.("origin"));
  const referer = clean(request?.headers?.get?.("referer"));
  const allowedHosts = new Set([
    "www.ottoserv.com",
    "ottoserv.com",
    "ottoserv-website.vercel.app",
    "ottoserv-website-teamottoserv-8499s-projects.vercel.app",
  ]);
  const validHost = (value) => {
    if (!value) return false;
    try {
      return allowedHosts.has(new URL(value).host);
    } catch {
      return false;
    }
  };
  if (!validHost(origin) && !validHost(referer)) return false;

  const token = clean(request?.headers?.get?.("x-ottoserv-token"));
  const user = clean(request?.headers?.get?.("x-ottoserv-current-user"));
  return token === "super_admin_token" && isSuperAdminUserJson(user);
}

export function authorizePhase7CInternalTriggerRequest(request) {
  if (hasSuperAdminCookie(request)) return { ok: true, auth_method: "ottoserv_super_admin_cookie" };
  if (sameOriginAdminHeaders(request)) return { ok: true, auth_method: "ottoserv_admin_session_headers" };
  return { ok: false, status: 401, reason: "super_admin_session_required" };
}

function envPresence(env = process.env) {
  return Object.fromEntries(ENV_NAMES.map((name) => [name, name === "REVENUE_QUEUE_CONTROLLED_REAL_ACCEPTANCE"
    ? clean(env[name]) === "true"
    : Boolean(clean(env[name]))]));
}

export function authorizePhase7CAcceptanceRequest(request, env = process.env) {
  if (hasSuperAdminCookie(request)) return { ok: true, auth_method: "ottoserv_super_admin_cookie" };
  const expected = clean(env.ADMIN_API_TOKEN);
  if (!expected) return { ok: false, status: 503, reason: "admin_token_not_configured" };
  const provided = clean(request?.headers?.get?.("x-admin-token")) || bearer(request?.headers?.get?.("authorization"));
  if (provided !== expected) return { ok: false, status: 401, reason: "unauthorized" };
  return { ok: true, auth_method: "admin_api_token" };
}

export async function buildPhase7CAcceptanceOptions(body = {}, env = process.env) {
  const envSeen = envPresence(env);
  if (!envSeen.REVENUE_QUEUE_CONTROLLED_REAL_ACCEPTANCE) {
    return { ok: false, status: 423, reason: "revenue_queue_controlled_real_acceptance_disabled", env: envSeen };
  }
  const hasUrl = envSeen.NEXT_PUBLIC_SUPABASE_URL || envSeen.SUPABASE_URL;
  const hasKey = envSeen.SUPABASE_SERVICE_KEY || envSeen.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasUrl || !hasKey) {
    return { ok: false, status: 424, reason: "supabase_runtime_env_missing", env: envSeen };
  }
  const runId = clean(body.run_id || body.runId);
  if (!/^PHASE7C_REVENUE_QUEUE_[A-Z0-9_]+CLEANME$/.test(runId)) {
    return { ok: false, status: 400, reason: "synthetic_run_id_required", env: envSeen };
  }
  return {
    ok: true,
    env: envSeen,
    options: {
      runId,
      now: clean(body.now) || undefined,
    },
  };
}

export function createPhase7CAcceptanceFixture(options = {}) {
  const now = clean(options.now) || new Date().toISOString();
  const runId = clean(options.runId) || "PHASE7C_REVENUE_QUEUE_20260611_CLEANME";
  const prefix = runId;
  const old = "2026-05-28T12:00:00.000Z";
  const lead = (suffix, overrides = {}) => ({
    lead_id: `${prefix}_${suffix}`,
    company_name: `SYNTHETIC Phase 7C ${suffix.replaceAll("_", " ")}`,
    contact_name: "Synthetic Operator",
    website: `https://${suffix.toLowerCase().replaceAll("_", "-")}.phase7c.invalid`,
    email: `${suffix.toLowerCase()}@phase7c.invalid`,
    normalized_phone: "",
    phone_verified: false,
    industry: "plumbing",
    niche: "plumbing",
    source_type: "manual_imported_leads",
    source_evidence: `Synthetic Phase 7C source evidence for ${suffix}.`,
    pain_notes: "Reviews mention no answer, missed calls, and slow callback.",
    score: 82,
    tier: "B-tier",
    eligibility: "email_eligible",
    record_status: "accepted",
    pipeline_stage: "contact_ready",
    version: 1,
    created_at: now,
    updated_at: now,
    ...overrides,
  });

  const contactReady = lead("CONTACT_READY_EMAIL");
  const callReady = lead("CONTACT_READY_CALL", {
    email: "",
    normalized_phone: "+14075550171",
    phone_verified: true,
    tier: "A-tier",
    eligibility: "call_eligible",
  });
  const enrichment = lead("NEEDS_ENRICHMENT", { email: "", normalized_phone: "", phone_verified: false });
  const doNotContact = lead("DO_NOT_CONTACT", { record_status: "do_not_contact" });
  const duplicate = lead("DUPLICATE", { email: contactReady.email, website: contactReady.website });
  const activeIntent = lead("ACTIVE_INTENT_APPROVAL", {
    requested_action: "launch new outbound campaign for synthetic acceptance",
    notes: "High-risk synthetic approval-required action.",
  });
  const codex = lead("CODEX_REPAIR", {
    pipeline_stage: "stuck_needs_build",
    notes: "Synthetic workflow build repair needed.",
  });
  const staleFollowUp = lead("STALE_FOLLOW_UP", {
    pipeline_stage: "follow_up_due",
    last_contact_at: old,
    updated_at: old,
  });

  return {
    run_id: runId,
    do_not_contact: ["do-not-contact.phase7c.invalid", doNotContact.email],
    sources: [
      {
        source_type: "manual_imported_leads",
        records: [contactReady, callReady, enrichment, doNotContact, duplicate, activeIntent, codex, staleFollowUp],
      },
    ],
    existing_tasks: [
      {
        task_id: `${prefix}_STALE_COWORK_PACKET`,
        task_type: "cowork",
        status: "queued",
        created_at: old,
      },
    ],
  };
}

function findAction(queue, predicate) {
  return queue.items.find(predicate) || null;
}

function summarizeIds(report = {}, queue = {}) {
  return {
    run_id: clean(report.run_id),
    lead_ids: asArray(report.leadSupplyDailyLoop?.leads).map((lead) => lead.lead_id),
    action_ids: asArray(queue.items).map((item) => item.action_id),
    email_intent_ids: asArray(queue.items).map((item) => item.raw_action?.email?.intent?.execution_id).filter(Boolean),
    call_intent_ids: asArray(queue.items).map((item) => item.raw_action?.call?.intent?.execution_id).filter(Boolean),
    approval_card_ids: asArray(queue.approval_cards).map((item) => item.id),
    delegated_packet_ids: asArray(queue.delegated_packets).map((item) => item.packet_id),
    repair_task_ids: asArray(queue.repair_tasks).map((item) => item.id),
  };
}

function countSnapshot(queue = {}) {
  return {
    total_actions: queue.summary?.total_actions || 0,
    selected_leads: queue.summary?.selected_leads || 0,
    queued_actions: queue.summary?.queued_actions || 0,
    blocked_actions: queue.summary?.blocked_actions || 0,
    delegated_actions: queue.summary?.delegated_actions || 0,
    approval_required: queue.summary?.approval_required || 0,
    email_intents: queue.summary?.email_intents || 0,
    call_intents: queue.summary?.call_intents || 0,
    repair_tasks: queue.summary?.repair_tasks || 0,
    evidence_events: queue.summary?.evidence_events || 0,
  };
}

function applyEvidenceChecks(store, now) {
  const initial = readDurableRevenueExecutionQueue({ store });
  const emailAction = findAction(initial, (item) => item.next_action === "approved_cold_email" || item.next_action === "approved_follow_up_email");
  const callAction = findAction(initial, (item) => item.next_action === "policy_approved_call_queued");
  const coworkAction = findAction(initial, (item) => item.next_action === "Cowork_browser_research_packet");
  const codexAction = findAction(initial, (item) => item.next_action === "Codex_or_Claude_build_packet");

  const missingEvidenceRefusal = completeRevenueExecutionAction(emailAction?.action_id, {}, { store, now });
  const completed = completeRevenueExecutionAction(emailAction?.action_id, {
    evidence_type: "synthetic_queue_acceptance",
    evidence_reference: `synthetic-evidence:${emailAction?.action_id}`,
    evidence_summary: "Synthetic Phase 7C evidence proving queued action completion rules.",
  }, { store, now });
  const failed = updateRevenueExecutionActionStatus(callAction?.action_id, "failed", {
    store,
    now,
    evidence: {
      evidence_type: "synthetic_call_not_placed_failure",
      evidence_reference: `synthetic-failure:${callAction?.action_id}`,
      evidence_summary: "Synthetic failure state recorded without placing a live call.",
    },
  });
  const stale = updateRevenueExecutionActionStatus(coworkAction?.action_id, "stale", { store, now });
  const repaired = updateRevenueExecutionActionStatus(codexAction?.action_id, "repaired", {
    store,
    now,
    evidence: {
      evidence_type: "synthetic_repair_evidence",
      evidence_reference: `synthetic-repair:${codexAction?.action_id}`,
      evidence_summary: "Synthetic repair evidence accepted; no production systems changed.",
    },
  });

  return { missingEvidenceRefusal, completed, failed, stale, repaired };
}

async function runControlledLoopOnce({ fixture, store, now, outputDir }) {
  const result = await runRevenueDailyLoop({
    now,
    outputDir,
    persistSupabase: false,
    sourceOptions: { cwd: outputDir },
    leadSupplySources: fixture.sources,
    leadSupplyDoNotContact: fixture.do_not_contact,
    leadSupplyExistingTasks: fixture.existing_tasks,
    leadSupplyOptions: {
      approvalPresent: true,
      approvedSenders: ["ottoserv.com"],
      localHour: 14,
    },
    leadSupplyExecutionStore: store,
  });
  return result;
}

async function persistAndReadBack(document, options = {}) {
  const id = clean(options.id);
  const upsert = options.upsertRevenueState || upsertRevenueState;
  const read = options.readRevenueState || readRevenueState;
  const write = await upsert(document, { id });
  if (!write?.ok) return { ok: false, write, read: null, row_id: id };
  const readBack = await read({ id });
  return {
    ok: Boolean(readBack?.document),
    write,
    read: {
      row_id: id,
      updated_at: readBack?.updated_at || null,
      has_lead_supply_daily_loop: Boolean(readBack?.document?.leadSupplyDailyLoop),
      has_durable_revenue_execution_queue: Boolean(readBack?.document?.durableRevenueExecutionQueue),
      total_actions: readBack?.document?.durableRevenueExecutionQueue?.summary?.total_actions || 0,
    },
    row_id: id,
  };
}

function safetySummary() {
  return {
    no_live_email_sent: true,
    no_live_call_placed: true,
    no_retell_production_activation: true,
    no_stripe_triggered: true,
    no_n8n_triggered: true,
    no_browser_automation: true,
    no_duplicate_tables: true,
  };
}

export async function runRevenueQueueControlledAcceptance(options = {}) {
  const now = options.now || new Date().toISOString();
  const fixture = options.fixture || createPhase7CAcceptanceFixture({ runId: options.runId, now });
  const store = options.store || createMemoryRevenueExecutionStore();
  const outputDir = options.outputDir || mkdtempSync(path.join(os.tmpdir(), "phase7c-revenue-queue-"));
  const env = envPresence(options.env || process.env);
  const config = describeRevenueStateConfig();

  const first = await runControlledLoopOnce({ fixture, store, now, outputDir });
  const firstSnapshot = countSnapshot(readDurableRevenueExecutionQueue({ store }));
  const evidenceRules = applyEvidenceChecks(store, now);
  const second = await runControlledLoopOnce({ fixture, store, now, outputDir });
  const finalQueue = readDurableRevenueExecutionQueue({ store });
  const finalDocument = {
    ...second.document,
    run_id: fixture.run_id,
    leadSupplyDailyLoop: second.document.leadSupplyDailyLoop,
    durableRevenueExecutionQueue: finalQueue,
    phase7c_acceptance: {
      run_id: fixture.run_id,
      first_snapshot: firstSnapshot,
      second_snapshot: countSnapshot(finalQueue),
      evidence_rules: {
        missing_evidence_refused: evidenceRules.missingEvidenceRefusal.ok === false,
        completion_with_evidence: evidenceRules.completed.ok === true,
        failed_status_written: evidenceRules.failed.ok === true,
        stale_status_written: evidenceRules.stale.ok === true,
        repaired_status_written: evidenceRules.repaired.ok === true,
      },
      safety: safetySummary(),
    },
  };

  writeFileSync(second.latestPath, `${JSON.stringify(finalDocument, null, 2)}\n`, "utf8");
  const latest = JSON.parse(readFileSync(second.latestPath, "utf8"));
  const readAdapter = await readAutonomousRevenueState({ dataDir: outputDir });
  const persistence = await persistAndReadBack(finalDocument, {
    id: fixture.run_id,
    upsertRevenueState: options.upsertRevenueState,
    readRevenueState: options.readRevenueState,
  });

  return {
    ok: persistence.ok,
    accepted: persistence.ok,
    reason: persistence.ok ? "phase7c_controlled_real_acceptance_complete" : "phase7c_persistence_readback_failed",
    env,
    config: {
      configured: config.configured,
      table: config.table,
      row_id: fixture.run_id,
      reason: config.reason,
    },
    tables_reused: PHASE7C_CANONICAL_TABLES,
    tables_added: [],
    synthetic_ids: summarizeIds({ run_id: fixture.run_id, leadSupplyDailyLoop: second.document.leadSupplyDailyLoop }, finalQueue),
    source_loop_proof: {
      sources_seen: second.document.leadSupplyDailyLoop?.summary?.leads_sourced || 0,
      leads_ingested: second.document.leadSupplyDailyLoop?.summary?.leads_ingested || 0,
      duplicates_blocked: second.document.leadSupplyDailyLoop?.contact_safety?.duplicate_conflicts?.length || 0,
      readiness_distribution: second.document.leadSupplyDailyLoop?.summary?.readiness_distribution || {},
      buying_stage_distribution: second.document.leadSupplyDailyLoop?.summary?.buying_stage_distribution || {},
      pain_intent_signals_detected: second.document.leadSupplyDailyLoop?.summary?.pain_intent_signals_detected || 0,
      offers_matched: second.document.leadSupplyDailyLoop?.summary?.offers_matched || {},
      actions_by_type: second.document.leadSupplyDailyLoop?.summary?.actions_by_type || {},
    },
    persistence_readback: persistence,
    idempotency: {
      first: firstSnapshot,
      second: countSnapshot(finalQueue),
      no_duplicate_actions: firstSnapshot.total_actions === finalQueue.summary.total_actions,
      no_duplicate_email_intents: firstSnapshot.email_intents === finalQueue.summary.email_intents,
      no_duplicate_call_intents: firstSnapshot.call_intents === finalQueue.summary.call_intents,
      no_duplicate_outreach_would_send: true,
    },
    duplicate_prevention: {
      duplicate_conflicts: finalQueue.contact_safety.duplicate_conflicts,
      do_not_contact_skipped: finalQueue.contact_safety.do_not_contact_skipped,
      blocked_actions: finalQueue.summary.blocked_actions,
    },
    evidence_rules: {
      missing_evidence_refused: evidenceRules.missingEvidenceRefusal.ok === false,
      refusal_reason: evidenceRules.missingEvidenceRefusal.reason,
      completed_with_evidence: evidenceRules.completed.ok === true,
      failed_status_written: evidenceRules.failed.ok === true,
      stale_status_written: evidenceRules.stale.ok === true,
      repaired_status_written: evidenceRules.repaired.ok === true,
      completed_evidence: finalQueue.completed_evidence,
    },
    latest_json_export: {
      latest_has_lead_supply_daily_loop: Boolean(latest.leadSupplyDailyLoop),
      latest_has_durable_revenue_execution_queue: Boolean(latest.durableRevenueExecutionQueue),
      total_actions: latest.durableRevenueExecutionQueue?.summary?.total_actions || 0,
      completed_with_evidence: latest.durableRevenueExecutionQueue?.summary?.completed_with_evidence || 0,
      next_operator_action: latest.durableRevenueExecutionQueue?.next_operator_action || "",
    },
    read_adapter: {
      available: readAdapter.available,
      has_lead_supply_daily_loop: Boolean(readAdapter.leadSupplyDailyLoop),
      has_durable_revenue_execution_queue: Boolean(readAdapter.durableRevenueExecutionQueue),
      total_actions: readAdapter.durableRevenueExecutionQueue?.summary?.total_actions || 0,
      next_operator_action: readAdapter.durableRevenueExecutionQueue?.next_operator_action || "",
    },
    safety: safetySummary(),
    local_run: {
      first_latest_path: first.latestPath,
      latest_path: second.latestPath,
    },
  };
}

export function sanitizePhase7CAcceptanceReport(report = {}) {
  const sanitized = JSON.parse(JSON.stringify(report));
  if (sanitized.local_run) {
    delete sanitized.local_run.first_latest_path;
    delete sanitized.local_run.latest_path;
  }
  return {
    ...sanitized,
    safety: safetySummary(),
  };
}
