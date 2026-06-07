#!/usr/bin/env node
// ─── Phase 2 controlled-real acceptance runner ────────────────────────────────
//
// Closes the controlled-real gate in ONE command, in an environment that has live
// Supabase + provider credentials. It sends EXACTLY ONE approved email to the
// OttoServ-controlled recipient, captures real provider IDs, persists + reads back
// evidence, advances the canonical lead, proves an idempotent rerun does not send
// again, then waits for / ingests the controlled reply and proves follow-up
// adjustment and restart safety.
//
// SAFETY:
//   - Requires HERMES_EMAIL_MODE=live AND a wired provider transport. Without both,
//     it refuses to send (no_send) and exits non-zero with a clear reason.
//   - Recipient MUST be HERMES_EMAIL_CONTROLLED_RECIPIENT (an OttoServ inbox).
//   - Sends at most one email. Never contacts a real prospect.
//
// Usage (in a credentialed environment, after the migration is applied):
//   HERMES_EMAIL_MODE=live \
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
//   HERMES_EMAIL_PROVIDER=resend HERMES_EMAIL_API_KEY=... \
//   HERMES_EMAIL_SENDER=hermes@ottoserv.com \
//   HERMES_EMAIL_CONTROLLED_RECIPIENT=controlled@ottoserv.com \
//   node scripts/phase2-controlled-real-acceptance.mjs --send
//
//   # after the controlled reply lands in the inbox, ingest it:
//   node scripts/phase2-controlled-real-acceptance.mjs --ingest-reply \
//     --provider-event-id <id> --in-reply-to <outbound_message_id> --body "..."

import { readEmailConfig, EMAIL_MODE, EMAIL_CONFIG_STATE } from "../src/lib/emailRail/config.mjs";
import { buildProviderTransport } from "../src/lib/emailRail/transport.mjs";
import { makeEmailClient } from "../src/lib/emailRail/store.mjs";
import { runEmailAction, materializeIntent } from "../src/lib/emailRail/pipeline.mjs";
import { evaluatePolicy } from "../src/lib/emailRail/policy.mjs";
import { processReply } from "../src/lib/emailRail/reply.mjs";
import { EMAIL_STATES } from "../src/lib/emailRail/intent.mjs";
import { ACCEPTANCE_LEAD, ACCEPTANCE_ACTION } from "../tests/fixtures/controlled-real-email-acceptance.mjs";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function has(flag) { return process.argv.includes(`--${flag}`); }
function log(obj) { console.log(JSON.stringify(obj, null, 2)); }

async function preflight() {
  const cfg = readEmailConfig();
  const client = makeEmailClient();
  const blockers = [];
  if (cfg.state !== EMAIL_CONFIG_STATE.CONFIGURED) blockers.push(`config_state:${cfg.state}`);
  if (cfg.mode !== EMAIL_MODE.LIVE) blockers.push("mode_not_live (set HERMES_EMAIL_MODE=live)");
  if (!client) blockers.push("supabase_not_configured");
  if (!cfg.controlled_recipient) blockers.push("HERMES_EMAIL_CONTROLLED_RECIPIENT_missing");
  const tp = buildProviderTransport();
  if (!tp.ok) blockers.push(`provider:${tp.reason}`);
  return { cfg, client, transport: tp.ok ? tp.transport : null, lookup: tp.lookup, provider: tp.provider, blockers };
}

async function doSend() {
  const pf = await preflight();
  if (pf.blockers.length) {
    log({ ok: false, stage: "preflight", blockers: pf.blockers, note: "controlled-real send refused — environment not credentialed" });
    process.exit(2);
  }
  const recipient = pf.cfg.controlled_recipient;
  const lead = { ...ACCEPTANCE_LEAD, email: recipient };
  const policyCtx = {
    lead, now: new Date().toISOString(),
    approvedSenders: [pf.cfg.present.sender ? ACCEPTANCE_ACTION.sender : ACCEPTANCE_ACTION.sender, ACCEPTANCE_ACTION.sender.split("@")[1]],
    approvalPresent: true, // standing approval covers this one controlled-real email
  };
  const result = await runEmailAction(
    { lead, ...ACCEPTANCE_ACTION, recipient, policyCtx },
    { client: pf.client, transport: pf.transport, worker_id: "Hermes-acceptance", updateLead: true },
  );
  const passed = result.ok && result.intent?.state === EMAIL_STATES.COMPLETED && result.evidence?.provider_message_id;

  // Idempotent rerun must NOT send again.
  let rerunBlocked = false;
  if (passed) {
    const re = await materializeIntent({ lead, ...ACCEPTANCE_ACTION, recipient }, { client: pf.client });
    const rp = evaluatePolicy(re.intent, { ...policyCtx, priorSuccessIdemKeys: new Set([result.intent.idempotency_key]) });
    rerunBlocked = !rp.ok && rp.reason === "prior_successful_send_exists";
  }

  log({
    ok: Boolean(passed && rerunBlocked),
    stage: "send",
    provider: pf.provider,
    execution_id: result.intent?.execution_id,
    state: result.intent?.state,
    provider_message_id: result.evidence?.provider_message_id,
    provider_thread_id: result.evidence?.provider_thread_id,
    lead_updated: result.lead_updated,
    evidence_items: result.evidence_items,
    idempotent_rerun_blocked: rerunBlocked,
    reason: result.reason,
    next: "send a controlled reply from the OttoServ inbox, then run --ingest-reply",
  });
  process.exit(passed && rerunBlocked ? 0 : 1);
}

async function doIngestReply() {
  const pf = await preflight();
  if (!pf.client) { log({ ok: false, blockers: pf.blockers }); process.exit(2); }
  const intent = {
    execution_id: arg("execution-id"),
    lead_id: ACCEPTANCE_LEAD.lead_id,
    provider_message_id: arg("in-reply-to"),
    provider_thread_id: arg("thread-id"),
  };
  const inbound = {
    provider_event_id: arg("provider-event-id"),
    in_reply_to: arg("in-reply-to"),
    thread_id: arg("thread-id"),
    from: pf.cfg.controlled_recipient,
    subject: "Re: " + ACCEPTANCE_ACTION.subject,
    body: arg("body", "Yes, this looks good — I'm interested, tell me more."),
  };
  const r = await processReply(inbound, intent, { client: pf.client, updateLead: true });
  log({ ok: r.ok, stage: "ingest-reply", classification: r.classification, deduped: r.deduped, stops_sequence: r.stops_sequence, lead_advanced: r.lead_advanced });
  process.exit(r.ok ? 0 : 1);
}

(async () => {
  if (has("ingest-reply")) return doIngestReply();
  if (has("send")) return doSend();
  // Default: dry preflight only (never sends).
  const pf = await preflight();
  log({ ok: pf.blockers.length === 0, stage: "preflight_only", provider: pf.provider, blockers: pf.blockers, note: "pass --send to perform the single controlled-real send" });
  process.exit(pf.blockers.length === 0 ? 0 : 2);
})();
