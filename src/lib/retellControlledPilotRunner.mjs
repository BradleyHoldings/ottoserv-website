import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { makeRetellTransport, normalizeRetellCall, readRetellConfig, sanitizeRetellError } from "./callRail/retell.mjs";
import { findRetellPhoneNumber } from "./callRail/retellReadiness.mjs";

export const RETELL_CONTROLLED_PILOT_RUNNER_VERSION = "phase7_retell_controlled_pilot_runner_v1";

function clean(value) {
  return String(value ?? "").trim();
}

function digits(value) {
  return clean(value).replace(/\D/g, "");
}

function maskPhone(value) {
  const d = digits(value);
  return d ? `***${d.slice(-4)}` : "";
}

function last(value, count = 6) {
  const s = clean(value);
  return s ? s.slice(-count) : "";
}

function slug(value, fallback = "retell-pilot") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
}

function stableRunId({ now, name, phone }) {
  const hash = createHash("sha1").update(`${clean(now)}:${clean(name)}:${digits(phone)}`).digest("hex").slice(0, 10);
  return `retell-pilot-${slug(name, "test-contact")}-${hash}`;
}

function isE164(value) {
  return /^\+[1-9]\d{7,14}$/.test(clean(value));
}

function approvalAccepted(approval = {}) {
  const decision = clean(approval.decision || approval.approval_status).toLowerCase();
  const scope = clean(approval.scope || approval.action || approval.approved_scope);
  return ["approved", "approve"].includes(decision)
    && /jonathan|operator/i.test(clean(approval.operator || approval.decided_by || approval.approved_by))
    && /single_controlled_retell_pilot_call|retell_pilot|test_call/i.test(scope);
}

function contactBlockers(contact = {}, approval = {}) {
  const blockers = [];
  if (!clean(contact.name)) blockers.push("test_contact_name_missing");
  if (!isE164(contact.phone_number)) blockers.push("test_contact_phone_e164_missing");
  if (!clean(contact.consent_note)) blockers.push("test_contact_consent_note_missing");
  if (!clean(contact.scenario)) blockers.push("test_scenario_missing");
  if (!approvalAccepted(approval)) blockers.push("explicit_test_contact_approval_missing");
  return blockers;
}

function classifyPhoneManagement(phone = {}) {
  const type = clean(phone.phone_number_type || phone.type).toLowerCase();
  if (/telnyx|import|byo|external/.test(type)) return "telnyx/imported";
  if (/retell|twilio/.test(type)) return "retell-managed";
  return type || "unknown";
}

function outboundAgents(phone = []) {
  return Array.isArray(phone?.outbound_agents) ? phone.outbound_agents : [];
}

function phoneAgentBound(phone = {}, agentId = "") {
  const agents = outboundAgents(phone);
  if (!agents.length) return true;
  return agents.some((agent) => {
    if (typeof agent === "string") return clean(agent) === clean(agentId);
    return clean(agent?.agent_id || agent?.id) === clean(agentId);
  });
}

