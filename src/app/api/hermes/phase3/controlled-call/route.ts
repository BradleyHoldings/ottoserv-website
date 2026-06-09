import { NextResponse } from "next/server";

import { makeSupabaseClient, upsertLeads } from "../../../../../lib/leadRail/store.mjs";
import { createCallIntent } from "../../../../../lib/callRail/intent.mjs";
import { makeCallClient } from "../../../../../lib/callRail/store.mjs";
import { makeRetellTransport } from "../../../../../lib/callRail/retell.mjs";
import { buildRetellReadinessReport } from "../../../../../lib/callRail/retellReadiness.mjs";
import {
  applyCallPolicyGate,
  claimCallIntent,
  completeCallIntent,
  materializeCallIntent,
  reconcileProviderTimeout,
  startCallIntent,
} from "../../../../../lib/callRail/pipeline.mjs";

export const dynamic = "force-dynamic";

const CONTROLLED_FROM = "+14079045560";
const CONTROLLED_TO = "+14078816243";
const CONTROLLED_TZ = "America/New_York";
const LEAD_ID = "lead-phase3-controlled-jonathan-retell";
const SCRIPT_REF = "phase3-controlled-synthetic-retell-v1";
const APPROVED_ANGLE = "Front Office Leak Check";
const APPROVAL_ID = "approval-phase3-controlled-real-retell-jonathan";
const SCHEDULED_SLOT = "phase3-controlled-real-2026-06-09";
const OWNER = "HermesPhase3Acceptance";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function maskPhone(value: string): string {
  const digits = clean(value).replace(/\D/g, "");
  return digits ? `***${digits.slice(-4)}` : "";
}

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(request: Request): boolean {
  const expected = clean(process.env.HERMES_PHASE3_ACCEPTANCE_TOKEN || process.env.ADMIN_API_TOKEN);
  const provided = clean(request.headers.get("x-hermes-phase3-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  return Boolean(expected && timingSafeEqual(provided, expected));
}

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

async function leadForIntent(now: string) {
  const client = makeSupabaseClient();
  if (!client) return { ok: false, reason: "supabase_not_configured" };
  const current = await client.read(LEAD_ID);
  const lead = current || {
    lead_id: LEAD_ID,
    company_name: "Jonathan Controlled Phase 3 Acceptance",
    contact_name: "Jonathan Controlled Recipient",
    normalized_phone: CONTROLLED_TO,
    phone_verified: true,
    timezone: CONTROLLED_TZ,
    source_type: "phase3_controlled_acceptance",
    source_evidence: "operator_provided_controlled_number",
    pipeline_stage: "ready_to_call",
    eligibility: "call",
    next_action: "call",
    preferred_offer: "leak_check",
    record_status: "active",
    schema_version: "phase3.v1",
    version: 1,
    created_at: now,
    updated_at: now,
    last_validated_at: now,
  };
  if (!current) {
    const persisted = await upsertLeads([lead], { now, client });
    if (!persisted.ok) return { ok: false, reason: persisted.results?.[0]?.reason || "lead_seed_failed" };
  }
  return { ok: true, lead, version: Number(lead.version || 1) };
}

function intentInput(lead: Record<string, unknown>, version: number) {
  return {
    lead_id: LEAD_ID,
    lead_version: version,
    phone: CONTROLLED_TO,
    approved_script_ref: SCRIPT_REF,
    approved_angle: APPROVED_ANGLE,
    approval_id: APPROVAL_ID,
    scheduled_slot: SCHEDULED_SLOT,
    from_number: CONTROLLED_FROM,
    lead,
    policyCtx: {
      lead,
      localHour: 11,
      approvalPresent: true,
      activeReplyState: "",
      attempts: {},
      policy: { max_attempts: 1, min_spacing_hours: 24 },
    },
  };
}

async function readExisting(callClient: ReturnType<typeof makeCallClient>, input: Record<string, unknown>) {
  const expected = createCallIntent(input);
  const row = await callClient?.readIntent(expected.execution_id);
  return { expected, row, intent: row?.raw_intent || null };
}

function summarizeIntent(intent: Record<string, unknown> | null) {
  if (!intent) return null;
  return {
    execution_id: intent.execution_id,
    state: intent.state,
    provider_call_id: intent.provider_call_id || "",
    provider_status: intent.provider_status || "",
    provider_outcome: intent.provider_outcome || "",
    duration_seconds: intent.duration_seconds || 0,
    next_action: intent.next_action || "",
    from_number: maskPhone(CONTROLLED_FROM),
    to_number: maskPhone(CONTROLLED_TO),
    recording_url_present: Boolean(clean(intent.recording_url)),
    transcript_url_present: Boolean(clean(intent.transcript_url)),
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return response({ ok: false, error: "unauthorized" }, 401);
  const now = new Date().toISOString();
  const seeded = await leadForIntent(now);
  if (!seeded.ok) return response({ ok: false, reason: seeded.reason }, 424);
  const callClient = makeCallClient();
  const { expected, intent } = await readExisting(callClient, intentInput(seeded.lead, seeded.version));
  let evidence = null;
  if (intent?.provider_call_id && callClient) evidence = await callClient.readEvidence(String(intent.provider_call_id)).catch(() => null);
  return response({
    ok: true,
    expected_execution_id: expected.execution_id,
    duplicate_prevented: Boolean(intent?.provider_call_id),
    intent: summarizeIntent(intent),
    evidence_read_back: evidence ? {
      provider_call_id: evidence.provider_call_id,
      outcome: evidence.outcome,
      provider_status: evidence.provider_status,
      duration_seconds: evidence.duration_seconds,
      recording_url_present: Boolean(clean(evidence.recording_url)),
      transcript_url_present: Boolean(clean(evidence.transcript_url)),
      next_action: evidence.next_action,
    } : null,
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return response({ ok: false, error: "unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  const action = clean(body.action);
  if (clean(body.from_number) !== CONTROLLED_FROM || clean(body.to_number) !== CONTROLLED_TO || clean(body.timezone) !== CONTROLLED_TZ) {
    return response({ ok: false, reason: "controlled_numbers_or_timezone_mismatch" }, 400);
  }
  if (clean(body.confirm) !== "PLACE_EXACTLY_ONE_PHASE3_CONTROLLED_RETELL_CALL") {
    return response({ ok: false, reason: "confirmation_required" }, 400);
  }

  const now = new Date().toISOString();
  const readiness = await buildRetellReadinessReport();
  if (!readiness.ok) return response({ ok: false, step: "retell_readiness", readiness }, 424);

  const seeded = await leadForIntent(now);
  if (!seeded.ok) return response({ ok: false, step: "lead_seed", reason: seeded.reason }, 424);
  const callClient = makeCallClient();
  if (!callClient) return response({ ok: false, reason: "supabase_not_configured" }, 424);
  const input = intentInput(seeded.lead, seeded.version);
  const existing = await readExisting(callClient, input);

  if (existing.intent?.provider_call_id) {
    return response({ ok: true, duplicate_prevented: true, action, intent: summarizeIntent(existing.intent) });
  }

  const transport = makeRetellTransport();
  if (!transport) return response({ ok: false, reason: "retell_transport_not_configured" }, 424);

  if (action === "place") {
    const materialized = await materializeCallIntent(input, { now, client: callClient });
    if (!materialized.ok && !materialized.idempotent) return response({ ok: false, step: "materialize", reason: materialized.reason }, 424);
    const policy = await applyCallPolicyGate(materialized.intent, input.policyCtx, { now, client: callClient });
    if (!policy.ok) return response({ ok: false, step: "policy", reason: policy.reason, receipt: policy.receipt }, 424);
    const claimed = await claimCallIntent(policy.intent, OWNER, { now, client: callClient });
    if (!claimed.ok) return response({ ok: false, step: "claim", reason: claimed.reason }, 424);
    const started = await startCallIntent(claimed.intent, transport, { now, client: callClient });
    return response({ ok: started.ok, step: started.step || "started_unverified", requires_reconciliation: true, provider_call_id: started.provider_call_id, intent: summarizeIntent(started.intent) }, started.ok ? 200 : 424);
  }

  if (action === "reconcile") {
    if (!existing.intent?.provider_call_id) return response({ ok: false, reason: "no_provider_call_id_to_reconcile" }, 424);
    const reconciled = await reconcileProviderTimeout(existing.intent, { now, client: callClient, lookupCall: transport.lookupCall });
    return response({ ok: reconciled.ok, step: "reconcile", reason: reconciled.reason, intent: summarizeIntent(reconciled.intent), evidence: reconciled.evidence ? {
      provider_call_id: reconciled.evidence.provider_call_id,
      outcome: reconciled.evidence.outcome,
      provider_status: reconciled.evidence.provider_status,
      duration_seconds: reconciled.evidence.duration_seconds,
      recording_url_present: Boolean(clean(reconciled.evidence.recording_url)),
      transcript_url_present: Boolean(clean(reconciled.evidence.transcript_url)),
      next_action: reconciled.evidence.next_action,
    } : null, evidence_items: reconciled.evidence_items, lead_updated: reconciled.lead_updated }, reconciled.ok ? 200 : 424);
  }

  if (action === "complete") {
    if (!existing.intent?.provider_call_id) return response({ ok: false, reason: "no_provider_call_id_to_complete" }, 424);
    const provider = await transport.lookupCall(String(existing.intent.provider_call_id));
    const completed = await completeCallIntent(existing.intent, provider, { now, client: callClient });
    return response({ ok: completed.ok, step: "complete", reason: completed.reason, intent: summarizeIntent(completed.intent), evidence: completed.evidence ? {
      provider_call_id: completed.evidence.provider_call_id,
      outcome: completed.evidence.outcome,
      provider_status: completed.evidence.provider_status,
      duration_seconds: completed.evidence.duration_seconds,
      recording_url_present: Boolean(clean(completed.evidence.recording_url)),
      transcript_url_present: Boolean(clean(completed.evidence.transcript_url)),
      next_action: completed.evidence.next_action,
    } : null, evidence_items: completed.evidence_items, lead_updated: completed.lead_updated }, completed.ok ? 200 : 424);
  }

  return response({ ok: false, reason: "unsupported_action" }, 400);
}
