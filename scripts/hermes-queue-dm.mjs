// Queue one verified social DM packet into the existing durable execution queue.
// This queues intent only; it never opens a browser or sends a message.

import { promises as fs } from "node:fs";
import path from "node:path";

import { loadRevenueDocument } from "../src/lib/actorEvidenceIntake.mjs";
import { upsertRevenueState } from "../src/lib/revenueEngineSupabaseStore.mjs";

function clean(value) { return String(value ?? "").trim(); }
function slug(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64); }

const raw = process.env.HERMES_DM_PACKET_JSON || "";
if (!raw) {
  console.error("Set HERMES_DM_PACKET_JSON to a JSON object with lead_id, company, platform, profile_url, and message.");
  process.exit(1);
}

let input;
try { input = JSON.parse(raw); }
catch (error) {
  console.error(`Invalid HERMES_DM_PACKET_JSON: ${String(error?.message || error)}`);
  process.exit(1);
}

const required = ["lead_id", "company", "platform", "profile_url", "message"];
const missing = required.filter((key) => !clean(input[key]));
if (missing.length) {
  console.error(`Missing required fields: ${missing.join(", ")}`);
  process.exit(1);
}
if (!/^https?:\/\//i.test(clean(input.profile_url))) {
  console.error("profile_url must be a verified http(s) URL.");
  process.exit(1);
}

const now = process.env.HERMES_NOW || new Date().toISOString();
const taskId = clean(input.task_id) || `apx-dm-${slug(input.lead_id)}-${slug(input.platform)}`;
const loaded = await loadRevenueDocument({ dataDir: process.env.REVENUE_LOOP_OUTPUT_DIR });
const document = loaded.document || {};
const items = Array.isArray(document?.approvalExecutionQueue?.items) ? document.approvalExecutionQueue.items : [];
const exists = items.some((item) => clean(item?.taskPacket?.task_id || item?.lifecycle?.assigned_task_id) === taskId);

if (exists) {
  console.log(JSON.stringify({ ok: true, queued: false, reason: "already_exists", task_id: taskId }, null, 2));
  process.exit(0);
}

const actorPacket = {
  task_id: taskId,
  action_id: clean(input.action_id) || `na-dm-${slug(input.lead_id)}-${slug(input.platform)}`,
  channel: `${slug(input.platform)}_dm`,
  lead_id: clean(input.lead_id),
  company: clean(input.company),
  packet: {
    kind: "dm_packet",
    platform: clean(input.platform).toLowerCase(),
    profile_url: clean(input.profile_url),
    recipient_name: clean(input.recipient_name),
    message: clean(input.message),
    source_url: clean(input.source_url),
    offer: clean(input.offer),
  },
  policy: {
    materialized_via: clean(input.materialized_via) || "standing_dm_policy",
    approved_by: clean(input.approved_by) || "standing_policy",
    daily_cap: Number(input.daily_cap || 5),
    risk: clean(input.risk_level) || "low",
  },
  required_evidence: ["DM evidence: platform, profile/thread URL, timestamp, message id when available, screenshot/confirmation, outcome, and next action."],
  mode: "no_send_no_call",
  no_send: true,
  no_call: true,
  status: "queued",
};

const entry = {
  taskPacket: {
    task_id: taskId,
    created_at: now,
    execution_rail: "browser_dm",
    assigned_agent: "Hermes",
    actor_packet: actorPacket,
  },
  lifecycle: {
    assigned_task_id: taskId,
    execution_status: "queued",
    evidence_status: "required",
    required_evidence: actorPacket.required_evidence,
    submitted_evidence: [],
    created_at: now,
    updated_at: now,
  },
};

const nextItems = [...items, entry];
const nextDocument = {
  ...document,
  approvalExecutionQueue: {
    ...(document.approvalExecutionQueue || {}),
    generated_at: now,
    count: nextItems.length,
    items: nextItems,
  },
};

let local = false;
if (loaded.source?.kind === "local_file" && loaded.source.file) {
  await fs.mkdir(path.dirname(loaded.source.file), { recursive: true });
  await fs.writeFile(loaded.source.file, `${JSON.stringify(nextDocument, null, 2)}\n`, "utf8");
  local = true;
}
let supabase = { ok: false, skipped: true, reason: "disabled" };
if (process.env.HERMES_PERSIST_SUPABASE !== "false") supabase = await upsertRevenueState(nextDocument);

console.log(JSON.stringify({ ok: true, queued: true, task_id: taskId, persisted: { local, supabase }, note: "Queued only; no DM sent." }, null, 2));
