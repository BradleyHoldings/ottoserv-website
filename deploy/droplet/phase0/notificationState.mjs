// ─── Phase 0: durable watchdog alert dedup ───────────────────────────────────

import { promises as fs } from "node:fs";
import path from "node:path";

function clean(v) { return String(v ?? "").trim(); }
const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };
function rank(sev) { return SEVERITY_RANK[clean(sev).toLowerCase()] || 0; }

export function notifyStateDir(options = {}) {
  if (options.notifyStateDir) return options.notifyStateDir;
  if (clean(process.env.HERMES_NOTIFY_STATE_DIR)) return clean(process.env.HERMES_NOTIFY_STATE_DIR);
  const root = clean(process.env.HERMES_STATE_ROOT)
    || (clean(process.env.HERMES_TASKS_DIR)
      ? path.dirname(clean(process.env.HERMES_TASKS_DIR))
      : path.join(process.cwd(), "data", "revenue-engine"));
  return path.join(root, "notify-state");
}

function keyFor(alert) { return `${clean(alert.task_id)}::${clean(alert.failure_class)}`; }
function fileFor(key, options = {}) {
  const safe = key.toLowerCase().replace(/[^a-z0-9-]+/g, "_");
  return path.join(notifyStateDir(options), `${safe}.json`);
}
function signatureOf(alert) { return `${clean(alert.severity)}:${clean(alert.state)}`; }

export const DEFAULT_COOLDOWN_MIN = Number(process.env.HERMES_ALERT_COOLDOWN_MIN || 30);

export async function shouldNotify(alert, options = {}) {
  const now = options.now || new Date().toISOString();
  const cooldownMin = Number(options.cooldownMin ?? DEFAULT_COOLDOWN_MIN);
  const prior = await loadRecord(keyFor(alert), options);

  if (!prior) return { send: true, reason: "first_detection" };
  if (prior.resolved) return { send: true, reason: "recurrence_after_resolution" };

  const escalatedSeverity = rank(alert.severity) > rank(prior.last_severity);
  const stateChanged = clean(alert.state) && clean(alert.state) !== clean(prior.last_state);
  if (escalatedSeverity || stateChanged) {
    return { send: true, reason: escalatedSeverity ? "severity_escalation" : "state_change" };
  }

  const ageMin = (Date.parse(now) - Date.parse(prior.last_sent_at || prior.updated_at)) / 60000;
  if (Number.isFinite(ageMin) && ageMin >= cooldownMin) {
    return { send: true, reason: "cooldown_elapsed_reminder" };
  }
  return { send: false, reason: "unchanged_within_cooldown" };
}

export async function recordSent(alert, options = {}) {
  const now = options.now || new Date().toISOString();
  const key = keyFor(alert);
  const prior = await loadRecord(key, options);
  const rec = {
    key,
    task_id: clean(alert.task_id),
    failure_class: clean(alert.failure_class),
    last_signature: signatureOf(alert),
    last_severity: clean(alert.severity),
    last_state: clean(alert.state),
    last_sent_at: now,
    resolved: false,
    resolved_at: "",
    sent_count: Number(prior?.sent_count || 0) + 1,
    created_at: prior?.created_at || now,
    updated_at: now,
  };
  await saveRecord(rec, options);
  return rec;
}

export async function reconcileResolved(activeKeys = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const active = new Set(activeKeys);
  const dir = notifyStateDir(options);
  let resolved = 0;
  let names = [];
  try { names = await fs.readdir(dir); } catch { return { resolved: 0 }; }
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const rec = JSON.parse(await fs.readFile(path.join(dir, name), "utf8"));
      if (!rec.resolved && !active.has(rec.key)) {
        await saveRecord({ ...rec, resolved: true, resolved_at: now, updated_at: now }, options);
        resolved += 1;
      }
    } catch { /* ignore malformed stale records */ }
  }
  return { resolved };
}

export function alertKey(alert) { return keyFor(alert); }

async function saveRecord(rec, options = {}) {
  const file = fileFor(rec.key, options);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temp, `${JSON.stringify(rec, null, 2)}\n`, "utf8");
  await fs.rename(temp, file);
  return file;
}

async function loadRecord(key, options = {}) {
  try { return JSON.parse(await fs.readFile(fileFor(key, options), "utf8")); }
  catch { return null; }
}
