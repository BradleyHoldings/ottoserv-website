import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { importTs } from "./helpers/import-ts.mjs";

const {
  buildPilotStartConversion,
  listPilotStartConversions,
  savePilotStartConversion,
  validatePilotStartInput,
} = await importTs("src/lib/processScanConversions.ts");

test("pilot start input requires contact details and consent", () => {
  assert.equal(validatePilotStartInput({ email: "bad", consent_to_contact: true }), "Please enter a valid email address.");
  assert.equal(
    validatePilotStartInput({ name: "Maya", email: "maya@example.com", company: "Harbor", workflow: "Lead intake" }),
    "Consent to contact is required before we can start the pilot path.",
  );
  assert.equal(
    validatePilotStartInput({ name: "Maya", email: "maya@example.com", company: "Harbor", workflow: "Lead intake", consent_to_contact: true }),
    null,
  );
});

test("pilot start conversion persists locally when Supabase is unavailable", async () => {
  const previousCwd = process.cwd();
  const dir = await mkdtemp(join(tmpdir(), "ottoserv-conversions-"));
  process.chdir(dir);
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;

  try {
    const conversion = buildPilotStartConversion({
      scan_id: "ps_123",
      name: "Maya Lee",
      email: "maya@harborpoint.example",
      company: "Harbor Point PM",
      phone: "555-111-2222",
      workflow: "Lead Intake Agent",
      preferred_start_date: "2026-06-15",
      notes: "Need after-hours coverage first.",
      consent_to_contact: true,
    });
    const saved = await savePilotStartConversion(conversion);
    const rows = await listPilotStartConversions();

    assert.equal(saved.storage, "local");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].scan_id, "ps_123");
    assert.equal(rows[0].event_type, "pilot_start_requested");
    assert.equal(rows[0].consent_to_contact, true);
  } finally {
    process.chdir(previousCwd);
    if (previousUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey) process.env.SUPABASE_SERVICE_KEY = previousKey;
    await rm(dir, { recursive: true, force: true });
  }
});

test("production pilot conversion does not silently use local filesystem as authoritative", async () => {
  const previousCwd = process.cwd();
  const dir = await mkdtemp(join(tmpdir(), "ottoserv-conversions-prod-"));
  process.chdir(dir);
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_KEY;
  const previousNodeEnv = process.env.NODE_ENV;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
  process.env.NODE_ENV = "production";

  try {
    const conversion = buildPilotStartConversion({
      scan_id: "ps_prod",
      name: "Maya Lee",
      email: "maya@harborpoint.example",
      company: "Harbor Point PM",
      workflow: "Lead Intake Agent",
      consent_to_contact: true,
    });
    const saved = await savePilotStartConversion(conversion);
    const rows = await listPilotStartConversions();

    assert.equal(saved.storage, "pending_supabase_configuration");
    assert.equal(saved.reason, "supabase_not_configured");
    assert.deepEqual(rows, []);
    assert.equal(existsSync(join(dir, "data", "process_scan_conversion_events.json")), false);
  } finally {
    process.chdir(previousCwd);
    if (previousUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey) process.env.SUPABASE_SERVICE_KEY = previousKey;
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    await rm(dir, { recursive: true, force: true });
  }
});
