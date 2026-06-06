import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const script = path.resolve("scripts/phase1-lead-core.mjs");

async function runCli(payload, args = []) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "phase1-core-"));
  const input = path.join(dir, "input.json");
  await fs.writeFile(input, JSON.stringify(payload), "utf8");
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [script, "--input", input, "--now", "2026-06-06T18:30:00.000Z", ...args],
      { cwd: process.cwd(), env: { ...process.env } },
    );
    assert.equal(stderr, "");
    return JSON.parse(stdout);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("CLI produces internal-only output", async () => {
  const result = await runCli({ leads: [{
    company_name: "Safe Plumbing",
    phone: "407-222-0198",
    website: "https://safeplumbing.com",
    source_url: "https://google.com/maps/safe-plumbing",
    city: "Orlando",
    state: "FL",
  }] });
  assert.equal(result.mode, "internal_no_outreach");
  assert.equal(result.external_actions_taken, false);
  assert.equal(result.production_systems_touched, false);
  assert.equal(result.summary.email_or_call_actions, 0);
  assert.equal(result.summary.accepted_unique, 1);
});

test("CLI collapses duplicates and creates one enrichment task", async () => {
  const result = await runCli([
    {
      company_name: "Research Roofing",
      website: "https://researchroofing.com",
      source_url: "https://linkedin.com/company/research-roofing",
      city: "Tampa",
      state: "FL",
    },
    {
      company_name: "Research Roofing LLC",
      website: "researchroofing.com/contact",
      source_url: "https://bbb.org/research-roofing",
      city: "Tampa",
      state: "FL",
    },
  ]);
  assert.equal(result.summary.accepted_unique, 1);
  assert.equal(result.summary.duplicates, 1);
  assert.equal(result.summary.enrichment_tasks, 1);
  assert.equal(result.enrichment_tasks[0].external_outreach_allowed, false);
});

test("CLI detects a duplicate against an existing file", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "phase1-existing-"));
  const existing = path.join(dir, "existing.json");
  await fs.writeFile(existing, JSON.stringify([{
    company_name: "Existing Electric",
    phone: "321-222-0199",
    website: "https://existingelectric.com",
    source_url: "https://google.com/maps/existing-electric",
    city: "Cocoa",
    state: "FL",
  }]), "utf8");
  try {
    const result = await runCli([{
      company_name: "Existing Electric Inc",
      phone: "+1 321 222 0199",
      source_url: "https://bbb.org/existing-electric",
      city: "Cocoa",
      state: "FL",
    }], ["--existing", existing]);
    assert.equal(result.summary.accepted_unique, 0);
    assert.equal(result.summary.duplicates, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
