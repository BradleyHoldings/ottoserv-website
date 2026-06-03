import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createWorkflowDiagnostics,
  getClarificationQuestions,
} from "../src/lib/processScanDiagnostics.mjs";

test("diagnostics marks no-audio submissions as medium confidence with missing narration", () => {
  const diagnostics = createWorkflowDiagnostics({
    company_name: "COE Handyman Services",
    main_leak: "invoice_payment_follow_up",
    process_name: "Invoice/payment follow-up workflow",
    recording_status: "recorded_upload_pending",
    audio_status: "disabled",
    gap_tags: ["follow_up_depends_on_memory", "status_not_updated"],
    clarification_answers: {
      owner: "Office manager",
      status_tracking: "QuickBooks and a shared inbox",
    },
    current_process_description: "",
  });

  assert.equal(diagnostics.reportConfidence.level, "Medium");
  assert.match(diagnostics.reportConfidence.reason, /no audio narration/i);
  assert.ok(
    diagnostics.couldNotConfirm.some((item) => /customer confirmation/i.test(item)),
    "missing customer confirmation is surfaced",
  );
  assert.ok(
    diagnostics.currentStateMap.nodes.some((node) => node.type === "decision"),
    "current map includes decision nodes",
  );
  assert.ok(
    diagnostics.currentStateMap.nodes.some((node) => node.type === "leak" && node.severity === "high"),
    "current map includes high-severity leak nodes",
  );
  assert.equal(diagnostics.aiRecommendation.name, "Invoice Follow-Up Agent");
});

test("diagnostics gives high confidence when recording, audio, tags, and answers are present", () => {
  const diagnostics = createWorkflowDiagnostics({
    company_name: "COE Handyman Services",
    main_leak: "scheduling",
    process_name: "Scheduling request workflow",
    recording_status: "recorded_upload_pending",
    audio_status: "enabled",
    gap_tags: ["customers_ask_more_than_once"],
    clarification_answers: {
      owner: "Dispatcher",
      status_tracking: "ServiceTitan",
      follow_up: "Dispatcher texts customer same day",
      customer_confirmation: "Yes, text confirmation",
      reminders: "Automated reminders",
    },
    current_process_description: "Customer requests a slot, dispatcher confirms, ServiceTitan is updated.",
  });

  assert.equal(diagnostics.reportConfidence.level, "High");
  assert.match(diagnostics.reportConfidence.reason, /audio narration/i);
  assert.equal(diagnostics.aiRecommendation.name, "Scheduling Assistant");
  assert.ok(diagnostics.futureStateMap.nodes.some((node) => node.type === "automation"));
});

test("clarification questions stay lightweight and prioritize missing audio context", () => {
  const questions = getClarificationQuestions({
    audio_status: "blocked",
    software_used: "",
    gap_tags: ["follow_up_depends_on_memory"],
    clarification_answers: {},
  });

  assert.ok(questions.length >= 2);
  assert.ok(questions.length <= 5);
  assert.equal(questions[0].id, "summary");
  assert.ok(questions.some((question) => question.id === "status_tracking"));
});
