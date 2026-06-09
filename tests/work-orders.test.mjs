import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorkOrder,
  filterWorkOrders,
  getWorkOrderSummary,
  updateWorkOrderStatus,
  validateWorkOrderInput,
  WORK_ORDER_COLUMNS,
} from "../src/lib/workOrders.mjs";

test("validates required work order fields", () => {
  const result = validateWorkOrderInput({
    title: "",
    client: "",
    property: "",
    description: "",
    priority: "",
    category: "",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ["title", "client", "property", "description", "priority", "category"]);
});

test("builds work order with approval-aware default status and activity", () => {
  const workOrder = buildWorkOrder(
    {
      title: "Leak under sink",
      client: "Acme Properties",
      property: "River House",
      description: "Tenant reports active leak.",
      priority: "high",
      category: "Plumbing",
      approvalRequired: true,
      approvalStatus: "pending",
      automationOptions: {
        aiSummary: true,
        aiPriority: true,
        notifyTenant: true,
      },
    },
    { sequence: 47, now: "2026-05-20T10:00:00.000Z", actor: "Avery" },
  );

  assert.equal(workOrder.id, "WO-2026-00047");
  assert.equal(workOrder.status, "needs_approval");
  assert.equal(workOrder.activityLog[0].action, "Work order created");
  assert.equal(workOrder.automationActivity.includes("AI summary pending"), true);
  assert.equal(workOrder.automationActivity.includes("Tenant notification queued"), true);
});

test("scheduled date sets scheduled default status when approval is not blocking", () => {
  const workOrder = buildWorkOrder(
    {
      title: "Filter change",
      client: "Acme Properties",
      property: "River House",
      description: "Quarterly HVAC filter service.",
      priority: "low",
      category: "HVAC",
      scheduledDate: "2026-05-20",
      approvalRequired: false,
    },
    { sequence: 2, now: "2026-05-20T10:00:00.000Z" },
  );

  assert.equal(workOrder.status, "scheduled");
});

test("updates status with activity log entry", () => {
  const workOrder = buildWorkOrder(
    {
      title: "Broken outlet",
      client: "Acme Properties",
      property: "River House",
      description: "Outlet sparks when used.",
      priority: "emergency",
      category: "Electrical",
    },
    { sequence: 3, now: "2026-05-20T10:00:00.000Z" },
  );

  const updated = updateWorkOrderStatus(workOrder, "completed", "Avery", "Closed with photos.");

  assert.equal(updated.status, "completed");
  assert.equal(updated.activityLog[0].action, "Status changed to Completed");
  assert.equal(updated.activityLog[0].detail, "Closed with photos.");
});

test("summaries and filters are safe and useful", () => {
  const orders = [
    buildWorkOrder({ title: "A", client: "A Client", property: "One", description: "A", priority: "emergency", category: "Plumbing", dueDate: "2026-05-19" }, { sequence: 1, now: "2026-05-20T10:00:00.000Z" }),
    buildWorkOrder({ title: "B", client: "B Client", property: "Two", description: "B", priority: "medium", category: "HVAC", scheduledDate: "2026-05-20", estimatedCost: 500 }, { sequence: 2, now: "2026-05-20T10:00:00.000Z" }),
    updateWorkOrderStatus(buildWorkOrder({ title: "C", client: "C Client", property: "Three", description: "C", priority: "low", category: "Cleaning" }, { sequence: 3, now: "2026-05-19T10:00:00.000Z" }), "completed", "OttoServ", "", { now: "2026-05-20T10:00:00.000Z" }),
  ];

  const summary = getWorkOrderSummary(orders, "2026-05-20T12:00:00.000Z");
  assert.equal(summary.open, 2);
  assert.equal(summary.urgentOverdue, 2);
  assert.equal(summary.scheduledToday, 1);
  assert.equal(summary.completedThisWeek, 1);
  assert.equal(summary.estimatedApprovedSpend, 500);

  const filtered = filterWorkOrders(orders, { priority: "emergency", overdueOnly: true, search: "client" }, "2026-05-20T12:00:00.000Z");
  assert.equal(filtered.length, 1);
});

test("kanban columns match work order execution workflow", () => {
  assert.deepEqual(WORK_ORDER_COLUMNS.map((column) => column.id), [
    "new",
    "needs_approval",
    "scheduled",
    "in_progress",
    "waiting_on_parts",
    "ready_for_review",
    "completed",
  ]);
});
