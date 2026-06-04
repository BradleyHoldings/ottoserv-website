// ─── Hermes headless orchestrator (Autonomy v2, milestone 4) ──────────────────
//
// THE GAP THIS FILLS
// All the pieces exist — state read, learning-weighted selector, scorecard,
// operating ledger — but nothing RUNS them together on a schedule. "Hermes runs
// OttoServ day after day" requires one heartbeat that, each cycle:
//   sense (load state + memory) → decide (learning-weighted next actions) →
//   score (autonomy scorecard) → record (write events to the ledger) →
//   persist (publish the cycle so actors/dashboard/Hermes read what to do next).
//
// This module is that heartbeat. It COMPOSES the existing modules (no rebuild, no
// parallel store) and persists the cycle via the existing revenue_engine_state
// store under a separate row id ("operating_cycle") plus a local mirror.
//
// SAFETY: it reads, decides, records, and publishes proposals only. It triggers
// NO outreach/calls/emails/payments/n8n/deploys and executes no task — every
// action it emits is a proposal that keeps its approval gate. Best-effort
// persistence no-ops cleanly when unconfigured.

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveRevenueEngineDir } from "./revenueEngineReadAdapter.mjs";
import { loadRevenueDocument } from "./actorEvidenceIntake.mjs";
import { loadOperatingLedger, summarizeLedger, recordLedgerEvents, entriesFromNextActions, entriesFromRepairPackets } from "./hermesOperatingLedger.mjs";
import { selectNextActionsWithLearning } from "./hermesLearningWeights.mjs";
import { computeScorecard } from "./hermesAutonomyScorecard.mjs";
import { materializeActorPackets, reconcileNextActions, DEFAULT_STANDING_OUTBOUND_POLICY } from "./hermesApprovalThroughput.mjs";
import { generateRepairPackets } from "./hermesSelfRepair.mjs";
import { mergeMaterializedIntoQueue } from "./hermesActorQueue.mjs";
import { executeSafeInternalActions } from "./hermesSafeExecutor.mjs";
import { executeEmailQueue } from "./hermesEmailExecutor.mjs";
import { executeCallQueue } from "./hermesCallExecutor.mjs";
import { upsertRevenueState } from "./revenueEngineSupabaseStore.mjs";

export const CYCLE_ROW_ID = "operating_cycle";
export const CYCLE_FILE = "operating-cycle.json";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readJsonSafe(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

// Resolve the lead-intent signal files (best-effort; absent → null, not fatal).
async function senseLeadSignals(options) {
  const cwd = options.cwd || process.cwd();
  const leadsPath = options.leadsPath || process.env.LEADS_PATH || path.join(cwd, "data", "call-imports", "leads.json");
  const liDir = options.leadIntentDir || process.env.LEAD_INTENT_OUTPUT_DIR || path.join(cwd, "data", "lead-intent");
  const [leadsRaw, pipeline, ingestReport] = await Promise.all([
    readJsonSafe(leadsPath),
    readJsonSafe(path.join(liDir, "pipeline.json")),
    readJsonSafe(path.join(liDir, "ingest-report.json")),
  ]);
  return { leads: asArray(leadsRaw), pipeline, ingestReport };
}

// Resolve the actor availability descriptor (best-effort; absent → undefined so
// self-repair behavior is unchanged). Lets temporary credit/window exhaustion be
// queued-until-reset instead of misread as a broken rail.
async function senseActorAvailability(options) {
  const cwd = options.cwd || process.cwd();
  const file = options.availabilityPath || process.env.HERMES_ACTOR_AVAILABILITY_PATH || path.join(cwd, "data", "actors", "availability.json");
  const raw = await readJsonSafe(file);
  if (raw && typeof raw === "object") return raw;
  return undefined;
}

// Resolve the client-success signals (best-effort; absent → [], not fatal). Safe
// fixture/store shape — business-name level, no PII required.
async function senseClientSignals(options) {
  const cwd = options.cwd || process.cwd();
  const clientsPath = options.clientsPath || process.env.CLIENT_SUCCESS_PATH || path.join(cwd, "data", "client-success", "clients.json");
  const raw = await readJsonSafe(clientsPath);
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.clients)) return raw.clients;
  return [];
}

/**
 * Run one operating cycle. Returns the full cycle result; also persists it.
 *
 * @param {object} options {
 *   now?, cwd?, dataDir?, leadsPath?, leadIntentDir?,
 *   state? { document, leads, pipeline, ingestReport } // inject to skip disk,
 *   persistSupabase?, writeLocal?, recordLedger?
 * }
 */
