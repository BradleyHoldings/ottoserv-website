import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProcessScan } from "../src/lib/processScans.ts";
import { createWorkflowDiagnostics, getClarificationQuestions } from "../src/lib/processScanDiagnostics.mjs";

const baseInput = {
  company_name: "Harbor Point PM",
  contact_name: "Maya Lee",
  email: "maya@harborpoint.example",
  phone: "555-111-2222",
  main_leak: "lead_intake",
  process_name: "New owner lead intake",
  process_type: "lead_intake",
  software_used: "Buildium and shared inbox",
  current_process_description: "Website form lands in inbox. Office manager checks Buildium, forwards to leasing, then waits for confirmation.",
  failure_impact: "Owner lead waits two days and calls a competitor.",
  monthly_lead_volume: "45",
  recording_status: "recorded_upload_pending",
  audio_status: "enabled",
  gap_tags: ["no_clear_owner", "slow_response", "status_not_updated"],
  clarification_answers: {
    owner: "Office manager first, leasing after qualification",
    follow_up: "No escalation unless Maya remembers to check the inbox",
    customer_confirmation: "Only if leasing manually replies",
    reminders: "Manual calendar reminders",
    status_tracking: "Buildium status is updated after qualification",
  },
  source_page: "front_office_leak_check",
};

test("diagnostics create evidence-specific workflow maps with priorities, risks, and next actions", () => {
  const diagnostics = createWorkflowDiagnostics(baseInput);

  assert.equal(diagnostics.reportConfidence.level, "High");
  assert.ok(diagnostics.currentStateMap.nodes.some((node) => node.label.includes("Office manager first")));
  assert.ok(diagnostics.currentStateMap.nodes.some((node) => node.type === "leak" && node.severity === "high"));
  assert.ok(diagnostics.revenueRisks.some((risk) => risk.title.includes("Slow response")));
  assert.ok(diagnostics.priorityRanking.some((item) => item.priority === "P1" && item.title.includes("Owner")));
  assert.ok(diagnostics.nextActions.some((action) => action.includes("Assign")));
  assert.ok(diagnostics.automationOpportunities.some((item) => item.includes("Buildium")));
});

test("buildProcessScan persists honest report sections from diagnostics", () => {
  const scan = buildProcessScan(baseInput, "https://www.ottoserv.com");

  assert.equal(scan.audio_included, true);
  assert.equal(scan.report_confidence, "High");
  assert.ok(Array.isArray(scan.revenue_risks_json));
  assert.ok(scan.revenue_risks_json.length >= 2);
  assert.ok(Array.isArray(scan.priority_ranking_json));
  assert.ok(scan.priority_ranking_json.some((item) => item.priority === "P1"));
  assert.ok(Array.isArray(scan.practical_next_actions_json));
  assert.ok(scan.current_state_workflow_map_json.nodes.some((node) => node.source === "reported"));
  assert.match(scan.current_state_flowchart_mermaid || "", /owner_decision/);
});

test("follow-up questions stay brief and target only missing context", () => {
  const questions = getClarificationQuestions({
    audio_status: "blocked",
    software_used: "",
    gap_tags: ["follow_up_depends_on_memory"],
    clarification_answers: {
      owner: "Dispatcher",
      customer_confirmation: "Automated text",
    },
  });

  assert.ok(questions.length <= 5);
  assert.ok(questions.some((question) => question.id === "summary"));
  assert.ok(questions.some((question) => question.id === "status_tracking"));
  assert.ok(questions.some((question) => question.id === "follow_up"));
  assert.ok(!questions.some((question) => question.id === "owner"));
  assert.ok(!questions.some((question) => question.id === "customer_confirmation"));
});
