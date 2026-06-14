import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildRetellControlledReadinessReport,
  generateControlledRetellExecutionPacket,
  evaluateControlledRetellAction,
  ingestControlledRetellEvidence,
  evaluateControlledRetellProductionActivationGate,
  writeBackControlledRetellEvidence,
} from "../src/lib/retellControlledVoiceExecution.mjs";
import { generateVoiceSetupPacket } from "../src/lib/retellVoiceServiceAutomation.mjs";
import { createMockServiceDeliveryLiveClient, persistServiceDeliveryRun } from "../src/lib/serviceDeliveryPersistence.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import {
  buildControlledRetellPilotPlan,
  buildControlledRetellPilotRetryPlan,
  executeControlledRetellPilot,
  executeControlledRetellPilotRetry,
  readControlledRetellPilotFinalState,
  readControlledRetellPilotEvidence,
} from "../src/lib/retellControlledPilotRunner.mjs";

const NOW = "2026-06-11T20:00:00.000Z";

function voiceWorkOrder(overrides = {}) {
  return {
    id: "WO-RETELL-6F-001",
    title: "AI Receptionist: controlled Retell test",
    client: "Synthetic Harbor Services",
    service_key: "ai_receptionist",
    status: "sandbox_execution_ready",
    approvalStatus: "approved",
    implementation: {
      assignment: { assignee: "Jonathan", requires_approval: true },
      readiness: { can_queue: false, requires_approval: true, blocked_reasons: ["approval_required"] },
      testing_checklist: ["Run approved synthetic Retell test call"],
      launch_checklist: ["Confirm test call evidence"],
      monitoring_metrics: ["answered_calls", "qualified_calls"],
      upsell_paths: ["Missed Call Recovery"],
    },
    voice_intake: {
      business_name: "Synthetic Harbor Services",
      business_hours: "Mon-Fri 8am-5pm",
      service_area: "Orlando, FL",
      services_offered: ["Repairs"],
      main_phone_number: "+14075550199",
      desired_retell_number: "+14075550199",
      escalation_contact: "Jonathan synthetic escalation",
      emergency_handling_rules: "Escalate active leaks immediately.",
      faqs: ["Hours", "Scheduling"],
      booking_rules: "Collect name, service need, urgency.",
      after_hours_behavior: "Create callback task.",
      crm_calendar_handoff_notes: "No production CRM write.",
    },
    ...overrides,
  };
}

function approvedPacket(overrides = {}) {
  const packet = generateVoiceSetupPacket(voiceWorkOrder(), { now: NOW });
  return {
    ...packet,
    approval_status: "approved",
    approval_id: "approval-retell-6f-001",
    ...overrides,
  };
}

test("controlled Retell readiness fails closed without credentials and reports env names only", async () => {
  const report = await buildRetellControlledReadinessReport({ env: {}, fetchImpl: async () => {
    throw new Error("network should not be called");
  } });

  assert.equal(report.ok, false);
  assert.equal(report.status, "blocked_missing_retell_config");
  assert.deepEqual(report.required_env_names, [
    "RETELL_API_KEY",
    "RETELL_AGENT_ID",
    "RETELL_PHONE_NUMBER or RETELL_FROM_NUMBER or RETELL_PHONE_NUMBER_ID",
  ]);
  assert.equal(JSON.stringify(report).includes("secret"), false);
});

test("controlled Retell readiness with credentials reports presence names only", async () => {
  const seen = [];
  const report = await buildRetellControlledReadinessReport({
    env: {
      RETELL_API_KEY: "secret-api-key",
      RETELL_AGENT_ID: "agent_phase6f_acceptance",
      RETELL_PHONE_NUMBER_ID: "phone_phase6f",
      RETELL_BASE_URL: "https://api.retellai.test",
    },
    fetchImpl: async (url) => {
      seen.push(String(url));
      if (String(url).includes("phone-numbers")) {
        return {
          ok: true,
          async json() {
            return { phone_numbers: [{ phone_number_id: "phone_phase6f", phone_number: "+14075550199", allowed_outbound_country_list: ["US"], outbound_agents: ["agent_phase6f_acceptance"] }] };
          },
          async text() { return "{}"; },
        };
      }
      return {
        ok: true,
        async json() {
          return { agent_id: "agent_phase6f_acceptance", agent_name: "Morgan Phase 6F", response_engine: { type: "retell-llm" } };
        },
        async text() { return "{}"; },
      };
    },
  });

  assert.equal(report.ok, true);
  assert.equal(report.env_present.RETELL_API_KEY, true);
  assert.equal(report.env_present.RETELL_AGENT_ID, true);
  assert.equal(report.env_present.RETELL_PHONE_NUMBER_ID, true);
  assert.equal(JSON.stringify(report).includes("secret-api-key"), false);
  assert.ok(seen.some((url) => url.includes("/v2/list-phone-numbers")));
});

