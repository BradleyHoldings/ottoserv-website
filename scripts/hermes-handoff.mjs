// Hermes paid-client handoff runner. Scans leads + recorded call outcomes for
// interested/buyer-ready signals and produces implementation work-order SEEDS that
// land on the proposal/payment gate. Triggers NOTHING — no proposal, no payment
// link, no build. The proposal/pricing/payment/build steps stay gated by the work
// order's stage ladder.
//
// Env overrides: LEADS_PATH, REVENUE_LOOP_OUTPUT_DIR, HERMES_NOW.

import { promises as fs } from "node:fs";
import path from "node:path";

import { loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";
import { detectInterestedHandoffs } from "../src/lib/hermesPaidClientHandoff.mjs";
import { isCallTask } from "../src/lib/hermesCallRail.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();

async function readJsonSafe(file) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return null; }
}
function clean(v) { return String(v ?? "").trim(); }
function asArray(v) { return Array.isArray(v) ? v : []; }

async function main() {
  const cwd = process.cwd();
  const leadsPath = process.env.LEADS_PATH || path.join(cwd, "data", "call-imports", "leads.json");
  const loaded = await loadRevenueDocument({});
  const document = loaded.document || {};
  const leadsRaw = (await readJsonSafe(leadsPath)) || [];
  const leads = Array.isArray(leadsRaw) ? leadsRaw : [];

  // Derive interested call outcomes from the document's recorded call tasks.
  const callOutcomes = asArray(document?.approvalExecutionQueue?.items)
    .filter(isCallTask)
    .flatMap((item) => {
      const lc = item.lifecycle || {};
      const text = asArray(lc.submitted_evidence).map((e) => `${e.evidence_summary} ${e.evidence_reference}`).join(" ");
      const dispo = clean(lc.disposition) || (/\bbooked\b/i.test(text) ? "booked_demo" : /callback/i.test(text) ? "callback_scheduled" : "");
      if (!dispo) return [];
      return [{ lead_id: clean(lc.lead_id), company: clean(item.taskPacket?.company), disposition: dispo, call_id: asArray(lc.submitted_evidence)[0]?.evidence_reference || "", recorded_at: clean(lc.last_status_update_at) || now }];
    });

  const existingWorkOrders = asArray(document?.implementationWorkOrders?.orders);
  const result = detectInterestedHandoffs({ leads, callOutcomes, existingWorkOrders, now });

  console.log(JSON.stringify({
    mode: "paid_client_handoff",
    generated_at: now,
    document_source: loaded.source?.kind || "none",
    summary: result.summary,
    handoff_seeds: result.seeds,
    note: "Proposals only. Promote with promoteSeedsToWorkOrders(seeds) to open durable work orders at the proposal/payment gate. Proposal/pricing/payment-link/build remain approval-gated.",
  }, null, 2));
}

main().catch((err) => { console.error(String(err?.stack || err)); process.exit(1); });
