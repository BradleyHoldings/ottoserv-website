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

function retryApprovalAccepted(approval = {}) {
  const decision = clean(approval.decision || approval.approval_status).toLowerCase();
  const scope = clean(approval.scope || approval.action || approval.approved_scope);
  return ["approved", "approve"].includes(decision)
    && /jonathan|operator/i.test(clean(approval.operator || approval.decided_by || approval.approved_by))
    && /single_controlled_retell_pilot_retry|retell_pilot_retry|retry/i.test(scope);
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

function readEvidenceByRunId(outputDir, runId) {
  const filePath = evidencePath(outputDir, runId);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8"));
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

function hasTranscript(evidence = {}) {
  return Boolean(clean(evidence.transcript_or_summary || evidence.transcript || evidence.summary || evidence.transcript_url));
}

function transcriptText(evidence = {}) {
  return clean(evidence.transcript_or_summary || evidence.transcript || evidence.summary);
}

function unresolvedTemplateVariables(text = "") {
  const matches = clean(text).match(/\{\{\s*[^}]+\s*\}\}/g) || [];
  return [...new Set(matches.map((item) => item.replace(/\s+/g, "")))];
}

function excerptAround(text = "", needle = "", size = 180) {
  const haystack = clean(text);
  if (!haystack) return "";
  const index = needle ? haystack.indexOf(needle) : -1;
  if (index < 0) return haystack.slice(0, size);
  const start = Math.max(0, index - 60);
  return haystack.slice(start, start + size);
}

function firstTranscriptLine(text = "") {
  return clean(text).split(/\r?\n/).map(clean).find(Boolean)?.slice(0, 240) || "";
}

function issueLocationForTranscript(text = "", variables = []) {
  const firstLine = firstTranscriptLine(text);
  if (variables.some((item) => firstLine.includes(item))) return "welcome_message";
  return variables.length ? "prompt_body" : "none";
}

export function analyzeRetellPilotTranscriptQuality(evidence = {}, options = {}) {
  const transcript = transcriptText(evidence);
  const variables = unresolvedTemplateVariables(transcript);
  const connected = /ended|completed|successful/i.test(clean(evidence.call_status || evidence.status)) && Number(evidence.duration_ms || evidence.duration_seconds || 0) > 0;
  const hasIssue = variables.length > 0;
  const issueLocation = issueLocationForTranscript(transcript, variables);
  const recommendedPromptFix = "Replace any opening that depends on {{contact_name}} with: \"Hi, this is Morgan from OttoServ. Who am I speaking with?\" Or, only if a name variable is reliably available: \"Hi, this is Morgan from OttoServ. Am I speaking with {contact_name}?\" with a fallback when missing.";
  const recommendedWelcomeMessage = "Hi, this is Morgan calling from OttoServ. Who am I speaking with?";
  const repairPacket = hasIssue ? {
    id: `retell-script-repair-${slug(evidence.retell_call_id || evidence.run_id || "unknown")}`,
    issue_type: issueLocation === "welcome_message" ? "unresolved_retell_welcome_message_variable" : "unresolved_retell_prompt_variable",
    severity: "high",
    production_readiness_impact: "blocks_phase7_production_activation",
    affected_call_id: clean(evidence.retell_call_id || evidence.call_id),
    affected_agent_id: clean(evidence.agent_id),
    retell_field_to_fix: issueLocation === "welcome_message" ? "welcome_message" : "agent_prompt_or_tool_prompt",
    transcript_excerpt: excerptAround(transcript, variables[0]),
    unresolved_variables: variables,
    recommended_prompt_fix: recommendedPromptFix,
    recommended_welcome_message: recommendedWelcomeMessage,
    dynamic_variables_guidance: {
      future_ready_supported_payload_keys: ["contact_name", "business_name", "context"],
      requirement: "Dynamic variables may be sent in the Retell create-call payload when available, but Welcome Message and prompt text must still include natural fallback wording so raw {{...}} placeholders are never spoken.",
      production_activation_requires: "welcome_message_fixed_or_dynamic_variables_proven_populated_with_fallback",
    },
    acceptance_criteria: [
      "Welcome Message contains no raw {{...}} placeholders unless Retell proves dynamic variables are populated before speech.",
      "Opening line has fallback wording when contact_name, first_name, or business_name is missing.",
      "A controlled follow-up test transcript contains no spoken {{...}} placeholders.",
      "Production activation remains blocked until this repair is verified.",
    ],
    live_production_activation_allowed: false,
    route_options: {
      codex_repo_managed_prompt: {
        owner: "Codex",
        when: "prompt/config is managed in repo",
        action: "patch prompt template, add regression test, and rerun controlled pilot before production activation",
      },
      manual_retell_dashboard: {
        owner: "Jonathan/operator",
        when: "prompt/config must be edited manually in the Retell dashboard",
        action: "replace unresolved-variable opening with natural fallback wording",
      },
      future_retell_api_updater: {
        owner: "retell_api_updater",
        when: "API-based Retell agent prompt updates are enabled and approved",
        action: "apply approved prompt patch through Retell API with evidence read-back",
      },
    },
    safety: {
      no_live_call_executed_by_repair_packet: true,
      no_production_activation: true,
      no_full_phone_numbers: true,
    },
  } : null;

  return {
    ok: true,
    status: hasIssue ? "script_polish_needed" : connected ? "clean_connected_transcript" : "transcript_not_connected_or_pending",
    issue_location: issueLocation,
    unresolved_variables: variables,
    pass_fail_result: hasIssue ? "pilot_connected_script_polish_needed" : connected ? "pilot_pass_candidate" : clean(evidence.pass_fail_result || "pending_call_completion"),
    repair_packet: repairPacket,
    production_activation: {
      status: "requires_separate_approval",
      allowed: false,
      blocked_by_script_quality: hasIssue,
      blocked_by_welcome_message: hasIssue && issueLocation === "welcome_message",
    },
  };
}

function durationMs(evidence = {}) {
  if (evidence.duration_ms !== undefined) return Number(evidence.duration_ms || 0);
  if (evidence.duration_seconds !== undefined) return Number(evidence.duration_seconds || 0) * 1000;
  return 0;
}

function priorAttemptRetryable(evidence = {}) {
  const status = clean(evidence.call_status).toLowerCase();
  const reason = clean(evidence.disconnection_reason).toLowerCase();
  return status === "not_connected"
    && ["user_declined", "dial_no_answer", "voicemail_reached", "call_failed", ""].includes(reason)
    && durationMs(evidence) === 0
    && !hasTranscript(evidence);
}

function retryRunId({ priorRunId, now, attempt = 1 }) {
  const hash = createHash("sha1").update(`${clean(priorRunId)}:retry:${attempt}:${clean(now)}`).digest("hex").slice(0, 10);
  return `retell-pilot-devon-retry-${attempt}-${hash}`;
}

function retryEvidenceAlreadyExists(outputDir, priorRunId) {
  const dir = evidenceDir(outputDir);
  if (!existsSync(dir)) return null;
  try {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const parsed = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
      if (clean(parsed.previous_run_id) === clean(priorRunId) && Number(parsed.attempt_number) === 2) return parsed;
    }
  } catch {
    return null;
  }
  return null;
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

function retryStatusFor(blockers = []) {
  if (blockers.includes("retry_already_used")) return "pilot_retry_executed";
  if (blockers.includes("prior_attempt_connected_or_has_transcript")) return "blocked_prior_attempt_connected";
  if (blockers.includes("explicit_retry_approval_missing")) return "blocked_missing_retry_approval";
  if (blockers.includes("retell_credentials_missing")) return "blocked_missing_credentials";
  if (blockers.includes("retell_phone_number_agent_binding_missing") || blockers.includes("retell_phone_number_lookup_failed")) return "blocked_missing_phone_number_agent_binding";
  if (blockers.includes("corrected_from_number_required")) return "blocked_missing_phone_number_agent_binding";
  if (blockers.some((item) => /^test_contact|wrong_test_contact/.test(item))) return "blocked_missing_test_contact_approval";
  return "pilot_retry_ready";
}

export async function buildControlledRetellPilotRetryPlan(options = {}) {
  const now = clean(options.now) || new Date().toISOString();
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const contact = options.testContact || {};
  const approval = options.retryApproval || {};
  const priorRunId = clean(options.priorRunId);
  const priorEvidence = priorRunId ? readEvidenceByRunId(options.outputDir, priorRunId) : null;
  const retell = await getRuntimeRetellDetails({ env, fetchImpl });
  const blockers = [...retell.blockers];

  if (!priorEvidence) blockers.push("prior_attempt_evidence_missing");
  if (priorEvidence && !priorAttemptRetryable(priorEvidence)) blockers.push("prior_attempt_connected_or_has_transcript");
  if (!retryApprovalAccepted(approval)) blockers.push("explicit_retry_approval_missing");
  if (clean(env.RETELL_CONTROLLED_PILOT_ENABLED).toLowerCase() !== "true") blockers.push("controlled_pilot_env_flag_not_enabled");
  if (clean(contact.name) !== "Devon" || maskPhone(contact.phone_number) !== "***6243") blockers.push("wrong_test_contact_for_retry");
  if (!clean(contact.consent_note)) blockers.push("test_contact_consent_note_missing");
  if (!clean(contact.scenario)) blockers.push("test_scenario_missing");
  if (retell.config?.from_number_redacted !== "***5341") blockers.push("corrected_from_number_required");
  const existingRetry = retryEvidenceAlreadyExists(options.outputDir, priorRunId);
  if (existingRetry) blockers.push("retry_already_used");

  const uniqueBlockers = [...new Set(blockers)];
  const status = retryStatusFor(uniqueBlockers);
  return {
    ok: uniqueBlockers.length === 0,
    status,
    version: RETELL_CONTROLLED_PILOT_RUNNER_VERSION,
    run_id: retryRunId({ priorRunId, now, attempt: 1 }),
    previous_run_id: priorRunId,
    timestamp: now,
    blockers: uniqueBlockers,
    prior_attempt: priorEvidence ? {
      run_id: clean(priorEvidence.run_id),
      attempt_number: Number(priorEvidence.attempt_number || 1),
      call_status: clean(priorEvidence.call_status),
      disconnection_reason: clean(priorEvidence.disconnection_reason),
      duration_ms: durationMs(priorEvidence),
      transcript_present: hasTranscript(priorEvidence),
      redacted_phone_number: clean(priorEvidence.redacted_phone_number),
      from_number: clean(priorEvidence.from_number),
      retryable: priorAttemptRetryable(priorEvidence),
    } : null,
    retry: {
      attempt_number: 2,
      corrected_from_number: retell.config?.from_number_redacted || "",
      already_used: Boolean(existingRetry),
    },
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
      approved: retryApprovalAccepted(approval),
      approval_id: clean(approval.approval_id || approval.id),
      operator: clean(approval.operator || approval.decided_by || approval.approved_by),
      scope: clean(approval.scope || approval.action || approval.approved_scope),
      reason: clean(approval.reason),
    },
    execution: {
      call_limit: 1,
      retry_limit: 1,
      execute_allowed: uniqueBlockers.length === 0,
    },
    safety: {
      call_limit: 1,
      retry_limit: 1,
      no_broad_production_calling: true,
      no_leads_called: true,
      no_clients_called: true,
      no_general_production_voice_activation: true,
      production_activation_still_requires_separate_approval: true,
    },
    production_activation: {
      status: "requires_separate_approval",
      allowed: false,
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
    dynamic_variables: options.dynamicVariables,
  });
  const normalized = normalizeRetellCall(call);
  const retellCallId = clean(call.provider_call_id || normalized.provider_call_id);
  const baseEvidence = {
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
    rollback_monitoring_notes: "Single friendly-contact pilot only. No general production voice activation; monitor Retell dashboard/call status and do not run follow-up calls without another Jonathan/operator approval.",
    production_activation_still_requires_separate_approval: true,
    safety: plan.safety,
  };
  const quality = analyzeRetellPilotTranscriptQuality(baseEvidence);
  const evidence = {
    ...baseEvidence,
    pass_fail_result: quality.pass_fail_result === "pilot_pass_candidate" ? "pass" : quality.pass_fail_result,
    script_quality: quality,
    repair_packet: quality.repair_packet,
  };
  const filePath = writeEvidence(options.outputDir, evidence);
  return {
    ok: true,
    status: evidence.pass_fail_result === "pass" ? "pilot_passed" : evidence.pass_fail_result === "pilot_connected_script_polish_needed" ? "pilot_connected_script_polish_needed" : "pilot_executed",
    evidence,
    evidence_path: filePath,
    safety: plan.safety,
  };
}