test("approved voice work order can generate controlled Retell test-call packet", () => {
  const packet = generateControlledRetellExecutionPacket(approvedPacket(), { now: NOW });

  assert.equal(packet.ok, true);
  assert.equal(packet.execution_packet.status, "test_call_queued");
  assert.equal(packet.execution_packet.actions.agent_config_preparation.allowed, true);
  assert.equal(packet.execution_packet.actions.sandbox_test_call.allowed, true);
  assert.equal(packet.execution_packet.actions.production_activation.allowed, false);
  assert.equal(packet.execution_packet.actions.number_provisioning.allowed, false);
  assert.equal(packet.execution_packet.actions.live_routing_change.allowed, false);
  assert.equal(packet.execution_packet.related_approval_id, "approval-retell-6f-001");
});

test("unapproved Retell test-call packet is blocked", () => {
  const result = generateControlledRetellExecutionPacket(approvedPacket({ approval_status: "pending" }), { now: NOW });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "approved_voice_work_order_required");
});

test("production activation, number provisioning, and live routing stay blocked", () => {
  const packet = generateControlledRetellExecutionPacket(approvedPacket(), { now: NOW }).execution_packet;

  assert.equal(evaluateControlledRetellAction(packet, "production_activation").ok, false);
  assert.equal(evaluateControlledRetellAction(packet, "number_provisioning").ok, false);
  assert.equal(evaluateControlledRetellAction(packet, "live_routing_change").ok, false);
  assert.equal(evaluateControlledRetellAction(packet, "outbound_customer_call").ok, false);
});

