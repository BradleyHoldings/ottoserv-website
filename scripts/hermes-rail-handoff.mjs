// Hermes outbound rail handoff (email + call). Reads queued actor packets from the
// durable queue and produces send-ready drafts / call-ready packets after full
// preflight (contact path, evidence contract, public evidence, DNC/blacklist,
// cooldown, business hours, attempts, caps, sensitive/upset/new-campaign).
//
// NO-SEND / NO-CALL: this never sends an email or dials a call. mode is
// no_send_no_call unless HERMES_RAIL_MODE=live AND a real adapter is wired (not in
// this sprint). Over-cap/sensitive items are reported gated; missing prerequisites
// are reported blocked. Read-only by default.
//
// Env: REVENUE_LOOP_OUTPUT_DIR, HERMES_NOW, HERMES_RAIL_MODE (default no_send_no_call),
//   HERMES_RAIL_CHANNEL (email|call|both, default both), DNC_LIST/BLACKLIST (comma).

import { promises as fs } from "node:fs";
import path from "node:path";

import { loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";
import { readActorQueue } from "../src/lib/hermesActorQueue.mjs";
import { prepareRailHandoffs } from "../src/lib/hermesOutboundRails.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();
const mode = process.env.HERMES_RAIL_MODE || "no_send_no_call";
const channel = process.env.HERMES_RAIL_CHANNEL || "both";

function list(env) {
  return clean(env).split(",").map((s) => s.trim()).filter(Boolean);
}
function clean(v) { return String(v ?? "").trim(); }

async function main() {
  const loaded = await loadRevenueDocument({});
  const document = loaded.document || {};
  const queue = readActorQueue(document, channel === "both" ? {} : { channel });

  const ctx = {
    now,
    mode,
    dnc: list(process.env.DNC_LIST),
    blacklist: list(process.env.BLACKLIST),
  };
  const result = prepareRailHandoffs(queue, ctx);

  if (mode === "live") {
    // A real send/dial adapter is intentionally NOT wired in this sprint. Refuse to
    // pretend: report that live mode needs an explicitly-approved adapter + creds.
    result.live_adapter = "not_enabled — real email/call adapter requires separate approval and safe credentials; no sends/dials performed.";
  }

  console.log(JSON.stringify({
    generated_at: now,
    mode,
    document_source: loaded.source?.kind || "none",
    queued_outbound: queue.length,
    summary: result.summary,
    email: result.email,
    call: result.call,
    live_adapter: result.live_adapter,
    note: "No emails sent, no calls dialed. ready = passed preflight (draft/call-ready attached); blocked = prerequisite/guardrail failed; gated = over-cap/sensitive/new-campaign needs Jonathan.",
  }, null, 2));
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
