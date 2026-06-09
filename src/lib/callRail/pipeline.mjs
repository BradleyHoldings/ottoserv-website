import { readAuthoritativeLeads, upsertLeads } from "../leadRail/store.mjs";
import { CALL_STATES, createCallIntent, transitionCall } from "./intent.mjs";
import { evaluateCallPolicy } from "./policy.mjs";
import { makeCallClient, persistCallIntent, PERSISTENCE } from "./store.mjs";
import { buildCallEvidence, isTerminalProviderStatus, nextActionForOutcome } from "./outcomes.mjs";

const LEASE_SECONDS = 120;
const TERMINAL_STATES = new Set([CALL_STATES.COMPLETED, CALL_STATES.CANCELLED, CALL_STATES.DEAD_LETTER]);

function clean(v) { return String(v ?? "").trim(); }

export async function materializeCallIntent(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const intent = createCallIntent(input, { now });
  const client = options.client || makeCallClient(options);
  if (!client) return { ok: false, intent, persisted: false, status: "persistence_pending", reason: "supabase_not_configured" };
  const result = await persistCallIntent(intent, { client });
  if (!result.ok && result.status === PERSISTENCE.DUPLICATE) return { ok: true, intent, persisted: true, idempotent: true, status: "idempotent" };
  if (!result.ok) return { ok: false, intent, persisted: false, status: result.status, reason: result.reason };
  return { ok: true, intent, persisted: true, status: result.status };
}

export async function applyCallPolicyGate(intent, ctx = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const client = options.client || makeCallClient(options);
  const result = evaluateCallPolicy(intent, { ...ctx, now });
  const target = result.ok ? CALL_STATES.APPROVED : result.requires_approval ? CALL_STATES.APPROVAL_REQUIRED : CALL_STATES.BLOCKED;
  const advanced = transitionCall(intent, target, { now, policy_receipt: result.receipt, reason: result.reason || "policy_passed" });
  if (!advanced.ok) return { ok: false, intent, reason: advanced.error };
  if (client) await persistCallIntent(advanced.intent, { client });
  return { ok: result.ok, requires_approval: result.requires_approval, intent: advanced.intent, receipt: result.receipt, reason: result.reason };
}

export async function claimCallIntent(intent, owner, options = {}) {
  const now = options.now || new Date().toISOString();
  const client = options.client || makeCallClient(options);
  if (!client) return { ok: false, reason: "supabase_not_configured" };
  if (TERMINAL_STATES.has(clean(intent.state))) return { ok: false, reason: "terminal_state" };

  const claimResult = await client.claim(clean(intent.execution_id), clean(owner), LEASE_SECONDS, now);
  if (!claimResult?.ok) return { ok: false, reason: claimResult?.reason || claimResult?.error || "claim_failed" };

  let authoritative = intent;
  try {
    const row = await client.readIntent(clean(intent.execution_id));
    if (row?.raw_intent) authoritative = { ...row.raw_intent, version: Number(row.version ?? row.raw_intent.version) };
  } catch (_) {}

  if (TERMINAL_STATES.has(clean(authoritative.state))) return { ok: false, reason: "terminal_state" };
  const leaseExpires = clean(claimResult.lease_expires_at) || new Date(Date.parse(now) + LEASE_SECONDS * 1000).toISOString();
  const advanced = transitionCall(authoritative, CALL_STATES.CLAIMED, {
    now,
    actor: owner,
    lease_owner: owner,
    lease_expires_at: leaseExpires,
    reason: "claimed",
  });
  if (!advanced.ok) return { ok: false, reason: advanced.error };
  const persisted = await persistCallIntent(advanced.intent, { client });
  if (!persisted.ok) return { ok: false, reason: persisted.reason };
  return { ok: true, intent: advanced.intent, lease_expires_at: leaseExpires };
}

export async function startCallIntent(intent, transport, options = {}) {
  const now = options.now || new Date().toISOString();
  const client = options.client || makeCallClient(options);
  if (!client) return { ok: false, reason: "supabase_not_configured", intent };
  if (intent.state !== CALL_STATES.CLAIMED && intent.state !== CALL_STATES.EXECUTING) return { ok: false, reason: `wrong_state:${intent.state}`, intent };
  if (!clean(intent.lease_owner)) return { ok: false, reason: "no_lease_owner", intent };
  if (!intent.policy_receipt) return { ok: false, reason: "missing_policy_receipt", intent };
  if (typeof transport?.placeCall !== "function") return { ok: false, reason: "retell_transport_not_configured", intent };

  let current = intent;
  const executing = transitionCall(current, CALL_STATES.EXECUTING, { now, reason: "executing" });
  if (!executing.ok) return { ok: false, reason: executing.error, intent: current };
  current = executing.intent;
  await persistCallIntent(current, { client });

  let placed;
  try {
    placed = await transport.placeCall(current, { now });
  } catch (err) {
    const failed = transitionCall(current, CALL_STATES.RETRY_WAITING, { now, sanitized_error: clean(err?.message).slice(0, 300), reason: "provider_error" });
    if (failed.ok) {
      current = failed.intent;
      await persistCallIntent(current, { client });
    }
    return { ok: false, reason: "provider_error", intent: current, retry_eligible: true };
  }

  const providerCallId = clean(placed?.provider_call_id || placed?.call_id || placed?.id);
  if (!providerCallId) return { ok: false, reason: "provider_returned_no_call_id", intent: current };
  const started = transitionCall(current, CALL_STATES.STARTED_UNVERIFIED, {
    now,
    provider_call_id: providerCallId,
    provider_status: clean(placed.status || "started"),
    reason: "provider_started_unverified",
  });
  if (!started.ok) return { ok: false, reason: started.error, intent: current };
  current = started.intent;
  await persistCallIntent(current, { client });
  return { ok: true, intent: current, provider_call_id: providerCallId, requires_reconciliation: true };
}

