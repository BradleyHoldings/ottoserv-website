// Run Hermes browser research against seed leads and write the existing
// research-results.json contract. This performs research only; it never contacts.

import { promises as fs } from "node:fs";
import path from "node:path";

import { createBrowserProvider } from "../src/lib/hermesBrowserProvider.mjs";
import { researchSeedLeads } from "../src/lib/hermesBrowserResearch.mjs";

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

const cwd = process.cwd();
const input = process.env.HERMES_RESEARCH_INPUT || process.argv[2] || path.join(cwd, "data", "lead-intent", "research-seeds.json");
const output = process.env.HERMES_RESEARCH_OUTPUT || path.join(cwd, "data", "lead-intent", "research-results.json");
const limit = Number(process.env.HERMES_RESEARCH_LIMIT || 10);
const provider = createBrowserProvider();

if (!provider) {
  console.error(JSON.stringify({ ok: false, reason: "browser_bridge_not_configured", missing_env: ["HERMES_BROWSER_BRIDGE_URL"] }, null, 2));
  process.exit(1);
}

let parsed;
try {
  parsed = await readJson(input);
} catch (error) {
  console.error(JSON.stringify({ ok: false, reason: "research_seed_file_unreadable", input, error: String(error?.message || error) }, null, 2));
  process.exit(1);
}

const seeds = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.leads) ? parsed.leads : Array.isArray(parsed?.rows) ? parsed.rows : [];
const result = await researchSeedLeads(seeds, { provider, limit, now: process.env.HERMES_NOW });
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(result.results, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, input, output, summary: result.summary, next_step: "npm run lead:intake" }, null, 2));
