// ─── Phase 2 email execution rail: main pipeline ─────────────────────────────
//
// Orchestrates one email action from intent through completion:
//   eligible lead → policy gate → approved intent → atomic claim → send →
//   provider evidence → read-back → canonical lead update → final receipt.
//
// NEVER marks completed without all 9 required evidence items (rule 5).
// NEVER fabricates evidence (rule 4). Idempotent on restart (rule 5).
// Supabase is authoritative; local JSON is evidence cache only (rule 2).

import { readRailConfig } from "../leadRail/config.mjs";
import { readAuthoritativeLeads, upsertLeads } from "../leadRail/store.mjs";
import { AUTHORITATIVE_READ } from "../leadRail/store.mjs";
import { ELIGIBILITY } from "../leadRail/eligibility.mjs";
import { readEmailConfig, assertNoLocalAuthorityInProduction, EMAIL_MODE } from "./config.mjs";
import {
  createEmailIntent, transitionEmail, EMAIL_STATES, EMAIL_ACTION,
  deriveExecutionId, deriveIdempotencyKey, contentHash,
} from "./intent.mjs";
import { evaluatePolicy } from "./policy.mjs";
import {
  makeEmailClient, persistIntent, PERSISTENCE, AUTHORITATIVE_READ as EMAIL_READ,
} from "./store.mjs";
import { sendViaProvider, reconcileUnverified, SEND_OUTCOME } from "./provider.mjs";

function clean(v) { return String(v ?? "").trim(); }

const LEASE_SECONDS = 120; // 2-minute lease; watchdog reclaims expired leases

/**
 * Materialize a durable email intent for an eligible lead. Pure step — writes only
 * the intent to Supabase, does not send. Idempotent: same inputs → same execution_id
 * and idempotency_key, so a re-run returns the existing intent without duplication.
 *
 * @returns { ok, intent, persisted, status, reason }
 */
export async function materializeIntent(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const lead = input.lead || {};
  const emailCfg = options.emailConfig || readEmailConfig();

  // Config gate: no live execution without authoritative Supabase.
  if (emailCfg.mode === EMAIL_MODE.LIVE) assertNoLocalAuthorityInProduction(emailCfg);

  const intent = createEmailIntent({
    lead_id: lead.lead_id,
    lead_version: lead.version,
    action_type: input.action_type || EMAIL_ACTION.OUTBOUND,
    campaign_id: input.campaign_id,
    sequence_step: input.sequence_step,
    scheduled_slot: input.scheduled_slot,
    sender: input.sender || emailCfg.provider,
    recipient: clean(lead.email),
    template_ref: input.template_ref,
    subject: input.subject,
    body: input.body,
    content_hash: input.content_hash,
    policy_version: input.policy_version,
    reason: input.reason,
    eligibility_evidence: input.eligibility_evidence,
    scheduled_at: input.scheduled_at || now,
    correlation_id: input.correlation_id,
  }, { now });

  const client = options.client || makeEmailClient(options);
  if (!client) {
    return { ok: false, intent, persisted: false, status: "persistence_pending", reason: "supabase_not_configured" };
  }

  const result = await persistIntent(intent, { client });
  if (!result.ok && result.status === PERSISTENCE.DUPLICATE) {
    // Same idempotency key already persisted — return as success (idempotent).
    return { ok: true, intent, persisted: true, idempotent: true, status: "idempotent", reason: "duplicate_idempotency_key" };
  }
  if (!result.ok) {
    return { ok: false, intent, persisted: false, status: result.status, reason: result.reason };
  }
  return { ok: true, intent, persisted: true, status: result.status };
}

/**
 * Run the policy gate and advance the intent to `approved` or `approval_required`.
 * Returns the advanced intent with policy receipt attached.
 */
export async function applyPolicyGate(intent, ctx = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const client = options.client || makeEmailClient(options);
  const result = evaluatePolicy(intent, { ...ctx, now });

  if (!result.ok && result.requires_approval) {
    const advanced = transitionEmail(intent, EMAIL_STATES.APPROVAL_REQUIRED, { now, policy_receipt: result.receipt, reason: "approval_required" });
    if (!advanced.ok) return { ok: false, intent, reason: advanced.error };
    if (client) await persistIntent(advanced.intent, { client });
    return { ok: false, requires_approval: true, intent: advanced.intent, receipt: result.receipt, reason: "approval_required" };
  }
  if (!result.ok) {
    const advanced = transitionEmail(intent, EMAIL_STATES.BLOCKED, { now, policy_receipt: result.receipt, reason: result.reason });
    if (!advanced.ok) return { ok: false, intent, reason: advanced.error };
    if (client) await persistIntent(advanced.intent, { client });
    return { ok: false, requires_approval: false, intent: advanced.intent, receipt: result.receipt, reason: result.reason };
  }
  const advanced = transitionEmail(intent, EMAIL_STATES.APPROVED, { now, policy_receipt: result.receipt, reason: "policy_passed" });
  if (!advanced.ok) return { ok: false, intent, reason: advanced.error };
  if (client) await persistIntent(advanced.intent, { client });
  return { ok: true, intent: advanced.intent, receipt: result.receipt };
}

