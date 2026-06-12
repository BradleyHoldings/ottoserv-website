import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildMultiAgentCommandState,
  detectCommandConflicts,
  getAgentResourceRegistry,
  getCapabilityMatrix,
  routeCommandTask,
} from "../src/lib/multiAgentCommandState.mjs";
import { runRevenueDailyLoop } from "../src/lib/revenueLoopRunner.mjs";
import { readAutonomousRevenueState } from "../src/lib/revenueEngineReadAdapter.mjs";

const NOW = "2026-06-12T14:00:00.000Z";

function task(overrides = {}) {
  return {
    task_id: "task-code-1",
    task_type: "code_changes",
    risk_level: "medium",
    required_tools: ["filesystem", "tests"],
    evidence_path: "commit_and_tests",
    status: "queued",
    ...overrides,
  };
}

test("agent registry contains active agents/resources, Jarvis reserved, and planned agents non-routable", () => {
  const registry = getAgentResourceRegistry();
  const active = new Set(registry.active.map((agent) => agent.agent_key));
  const planned = new Set(registry.planned.map((agent) => agent.agent_key));
  const reserved = new Set(registry.reserved.map((agent) => agent.agent_key));

  for (const key of ["hermes", "codex", "claude_code", "cowork", "jonathan_operator", "retell_call_rail", "email_rail", "supabase_data_rail", "vercel_deploy_rail"]) {
    assert.equal(active.has(key), true, `${key} active`);
  }
  assert.equal(reserved.has("jarvis"), true);
  assert.equal(active.has("jarvis"), false);
  for (const key of ["nova", "dash", "atlas", "sentinel"]) {
    assert.equal(planned.has(key), true, `${key} planned`);
    assert.equal(registry.by_key[key].routable, false);
  }
});

test("capability matrix routes code, browser research, service delivery, and revenue queue tasks", () => {
  const matrix = getCapabilityMatrix();

  assert.equal(matrix.code_changes.primary, "codex");
  assert.ok(matrix.code_changes.capable_agents.includes("claude_code"));
  assert.equal(routeCommandTask(task({ task_type: "browser_manual_research" })).primary_assignee, "cowork");
  assert.equal(routeCommandTask(task({ task_type: "service_delivery_work_order" })).primary_assignee, "hermes");
  assert.equal(routeCommandTask(task({ task_type: "revenue_queue_task" })).primary_assignee, "hermes");
  assert.equal(routeCommandTask(task({ task_type: "controlled_email_execution" })).primary_assignee, "email_rail");
  assert.equal(routeCommandTask(task({ task_type: "controlled_call_execution" })).primary_assignee, "retell_call_rail");
});

test("approval-required work blocks production execution and attaches evidence requirements", () => {
  const route = routeCommandTask(task({
    task_id: "prod-voice",
    task_type: "production_voice_activation",
    risk_level: "high",
    approval_required: true,
  }));

  assert.equal(route.primary_assignee, "jonathan_operator");
  assert.equal(route.allowed_execution_mode, "production_gated");
  assert.equal(route.blocked, true);
  assert.ok(route.required_approvals.includes("jonathan_operator_approval"));
  assert.ok(route.required_evidence.length >= 1);
});

test("exhausted or limited resources trigger fallback without routing planned agents", () => {
  const codeRoute = routeCommandTask(task(), {
    resources: { codex: { status: "exhausted" }, claude_code: { status: "available" } },
  });
  const plannedRoute = routeCommandTask(task({ task_type: "growth_campaign_ideation", requested_agent: "nova" }));

  assert.equal(codeRoute.primary_assignee, "claude_code");
  assert.equal(codeRoute.fallback_assignee, "jonathan_operator");
  assert.equal(plannedRoute.primary_assignee, "hermes");
  assert.equal(plannedRoute.conflict_warnings.some((warning) => /planned/.test(warning)), true);
});

test("duplicate and conflict detection blocks overlapping ownership and unsafe execution", () => {
  const conflicts = detectCommandConflicts([
    task({ task_id: "code-a", assigned_agent: "codex", file_paths: ["src/lib/a.mjs"] }),
    task({ task_id: "code-b", assigned_agent: "claude_code", file_paths: ["src/lib/a.mjs"] }),
    task({ task_id: "lead-a", assigned_agent: "cowork", lead_id: "lead-1", execution_kind: "contact" }),
    task({ task_id: "lead-b", assigned_agent: "hermes", lead_id: "lead-1", execution_kind: "contact" }),
    task({ task_id: "deploy-a", task_type: "deployment", assigned_agent: "vercel_deploy_rail", deployment_target: "production" }),
    task({ task_id: "deploy-b", task_type: "deployment", assigned_agent: "vercel_deploy_rail", deployment_target: "production" }),
    task({ task_id: "no-evidence", task_type: "revenue_queue_task", evidence_path: "" }),
    task({ task_id: "prod-no-approval", task_type: "production_voice_activation", approval_required: false }),
    task({ task_id: "jarvis", assigned_agent: "jarvis" }),
  ]);
  const types = new Set(conflicts.map((item) => item.type));

  assert.equal(types.has("file_ownership_conflict"), true);
  assert.equal(types.has("lead_contact_conflict"), true);
  assert.equal(types.has("duplicate_deploy_attempt"), true);
  assert.equal(types.has("missing_evidence_path"), true);
  assert.equal(types.has("production_without_approval"), true);
  assert.equal(types.has("reserved_alias_authority_conflict"), true);
});

test("command state summarizes delegations, resources, approvals, evidence, and next action", () => {
  const state = buildMultiAgentCommandState({
    tasks: [
      task({ task_id: "email-held", task_type: "controlled_email_execution", status: "held_until_send_window" }),
      task({ task_id: "approval", task_type: "production_voice_activation", risk_level: "high", approval_required: true }),
      task({ task_id: "stale", task_type: "browser_manual_research", assigned_agent: "cowork", created_at: "2026-06-01T00:00:00.000Z" }),
    ],
    resources: { cowork: { status: "limited", reason: "manual capacity" } },
    now: NOW,
  });

  assert.equal(state.summary.active_delegations, 3);
  assert.equal(state.summary.approvals_needed, 1);
  assert.equal(state.resource_availability_summary.cowork.status, "limited");
  assert.ok(state.stale_tasks.some((item) => item.task_id === "stale"));
  assert.ok(state.evidence_requirements.length >= 1);
  assert.ok(state.next_operator_action);
});

test("latest.json and read adapter expose multiAgentCommandState", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "phase8a-latest-"));
  const result = await runRevenueDailyLoop({
    now: NOW,
    outputDir,
    persistSupabase: false,
    sourceOptions: { cwd: outputDir },
    commandTasks: [
      task({ task_id: "code-task", task_type: "code_changes" }),
      task({ task_id: "research-task", task_type: "browser_manual_research" }),
    ],
    commandResources: { codex: { status: "available" }, cowork: { status: "available" } },
  });
  const latest = JSON.parse(await readFile(result.latestPath, "utf8"));
  const readState = await readAutonomousRevenueState({ dataDir: outputDir });

  assert.equal(latest.multiAgentCommandState.summary.active_delegations, 2);
  assert.equal(latest.multiAgentCommandState.registry_summary.active_routable, 9);
  assert.equal(readState.multiAgentCommandState.summary.active_delegations, 2);
  assert.equal(result.summary.multi_agent_command_state.active_delegations, 2);

  await rm(outputDir, { recursive: true, force: true });
});