export async function completeCallIntent(intent, providerResult = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const client = options.client || makeCallClient(options);
  if (!client) return { ok: false, reason: "supabase_not_configured", intent };
  if (![CALL_STATES.EXECUTING, CALL_STATES.STARTED_UNVERIFIED, CALL_STATES.CLAIMED].includes(clean(intent.state))) {
    return { ok: false, reason: `wrong_state:${intent.state}`, intent };
  }
  const providerCallId = clean(providerResult.provider_call_id || providerResult.call_id || providerResult.id);
  if (!providerCallId) return { ok: false, reason: "missing_provider_call_id", intent };
  if (!isTerminalProviderStatus(providerResult.status) && !clean(providerResult.outcome)) {
    return { ok: false, reason: "provider_outcome_not_terminal", intent, requires_reconciliation: true };
  }

  const evidence = buildCallEvidence(intent, { ...providerResult, provider_call_id: providerCallId }, now);
  if (!evidence) return { ok: false, reason: "missing_provider_evidence", intent };
  const written = await client.writeEvidence(evidence);
  if (!written?.ok) return { ok: false, reason: written?.error || "evidence_write_failed", intent, requires_reconciliation: true };

  let readBack;
  try { readBack = await client.readEvidence(providerCallId); } catch (_) { readBack = null; }
  if (!readBack || clean(readBack.provider_call_id) !== providerCallId) {
    return { ok: false, reason: "evidence_read_back_failed", intent, requires_reconciliation: true };
  }

  let leadUpdated = false;
  if (options.updateLead !== false) leadUpdated = await advanceLeadFromCallOutcome(intent.lead_id, evidence, options);

  const completed = transitionCall(intent, CALL_STATES.COMPLETED, {
    now,
    provider_call_id: providerCallId,
    provider_status: evidence.provider_status,
    provider_outcome: evidence.outcome,
    duration_seconds: evidence.duration_seconds,
    recording_url: evidence.recording_url,
    transcript_url: evidence.transcript_url,
    provider_evidence: evidence,
    next_action: evidence.next_action,
    reason: "completed_with_provider_evidence",
    evidence_ref: providerCallId,
  });
  if (!completed.ok) return { ok: false, reason: completed.error, intent };
  const persisted = await persistCallIntent(completed.intent, { client });
  if (!persisted.ok) return { ok: false, reason: `final_persist_failed:${persisted.reason}`, intent: completed.intent };

  return {
    ok: true,
    intent: completed.intent,
    evidence,
    lead_updated: leadUpdated,
    evidence_items: {
      durable_intent: "verified",
      policy_receipt: intent.policy_receipt ? "verified" : "missing",
      provider_call_id: "verified",
      provider_terminal_outcome: "verified",
      provider_evidence_write: "verified",
      provider_read_back: "verified",
      canonical_lead_update: leadUpdated ? "verified" : "skipped",
      final_receipt: "verified",
    },
  };
}

export async function reconcileProviderTimeout(intent, options = {}) {
  const now = options.now || new Date().toISOString();
  const lookup = options.lookupCall;
  if (typeof lookup !== "function") return { ok: false, reason: "lookup_not_configured", intent, requires_reconciliation: true };
  const result = await lookup(clean(intent.provider_call_id), intent);
  if (!result) return { ok: false, reason: "provider_evidence_missing", intent, requires_reconciliation: true };
  return completeCallIntent(intent, result, { ...options, now });
}

export async function runCallAction(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const owner = clean(options.worker_id) || "Hermes";
  const mat = await materializeCallIntent(input, { ...options, now });
  if (!mat.ok && !mat.idempotent) return { ok: false, step: "materialize", reason: mat.reason };
  const policy = await applyCallPolicyGate(mat.intent, { ...input.policyCtx, lead: input.lead }, { ...options, now });
  if (!policy.ok) return { ok: false, step: "policy", reason: policy.reason, requires_approval: policy.requires_approval, intent: policy.intent };
  const claimed = await claimCallIntent(policy.intent, owner, { ...options, now });
  if (!claimed.ok) return { ok: false, step: "claim", reason: claimed.reason, intent: policy.intent };
  const started = await startCallIntent(claimed.intent, options.transport, { ...options, now });
  return { ...started, step: started.ok ? "started_unverified" : "execute" };
}

async function advanceLeadFromCallOutcome(lead_id, evidence, options = {}) {
  try {
    const authRead = await readAuthoritativeLeads(options.leadStore || {});
    if (!authRead.ok) return false;
    const lead = (authRead.rows || []).find((r) => clean(r.lead_id) === clean(lead_id));
    if (!lead) return false;
    const route = nextActionForOutcome(evidence.outcome, { preferredOffer: options.preferredOffer || lead.preferred_offer || "leak_check" });
    const advanced = {
      ...lead,
      pipeline_stage: route.pipeline_stage,
      eligibility: route.eligibility,
      next_action: route.next_action,
      last_call_outcome: evidence.outcome,
      last_call_provider_id: evidence.provider_call_id,
      last_validated_at: options.now || new Date().toISOString(),
      version: Number(lead.version || 1) + 1,
    };
    const result = await upsertLeads([advanced], options.leadStore || {});
    return result?.persisted > 0;
  } catch (_) {
    return false;
  }
}