/**
 * Atomically claim an intent for execution. Database-enforced one-winner via the
 * hermes_email_claim_cas RPC. Returns { ok, intent?, reason? }. Stale workers (lease
 * expired) are rejected by the DB — only the current lease owner may advance.
 */
export async function claimIntent(intent, owner, options = {}) {
  const now = options.now || new Date().toISOString();
  const client = options.client || makeEmailClient(options);
  if (!client) return { ok: false, reason: "supabase_not_configured" };

  const claimResult = await client.claim(clean(intent.execution_id), clean(owner), LEASE_SECONDS, now);
  if (!claimResult?.ok) {
    return { ok: false, reason: claimResult?.reason || claimResult?.error || "claim_failed" };
  }

  // The atomic claim RPC mutated the stored row (lease + version) out of band, so
  // re-read the authoritative intent before transitioning — never persist against a
  // stale in-memory version.
  let authoritative = intent;
  try {
    const row = await client.readIntent(clean(intent.execution_id));
    if (row && row.raw_intent) authoritative = { ...row.raw_intent, version: Number(row.version ?? row.raw_intent.version) };
  } catch (_) { /* fall back to passed-in intent */ }

  const leaseExpires = clean(claimResult.lease_expires_at) || new Date(Date.parse(now) + LEASE_SECONDS * 1000).toISOString();
  const advanced = transitionEmail(authoritative, EMAIL_STATES.CLAIMED, {
    now, actor: owner,
    lease_owner: owner, lease_expires_at: leaseExpires,
    reason: "claimed",
  });
  if (!advanced.ok) return { ok: false, reason: advanced.error };
  const persisted = await persistIntent(advanced.intent, { client });
  if (!persisted.ok) return { ok: false, reason: persisted.reason };
  return { ok: true, intent: advanced.intent, lease_expires_at: leaseExpires };
}

/**
 * Execute a claimed intent: send → evidence → completion. This is the only place
 * where a real send occurs. Returns a structured result with all 9 evidence items.
 *
 * Completion requires ALL of:
 *   1. durable intent (already persisted before this call)
 *   2. policy receipt (attached to intent)
 *   3. atomic claim receipt (lease_owner set)
 *   4. real provider message id
 *   5. provider acceptance evidence
 *   6. persisted evidence record
 *   7. read-after-write verification
 *   8. canonical lead/pipeline update
 *   9. final execution receipt
 */
