import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { ENRICHMENT_STATUS } from "../src/lib/leadRail/eligibility.mjs";
import { buildEnrichmentTask, ingestEnrichmentResult } from "../src/lib/leadRail/enrichment.mjs";
import { deriveLeadId } from "../src/lib/leadRail/identity.mjs";
import { LEAD_SCHEMA_VERSION } from "../src/lib/leadRail/schema.mjs";
import { runLeadIntakeEnrichment } from "../src/lib/leadRail/pipeline.mjs";

const NOW = "2026-06-06T12:00:00.000Z";

let tmpCounter = 0;
async function tmpDirs() {
  const base = path.join(os.tmpdir(), `lead-rail-consolidation-${process.pid}-${Date.now()}-${tmpCounter++}`);
  const tasksDir = path.join(base, "tasks");
  const dataDir = path.join(base, "data");
  await fs.mkdir(tasksDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });
  return { tasksDir, dataDir };
}

function fakeClient(initial = []) {
  const store = new Map((initial || []).map((lead) => [lead.lead_id, JSON.parse(JSON.stringify(lead))]));
  return {
    store,
    async read(id) {
      return store.has(id) ? JSON.parse(JSON.stringify(store.get(id))) : null;
    },
    async write(row) {
      store.set(row.raw_payload.lead_id, JSON.parse(JSON.stringify(row.raw_payload)));
      return { ok: true };
    },
    async readBack(id) {
      return store.has(id) ? JSON.parse(JSON.stringify(store.get(id))) : null;
    },
  };
}

const leadRow = (over = {}) => ({
  company_name: "Cascade Plumbing Co",
  website: "https://cascadeplumbing.com",
  phone: "(206) 824-1107",
  email: "office@cascadeplumbing.com",
  city: "Seattle",
  state: "WA",
  industry: "plumbing",
  source_url: "https://www.reddit.com/r/smallbusiness/comments/cascade/",
  evidence_snippet: "We keep missing calls after 5pm.",
  intent_type: "missed_call_or_response_issue",
  ...over,
});

async function realRailLead(row = leadRow()) {
  const dirs = await tmpDirs();
  const client = fakeClient();
  const result = await runLeadIntakeEnrichment(
    { rows: [row], source: { source_url: "consolidation-test" }, now: NOW },
    { ...dirs, skipStoreRead: true, store: { client }, skipLocal: true },
  );
  assert.equal(result.final_status, "completed");
  assert.equal(result.upserts.length, 1);
  return result.upserts[0];
}

function readJson(file) {
  return JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
}

function validateJsonSchema(schema, value, at = "$") {
  const errors = [];
  const add = (message) => errors.push(`${at}: ${message}`);

  if (schema.const !== undefined && value !== schema.const) add(`expected const ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) add(`expected one of ${schema.enum.join(", ")}`);
  if (schema.pattern && typeof value === "string" && !new RegExp(schema.pattern).test(value)) add(`pattern ${schema.pattern} did not match ${value}`);

  const type = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (type.length && !type.some((t) => matchesType(t, value))) add(`expected type ${type.join("|")}`);

  if (schema.type === "object" || (value && typeof value === "object" && !Array.isArray(value) && schema.properties)) {
    const required = schema.required || [];
    for (const key of required) if (value?.[key] === undefined) errors.push(`${at}.${key}: required`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value || {})) {
        if (!schema.properties?.[key]) errors.push(`${at}.${key}: additional property`);
      }
    }
    for (const [key, child] of Object.entries(schema.properties || {})) {
      if (value?.[key] !== undefined) errors.push(...validateJsonSchema(child, value[key], `${at}.${key}`));
    }
  }

  if (schema.type === "array" || Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) add(`expected at least ${schema.minItems} items`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) add("expected unique items");
    if (schema.items) {
      value.forEach((item, index) => errors.push(...validateJsonSchema(schema.items, item, `${at}[${index}]`)));
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) add(`expected >= ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) add(`expected <= ${schema.maximum}`);
  }

  return errors;
}

