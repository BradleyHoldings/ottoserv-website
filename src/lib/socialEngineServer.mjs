// ─── Server-side SocialEngine binding ─────────────────────────────────────────
//
// Binds the deep SocialEngine (socialContentEngine.mjs) to the durable filesystem
// store so API routes share ONE persistent source of truth. This is the bridge
// that finally connects /dashboard/social to real, surviving workflow state:
//
//   route handler -> getServerSocialEngine() -> createSocialEngine({ store: file })
//
// Also computes the dashboard health/status panel (Task 9) by deriving the
// "last run" timestamps from the engine's own audit log, so the panel reflects
// real activity rather than a hardcoded value.

import { createSocialEngine } from "./socialContentEngine.mjs";
import {
  createFileSocialWorkflowStore,
  SOCIAL_DRAFTS_PATH,
} from "./socialWorkflowStore.mjs";

export function getServerSocialEngine() {
  const store = createFileSocialWorkflowStore();
  return createSocialEngine({ store });
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
 * Full social-ops health/status panel (Task 9). Combines the engine's own health
 * with derived "last run" timestamps and the workflow counts the dashboard shows.
 */
export async function getSocialOpsHealthPanel() {
  const engine = getServerSocialEngine();
  const [items, baseHealth] = await Promise.all([
    engine.listDrafts(),
    engine.getHealthStatus(),
  ]);

  const count = (statuses) => items.filter((i) => statuses.includes(i.status)).length;

  return {
    service: "SocialEngine",
    backend_connected: true,
    backend_status: baseHealth.status, // healthy | degraded
    data_source: `filesystem:${SOCIAL_DRAFTS_PATH}`,

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

    errors: baseHealth.errors,
  };
}
