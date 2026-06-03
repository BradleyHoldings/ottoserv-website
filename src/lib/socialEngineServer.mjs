// ─── Server-side SocialEngine binding + store selection ───────────────────────
//
// Binds the deep SocialEngine (socialContentEngine.mjs) to a DURABLE store and
// selects the right one for the environment:
//
//   * Supabase configured (or SOCIAL_ENGINE_STORE=supabase) -> Supabase store
//     (production-safe; works on Vercel's read-only filesystem)
//   * otherwise                                             -> filesystem store
//     (local dev/tests; resolves to a writable dir, never /var/task)
//
// The deep engine module is unchanged — we only swap the pluggable store and add
// a health panel. No real social publishing happens here.

import { createSocialEngine } from "./socialContentEngine.mjs";
import { createFileSocialWorkflowStore } from "./socialWorkflowStore.mjs";
import { createSupabaseSocialWorkflowStore, supabaseConfigured } from "./socialSupabaseStore.mjs";

// Cache the store per-process, keyed by the env signature so tests that toggle
// env vars get a fresh store instead of a stale cached one.
let cached = null;

function storeSignature() {
  return [
    (process.env.SOCIAL_ENGINE_STORE || "").toLowerCase(),
    supabaseConfigured() ? "sb" : "fs",
    process.env.SOCIAL_ENGINE_DATA_DIR || "",
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
  ].join("|");
}

export function selectSocialStore() {
  const signature = storeSignature();
  if (cached && cached.signature === signature) return cached;

  const forced = (process.env.SOCIAL_ENGINE_STORE || "").toLowerCase();
  let store;
  if (forced === "filesystem") {
    store = createFileSocialWorkflowStore();
  } else if (forced === "supabase" || supabaseConfigured()) {
    try {
      store = createSupabaseSocialWorkflowStore();
    } catch (err) {
      if (forced === "supabase") throw err;
      store = createFileSocialWorkflowStore(); // misconfigured auto-detect → safe fallback
    }
  } else {
    store = createFileSocialWorkflowStore();
  }

  cached = {
    signature,
    store,
    type: store.kind,
    writable: store.writable !== false,
    descriptor: store.descriptor || store.path || store.kind,
  };
  return cached;
}

export function getServerSocialEngine() {
  return createSocialEngine({ store: selectSocialStore().store });
}

// Latest `at` timestamp across all items whose audit_log contains `action`.
function lastAuditAt(items, actions) {
  const wanted = Array.isArray(actions) ? actions : [actions];
  let latest = null;
  for (const item of items) {
    for (const entry of item.audit_log || []) {
      if (wanted.includes(entry.action)) {
        if (!latest || entry.at > latest) latest = entry.at;
      }
    }
  }
  return latest;
}

/**
 * Social-ops health/status panel (Task 9 + production store visibility).
 * Reports the active store type, writability, data source, connection status,
 * last error, "last run" timestamps (from the audit log), and workflow counts.
 */
export async function getSocialOpsHealthPanel() {
  const selected = selectSocialStore();
  const engine = createSocialEngine({ store: selected.store });

  let items = [];
  let backendConnected = true;
  let lastError = null;

  try {
    items = await engine.listDrafts();
  } catch (err) {
    backendConnected = false;
    lastError = err instanceof Error ? err.message : String(err);
  }
  // Surface any store-level error (e.g. failed hydration) even if list succeeded.
  if (!lastError && selected.store.lastError) lastError = selected.store.lastError;

  const count = (statuses) => items.filter((i) => statuses.includes(i.status)).length;

  return {
    service: "SocialEngine",
    backend_connected: backendConnected,
    store_type: selected.type,            // "supabase" | "filesystem"
    writable: selected.writable,
    data_source: selected.descriptor,
    backend_status: backendConnected ? (count(["failed", "fallback"]) ? "degraded" : "healthy") : "disconnected",
    last_error: lastError,

    last_codex_content_prep: lastAuditAt(items, "createDraft"),
    last_hermes_social_review: lastAuditAt(items, "reviewDraft"),
    last_approval_writeback: lastAuditAt(items, ["approveDraft", "rejectDraft"]),
    last_cowork_handoff: lastAuditAt(items, ["routeApprovedItem", "recordExecutorHandoff"]),
    last_cowork_evidence: lastAuditAt(items, "recordEvidence"),

    drafts_count: count(["draft"]),
    pending_approval_count: count(["pending_review", "reviewed"]),
    approved_awaiting_cowork_count: count(["approved", "routed_to_executor"]),
    published_count: count(["published"]),
    failed_stalled_count: count(["failed", "fallback"]),
    total_count: items.length,
  };
}