test("production activation gate requires approval, credentials, test-call evidence, rollback, monitoring, and client approval", async () => {
  const packet = generateControlledRetellExecutionPacket(approvedPacket(), { now: NOW }).execution_packet;
  const blocked = await evaluateControlledRetellProductionActivationGate(packet, {
    env: {},
    evidence: {},
    approval: {},
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, "blocked_missing_credentials");
  assert.ok(blocked.blockers.includes("retell_credentials_missing"));
  assert.ok(blocked.blockers.includes("accepted_test_call_evidence_missing"));
  assert.ok(blocked.blockers.includes("explicit_operator_activation_approval_missing"));
  assert.ok(blocked.blockers.includes("client_launch_approval_missing"));
  assert.equal(blocked.safety.no_live_action_executed, true);

  const ready = await evaluateControlledRetellProductionActivationGate(packet, {
    env: {
      RETELL_API_KEY: "secret-api-key",
      RETELL_AGENT_ID: "agent_phase6f_acceptance",
      RETELL_PHONE_NUMBER_ID: "phone_phase6f",
      RETELL_VOICE_SERVICE_LIVE_EXECUTION: "approved",
    },
    evidence: {
      status: "completed",
      retell_agent_config_id: "agent_config_phase6f",
      retell_call_id: "call_phase6f_001",
      call_status: "ended",
      call_result: "connected_test",
      transcript_unavailable_reason: "synthetic fixture omitted full transcript",
      occurred_at: NOW,
      approval_id: "approval-retell-6f-001",
      work_order_id: "WO-RETELL-6F-001",
      rollback_plan_id: "rollback-phase6f-001",
      monitoring_plan_id: "monitor-phase6f-001",
      client_launch_approval_id: "client-approval-phase6f-001",
    },
    approval: {
      decision: "approved",
      operator: "Jonathan/operator",
      approval_id: "approval-retell-6f-activation",
      scope: "production_activation",
    },
    testContact: {
      name: "Devon",
      phone_number: "+14078816243",
      consent_note: "Devon gave Jonathan permission to send one test call.",
      scenario: "Friendly plumbing/HVAC owner test.",
    },
  });

  assert.equal(ready.ok, true);
  assert.equal(ready.status, "pilot_ready");
  assert.equal(ready.allowed_actions.production_activation, false);
  assert.equal(ready.next_action, "operator_may_run_separate_controlled_activation_after_final_live_review");
  assert.equal(JSON.stringify(ready).includes("secret-api-key"), false);
});

test("production activation gate distinguishes controlled pilot lifecycle states", async () => {
  const packet = generateControlledRetellExecutionPacket(approvedPacket(), { now: NOW }).execution_packet;
  const base = {
    env: {
      RETELL_API_KEY: "secret-api-key",
      RETELL_AGENT_ID: "agent_phase6f_acceptance",
      RETELL_PHONE_NUMBER_ID: "phone_phase6f",
      RETELL_VOICE_SERVICE_LIVE_EXECUTION: "approved",
    },
    evidence: {
      status: "completed",
      retell_agent_config_id: "agent_config_phase6f",
      retell_call_id: "call_phase6f_001",
      call_status: "ended",
      call_result: "connected_test",
      transcript_unavailable_reason: "synthetic fixture omitted full transcript",
      occurred_at: NOW,
      approval_id: "approval-retell-6f-001",
      work_order_id: "WO-RETELL-6F-001",
      rollback_plan_id: "rollback-phase6f-001",
      monitoring_plan_id: "monitor-phase6f-001",
      client_launch_approval_id: "client-approval-phase6f-001",
    },
    approval: {
      decision: "approved",
      operator: "Jonathan/operator",
      approval_id: "approval-retell-6f-activation",
      scope: "production_activation",
    },
  };

  const missingContact = await evaluateControlledRetellProductionActivationGate(packet, base);
  assert.equal(missingContact.status, "blocked_missing_test_contact_approval");
  assert.ok(missingContact.blockers.includes("explicit_test_contact_approval_missing"));

  const pilotReady = await evaluateControlledRetellProductionActivationGate(packet, {
    ...base,
    testContact: {
      name: "Devon",
      phone_number: "+14078816243",
      consent_note: "Devon gave Jonathan permission to send one test call.",
      scenario: "Friendly plumbing/HVAC owner test.",
    },
  });
  assert.equal(pilotReady.status, "pilot_ready");

  const pilotExecuted = await evaluateControlledRetellProductionActivationGate(packet, {
    ...base,
    testContact: {
      name: "Devon",
      phone_number: "+14078816243",
      consent_note: "Devon gave Jonathan permission to send one test call.",
      scenario: "Friendly plumbing/HVAC owner test.",
    },
    pilotEvidence: {
      run_id: "retell-pilot-devon",
      retell_call_id: "call_pilot_001",
      pass_fail_result: "pending_call_completion",
    },
  });
  assert.equal(pilotExecuted.status, "pilot_executed");

  const pilotPassed = await evaluateControlledRetellProductionActivationGate(packet, {
    ...base,
    testContact: {
      name: "Devon",
      phone_number: "+14078816243",
      consent_note: "Devon gave Jonathan permission to send one test call.",
      scenario: "Friendly plumbing/HVAC owner test.",
    },
    pilotEvidence: {
      run_id: "retell-pilot-devon",
      retell_call_id: "call_pilot_001",
      pass_fail_result: "pass",
    },
  });
  assert.equal(pilotPassed.status, "pilot_passed");
  assert.equal(pilotPassed.production_activation.status, "requires_separate_approval");
});

test("controlled Retell pilot blocks without credentials or explicit approved test contact", async () => {
  const blocked = await buildControlledRetellPilotPlan({
    now: NOW,
    env: {},
    testContact: {},
    operatorApproval: {},
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, "blocked_missing_credentials");
  assert.ok(blocked.blockers.includes("retell_credentials_missing"));
  assert.ok(blocked.blockers.includes("explicit_test_contact_approval_missing"));
  assert.equal(blocked.safety.call_limit, 1);
  assert.equal(blocked.safety.no_broad_production_calling, true);
  assert.equal(JSON.stringify(blocked).includes("+14078816243"), false);
});

test("controlled Retell pilot executes exactly one approved call and stores sanitized evidence", async () => {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "retell-pilot-"));
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith("/v2/list-phone-numbers")) {
      return {
        ok: true,
        async json() {
          return {
            phone_numbers: [{
              phone_number_id: "pn_pilot_001",
              phone_number: "+15551234567",
              phone_number_type: "telnyx",
              allowed_outbound_country_list: ["US"],
              outbound_agents: [{ agent_id: "agent_pilot_001" }],
            }],
          };
        },
      };
    }
    if (url.endsWith("/get-agent/agent_pilot_001")) {
      return {
        ok: true,
        async json() {
          return {
            agent_id: "agent_pilot_001",
            agent_name: "Hermes Pilot Receptionist",
            response_engine: { type: "retell-llm" },
            webhook_events: ["call_ended"],
          };
        },
      };
    }
    if (url.endsWith("/v2/create-phone-call")) {
      calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
      return {
        ok: true,
        async json() {
          return {
            call_id: "call_pilot_001",
            call_status: "registered",
            call_analysis: { call_summary: "Devon completed the approved receptionist pilot scenario." },
          };
        },
      };
    }
    throw new Error(`unexpected ${url}`);
  };

  const result = await executeControlledRetellPilot({
    now: NOW,
    outputDir,
    env: {
      RETELL_API_KEY: "secret-api-key",
      RETELL_AGENT_ID: "agent_pilot_001",
      RETELL_PHONE_NUMBER_ID: "pn_pilot_001",
      RETELL_BASE_URL: "https://api.retellai.test",
      RETELL_CONTROLLED_PILOT_ENABLED: "true",
    },
    testContact: {
      name: "Devon",
      phone_number: "+14078816243",
      consent_note: "Devon gave Jonathan permission to send one OttoServ/Hermes AI test call for Retell testing.",
      scenario: "Pretend the test contact owns a small plumbing/HVAC business.",
    },
    operatorApproval: {
      decision: "approved",
      operator: "Jonathan/operator",
      approval_id: "approval-retell-pilot-devon",
      scope: "single_controlled_retell_pilot_call",
    },
    fetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "pilot_executed");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.to_number, "+14078816243");
  assert.equal(calls[0].body.from_number, "+15551234567");
  assert.equal(calls[0].body.override_agent_id, "agent_pilot_001");
  assert.equal(result.evidence.test_contact_name, "Devon");
  assert.equal(result.evidence.redacted_phone_number, "***6243");
  assert.equal(result.evidence.retell_call_id, "call_pilot_001");
  assert.equal(result.evidence.agent_id, "agent_pilot_001");
  assert.equal(result.evidence.from_number, "***4567");
  assert.equal(result.evidence.phone_number_management, "telnyx/imported");
  assert.equal(result.evidence.pass_fail_result, "pending_call_completion");
  assert.equal(result.evidence.production_activation_still_requires_separate_approval, true);
  assert.equal(JSON.stringify(result).includes("secret-api-key"), false);
  assert.equal(JSON.stringify(result).includes("+14078816243"), false);

  const readBack = readControlledRetellPilotEvidence({ outputDir, runId: result.evidence.run_id });
  assert.equal(readBack.ok, true);
  assert.equal(readBack.evidence.retell_call_id, "call_pilot_001");
  assert.equal(readBack.evidence.redacted_phone_number, "***6243");
});

