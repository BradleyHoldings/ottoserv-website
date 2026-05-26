import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const homepage = readFileSync(join(root, "src", "app", "page.tsx"), "utf8");
const navbar = readFileSync(join(root, "src", "components", "Navbar.tsx"), "utf8");

test("homepage makes the free leak check the primary hero CTA", () => {
  const hero = homepage.slice(
    homepage.indexOf("{/* Hero */}"),
    homepage.indexOf("{/* Audience Strip */}"),
  );
  const leakCheckIndex = hero.indexOf("Get a Free Front Office Leak Check");
  const pilotIndex = hero.indexOf("Start the 30-Day Pilot");

  assert.ok(leakCheckIndex > -1, "free leak check CTA is present");
  assert.ok(pilotIndex > -1, "pilot CTA is present");
  assert.ok(leakCheckIndex < pilotIndex, "free leak check appears before pilot CTA");
  assert.match(
    homepage,
    /Takes 5 minutes\. We review your call handling, lead response,\s+after-hours coverage, and follow-up process\./,
  );
});

test("homepage includes compact audience strip and featured playbook block", () => {
  assert.match(homepage, /Built for:/);
  assert.match(homepage, /THE OTTOSERV OS PLAYBOOK/);
  assert.match(homepage, /See How OttoServ Becomes Your Business OS/);
  assert.match(homepage, /Watch the Playbook/);
});

test("navbar exposes cold-visitor labels without breaking existing routes", () => {
  for (const label of [
    "Front Desk AI",
    "Process Audit",
    "Playbook",
    "How It Works",
    "Industries",
    "About",
    "Contact",
    "Book a Call",
  ]) {
    assert.match(navbar, new RegExp(label));
  }
});
