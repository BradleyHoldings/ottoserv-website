// Hermes durable actor-queue runner. Senses current state, selects next actions,
// materializes normal outbound under standing policy, and PERSISTS the materialized
// packets into the revenue document's approvalExecutionQueue (latest.json +
// best-effort Supabase) — the same store the scorecard, selector, and actor
// evidence intake already use. Safe to schedule unattended.
//
// NO-SEND / NO-CALL by default: every persisted actor_packet carries mode
// "no_send_no_call". This script triggers NO emails, calls, DMs, payments, n8n,
// or deploys — it only queues intent for the (separate, explicitly-enabled) rails.
//
// Env overrides: REVENUE_LOOP_OUTPUT_DIR, LEADS_PATH, LEAD_INTENT_OUTPUT_DIR,
//   HERMES_NOW, HERMES_PERSIST_SUPABASE=false, HERMES_ACTOR_QUEUE_MODE (default
//   no_send_no_call; "live" is reserved for a future, explicitly-approved adapter).

import { promises as fs } from "node:fs";
import path from "node:path";

import { loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";
import { selectNextActions } from "../src/lib/hermesNextActionSelector.mjs";
import { materializeActorPackets, DEFAULT_STANDING_OUTBOUND_POLICY } from "../src/lib/hermesApprovalThroughput.mjs";
import { mergeMaterializedIntoQueue } from "../src/lib/hermesActorQueue.mjs";
import { upsertRevenueState } from "../src/lib/revenueEngineSupabaseStore.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();
const mode = process.env.HERMES_ACTOR_QUEUE_MODE || "no_send_no_call";
const persistSupabase = process.env.HERMES_PERSIST_SUPABASE !== "false";

async function readJsonSafe(file) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return null; }
}

async function main() {
  const cwd = process.cwd();
  const leadsPath = process.env.LEADS_PATH || path.join(cwd, "data", "call-imports", "leads.json");
  const liDir = process.env.LEAD_INTENT_OUTPUT_DIR || path.join(cwd, "data", "lead-intent");

  const loaded = await loadRevenueDocument({});
  const document = loaded.document || {};
  const leads = Array.isArray(await readJsonSafe(leadsPath)) ? await readJsonSafe(leadsPath) : [];
  const pipeline = await readJsonSafe(path.join(liDir, "pipeline.json"));
  const ingestReport = await readJsonSafe(path.join(liDir, "ingest-report.json"));

  const selected = selectNextActions({ leads, document, pipeline, ingestReport, now }, { now });
  const throughput = materializeActorPackets(selected.actions, { document, now, standingOutboundPolicy: DEFAULT_STANDING_OUTBOUND_POLICY });
  const merged = mergeMaterializedIntoQueue(document, selected.actions, throughput, { now, leads, mode, policy: DEFAULT_STANDING_OUTBOUND_POLICY });

  // Persist back the SAME way the rest of the system does (local + best-effort Supabase).
  let local_written = false;
  let supabase = { ok: false, skipped: true, reason: "disabled" };
  if (merged.added > 0) {
    const dir = process.env.REVENUE_LOOP_OUTPUT_DIR || path.join(cwd, "data", "revenue-engine");
    const file = loaded.source?.kind === "local_file" ? loaded.source.file : path.join(dir, "latest.json");
    try {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, `${JSON.stringify(merged.document, null, 2)}\n`, "utf8");
      local_written = true;
    } catch (err) {
      console.error(`Failed to persist actor queue: ${String(err?.message || err)}`);
    }
    if (persistSupabase) supabase = await upsertRevenueState(merged.document);
  }

  const out = {
    generated_at: now,
    mode,
    document_source: loaded.source?.kind || "none",
    throughput: throughput.summary,
    queue: {
      added: merged.added,
      skipped_existing: merged.skipped_existing,
      total_items: merged.document.approvalExecutionQueue.items.length,
    },
    queued_packets: merged.entries.map((e) => ({
      task_id: e.taskPacket.task_id,
      channel: e.taskPacket.actor_packet?.channel,
      lead_id: e.taskPacket.actor_packet?.lead_id,
      company: e.taskPacket.actor_packet?.company,
      via: e.taskPacket.actor_packet?.policy?.materialized_via,
      no_send: e.taskPacket.actor_packet?.no_send,
      no_call: e.taskPacket.actor_packet?.no_call,
      required_evidence: e.taskPacket.actor_packet?.required_evidence,
      status: e.lifecycle.execution_status,
    })),
    persisted: { local: local_written, supabase },
    note: "Durable actor queue persisted to approvalExecutionQueue. NO sends/calls — every packet is no_send/no_call by default. Real rails must be explicitly enabled with safe credentials.",
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
