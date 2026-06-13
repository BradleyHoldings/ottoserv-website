import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";

const source = await readFile(join(process.cwd(), "src/lib/dashboardAdminSession.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { readDashboardAdminSession, readDashboardUserSession } = await import(moduleUrl);

test("accepts only the real super admin cookie shape", () => {
  const session = readDashboardAdminSession(
    "super_admin_token",
    JSON.stringify({
      id: "jonathan-bradley",
      email: "jonathan@ottoservco.com",
      name: "Jonathan Bradley",
      role: "super_admin",
      isOttoServEmployee: true,
      clientAccess: ["all"],
      permissions: ["system_admin"],
    }),
  );

  assert.deepEqual(session, {
    email: "jonathan@ottoservco.com",
    name: "Jonathan Bradley",
  });
});

test("rejects browser-only or non-admin state", () => {
  assert.equal(readDashboardAdminSession(undefined, undefined), null);
  assert.equal(readDashboardAdminSession("super_admin_token", undefined), null);
  assert.equal(
    readDashboardAdminSession(
      "demo_token",
      JSON.stringify({
        id: "demo-user",
        email: "demo@ottoserv.com",
        name: "Demo User",
        role: "demo",
        isOttoServEmployee: false,
        clientAccess: ["demo-clients"],
        permissions: ["view_demo_data"],
      }),
    ),
    null,
  );
});

test("accepts non-admin users as normal cookie-backed sessions only", () => {
  const session = readDashboardUserSession(
    "demo_token",
    JSON.stringify({
      id: "demo-user",
      email: "demo@ottoserv.com",
      name: "Demo User",
      role: "demo",
      isOttoServEmployee: false,
      clientAccess: ["demo-clients"],
      permissions: ["view_demo_data"],
    }),
  );

  assert.equal(session?.email, "demo@ottoserv.com");
  assert.equal(session?.role, "demo");
  assert.equal(readDashboardAdminSession("demo_token", JSON.stringify(session)), null);
});