function matchesType(type, value) {
  if (type === "array") return Array.isArray(value);
  if (type === "object") return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "null") return value === null;
  return typeof value === type;
}

test("machine-readable canonical lead schema validates real rail output", async () => {
  const schema = readJson("../docs/contracts/canonical-lead.schema.json");
  const lead = await realRailLead();

  assert.equal(lead.schema_version, LEAD_SCHEMA_VERSION);
  assert.match(lead.lead_id, /^lid_v1_[a-f0-9]{16}$/);
  assert.equal(lead.external_outreach_allowed, false);

  const errors = validateJsonSchema(schema, lead);
  assert.deepEqual(errors, []);
});

test("machine-readable enrichment result schema validates real rail ingestion output", () => {
  const schema = readJson("../docs/contracts/enrichment-result.schema.json");
  const lead = {
    lead_id: "lid_v1_0123456789abcdef",
    company_name: "Harborview PM",
    website: "https://harborviewpm.com",
    contact_validation: {},
  };
  const task = buildEnrichmentTask(lead, { now: NOW });
  const result = ingestEnrichmentResult(
    lead,
    task,
    { email: "leasing@harborviewpm.com", source_url: "https://harborviewpm.com/team", actor: "Cowork" },
    { now: NOW },
  );

  assert.equal(result.ok, true);
  const contract = {
    schema_version: LEAD_SCHEMA_VERSION,
    task_id: result.task.task_id,
    lead_id: result.lead.lead_id,
    idempotency_key: result.task.idempotency_key,
    status: result.task.status,
    actor: result.task.result_evidence.actor,
    validated_at: result.task.result_evidence.validated_at,
    source_url: result.task.result_evidence.source_url,
    normalized_phone: result.lead.normalized_phone || "",
    email: result.lead.email || "",
    confidence: result.task.result_evidence.confidence,
    external_outreach_allowed: false,
  };

  assert.equal(contract.status, ENRICHMENT_STATUS.COMPLETED);
  const errors = validateJsonSchema(schema, contract);
  assert.deepEqual(errors, []);
});

test("legacy import compatibility derives IDs from the canonical rail identity", async () => {
  const mod = await import("../src/lib/outreach/leadImport.mjs");
  const rows = [
    leadRow({ company_name: "Cascade Plumbing Co", website: "https://cascadeplumbing.com/contact" }),
    leadRow({ company_name: "Summit Air", website: "https://summitair.com", email: "ops@summitair.com", phone: "" }),
  ];
  const a = mod.importLeadRows(rows, [], false);
  const b = mod.importLeadRows([...rows].reverse(), [], false);

  assert.deepEqual(a.imported.map((lead) => lead.lead_id).sort(), b.imported.map((lead) => lead.lead_id).sort());
  assert.equal(a.imported[0].lead_id, deriveLeadId({ website: "https://cascadeplumbing.com/contact" }));

  const repeated = mod.importLeadRows(rows, a.imported, false);
  assert.equal(repeated.accepted_count, 0);
  assert.equal(repeated.duplicate_count, 2);
});

test("migrated routes and adapters do not retain a duplicate lead implementation", async () => {
  const files = [
    "src/app/calls/import/route.ts",
    "src/app/calls/outcomes/route.ts",
    "src/app/calls/jarvis-packets/route.ts",
    "src/app/api/leads/capture/route.ts",
    "src/app/api/audit/request/route.ts",
    "src/lib/outreach/leadImport.ts",
    "src/lib/outreach/leadImport.mjs",
  ];

  const text = files.map((file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")).join("\n");
  assert.ok(text.includes("leadRail"), "compatibility layer should route through leadRail");
  assert.ok(!/canonicalLeadCore|leadImportV2/.test(text), "draft PR alternate implementations must not remain");
  assert.ok(!/stableLeadId|lead_id:\s*`?lead_|lead_id:\s*.*Date\.now|lead_id:\s*.*Math\.random/.test(text), "legacy row/time/random lead IDs must not remain");
});