export async function runOperatingCycle(options = {}) {
  const now = options.now || new Date().toISOString();
  const injected = options.state || {};

  // 1. SENSE — current revenue document, lead signals, and operating memory.
  const loadedDoc = injected.document !== undefined
    ? { available: true, document: injected.document, source: { kind: "injected" } }
    : await loadRevenueDocument(options);
  const document = loadedDoc.document || {};

  const leadSignals = injected.leads !== undefined || injected.pipeline !== undefined || injected.ingestReport !== undefined
    ? { leads: asArray(injected.leads), pipeline: injected.pipeline || null, ingestReport: injected.ingestReport || null }
    : await senseLeadSignals(options);

  const clients = injected.clients !== undefined ? asArray(injected.clients) : await senseClientSignals(options);
  const availability = injected.availability !== undefined ? injected.availability : await senseActorAvailability(options);

  const ledger = await loadOperatingLedger(options);
  const ledgerSummary = summarizeLedger(ledger.entries);

  const senseState = {
    document,
    leads: leadSignals.leads,
    pipeline: leadSignals.pipeline,
    ingestReport: leadSignals.ingestReport,
    clients,
    ledger: ledger.entries,
    ledgerSummary,
    now,
  };

  // 2. SCORE (detection) — autonomy scorecard used to drive self-repair.
  const detectionScore = computeScorecard(senseState, { now });

  // 3. SELF-REPAIR — turn detected broken rails into owned repair packets, so the
  //    selector routes them and the ledger learns (broken → repaired / MTTR). The
  //    generated packets are merged into the document the decide+record steps use.
  const selfRepair = generateRepairPackets({ scorecard: detectionScore, document, now, availability });
  const documentForActions = selfRepair.new_packets.length
    ? { ...document, repairPackets: [...asArray(document.repairPackets), ...selfRepair.new_packets] }
    : document;

  // 4. DECIDE — learning-weighted next actions (routes the repair packets too).
  const decided = selectNextActionsWithLearning({ ...senseState, document: documentForActions }, { now });

  // 4b. MATERIALIZE — turn proposals into actor-ready packets under standing policy.
  //     NORMAL B-tier email under cap and NORMAL approved-policy calls materialize
  //     WITHOUT a per-item approval; exceptional/over-cap/uncovered stay GATED and
  //     missing-prerequisite actions are BLOCKED. Triggers nothing.
  const throughput = materializeActorPackets(decided.actions, {
    document: documentForActions,
    now,
    standingOutboundPolicy: DEFAULT_STANDING_OUTBOUND_POLICY,
  });

  // 4b-ii. QUEUE — persist materialized outbound into the durable execution queue so
  //     the execute phase (and the actor evidence intake) can act on real packets.
  const queued = mergeMaterializedIntoQueue(documentForActions, decided.actions, throughput, {
    now,
    leads: leadSignals.leads,
    mode: options.executionMode === "live" ? "live" : undefined,
    policy: DEFAULT_STANDING_OUTBOUND_POLICY,
  });

  // 4b-iii. EXECUTE — close the loop inside the heartbeat. SAFE BY DEFAULT: internal
  //     status auto-completion runs always (it only advances evidence-backed tasks);
  //     email/call execution is no-send/no-dial unless options enable live mode AND a
  //     transport is wired. Nothing is sent/dialed here without explicit, credentialed
  //     opt-in, and evidence is never fabricated.
  const internalExec = executeSafeInternalActions(queued.document, { now });
  const emailExec = await executeEmailQueue(internalExec.document, {
    now,
    mode: options.emailMode || (options.executionMode === "live" ? "live" : "no_send"),
    transport: options.emailTransport || null,
    dnc: options.dnc, blacklist: options.blacklist, sentToday: options.sentToday,
    lastContactedAt: options.lastContactedAt, cooldownDays: options.cooldownDays,
  });
  const callExec = await executeCallQueue(emailExec.document, {
    now,
    mode: options.callMode || (options.executionMode === "live" ? "live" : "no_dial"),
    dialer: options.callTransport || null,
    dnc: options.dnc, blacklist: options.blacklist, lastContactedAt: options.lastContactedAt,
    cooldownDays: options.cooldownDays, attempts: options.attempts, maxAttempts: options.maxAttempts,
    businessHours: options.businessHours, localHour: options.localHour,
  });
  const documentExecuted = callExec.document;
  const executionLedgerEvents = [
    ...asArray(emailExec.ledgerEvents),
    ...asArray(callExec.ledgerEvents),
  ];
  const executionChanged = internalExec.executed.length > 0 || emailExec.summary.sent > 0 || emailExec.summary.failed > 0 || callExec.summary.dialed > 0 || callExec.summary.failed > 0 || queued.added > 0;

  // 4c. RE-SCORE — score the EXECUTED document so closed/evidenced packets count for
  //     loop-closure + evidence discipline. Bottleneck still counts only GATED proposals.
  const scorecard = computeScorecard({ ...senseState, document: documentExecuted, throughput }, { now });

  // 4d. RECONCILE — annotate published next_actions with what throughput did, so a
  //     normal outbound action that materialized under standing policy is shown as
  //     queued (required_approval:false), not "request Jonathan approval". Only
  //     genuinely gated proposals stay Jonathan approval blockers.
  const reconciledActions = reconcileNextActions(decided.actions, throughput);

  // 5. RECORD — write proposed actions + rail state into the operating ledger.
  let recorded = { added: 0, total: ledger.entries.length };
  if (options.recordLedger !== false) {
    // Record the RECONCILED actions so materialized outbound is logged as
    // proposed/queued (not approval-pending) — otherwise the ledger's
    // approvals.pending count keeps the Jonathan bottleneck artificially high.
    const events = [
      ...entriesFromNextActions({ ...decided, actions: reconciledActions }, { now }),
      ...entriesFromRepairPackets(asArray(documentForActions.repairPackets), { now }),
      ...executionLedgerEvents,
    ];
    recorded = await recordLedgerEvents(events, { ...options, now });
  }

  // 5. PERSIST — publish the cycle so actors/dashboard/Hermes read what to do next.
  const cycle = {
    id: CYCLE_ROW_ID,
    generated_at: now,
    autonomy_status: scorecard.autonomy_status,
    autonomy_score: scorecard.autonomy_score,
    grades: scorecard.grades,
    top_blockers: scorecard.top_blockers,
    next_actions: reconciledActions,
    next_actions_by_priority: decided.by_priority,
    throughput: {
      summary: throughput.summary,
      materialized: throughput.materialized.map((m) => ({ action_id: m.action_id, task_id: m.task_id, via: m.via, channel: m.channel, agent: m.taskPacket.assigned_agent })),
      gated: throughput.gated.map((g) => ({ action_id: g.action_id, risk: g.risk, channel: g.channel, reason: g.reason })),
      blocked: throughput.blocked,
      outbound_counters: throughput.outbound_counters,
    },
    scorecard,
    self_repair: {
      generated: selfRepair.new_packets.length,
      deferred_until_reset: asArray(selfRepair.deferred).length,
      by_owner: selfRepair.summary.by_owner,
      packets: selfRepair.new_packets.map((p) => ({ id: p.id, what_failed: p.what_failed, owner: p.owner, category: p.category, status: p.status })),
      deferred: asArray(selfRepair.deferred),
    },
    // The execute phase: queued → execution → evidence → status, all in one cycle.
    // SAFE BY DEFAULT (no_send/no_dial). Live sends/dials require an explicitly wired,
    // credentialed transport via options; absent → prepare-only, nothing leaves.
    execution: {
      queue_added: queued.added,
      internal_completed: internalExec.executed.length,
      email: emailExec.summary,
      call: callExec.summary,
      changed: executionChanged,
    },
    sense: {
      document_source: loadedDoc.source?.kind || "none",
      leads: leadSignals.leads.length,
      clients: clients.length,
      ledger_entries: ledger.entries.length,
    },
    ledger_recorded: { added: recorded.added, total: recorded.total },
  };

  let local_written = false;
  if (options.writeLocal !== false) {
    const file = path.join(resolveRevenueEngineDir(options), CYCLE_FILE);
    try {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, `${JSON.stringify(cycle, null, 2)}\n`, "utf8");
      local_written = true;
    } catch {
      // non-fatal
    }
  }

  let supabase = { ok: false, skipped: true, reason: "disabled" };
  if (options.persistSupabase !== false) {
    supabase = await upsertRevenueState(cycle, { id: CYCLE_ROW_ID });
  }

  // When the execute phase actually changed the document (queued/sent/dialed/closed),
  // persist the updated execution queue back to the SAME store the rest of the system
  // reads (latest.json + best-effort default Supabase row) so progress is durable.
  let document_persisted = false;
  if (executionChanged && loadedDoc.source?.kind === "local_file" && loadedDoc.source.file && options.writeLocal !== false) {
    try {
      await fs.writeFile(loadedDoc.source.file, `${JSON.stringify(documentExecuted, null, 2)}\n`, "utf8");
      document_persisted = true;
    } catch {
      // non-fatal
    }
  }
  if (executionChanged && options.persistSupabase !== false) {
    await upsertRevenueState(documentExecuted);
  }

  return {
    ok: true,
    cycle,
    summary: {
      autonomy_status: scorecard.autonomy_status,
      autonomy_score: scorecard.autonomy_score,
      next_actions: reconciledActions.length,
      throughput: throughput.summary,
      top_action: reconciledActions[0] ? { action_type: reconciledActions[0].action_type, actor: reconciledActions[0].actor, priority: reconciledActions[0].priority, throughput_status: reconciledActions[0].throughput_status, required_approval: reconciledActions[0].required_approval } : null,
      blockers: scorecard.top_blockers.length,
      self_repair_packets: selfRepair.new_packets.length,
      deferred_until_reset: asArray(selfRepair.deferred).length,
      execution: { queue_added: queued.added, internal_completed: internalExec.executed.length, emails_sent: emailExec.summary.sent, calls_placed: callExec.summary.dialed },
      ledger_added: recorded.added,
      persisted: { local: local_written, supabase, document: document_persisted },
    },
  };
}