async function retellJson(fetchImpl, root, apiKey, requestPath) {
  const response = await fetchImpl(`${root}${requestPath}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`retell_${requestPath.replace(/[^a-z0-9]+/gi, "_")}_${response.status}:${text.slice(0, 160)}`);
  }
  return response.json();
}

function extractPhoneNumbers(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.phone_numbers)) return raw.phone_numbers;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.numbers)) return raw.numbers;
  return [];
}

async function firstSuccessful(calls) {
  const errors = [];
  for (const call of calls) {
    try {
      return { ok: true, value: await call() };
    } catch (err) {
      errors.push(sanitizeRetellError(err));
    }
  }
  return { ok: false, errors };
}

async function getRuntimeRetellDetails({ env, fetchImpl }) {
  const cfg = readRetellConfig(env);
  const root = cfg.base_url.replace(/\/$/, "");
  if (!cfg.configured) {
    return {
      ok: false,
      blockers: ["retell_credentials_missing"],
      env_present: {
        RETELL_API_KEY: Boolean(clean(env.RETELL_API_KEY)),
        RETELL_AGENT_ID: Boolean(clean(env.RETELL_AGENT_ID)),
        RETELL_PHONE_NUMBER: Boolean(clean(env.RETELL_PHONE_NUMBER)),
        RETELL_FROM_NUMBER: Boolean(clean(env.RETELL_FROM_NUMBER)),
        RETELL_PHONE_NUMBER_ID: Boolean(clean(env.RETELL_PHONE_NUMBER_ID)),
      },
      errors: [],
    };
  }

  const phonesResult = await firstSuccessful([
    () => retellJson(fetchImpl, root, cfg.api_key, "/v2/list-phone-numbers"),
    () => retellJson(fetchImpl, root, cfg.api_key, "/list-phone-numbers"),
  ]);
  if (!phonesResult.ok) {
    return { ok: false, blockers: ["retell_phone_number_lookup_failed"], env_present: { RETELL_API_KEY: true, RETELL_AGENT_ID: true, RETELL_PHONE_NUMBER_OR_ID: true }, errors: phonesResult.errors };
  }

  const phones = extractPhoneNumbers(phonesResult.value);
  let phone = findRetellPhoneNumber(phones, cfg.from_number_ref);
  if (!phone) {
    const encoded = encodeURIComponent(cfg.from_number_ref);
    const direct = await firstSuccessful([
      () => retellJson(fetchImpl, root, cfg.api_key, `/get-phone-number/${encoded}`),
      () => retellJson(fetchImpl, root, cfg.api_key, `/v2/get-phone-number/${encoded}`),
    ]);
    if (direct.ok) phone = direct.value?.phone_number_record || direct.value?.phone_number || direct.value;
  }

  const agentResult = await firstSuccessful([
    () => retellJson(fetchImpl, root, cfg.api_key, `/get-agent/${encodeURIComponent(cfg.agent_id)}`),
    () => retellJson(fetchImpl, root, cfg.api_key, `/v2/get-agent/${encodeURIComponent(cfg.agent_id)}`),
  ]);
  const agent = agentResult.ok ? agentResult.value?.agent || agentResult.value : null;
  const fromNumber = clean(phone?.phone_number || phone?.number || phone?.e164 || (isE164(cfg.from_number_ref) ? cfg.from_number_ref : ""));
  const bindingOk = Boolean(phone && fromNumber && clean(agent?.agent_id || agent?.id) === cfg.agent_id && phoneAgentBound(phone, cfg.agent_id));
  return {
    ok: bindingOk,
    blockers: bindingOk ? [] : ["retell_phone_number_agent_binding_missing"],
    env_present: {
      RETELL_API_KEY: true,
      RETELL_AGENT_ID: true,
      RETELL_PHONE_NUMBER: Boolean(clean(env.RETELL_PHONE_NUMBER)),
      RETELL_FROM_NUMBER: Boolean(clean(env.RETELL_FROM_NUMBER)),
      RETELL_PHONE_NUMBER_ID: Boolean(clean(env.RETELL_PHONE_NUMBER_ID)),
    },
    config: {
      agent_id: cfg.agent_id,
      agent_id_last6: last(cfg.agent_id),
      from_number: fromNumber,
      from_number_redacted: maskPhone(fromNumber),
      phone_number_management: classifyPhoneManagement(phone),
      phone_number_agent_bound: phoneAgentBound(phone, cfg.agent_id),
      phone_number_ref_last4: maskPhone(cfg.from_number_ref) || last(cfg.from_number_ref),
      agent_name: clean(agent?.agent_name || agent?.name),
    },
    errors: agentResult.ok ? [] : agentResult.errors,
  };
}

function evidenceDir(outputDir) {
  return path.join(clean(outputDir) || path.join(process.cwd(), ".codex-scratch", "retell-pilot"), "retell-pilot-evidence");
}

function evidencePath(outputDir, runId) {
  return path.join(evidenceDir(outputDir), `${slug(runId)}.json`);
}

function existingEvidenceForContact(outputDir, contact = {}) {
  const dir = evidenceDir(outputDir);
  if (!existsSync(dir)) return null;
  const suffix = maskPhone(contact.phone_number);
  try {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const parsed = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
      if (clean(parsed.test_contact_name).toLowerCase() === clean(contact.name).toLowerCase() && clean(parsed.redacted_phone_number) === suffix) {
        return parsed;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function writeEvidence(outputDir, evidence) {
  const dir = evidenceDir(outputDir);
  mkdirSync(dir, { recursive: true });
  const filePath = evidencePath(outputDir, evidence.run_id);
  writeFileSync(filePath, `${JSON.stringify(evidence, null, 2)}\n`);
  return filePath;
}

function statusFor(blockers = []) {
  if (blockers.includes("retell_credentials_missing")) return "blocked_missing_credentials";
  if (blockers.includes("explicit_test_contact_approval_missing") || blockers.some((item) => /^test_contact|^test_scenario/.test(item))) return "blocked_missing_test_contact_approval";
  if (blockers.includes("retell_phone_number_agent_binding_missing") || blockers.includes("retell_phone_number_lookup_failed")) return "blocked_missing_phone_number_agent_binding";
  if (blockers.includes("controlled_pilot_env_flag_not_enabled")) return "blocked_missing_test_contact_approval";
  if (blockers.includes("call_limit_already_used")) return "pilot_executed";
  return "pilot_ready";
}

export async function buildControlledRetellPilotPlan(options = {}) {
  const now = clean(options.now) || new Date().toISOString();
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const contact = options.testContact || {};
  const approval = options.operatorApproval || {};
  const retell = await getRuntimeRetellDetails({ env, fetchImpl });
  const blockers = [...retell.blockers, ...contactBlockers(contact, approval)];
  if (clean(env.RETELL_CONTROLLED_PILOT_ENABLED).toLowerCase() !== "true") blockers.push("controlled_pilot_env_flag_not_enabled");
  const runId = stableRunId({ now, name: contact.name || "test-contact", phone: contact.phone_number });
  const existing = existingEvidenceForContact(options.outputDir, contact);
  if (existing) blockers.push("call_limit_already_used");

  return {
    ok: blockers.length === 0,
    status: statusFor(blockers),
    version: RETELL_CONTROLLED_PILOT_RUNNER_VERSION,
    run_id: runId,
    timestamp: now,
    blockers: [...new Set(blockers)],
    retell: {
      env_present: retell.env_present,
      agent_id_last6: retell.config?.agent_id_last6 || "",
      selected_agent_verified: Boolean(retell.ok && retell.config?.agent_id),
      selected_agent_name: retell.config?.agent_name || "",
      from_number: retell.config?.from_number_redacted || "",
      phone_number_management: retell.config?.phone_number_management || "unknown",
      phone_number_agent_bound: Boolean(retell.config?.phone_number_agent_bound),
      errors: retell.errors || [],
    },
    test_contact: {
      name: clean(contact.name),
      redacted_phone_number: maskPhone(contact.phone_number),
      consent_note_present: Boolean(clean(contact.consent_note)),
      scenario: clean(contact.scenario),
    },
    operator_approval: {
      approved: approvalAccepted(approval),
      approval_id: clean(approval.approval_id || approval.id),
      operator: clean(approval.operator || approval.decided_by || approval.approved_by),
      scope: clean(approval.scope || approval.action || approval.approved_scope),
    },
    execution: {
      call_limit: 1,
      calls_already_recorded_for_contact: existing ? 1 : 0,
      execute_allowed: blockers.length === 0,
    },
    safety: {
      call_limit: 1,
      no_broad_production_calling: true,
      no_leads_called: true,
      no_clients_called: true,
      no_general_production_voice_activation: true,
      production_activation_still_requires_separate_approval: true,
    },
    _runtime: retell.ok ? {
      agent_id: retell.config.agent_id,
      from_number: retell.config.from_number,
      base_url: clean(env.RETELL_BASE_URL) || "https://api.retellai.com",
    } : null,
  };
}

export async function executeControlledRetellPilot(options = {}) {
  const plan = await buildControlledRetellPilotPlan(options);
  if (!plan.ok) return plan;
  const contact = options.testContact || {};
  const transport = makeRetellTransport({
    config: {
      configured: true,
      api_key: clean((options.env || process.env).RETELL_API_KEY),
      agent_id: plan._runtime.agent_id,
      from_number: plan._runtime.from_number,
      base_url: plan._runtime.base_url,
    },
    fetchImpl: options.fetchImpl || globalThis.fetch,
  });
  if (!transport) return { ...plan, ok: false, status: "blocked_missing_credentials", blockers: ["retell_credentials_missing"] };

  const scenario = clean(contact.scenario);
  const call = await transport.placeCall({
    phone: clean(contact.phone_number),
    from_number: plan._runtime.from_number,
    execution_id: plan.run_id,
    lead_id: "controlled-retell-pilot-friendly-test-contact",
    idempotency_key: plan.run_id,
    approved_script_ref: "phase7_controlled_retell_pilot_devon",
    approved_angle: scenario,
  });
  const normalized = normalizeRetellCall(call);
  const retellCallId = clean(call.provider_call_id || normalized.provider_call_id);
  const evidence = {
    version: RETELL_CONTROLLED_PILOT_RUNNER_VERSION,
    run_id: plan.run_id,
    timestamp: plan.timestamp,
    operator_approval: plan.operator_approval,
    test_contact_name: clean(contact.name),
    redacted_phone_number: maskPhone(contact.phone_number),
    retell_call_id: retellCallId,
    agent_id: plan._runtime.agent_id,
    agent_id_last6: last(plan._runtime.agent_id),
    from_number: maskPhone(plan._runtime.from_number),
    phone_number_management: plan.retell.phone_number_management,
    scenario,
    call_status: clean(call.status || normalized.status),
    transcript_or_summary: clean(call.summary || normalized.summary),
    pass_fail_result: /ended|completed|successful/i.test(clean(call.status || normalized.status)) ? "pass" : "pending_call_completion",
    rollback_monitoring_notes: "Single friendly-contact pilot only. No general production voice activation; monitor Retell dashboard/call status and do not run follow-up calls without another Jonathan/operator approval.",
    production_activation_still_requires_separate_approval: true,
    safety: plan.safety,
  };
  const filePath = writeEvidence(options.outputDir, evidence);
  return {
    ok: true,
    status: evidence.pass_fail_result === "pass" ? "pilot_passed" : "pilot_executed",
    evidence,
    evidence_path: filePath,
    safety: plan.safety,
  };
}

export function readControlledRetellPilotEvidence(options = {}) {
  const runId = clean(options.runId);
  if (!runId) return { ok: false, reason: "run_id_required" };
  const filePath = evidencePath(options.outputDir, runId);
  if (!existsSync(filePath)) return { ok: false, reason: "pilot_evidence_not_found" };
  return {
    ok: true,
    evidence: JSON.parse(readFileSync(filePath, "utf8")),
    evidence_path: filePath,
  };
}