test("controlled Retell pilot refuses a second call when evidence already exists for the contact", async () => {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "retell-pilot-limit-"));
  let createCalls = 0;
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith("/v2/list-phone-numbers")) {
      return {
        ok: true,
        async json() {
          return {
            phone_numbers: [{
              phone_number_id: "pn_pilot_001",
              phone_number: "+15551234567",
              phone_number_type: "retell-twilio",
              allowed_outbound_country_list: ["US"],
              outbound_agents: [{ agent_id: "agent_pilot_001" }],
            }],
          };
        },
      };
    }
    if (url.endsWith("/get-agent/agent_pilot_001")) {
      return {
        ok: true,
        async json() {
          return { agent_id: "agent_pilot_001", agent_name: "Hermes Pilot Receptionist", response_engine: { type: "retell-llm" } };
        },
      };
    }
    if (url.endsWith("/v2/create-phone-call")) {
      createCalls += 1;
      return { ok: true, async json() { return { call_id: `call_pilot_00${createCalls}`, call_status: "registered" }; } };
    }
    throw new Error(`unexpected ${url} ${JSON.stringify(init)}`);
  };
  const options = {
    now: NOW,
    outputDir,
    env: {
      RETELL_API_KEY: "secret-api-key",
      RETELL_AGENT_ID: "agent_pilot_001",
      RETELL_PHONE_NUMBER_ID: "pn_pilot_001",
      RETELL_BASE_URL: "https://api.retellai.test",
      RETELL_CONTROLLED_PILOT_ENABLED: "true",
    },
    testContact: {
      name: "Devon",
      phone_number: "+14078816243",
      consent_note: "Devon gave Jonathan permission to send one OttoServ/Hermes AI test call for Retell testing.",
      scenario: "Friendly plumbing/HVAC owner test.",
    },
    operatorApproval: {
      decision: "approved",
      operator: "Jonathan/operator",
      approval_id: "approval-retell-pilot-devon",
      scope: "single_controlled_retell_pilot_call",
    },
    fetchImpl,
  };

  const first = await executeControlledRetellPilot(options);
  const second = await executeControlledRetellPilot(options);

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.status, "pilot_executed");
  assert.ok(second.blockers.includes("call_limit_already_used"));
  assert.equal(createCalls, 1);
});

