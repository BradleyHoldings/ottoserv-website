import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCommandCenterData,
  getJarvisCommandCenterResponse,
  isOttoServAdmin,
} from "../src/lib/commandCenter.mjs";

test("builds safe zero-state command center data", () => {
  const data = buildCommandCenterData({}, { role: "client_owner" });

  assert.equal(data.kpis.length, 8);
  assert.equal(data.kpis.some((kpi) => kpi.id === "revenueRepairs"), true);
  assert.equal(data.kpis.find((kpi) => kpi.id === "activeTasks").value, 0);
  assert.equal(data.snapshot.leadsToFollowUp.items.length, 0);
  assert.equal(data.alerts.length, 0);
  assert.equal(data.approvals.length, 0);
  assert.equal(data.recentActivity.length, 0);
  assert.equal(data.leadHealth.mode, "client");
  assert.match(data.jarvisBrief.emptyMessage, /Everything looks clear/);
});

test("computes actionable counts from raw dashboard collections", () => {
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const data = buildCommandCenterData(
    {
      tasks: [
        { id: "t1", title: "Call Sarah", status: "active", due_date: today, priority: "high" },
        { id: "t2", title: "Send quote", status: "overdue", due_date: yesterday, priority: "urgent" },
      ],
      leads: [
        { id: "l1", name: "Sarah Mitchell", status: "new", service_needed: "HVAC", created_at: today },
        { id: "l2", name: "Won Client", status: "won", service_needed: "Roofing", created_at: today },
      ],
      calls: [{ id: "c1", contact: "Sarah", status: "completed", outcome: "Connected", created_at: today }],
      invoices: [{ id: "i1", client_name: "Sarah", status: "overdue", amount: 1200 }],
      workOrders: [{ id: "wo1", title: "Install", status: "open" }],
      approvals: [{ id: "a1", type: "AI draft", title: "Follow-up email", created_at: today }],
    },
    { role: "client_owner" },
  );

  assert.equal(data.kpis.find((kpi) => kpi.id === "activeTasks").value, 1);
  assert.equal(data.kpis.find((kpi) => kpi.id === "overdueTasks").value, 1);
  assert.equal(data.kpis.find((kpi) => kpi.id === "newLeads").value, 1);
  assert.equal(data.kpis.find((kpi) => kpi.id === "callsToday").value, 1);
  assert.equal(data.kpis.find((kpi) => kpi.id === "openWorkOrders").value, 1);
  assert.equal(data.alerts.some((alert) => alert.type === "overdue_task"), true);
  assert.equal(data.alerts.some((alert) => alert.type === "invoice_overdue"), true);
  assert.equal(data.recentActivity.length > 0, true);
});

test("admin role sees platform lead supply mode", () => {
  assert.equal(isOttoServAdmin({ role: "ottoserv_admin" }), true);

  const data = buildCommandCenterData(
    { leadSupply: { targetPerDay: 200, attained: 45, totalsToday: { calls: 60, failed: 2, blocked: 3 }, dedupBlocked: 3 } },
    { role: "ottoserv_admin" },
  );

  assert.equal(data.leadHealth.mode, "platform");
  assert.equal(data.leadHealth.targetPerDay, 200);
});

test("Jarvis response returns structured task suggestions", () => {
  const response = getJarvisCommandCenterResponse("Summarize overdue tasks.", {
    alerts: [{ title: "Send quote overdue", severity: "high" }],
  });

  assert.match(response.message, /overdue/i);
  assert.equal(response.suggestedTask.title.length > 0, true);
});
