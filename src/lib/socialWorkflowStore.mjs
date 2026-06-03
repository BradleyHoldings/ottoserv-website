// ─── Durable filesystem store for the SocialEngine ────────────────────────────
//
// `socialContentEngine.mjs` already defines the deep SocialEngine and a pluggable
// store contract (createSocialEngine({ store })). Its default store is in-memory
// and therefore ephemeral — which is exactly why the live /dashboard/social path
// was disconnected: every request rebuilt a fresh engine and nothing persisted.
//
// This module implements the SAME store contract against a JSON file so the
// engine has a durable, shared source of truth that survives across requests and
// can be read/written by API routes, Hermes, and Cowork tooling. We intentionally
// do NOT modify the engine — we plug into its existing extension point.
//
// Store contract expected by createSocialEngine():
//   kind, create(item), update(id, updater), get(id), list(filters?), nextId()
//
// Path is overridable via SOCIAL_ENGINE_DATA_DIR so the Hermes daily-operating-
// loop / Cowork workspace can point at the same files in production.

import { promises as fs } from "fs";
import { mkdirSync, accessSync, constants as FS } from "fs";
import os from "os";
import path from "path";

export const SOCIAL_ENGINE_DATA_DIR =
  process.env.SOCIAL_ENGINE_DATA_DIR || path.join(process.cwd(), "data", "social-engine");

// Committed seed (imported Instagram/LinkedIn evidence + safe test draft). Lives
// in a subdirectory so it survives the `/data/social-engine/*.json` gitignore rule
// that hides the mutable runtime ledgers. Always read from the deploy bundle
// (readable even on Vercel's read-only /var/task), never written.
export const SOCIAL_SEED_PATH = path.join(
  process.cwd(),
  "data",
  "social-engine",
  "seed",
  "drafts.json",
);

// ─── Writable directory resolution ────────────────────────────────────────────
//
// On Vercel the app is deployed under a read-only /var/task, so writing
// data/social-engine/* throws EROFS. Resolve to the first writable directory:
//   1. SOCIAL_ENGINE_DATA_DIR (or repo data dir) if writable  — local dev
//   2. <os.tmpdir()>/ottoserv-social-engine                   — serverless safety net
// The tmp fallback is ephemeral per cold start; Supabase is the durable
// production store. This only prevents EROFS crashes when Supabase is absent.

let cachedDataDir = null;

function isWritableDir(dir) {
  try {
    mkdirSync(dir, { recursive: true });
    accessSync(dir, FS.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveWritableDataDir(preferred = SOCIAL_ENGINE_DATA_DIR) {
  if (cachedDataDir && cachedDataDir.preferred === preferred) return cachedDataDir;
  let dir = preferred;
  let writable = isWritableDir(preferred);
  if (!writable) {
    const fallback = path.join(os.tmpdir(), "ottoserv-social-engine");
    writable = isWritableDir(fallback);
    dir = writable ? fallback : preferred;
  }
  cachedDataDir = { preferred, dir, writable };
  return cachedDataDir;
}

export const SOCIAL_DRAFTS_PATH = path.join(SOCIAL_ENGINE_DATA_DIR, "social_drafts.json");
export const SOCIAL_EVENTS_PATH = path.join(SOCIAL_ENGINE_DATA_DIR, "social_events.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/**
 * Durable JSON-file-backed store implementing the SocialEngine store contract.
 *
 * @param {object} options
 * @param {string} [options.filePath]  Working drafts file (mutable runtime ledger).
 * @param {string} [options.seedPath]  Committed seed used to hydrate an empty dir.
 */
export function createFileSocialWorkflowStore(options = {}) {
  // Resolve a writable target. An explicit filePath wins (tests/dev); otherwise
  // pick the first writable dir so production never tries to write to /var/task.
  const resolved = options.filePath
    ? { dir: path.dirname(options.filePath), writable: isWritableDir(path.dirname(options.filePath)) }
    : resolveWritableDataDir();
  const filePath = options.filePath || path.join(resolved.dir, "social_drafts.json");
  const seedPath = options.seedPath === undefined ? SOCIAL_SEED_PATH : options.seedPath;

  async function loadAll() {
    if (!(await fileExists(filePath))) {
      // Hydrate from the committed seed once so the imported evidence + safe test
      // draft are visible out of the box. If there is no seed, start empty.
      if (seedPath && seedPath !== filePath && (await fileExists(seedPath))) {
        const seed = await readJson(seedPath, []);
        await writeJson(filePath, seed);
        return seed;
      }
      return [];
    }
    return readJson(filePath, []);
  }

  return {
    kind: "filesystem",
    path: filePath,
    writable: resolved.writable,
    descriptor: `filesystem:${filePath}`,

    async create(item) {
      const items = await loadAll();
      items.push(clone(item));
      await writeJson(filePath, items);
      return clone(item);
    },

    async update(id, updater) {
      const items = await loadAll();
      const idx = items.findIndex((entry) => entry.id === id);
      if (idx === -1) throw new Error(`Social item ${id} was not found.`);
      const next = updater(clone(items[idx]));
      items[idx] = clone(next);
      await writeJson(filePath, items);
      return clone(next);
    },

    async get(id) {
      const items = await loadAll();
      const item = items.find((entry) => entry.id === id);
      return item ? clone(item) : null;
    },

    async list(filters = {}) {
      const items = await loadAll();
      if (!filters.status) return items;
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      return items.filter((item) => statuses.includes(item.status));
    },

    nextId() {
      // Synchronous per the contract; derive from a cached snapshot when needed.
      // We read lazily here because nextId is only called inside createDraft right
      // before create(), which re-reads anyway. Use a timestamp-safe fallback.
      return `social-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    },
  };
}

// ─── Event log (for the health/status panel "last run" timestamps) ───────────

/**
 * Append a social-ops event. Used to surface "last Codex content prep",
 * "last Hermes review", "last approval", "last Cowork handoff", and
 * "last Cowork evidence" on the dashboard health panel.
 */
export async function recordSocialEvent(type, ref, detail) {
  // Best-effort breadcrumb only. The health panel derives "last run" timestamps
  // from each item's audit_log, so this file is non-critical — never let a
  // read-only filesystem (Vercel) or an unwritable path break a request.
  try {
    const { dir, writable } = resolveWritableDataDir();
    if (!writable) return;
    const eventsPath = path.join(dir, "social_events.json");
    const events = await readJson(eventsPath, []);
    events.push({ type, ref: ref ?? null, detail: detail ?? null, at: new Date().toISOString() });
    await writeJson(eventsPath, events);
  } catch {
    // swallow — events are advisory, audit_log is the source of truth
  }
}

export async function readSocialEvents() {
  try {
    const { dir } = resolveWritableDataDir();
    return await readJson(path.join(dir, "social_events.json"), []);
  } catch {
    return [];
  }
}