function writePriorPilotEvidence(outputDir, overrides = {}) {
  const dir = path.join(outputDir, "retell-pilot-evidence");
  const filePath = path.join(dir, "retell-pilot-devon-13dfa8f3d7.json");
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify({
    version: "phase7_retell_controlled_pilot_runner_v1",
    run_id: "retell-pilot-devon-13dfa8f3d7",
    timestamp: NOW,
    attempt_number: 1,
    test_contact_name: "Devon",
    redacted_phone_number: "***6243",
    retell_call_id: "call_attempt_1",
    from_number: "***5560",
    call_status: "not_connected",
    disconnection_reason: "user_declined",
    duration_ms: 0,
    transcript_or_summary: "",
    pass_fail_result: "pilot_failed_not_connected",
    production_activation_still_requires_separate_approval: true,
    ...overrides,
  }, null, 2));
  return filePath;
}

function retryRuntimeOptions(outputDir, overrides = {}) {
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith("/v2/list-phone-numbers")) {
      return {
        ok: true,
        async json() {
          return {
            phone_numbers: [{
              phone_number_id: "pn_retry_001",
              phone_number: "+15551235341",
              phone_number_type: "telnyx",
              allowed_outbound_country_list: ["US"],
              outbound_agents: [{ agent_id: "agent_pilot_001" }],
            }],
          };
        },
      };
    }
    if (url.endsWith("/get-agent/agent_pilot_001")) {
      return {
        ok: true,
        async json() {
          return { agent_id: "agent_pilot_001", agent_name: "Hermes Pilot Receptionist", response_engine: { type: "retell-llm" } };
        },
      };
    }
    if (url.endsWith("/v2/create-phone-call")) {
      return {
        ok: true,
        async json() {
          return {
            call_id: "call_retry_001",
            call_status: "registered",
            call_analysis: { call_summary: "Retry call registered for Devon." },
          };
        },
      };
    }
    throw new Error(`unexpected ${url} ${JSON.stringify(init)}`);
  };
  return {
    now: NOW,
    outputDir,
    priorRunId: "retell-pilot-devon-13dfa8f3d7",
    env: {
      RETELL_API_KEY: "secret-api-key",
      RETELL_AGENT_ID: "agent_pilot_001",
      RETELL_PHONE_NUMBER_ID: "pn_retry_001",
      RETELL_BASE_URL: "https://api.retellai.test",
      RETELL_CONTROLLED_PILOT_ENABLED: "true",
    },
    testContact: {
      name: "Devon",
      phone_number: "+14078816243",
      consent_note: "Devon gave Jonathan permission to send one OttoServ/Hermes AI test call for Retell testing.",
      scenario: "Friendly plumbing/HVAC owner retry test.",
    },
    retryApproval: {
      decision: "approved",
      operator: "Jonathan/operator",
      approval_id: "approval-retell-pilot-devon-retry-1",
      scope: "single_controlled_retell_pilot_retry",
      reason: "Attempt 1 did not connect, zero duration, no transcript.",
    },
    fetchImpl,
    ...overrides,
  };
}