export async function executeControlledRetellPilotRetry(options = {}) {
  const plan = await buildControlledRetellPilotRetryPlan(options);
  if (!plan.ok) return plan;
  const contact = options.testContact || {};
  const env = options.env || process.env;
  const transport = makeRetellTransport({
    config: {
      configured: true,
      api_key: clean(env.RETELL_API_KEY),
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
    lead_id: "controlled-retell-pilot-friendly-test-contact-retry",
    idempotency_key: plan.run_id,
    approved_script_ref: "phase7_controlled_retell_pilot_devon_retry_1",
    approved_angle: scenario,
    dynamic_variables: options.dynamicVariables,
  });
  const normalized = normalizeRetellCall(call);
  const status = clean(call.status || normalized.status);
  const baseEvidence = {
    version: RETELL_CONTROLLED_PILOT_RUNNER_VERSION,
    run_id: plan.run_id,
    previous_run_id: plan.previous_run_id,
    timestamp: plan.timestamp,
    attempt_number: 2,
    operator_approval: plan.operator_approval,
    test_contact_name: clean(contact.name),
    redacted_phone_number: maskPhone(contact.phone_number),
    retell_call_id: clean(call.provider_call_id || normalized.provider_call_id),
    agent_id: plan._runtime.agent_id,
    agent_id_last6: last(plan._runtime.agent_id),
    from_number: maskPhone(plan._runtime.from_number),
    phone_number_management: plan.retell.phone_number_management,
    scenario,
    call_status: status,
    disconnection_reason: clean(call.outcome || normalized.outcome),
    duration_ms: Number(call.duration_ms || normalized.duration_seconds * 1000 || 0),
    transcript_or_summary: clean(call.summary || normalized.summary),
    rollback_monitoring_notes: "Single approved retry after zero-duration not-connected first attempt. No production activation; no follow-up calls without another Jonathan/operator approval.",
    production_activation_still_requires_separate_approval: true,
    safety: plan.safety,
  };
  const quality = analyzeRetellPilotTranscriptQuality(baseEvidence);
  const evidence = {
    ...baseEvidence,
    pass_fail_result: quality.pass_fail_result === "pilot_pass_candidate" ? "pass" : quality.pass_fail_result,
    script_quality: quality,
    repair_packet: quality.repair_packet,
  };
  const filePath = writeEvidence(options.outputDir, evidence);
  return {
    ok: true,
    status: evidence.pass_fail_result === "pass" ? "pilot_passed" : evidence.pass_fail_result === "pilot_connected_script_polish_needed" ? "pilot_connected_script_polish_needed" : "pilot_retry_executed",
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

export function readControlledRetellPilotFinalState(options = {}) {
  const priorRunId = clean(options.priorRunId || options.runId);
  const prior = priorRunId ? readEvidenceByRunId(options.outputDir, priorRunId) : null;
  if (!prior) return { ok: false, reason: "pilot_evidence_not_found" };
  const attempts = [prior];
  const retry = retryEvidenceAlreadyExists(options.outputDir, priorRunId);
  if (retry) attempts.push(retry);
  const latest = attempts[attempts.length - 1];
  let status = clean(latest.pass_fail_result) === "pass" ? "pilot_passed" : clean(latest.pass_fail_result);
  if (!status || status === "pending_call_completion") status = Number(latest.attempt_number) === 2 ? "pilot_retry_executed" : "pilot_failed_not_connected";
  if (clean(latest.call_status) === "not_connected") status = "pilot_failed_not_connected";
  const repairPackets = attempts.map((item) => item.repair_packet).filter(Boolean);
  if (repairPackets.length) status = "pilot_connected_script_polish_needed";
  return {
    ok: true,
    status,
    attempts: attempts.map((item) => ({
      run_id: clean(item.run_id),
      previous_run_id: clean(item.previous_run_id),
      attempt_number: Number(item.attempt_number || 1),
      redacted_phone_number: clean(item.redacted_phone_number),
      from_number: clean(item.from_number),
      retell_call_id: clean(item.retell_call_id),
      call_status: clean(item.call_status),
      pass_fail_result: clean(item.pass_fail_result),
    })),
    latest_attempt: {
      run_id: clean(latest.run_id),
      attempt_number: Number(latest.attempt_number || 1),
      call_status: clean(latest.call_status),
      pass_fail_result: clean(latest.pass_fail_result),
    },
    production_activation: {
      status: "requires_separate_approval",
      allowed: false,
      blocked_by_script_quality: repairPackets.length > 0,
    },
    repair_packets: repairPackets,
  };
}
