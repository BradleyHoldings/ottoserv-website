// ─── Supabase-backed store for the SocialEngine ───────────────────────────────
//
// Production-durable implementation of the SAME store contract the SocialEngine
// expects (kind, create, update, get, list, nextId). It talks to Supabase via
// PostgREST (the pattern already used by the audit/newsletter routes), so it
// works on Vercel's read-only filesystem — no writes to /var/task.
//
// We do NOT modify the deep SocialEngine module; this is a drop-in store.
//
// Each row mirrors the SocialEngine record fields into typed columns (for SQL
// visibility / indexing) AND stores the full engine item in `raw_payload` jsonb,
// so the engine's exact shape round-trips losslessly regardless of column drift.

import { promises as fs } from "fs";
import { SOCIAL_SEED_PATH } from "./socialWorkflowStore.mjs";

const TABLE = process.env.SOCIAL_ENGINE_SUPABASE_TABLE || "social_drafts";

// timestamptz columns can't accept the engine's "" empty strings → send null.
const TIMESTAMP_FIELDS = new Set([
  "created_at",
  "reviewed_at",
  "approved_at",
  "rejected_at",
  "scheduled_for",
  "handed_to_cowork_at",
  "published_at",
]);

const COLUMN_FIELDS = [
  "id", "platform", "content_type", "post_text", "asset_path", "asset_url", "status",
  "content_category", "core_insight_or_reframe", "intended_audience", "cta_status",
  "billboard_risk_score", "social_strategy_review", "created_by", "reviewed_by",
  "approved_by", "created_at", "reviewed_at", "approved_at", "rejected_at",
  "scheduled_for", "handed_to_cowork_at", "published_at", "published_url",
  "evidence_path", "evidence_url", "failure_reason", "fallback_owner", "next_action",
  "learning_tags", "performance_notes", "audit_log", "executor", "executor_handoff",
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export function supabaseConfigured() {
  return getSupabaseConfig() !== null;
}

function itemToRow(item) {
  const row = {};
  for (const field of COLUMN_FIELDS) {
    let value = item[field];
    if (TIMESTAMP_FIELDS.has(field) && (value === "" || value === undefined)) value = null;
    row[field] = value === undefined ? null : value;
  }
  // Lossless copy of the exact engine item.
  row.raw_payload = clone(item);
  return row;
}

function rowToItem(row) {
  // Prefer the lossless raw_payload; fall back to typed columns.
  if (row && row.raw_payload && typeof row.raw_payload === "object") {
    return clone(row.raw_payload);
  }
  const item = {};
  for (const field of COLUMN_FIELDS) item[field] = row[field];
  return item;
}

/**
 * @param {object} options
 * @param {string} [options.seedPath] Committed seed used to hydrate an empty table.
 */
export function createSupabaseSocialWorkflowStore(options = {}) {
  const cfg = getSupabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY).");
  const seedPath = options.seedPath || SOCIAL_SEED_PATH;
  const base = `${cfg.url}/rest/v1/${TABLE}`;
  const headers = {
    "Content-Type": "application/json",
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
  };

  const state = { lastError: null };
  let hydrated = false;
  let hydrating = null;

  async function request(method, query, body, extraHeaders) {
    const res = await fetch(`${base}${query}`, {
      method,
      headers: { ...headers, ...(extraHeaders || {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(`Supabase ${method} ${TABLE} failed (${res.status}): ${text.slice(0, 300)}`);
      state.lastError = err.message;
      throw err;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function hydrateIfEmpty() {
    // Idempotent: only seed when the table is empty. Upsert on id to be race-safe.
    const existing = await request("GET", "?select=id&limit=1");
    if (Array.isArray(existing) && existing.length > 0) return;
    let seed = [];
    try {
      seed = JSON.parse(await fs.readFile(seedPath, "utf8"));
    } catch {
      return; // no seed available → leave table empty
    }
    if (!Array.isArray(seed) || seed.length === 0) return;
    await request(
      "POST",
      "?on_conflict=id",
      seed.map(itemToRow),
      { Prefer: "resolution=ignore-duplicates,return=minimal" },
    );
  }

  async function ensureHydrated() {
    if (hydrated) return;
    if (!hydrating) {
      hydrating = hydrateIfEmpty()
        .then(() => { hydrated = true; })
        .catch((err) => { state.lastError = err.message; })
        .finally(() => { hydrating = null; });
    }
    await hydrating;
  }

  return {
    kind: "supabase",
    writable: true,
    descriptor: `supabase:${cfg.url}/${TABLE}`,
    get lastError() { return state.lastError; },

    async ping() {
      await request("GET", "?select=id&limit=1");
      return true;
    },

    async create(item) {
      await ensureHydrated();
      const rows = await request("POST", "?select=*", itemToRow(item), { Prefer: "return=representation" });
      return Array.isArray(rows) && rows[0] ? rowToItem(rows[0]) : clone(item);
    },

    async update(id, updater) {
      await ensureHydrated();
      const current = await this.get(id);
      if (!current) throw new Error(`Social item ${id} was not found.`);
      const next = updater(clone(current));
      const rows = await request(
        "PATCH",
        `?id=eq.${encodeURIComponent(id)}&select=*`,
        itemToRow(next),
        { Prefer: "return=representation" },
      );
      return Array.isArray(rows) && rows[0] ? rowToItem(rows[0]) : clone(next);
    },

    async get(id) {
      await ensureHydrated();
      const rows = await request("GET", `?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
      return Array.isArray(rows) && rows[0] ? rowToItem(rows[0]) : null;
    },

    async list(filters = {}) {
      await ensureHydrated();
      let query = "?select=*&order=created_at.asc";
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query += `&status=in.(${statuses.map((s) => encodeURIComponent(s)).join(",")})`;
      }
      const rows = await request("GET", query);
      return Array.isArray(rows) ? rows.map(rowToItem) : [];
    },

    nextId() {
      return `social-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    },
  };
}