test("controlled Retell retry is blocked without explicit operator retry approval", async () => {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "retell-pilot-retry-no-approval-"));
  writePriorPilotEvidence(outputDir);

  const plan = await buildControlledRetellPilotRetryPlan(retryRuntimeOptions(outputDir, { retryApproval: {} }));

  assert.equal(plan.ok, false);
  assert.equal(plan.status, "blocked_missing_retry_approval");
  assert.ok(plan.blockers.includes("explicit_retry_approval_missing"));
  assert.equal(plan.safety.no_broad_production_calling, true);
});

test("controlled Retell retry is blocked if prior call connected", async () => {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "retell-pilot-retry-connected-"));
  writePriorPilotEvidence(outputDir, {
    call_status: "ended",
    disconnection_reason: "user_hangup",
    duration_ms: 12000,
    transcript_or_summary: "Connected and spoke with Devon.",
    pass_fail_result: "pass",
  });

  const plan = await buildControlledRetellPilotRetryPlan(retryRuntimeOptions(outputDir));

  assert.equal(plan.ok, false);
  assert.equal(plan.status, "blocked_prior_attempt_connected");
  assert.ok(plan.blockers.includes("prior_attempt_connected_or_has_transcript"));
});

test("controlled Retell retry is ready only for not connected zero-duration no-transcript prior attempt and corrected from number", async () => {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "retell-pilot-retry-ready-"));
  writePriorPilotEvidence(outputDir);

  const plan = await buildControlledRetellPilotRetryPlan(retryRuntimeOptions(outputDir));

  assert.equal(plan.ok, true);
  assert.equal(plan.status, "pilot_retry_ready");
  assert.equal(plan.retry.attempt_number, 2);
  assert.equal(plan.retry.corrected_from_number, "***5341");
  assert.equal(plan.test_contact.name, "Devon");
  assert.equal(plan.test_contact.redacted_phone_number, "***6243");
  assert.equal(plan.execution.execute_allowed, true);
  assert.equal(plan.safety.no_leads_called, true);
  assert.equal(plan.production_activation.status, "requires_separate_approval");
});

test("controlled Retell retry writes separate retry evidence and final state can read retry execution", async () => {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "retell-pilot-retry-exec-"));
  const originalPath = writePriorPilotEvidence(outputDir);
  const originalBefore = readFileSync(originalPath, "utf8");

  const result = await executeControlledRetellPilotRetry(retryRuntimeOptions(outputDir));

  assert.equal(result.ok, true);
  assert.equal(result.status, "pilot_retry_executed");
  assert.equal(result.evidence.attempt_number, 2);
  assert.equal(result.evidence.previous_run_id, "retell-pilot-devon-13dfa8f3d7");
  assert.equal(result.evidence.redacted_phone_number, "***6243");
  assert.equal(result.evidence.from_number, "***5341");
  assert.equal(result.evidence.retell_call_id, "call_retry_001");
  assert.match(result.evidence.run_id, /^retell-pilot-devon-retry-1-/);
  assert.notEqual(result.evidence_path, originalPath);
  assert.equal(readFileSync(originalPath, "utf8"), originalBefore);
  assert.equal(JSON.stringify(result).includes("secret-api-key"), false);
  assert.equal(JSON.stringify(result).includes("+14078816243"), false);

  const finalState = readControlledRetellPilotFinalState({ outputDir, priorRunId: "retell-pilot-devon-13dfa8f3d7" });
  assert.equal(finalState.ok, true);
  assert.equal(finalState.status, "pilot_retry_executed");
  assert.equal(finalState.attempts.length, 2);
  assert.equal(finalState.production_activation.status, "requires_separate_approval");
});

