#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

import {
  buildEnrichmentTask,
  dedupeCanonicalLeads,
  toCanonicalLead,
} from "../src/lib/leads/canonicalLeadCore.mjs";

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

async function readStdin() {
  let body = "";
  for await (const chunk of process.stdin) body += chunk;
  return body;
}

function coerceRows(payload) {
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === "object");
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.leads)) return payload.leads.filter((item) => item && typeof item === "object");
    if (Array.isArray(payload.records)) return payload.records.filter((item) => item && typeof item === "object");
    return [payload];
  }
  return [];
}

async function readJson(file, fallback = []) {
  if (!file) return fallback;
  const text = await fs.readFile(file, "utf8");
  return JSON.parse(text);
}

async function main() {
  const inputFile = argValue("--input");
  const existingFile = argValue("--existing");
  const outputFile = argValue("--output");
  const now = argValue("--now") || new Date().toISOString();

  const rawText = inputFile ? await fs.readFile(inputFile, "utf8") : await readStdin();
  if (!rawText.trim()) throw new Error("Provide JSON through --input or stdin.");

  const incoming = coerceRows(JSON.parse(rawText));
  const existing = coerceRows(await readJson(existingFile, []));
  const canonicalIncoming = incoming.map((row) => toCanonicalLead(row, { now }));
  const canonicalExisting = existing.map((row) => row.schema_version ? row : toCanonicalLead(row, { now }));
  const { accepted, duplicates } = dedupeCanonicalLeads(canonicalIncoming, canonicalExisting);

  const rejected = accepted.filter((lead) => lead.record_status === "rejected");
  const quarantined = accepted.filter((lead) => lead.record_status === "quarantined");
  const active = accepted.filter((lead) => lead.record_status === "active");
  const enrichmentTasks = accepted.map((lead) => buildEnrichmentTask(lead, { now })).filter(Boolean);

  const result = {
    generated_at: now,
    mode: "internal_no_outreach",
    external_actions_taken: false,
    production_systems_touched: false,
    summary: {
      rows_seen: incoming.length,
      accepted_unique: accepted.length,
      active: active.length,
      quarantined: quarantined.length,
      rejected: rejected.length,
      duplicates: duplicates.length,
      enrichment_tasks: enrichmentTasks.length,
      email_or_call_actions: 0,
    },
    accepted,
    duplicates,
    quarantine: quarantined,
    rejected,
    enrichment_tasks: enrichmentTasks,
  };

  const rendered = `${JSON.stringify(result, null, 2)}\n`;
  if (outputFile) {
    await fs.mkdir(path.dirname(path.resolve(outputFile)), { recursive: true });
    await fs.writeFile(outputFile, rendered, "utf8");
  } else {
    process.stdout.write(rendered);
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ ok: false, error: String(error?.message || error), external_actions_taken: false })}\n`);
  process.exit(1);
});
