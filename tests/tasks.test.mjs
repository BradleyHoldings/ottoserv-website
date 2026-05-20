import assert from "node:assert/strict";
import test from "node:test";

import {
  approveTask,
  archiveTask,
  assignTask,
  buildTask,
  createTaskFromSuggestion,
  filterTasks,
  getTaskSummary,
  isTaskOverdue,
  markTaskDone,
  rejectTask,
  snoozeTask,
  startTask,
  validateTaskInput,
} from "../src/lib/tasks.mjs";

const NOW = "2026-05-20T12:00:00.000Z";

test("validates that task title is required", () => {
  assert.deepEqual(validateTaskInput({ title: "  " }), { valid: false, missing: ["title"] });
  assert.deepEqual(validateTaskInput({ title: "Call client" }), { valid: true, missing: [] });
});

test("builds approval task with pending approval status", () => {
  const task = buildTask(
    {
      title: "Review AI email",
      approvalRequired: true,
      type: "approval",
      relatedRecordType: "crm",
      relatedRecordLabel: "Sandra Okafor",
    },
    { now: NOW, sequence: 7, actor: "Jarvis" },
  );

  assert.equal(task.id, "TSK-2026-00007");
  assert.equal(task.status, "needs_approval");
  assert.equal(task.approvalStatus, "pending");
  assert.equal(task.source, "manual");
  assert.equal(task.activityLog[0].action, "Task created");
});

test("detects overdue tasks from due date while ignoring done and archived tasks", () => {
  const overdue = buildTask({ title: "Late", dueDate: "2026-05-19", status: "open" }, { now: NOW });
  const done = buildTask({ title: "Done late", dueDate: "2026-05-19", status: "done" }, { now: NOW });
  const archived = buildTask({ title: "Archived late", dueDate: "2026-05-19", status: "archived" }, { now: NOW });

  assert.equal(isTaskOverdue(overdue, NOW), true);
  assert.equal(isTaskOverdue(done, NOW), false);
  assert.equal(isTaskOverdue(archived, NOW), false);
});

test("summarizes open, due today, overdue, and approval tasks", () => {
  const tasks = [
    buildTask({ title: "Open", status: "open", dueDate: "2026-05-22" }, { now: NOW }),
    buildTask({ title: "Today", status: "in_progress", dueDate: "2026-05-20" }, { now: NOW }),
    buildTask({ title: "Late", status: "waiting", dueDate: "2026-05-19" }, { now: NOW }),
    buildTask({ title: "Approval", approvalRequired: true }, { now: NOW }),
  ];

  assert.deepEqual(getTaskSummary(tasks, NOW), {
    openTasks: 4,
    dueToday: 1,
    overdue: 1,
    needsApproval: 1,
  });
});

test("filters tasks by status, priority, type, source, visibility, assignee, query, project, and overdue", () => {
  const tasks = [
    buildTask({
      title: "Follow up lead",
      description: "Call Acme",
      status: "open",
      priority: "high",
      type: "lead_follow_up",
      source: "otto",
      visibility: "client_visible",
      assignedTo: "Avery",
      projectId: "PRJ-1",
      relatedRecordLabel: "Acme Lead",
      dueDate: "2026-05-19",
    }, { now: NOW }),
    buildTask({
      title: "Internal automation review",
      status: "done",
      priority: "low",
      type: "automation",
      source: "automation",
      visibility: "internal",
      assignedTo: "Ops",
      projectId: "PRJ-2",
      dueDate: "2026-05-21",
    }, { now: NOW }),
  ];

  const filtered = filterTasks(tasks, {
    status: "overdue",
    priority: "high",
    type: "lead_follow_up",
    source: "otto",
    visibility: "client_visible",
    assignedTo: "Avery",
    projectId: "PRJ-1",
    search: "acme",
  }, NOW);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, "Follow up lead");
});

test("task actions update state and append activity", () => {
  const task = buildTask({ title: "Schedule tech", assignedTo: "Avery" }, { now: NOW });

  const started = startTask(task, "Ops");
  assert.equal(started.status, "in_progress");
  assert.equal(started.activityLog[0].action, "Task started");

  const assigned = assignTask(started, "Morgan", "Ops");
  assert.equal(assigned.assignedTo, "Morgan");
  assert.equal(assigned.activityLog[0].action, "Assigned to Morgan");

  const snoozed = snoozeTask(assigned, "2026-05-27", "Ops");
  assert.equal(snoozed.dueDate, "2026-05-27");
  assert.equal(snoozed.activityLog[0].action, "Task snoozed");

  const done = markTaskDone(snoozed, "Ops", NOW);
  assert.equal(done.status, "done");
  assert.equal(done.completedAt, NOW);
  assert.equal(done.completedBy, "Ops");

  const archived = archiveTask(done, "Ops");
  assert.equal(archived.status, "archived");
  assert.equal(archived.activityLog[0].action, "Task archived");
});

test("approval and rejection task flows record outcomes", () => {
  const task = buildTask({ title: "Approve invoice", approvalRequired: true, type: "invoice" }, { now: NOW });

  const approved = approveTask(task, "Owner");
  assert.equal(approved.approvalStatus, "approved");
  assert.equal(approved.status, "open");

  const rejected = rejectTask(task, "Needs corrected amount", "Owner");
  assert.equal(rejected.approvalStatus, "rejected");
  assert.equal(rejected.status, "waiting");
  assert.equal(rejected.rejectionReason, "Needs corrected amount");
});

test("creates normal Otto-sourced task from suggestion", () => {
  const task = createTaskFromSuggestion({
    title: "Review overdue work order",
    reason: "Work order has been waiting for 48 hours",
    type: "work_order",
    priority: "high",
    relatedRecordType: "work-orders",
    relatedRecordLabel: "WO-2026-00042",
  }, { now: NOW, actor: "Otto" });

  assert.equal(task.source, "otto");
  assert.equal(task.status, "open");
  assert.equal(task.description.includes("Work order has been waiting"), true);
  assert.equal(task.activityLog[0].action, "Suggested task accepted");
});
