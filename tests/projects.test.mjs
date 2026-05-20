import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProject,
  filterProjects,
  getProjectInsights,
  getProjectSummary,
  validateProjectInput,
} from "../src/lib/projects.mjs";

test("validates required project fields", () => {
  const result = validateProjectInput({
    projectName: "",
    clientName: "",
    projectType: "",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ["projectName", "clientName", "projectType"]);
});

test("builds a project with safe financials and optional milestones", () => {
  const project = buildProject(
    {
      projectName: "Kitchen Remodel",
      clientName: "Avery Stone",
      projectType: "Remodel",
      status: "planning",
      contractValue: 50000,
      estimatedCost: 35000,
      actualCost: 10000,
      createDefaultMilestones: true,
    },
    { sequence: 12, now: "2026-05-20T12:00:00.000Z" },
  );

  assert.equal(project.id, "PRJ-2026-00012");
  assert.equal(project.projectName, "Kitchen Remodel");
  assert.equal(project.grossProfit, 40000);
  assert.equal(project.marginPercent, 80);
  assert.equal(project.status, "planning");
  assert.equal(project.milestones.length > 0, true);
  assert.equal(project.activity[0].title, "Project created");
});

test("summarizes project portfolio metrics", () => {
  const projects = [
    buildProject({ projectName: "A", clientName: "Client A", projectType: "Repair", status: "in_progress", contractValue: 10000, estimatedCost: 6000, actualCost: 3000, openWorkOrders: 2 }, { sequence: 1, now: "2026-05-20T12:00:00.000Z" }),
    buildProject({ projectName: "B", clientName: "Client B", projectType: "Maintenance", status: "complete", contractValue: 5000, estimatedCost: 3000, actualCost: 2800, riskStatus: "healthy" }, { sequence: 2, now: "2026-05-20T12:00:00.000Z" }),
    buildProject({ projectName: "C", clientName: "Client C", projectType: "Inspection", status: "on_hold", contractValue: 2000, estimatedCost: 1000, actualCost: 1500, riskStatus: "over_budget" }, { sequence: 3, now: "2026-05-20T12:00:00.000Z" }),
  ];

  const summary = getProjectSummary(projects);
  assert.equal(summary.activeProjects, 1);
  assert.equal(summary.totalContractValue, 17000);
  assert.equal(summary.estimatedCost, 10000);
  assert.equal(summary.actualCost, 7300);
  assert.equal(summary.openWorkOrders, 2);
  assert.equal(summary.projectsAtRisk, 1);
});

test("filters projects by status and search query", () => {
  const projects = [
    buildProject({ projectName: "Kitchen Remodel", clientName: "Avery", projectType: "Remodel", status: "in_progress", address: "10 Oak" }, { sequence: 1 }),
    buildProject({ projectName: "Roof Repair", clientName: "Blake", projectType: "Repair", status: "planning", address: "20 Pine" }, { sequence: 2 }),
  ];

  assert.equal(filterProjects(projects, { status: "in_progress", search: "" }).length, 1);
  assert.equal(filterProjects(projects, { status: "all", search: "pine" }).length, 1);
  assert.equal(filterProjects(projects, { status: "all", search: "remodel" }).length, 1);
});

test("generates simple project insight flags", () => {
  const project = buildProject(
    {
      projectName: "Late Low Margin Job",
      clientName: "Client",
      projectType: "Repair",
      status: "in_progress",
      targetCompletionDate: "2026-05-01",
      contractValue: 10000,
      estimatedCost: 7000,
      actualCost: 8500,
      openWorkOrders: 0,
      updatedAt: "2026-05-01T12:00:00.000Z",
    },
    { sequence: 1, now: "2026-05-01T12:00:00.000Z" },
  );

  const insights = getProjectInsights(project, "2026-05-20T12:00:00.000Z").map((item) => item.title);
  assert.equal(insights.includes("Project is over budget"), true);
  assert.equal(insights.includes("Project is past target completion"), true);
  assert.equal(insights.includes("No work orders linked"), true);
  assert.equal(insights.includes("Project may need follow-up"), true);
  assert.equal(insights.includes("Low margin"), true);
});
