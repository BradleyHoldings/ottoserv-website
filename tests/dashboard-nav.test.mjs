import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  CREATE_ACTIONS,
  dashboardNavSections,
  filterNavSections,
  getDefaultOpenSections,
  getVisibleNavSections,
  isNavItemActive,
} from "../src/lib/dashboardNav.mjs";

test("client owners do not see OttoServ-only or gated admin links", () => {
  const sections = getVisibleNavSections({
    role: "client_owner",
    featureFlags: {},
  });
  const labels = sections.flatMap((section) => section.items.map((item) => item.label));

  assert.ok(labels.includes("CRM"));
  assert.ok(labels.includes("Financials"));
  assert.ok(!labels.includes("TechOps"));
  assert.ok(!labels.includes("Deployments"));
  assert.ok(!labels.includes("Platform Admin"));
  assert.ok(!labels.includes("AI Agents"));
  assert.ok(!labels.includes("Marketplace"));
});

test("OttoServ admins see internal and admin navigation", () => {
  const sections = getVisibleNavSections({
    role: "ottoserv_admin",
    featureFlags: {},
  });
  const labels = sections.flatMap((section) => section.items.map((item) => item.label));

  assert.ok(labels.includes("TechOps"));
  assert.ok(labels.includes("Deployments"));
  assert.ok(labels.includes("Platform Admin"));
  assert.ok(labels.includes("AI Agents"));
});

test("field workers only see field-friendly pages", () => {
  const sections = getVisibleNavSections({
    role: "field_worker",
    featureFlags: {},
  });
  const labels = sections.flatMap((section) => section.items.map((item) => item.label));

  assert.deepEqual(labels.sort(), [
    "Calendar",
    "Documents",
    "Materials",
    "Tasks",
    "Team / Labor",
    "Work Orders",
  ].sort());
});

test("active matching handles nested dashboard routes", () => {
  assert.equal(isNavItemActive("/dashboard/work-orders", "/dashboard/work-orders/new"), true);
  assert.equal(isNavItemActive("/dashboard/crm", "/dashboard/crm/contacts/123"), true);
  assert.equal(isNavItemActive("/dashboard/crm", "/dashboard/command-center"), false);
});

test("search filters visible sections by label and preserves group shape", () => {
  const sections = getVisibleNavSections({ role: "client_owner", featureFlags: {} });
  const filtered = filterNavSections(sections, "crm");

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].label, "Sales & Customers");
  assert.deepEqual(filtered[0].items.map((item) => item.label), ["CRM"]);
});

test("default open sections support first-run scanning", () => {
  assert.deepEqual(getDefaultOpenSections(), ["Command", "Sales & Customers", "Jobs & Operations"]);
});

test("ready nav links point at existing routes or explicit placeholders", () => {
  const appDir = join(process.cwd(), "src", "app");
  const allItems = dashboardNavSections.flatMap((section) => section.items);

  for (const item of allItems) {
    if (item.isComingSoon) continue;
    if (item.href.startsWith("/platform/")) continue;

    const routePath = item.href.replace(/^\//, "").replace(/\?.*$/, "");
    const routeDir = join(appDir, routePath);
    assert.equal(
      existsSync(join(routeDir, "page.tsx")) || existsSync(join(routeDir, "route.ts")),
      true,
      `${item.label} route is missing: ${item.href}`
    );
  }
});

test("create actions route safely to dashboard pages", () => {
  assert.ok(CREATE_ACTIONS.some((action) => action.label === "New Contact"));
  assert.ok(CREATE_ACTIONS.every((action) => action.href.startsWith("/dashboard/")));
});
