import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const intake = readFileSync(join(root, "src", "components", "ProcessScanIntake.tsx"), "utf8");
const report = readFileSync(join(root, "src", "app", "front-office-leak-check", "report", "[slug]", "page.tsx"), "utf8");
const thankYou = readFileSync(join(root, "src", "app", "front-office-leak-check", "thank-you", "page.tsx"), "utf8");
const startPilot = readFileSync(join(root, "src", "app", "front-office-leak-check", "start-pilot", "page.tsx"), "utf8");
const adminDetail = readFileSync(join(root, "src", "app", "dashboard", "process-scans", "[id]", "page.tsx"), "utf8");

test("leak check intake explains recording, microphone, gap tags, and clarifications", () => {
  assert.match(intake, /Before You Record/);
  assert.match(intake, /Microphone: Enabled/);
  assert.match(intake, /Microphone: Blocked/);
  assert.match(intake, /What problems happen in this workflow today/);
  assert.match(intake, /We could not confirm a few things from the recording/);
  assert.match(intake, /not uploaded or stored durably yet/);
});

test("report renders structured diagnostics and no longer links pilot CTA to front desk landing page", () => {
  assert.match(report, /Report Confidence/);
  assert.match(report, /Observed from recording/);
  assert.match(report, /Could not confirm/);
  assert.match(report, /Current-State Flowchart/);
  assert.match(report, /Recommended Future-State Flowchart/);
  assert.match(report, /Revenue Risks/);
  assert.match(report, /Priority Ranking/);
  assert.match(report, /not uploaded or stored durably/);
  assert.match(report, /Full Process Audit/);
  assert.match(report, /front-office-leak-check\/start-pilot/);
  assert.doesNotMatch(report, /href="\/front-desk-ai"/);
});

test("thank-you pilot CTA opens direct pilot start path", () => {
  assert.match(thankYou, /front-office-leak-check\/start-pilot/);
  assert.doesNotMatch(thankYou, /href="\/front-desk-ai"/);
});

test("pilot start path persists conversion details and admin detail surfaces them", () => {
  assert.match(startPilot, /action="\/api\/process-scans\/start-pilot"/);
  assert.match(startPilot, /consent_to_contact/);
  assert.match(startPilot, /Full Process Audit/);
  assert.match(adminDetail, /Pilot Start Requests/);
  assert.match(adminDetail, /api\/process-scans\/start-pilot/);
  assert.match(adminDetail, /recorded_upload_pending means/);
});
