// Hermes reply/outcome → lead-stage router CLI. Reads recorded call outcomes (and
// optional email replies) plus the lead ledger, and emits the stage routing:
// booked_audit_demo / paid_client_handoff / follow_up / not_interested / dnc /
// disqualified / human_review — with the evidence (id, timestamp, outcome, next
// action) each move requires. Buyer-ready signals also emit a paid-client handoff
// seed. READ-ONLY / propose-only: sends nothing, dials nothing, writes nothing.
//
// Env: LEADS_PATH, CALL_OUTCOMES_PATH, REPLIES_PATH, HERMES_NOW.

import { promises as fs } from "node:fs";
import path from "node:path";

import { routeOutcomes } from "../src/lib/hermesReplyRouter.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();

async function readJsonSafe(file) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return null; }
}

async function main() {
  const cwd = process.cwd();
  const leadsPath = process.env.LEADS_PATH || path.join(cwd, "data", "call-imports", "leads.json");
  const outcomesPath = process.env.CALL_OUTCOMES_PATH || path.join(cwd, "data", "call-imports", "call_outcomes.json");
  const repliesPath = process.env.REPLIES_PATH || path.join(cwd, "data", "call-imports", "email_replies.json");

  const leads = (Array.isArray(await readJsonSafe(leadsPath)) ? await readJsonSafe(leadsPath) : []) || [];
  const outcomes = (Array.isArray(await readJsonSafe(outcomesPath)) ? await readJsonSafe(outcomesPath) : []) || [];
  const replies = (Array.isArray(await readJsonSafe(repliesPath)) ? await readJsonSafe(repliesPath) : []) || [];
  const leadsById = new Map(leads.map((l) => [String(l.lead_id || "").trim(), l]));

  const result = routeOutcomes([...outcomes, ...replies], leadsById, { now });

  console.log(JSON.stringify({
    generated_at: now,
    inputs: { outcomes: outcomes.length, replies: replies.length, leads: leads.length },
    by_route: result.by_route,
    handoff_seeds: result.handoff_seeds.length,
    routed: result.routed.map((r) => ({ lead_id: r.lead_id, route: r.route, new_status: r.new_status, requires_approval: r.requires_approval, next_action: r.next_action, evidence_ref: r.evidence.reference })),
    blocked: result.blocked,
    note: "Propose-only. No emails/calls/DMs/writes. Buyer-ready signals seed a proposal/payment-gated paid-client handoff; question/objection/negative route to human_review (Jonathan).",
  }, null, 2));
}

main().catch((err) => { console.error(String(err?.stack || err)); process.exit(1); });