export async function executeIntent(intent, transport, options = {}) {
  const now = options.now || new Date().toISOString();
  const client = options.client || makeEmailClient(options);
  if (!client) return { ok: false, reason: "supabase_not_configured", intent };

  // Guard: must be in CLAIMED state with a matching lease owner.
  if (intent.state !== EMAIL_STATES.CLAIMED && intent.state !== EMAIL_STATES.EXECUTING) {
    return { ok: false, reason: `wrong_state:${intent.state}`, intent };
  }
  if (!clean(intent.lease_owner)) return { ok: false, reason: "no_lease_owner", intent };
  if (!intent.policy_receipt) return { ok: false, reason: "missing_policy_receipt", intent };

  // Advance to EXECUTING.
  const execAdv = transitionEmail(intent, EMAIL_STATES.EXECUTING, { now, reason: "executing" });
  if (!execAdv.ok) return { ok: false, reason: execAdv.error, intent };
  let current = execAdv.intent;
  await persistIntent(current, { client });

  // Evidence item 3 already set (lease_owner). Send via provider.
  const sendResult = await sendViaProvider(transport, current, { now });

  if (sendResult.outcome === SEND_OUTCOME.UNVERIFIED) {
    // Timeout / ambiguous — do NOT retry blind. Persist sent_unverified.
    const adv = transitionEmail(current, EMAIL_STATES.SENT_UNVERIFIED, { now, reason: sendResult.error_category || "sent_unverified" });
    if (adv.ok) { current = adv.intent; await persistIntent(current, { client }); }
    return { ok: false, sent_unverified: true, intent: current, reason: sendResult.error_category, requires_reconciliation: true };
  }

  if (sendResult.outcome === SEND_OUTCOME.ERROR || sendResult.outcome === SEND_OUTCOME.REJECTED) {
    const adv = transitionEmail(current, EMAIL_STATES.RETRY_WAITING, { now, reason: sendResult.error_category || "send_failed" });
    if (adv.ok) { current = adv.intent; await persistIntent(current, { client }); }
    return { ok: false, intent: current, reason: sendResult.error_category || "send_failed", retry_eligible: current.retry_count < 4 };
  }

  // Evidence item 4+5: real provider message id + acceptance.
  const evidence = sendResult.evidence;

  // Evidence item 6: persist the evidence record.
  const evRow = { ...evidence, execution_id: clean(current.execution_id), lead_id: clean(current.lead_id) };
  const evWritten = await client.writeEvidence(evRow);
  if (!evWritten?.ok) {
    // Evidence write failed — stay at sent_unverified (do not mark completed).
    const adv = transitionEmail(current, EMAIL_STATES.SENT_UNVERIFIED, { now, reason: "evidence_write_failed" });
    if (adv.ok) { current = adv.intent; await persistIntent(current, { client }); }
    return { ok: false, intent: current, reason: "evidence_write_failed", requires_reconciliation: true };
  }

  // Evidence item 7: read-after-write of evidence.
  let evReadBack;
  try { evReadBack = await client.readEvidence(evidence.provider_message_id); } catch (_) { evReadBack = null; }
  if (!evReadBack || clean(evReadBack.provider_message_id) !== evidence.provider_message_id) {
    const adv = transitionEmail(current, EMAIL_STATES.SENT_UNVERIFIED, { now, reason: "evidence_read_back_failed" });
    if (adv.ok) { current = adv.intent; await persistIntent(current, { client }); }
    return { ok: false, intent: current, reason: "evidence_read_back_failed", requires_reconciliation: true };
  }

  // Evidence item 8: advance canonical lead pipeline state (contacted).
  let leadUpdated = false;
  if (options.updateLead !== false && clean(current.lead_id)) {
    try {
      leadUpdated = await advanceLeadToContacted(current.lead_id, evidence, options);
    } catch (_) { /* non-fatal; evidence still recorded */ }
  }

  // Evidence item 9: final receipt on the intent.
  const completedAdv = transitionEmail(current, EMAIL_STATES.COMPLETED, {
    now,
    provider_message_id: evidence.provider_message_id,
    provider_thread_id: evidence.provider_thread_id,
    provider_evidence: evidence,
    reason: "completed_with_full_evidence",
    evidence_ref: evidence.provider_message_id,
  });
  if (!completedAdv.ok) return { ok: false, intent: current, reason: completedAdv.error };
  current = completedAdv.intent;
  const finalPersist = await persistIntent(current, { client });
  if (!finalPersist.ok) return { ok: false, intent: current, reason: "final_persist_failed:" + finalPersist.reason };

  return {
    ok: true,
    intent: current,
    evidence,
    lead_updated: leadUpdated,
    evidence_items: {
      1: "durable_intent",
      2: "policy_receipt",
      3: "atomic_claim",
      4: "provider_message_id",
      5: "provider_acceptance",
      6: "persisted_evidence",
      7: "read_after_write",
      8: leadUpdated ? "canonical_lead_updated" : "canonical_lead_update_skipped",
      9: "final_receipt",
    },
  };
}

/**
 * Advance the canonical lead to pipeline_stage="contacted" using Phase 1 CAS.
 * Uses Phase 1 upsertLeads which enforces optimistic concurrency (never overwrites
 * a newer version). Non-fatal if the lead moved in the meantime.
 */
async function advanceLeadToContacted(lead_id, evidence, options = {}) {
  const authRead = await readAuthoritativeLeads(options.leadStore || {});
  if (!authRead.ok) return false;
  const lead = (authRead.rows || []).find(r => clean(r.lead_id) === clean(lead_id));
  if (!lead) return false;
  const advanced = {
    ...lead,
    pipeline_stage: "contacted",
    eligibility: "engaged",
    next_action: "await_reply",
    last_validated_at: options.now || new Date().toISOString(),
    version: Number(lead.version || 1) + 1,
  };
  const result = await upsertLeads([advanced], options.leadStore || {});
  return result?.persisted > 0;
}

/**
 * Full single-action execution flow: materialize → policy → claim → execute.
 * Returns a consolidated result with all evidence items or a truthful partial state.
 */
export async function runEmailAction(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const owner = clean(options.worker_id) || "Hermes";

  // Step 1: materialize.
  const mat = await materializeIntent(input, { ...options, now });
  if (!mat.ok && !mat.idempotent) return { ok: false, step: "materialize", reason: mat.reason };

  // Step 2: policy gate.
  const policy = await applyPolicyGate(mat.intent, { ...input.policyCtx, lead: input.lead }, { ...options, now });
  if (!policy.ok) return { ok: false, step: "policy", reason: policy.reason, requires_approval: policy.requires_approval, intent: policy.intent };

  // Step 3: claim.
  const claim = await claimIntent(policy.intent, owner, { ...options, now });
  if (!claim.ok) return { ok: false, step: "claim", reason: claim.reason, intent: policy.intent };

  // Step 4: execute.
  const exec = await executeIntent(claim.intent, options.transport, { ...options, now });
  return { ...exec, step: exec.ok ? "completed" : "execute" };
}