test("controlled Retell evidence ingestion requires real proof", () => {
  const packet = generateControlledRetellExecutionPacket(approvedPacket(), { now: NOW }).execution_packet;
  const missing = ingestControlledRetellEvidence(packet, { status: "completed" }, { now: NOW });

  assert.equal(missing.ok, false);
  assert.equal(missing.reason, "retell_completion_requires_evidence");

  const accepted = ingestControlledRetellEvidence(packet, {
    status: "completed",
    retell_agent_config_id: "agent_config_phase6f",
    retell_call_id: "call_phase6f_001",
    call_status: "ended",
    call_result: "connected_test",
    transcript: "Synthetic caller asked for service availability.",
    occurred_at: NOW,
    approval_id: "approval-retell-6f-001",
    work_order_id: "WO-RETELL-6F-001",
  }, { now: NOW });

  assert.equal(accepted.ok, true);
  assert.equal(accepted.status, "test_call_completed");
  assert.equal(accepted.event.event_type, "service_delivery_retell_test_call_completed");
  assert.equal(accepted.event.details_json.evidence.retell_call_id, "call_phase6f_001");
});

test("controlled Retell evidence writes back to techops ticket events idempotently", async () => {
  const liveClient = createMockServiceDeliveryLiveClient();
  const wo = voiceWorkOrder();
  await persistServiceDeliveryRun({ opportunities: [], workOrders: [wo] }, { liveClient, now: NOW });
  const packet = generateControlledRetellExecutionPacket(approvedPacket(), { now: NOW }).execution_packet;
  const evidence = ingestControlledRetellEvidence(packet, {
    status: "completed",
    retell_agent_config_id: "agent_config_phase6f",
    retell_call_id: "call_phase6f_001",
    call_status: "ended",
    call_result: "connected_test",
    transcript_unavailable_reason: "synthetic fixture omitted full transcript",
    occurred_at: NOW,
    approval_id: "approval-retell-6f-001",
    work_order_id: wo.id,
  }, { now: NOW });

  const first = await writeBackControlledRetellEvidence(evidence, { liveClient, now: NOW });
  const second = await writeBackControlledRetellEvidence(evidence, { liveClient, now: NOW });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(liveClient.tables.techops_ticket_events.size, 2);
  assert.equal(liveClient.tables.techops_tickets.get(wo.id).status, "test_call_completed");
});

test("latest.json voice_service_status reflects controlled Retell evidence", async () => {
  const src = mkdtempSync(path.join(os.tmpdir(), "retell-6f-src-"));
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "retell-6f-out-"));
  const scanPath = path.join(src, "process_scans.json");
  writeFileSync(scanPath, JSON.stringify([{
    id: "retell_6f_scan",
    status: "report_ready",
    report_status: "ready",
    company_name: "Retell Harbor PM",
    contact_name: "Maya",
    email: "maya@example.com",
    main_leak: "missed_calls",
    process_name: "Inbound calls",
    current_process_description: "Missed calls need controlled AI receptionist testing.",
    automation_opportunities_json: [{ type: "missed_calls", severity: "high", evidence: "After-hours missed calls." }],
    email_sent_at: NOW,
  }]));

  await runRevenueDailyLoop({
    now: NOW,
    outputDir,
    sourceOptions: { cwd: src, processScansPath: scanPath },
    persistSupabase: false,
    retellVoiceEvents: [{
      ticket_number: "WO-2026-00901",
      event_type: "service_delivery_retell_test_call_completed",
      details_json: {
        packet_id: "retell_voice_wo_2026_00901",
        evidence: {
          evidence_type: "retell_test_call_completed",
          retell_call_id: "call_phase6f_latest",
          call_status: "ended",
          call_result: "connected_test",
          occurred_at: NOW,
          work_order_id: "WO-2026-00901",
        },
      },
    }],
  });

  const latest = JSON.parse(readFileSync(path.join(outputDir, "latest.json"), "utf8"));
  const voice = latest.serviceDeliveryExecution.voice_service_status;
  assert.equal(voice.summary.test_call_completed, 1);
  assert.equal(voice.items[0].voice_service_setup_status, "test_call_completed");
  assert.equal(voice.items[0].latest_voice_evidence.retell_call_id, "call_phase6f_latest");
});
