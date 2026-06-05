// ─── Phase 0: durable pending-operation store ────────────────────────────────
// Correlation derives from the ORIGINAL request, not a confirmation message.
// Pending operations carry authorization scope, requester ownership, and expiry.

import { promises as fs } from "node:fs";
import path from "node:path";

function clean(v) { return String(v ?? "").trim(); }
function asArray(v) { return Array.isArray(v) ? v : []; }

export function stateRoot() {
  if (clean(process.env.HERMES_STATE_ROOT)) return clean(process.env.HERMES_STATE_ROOT);
  if (clean(process.env.HERMES_TASKS_DIR)) return path.dirname(clean(process.env.HERMES_TASKS_DIR));
  return path.join(process.cwd(), "data", "revenue-engine");
}

export function pendingDir(options = {}) {
  return options.pendingDir || clean(process.env.HERMES_PENDING_DIR)
    || path.join(stateRoot(), "pending-operations");
}

function pendingFile(correlationId, options = {}) {
  return path.join(pendingDir(options), `${clean(correlationId)}.json`);
}

export function correlationIdFor({
  operationType,
  originalRequestMessageId,
  attachmentId,
} = {}) {
  const parts = ["op", clean(operationType), "req", clean(originalRequestMessageId)];
  if (clean(attachmentId)) parts.push("att", clean(attachmentId));
  return parts.join("-").toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function expirationFor(now, minutes) {
  const ms = Number(minutes) * 60_000;
  const fallback = 30 * 60_000;
  return new Date(Date.parse(now) + (Number.isFinite(ms) && ms > 0 ? ms : fallback)).toISOString();
}

export function isExpired(pending, now = new Date().toISOString()) {
  const expiry = Date.parse(clean(pending?.expires_at));
  return Number.isFinite(expiry) && Date.parse(now) >= expiry;
}

export async function requestOperation(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const operationType = clean(input.operationType);
  const originalRequestMessageId = clean(input.originalRequestMessageId);
  const approvalScope = clean(input.approvalScope) || operationType;
  const requestedByUserId = clean(input.requestedByUserId);
  const requestedInChatId = clean(input.requestedInChatId);

  if (!operationType) return { ok: false, reason: "missing_operation_type" };
  if (!originalRequestMessageId) return { ok: false, reason: "missing_original_request_message_id" };
  if (!approvalScope) return { ok: false, reason: "missing_approval_scope" };
  if (!requestedByUserId) return { ok: false, reason: "missing_requester_user_id" };
  if (!requestedInChatId) return { ok: false, reason: "missing_requester_chat_id" };

  const correlationId = correlationIdFor({
    operationType,
    originalRequestMessageId,
    attachmentId: input.attachmentId,
  });

  const existing = await loadPending(correlationId, options);
  if (existing) {
    return { ok: true, pending: existing, created: false, idempotent: true };
  }

  const pending = {
    correlation_id: correlationId,
    operation_type: operationType,
    approval_scope: approvalScope,
    original_request_message_id: originalRequestMessageId,
    attachment_id: clean(input.attachmentId),
    requested_by: clean(input.requestedBy),
    requested_by_user_id: requestedByUserId,
    requested_in_chat_id: requestedInChatId,
    request_text: clean(input.requestText).slice(0, 500),
    confirmation_message_ids: [],
    task_id: "",
    status: "pending",
    created_at: now,
    expires_at: clean(input.expiresAt)
      || expirationFor(now, input.expiresInMinutes ?? process.env.HERMES_PENDING_EXPIRY_MIN ?? 30),
    updated_at: now,
  };

  await savePending(pending, options);
  return { ok: true, pending, created: true, idempotent: false };
}

export async function resolvePendingForConfirmation(input = {}, options = {}) {
  const correlationId = correlationIdFor({
    operationType: input.operationType,
    originalRequestMessageId: input.originalRequestMessageId,
    attachmentId: input.attachmentId,
  });
  return loadPending(correlationId, options);
}

export function validatePendingForConfirmation(pending, input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  if (!pending) return { ok: false, reason: "pending_operation_not_found" };
  if (isExpired(pending, now)) return { ok: false, reason: "pending_operation_expired" };

  const operationType = clean(input.operationType);
  const approvalScope = clean(input.approvalScope) || operationType;
  const attachmentId = clean(input.attachmentId);
  const actorUserId = clean(input.actorUserId);
  const actorChatId = clean(input.actorChatId);

  if (clean(pending.operation_type) !== operationType) {
    return { ok: false, reason: "operation_type_mismatch" };
  }
  if (clean(pending.approval_scope) !== approvalScope) {
    return { ok: false, reason: "approval_scope_mismatch" };
  }
  if (clean(pending.attachment_id) !== attachmentId) {
    return { ok: false, reason: "attachment_mismatch" };
  }
  if (clean(pending.requested_by_user_id) !== actorUserId) {
    return { ok: false, reason: "requester_user_mismatch" };
  }
  if (clean(pending.requested_in_chat_id) !== actorChatId) {
    return { ok: false, reason: "requester_chat_mismatch" };
  }
  if (!["pending", "confirmed", "consumed"].includes(clean(pending.status))) {
    return { ok: false, reason: "pending_operation_invalid_status" };
  }
  return { ok: true };
}

export async function recordConfirmation(pending, confirmationMessageId, options = {}) {
  const now = options.now || new Date().toISOString();
  const id = clean(confirmationMessageId);
  if (!id) return { ok: false, reason: "missing_confirmation_message_id" };

  const priorIds = asArray(pending.confirmation_message_ids);
  const duplicate = priorIds.includes(id);
  const updated = {
    ...pending,
    confirmation_message_ids: duplicate ? priorIds : [...priorIds, id],
    status: pending.status === "consumed" ? "consumed" : "confirmed",
    updated_at: now,
  };
  await savePending(updated, options);
  return { ok: true, pending: updated, duplicate_confirmation: duplicate };
}

export async function markConsumed(pending, taskId, options = {}) {
  const now = options.now || new Date().toISOString();
  const updated = {
    ...pending,
    status: "consumed",
    task_id: clean(taskId) || clean(pending.task_id),
    updated_at: now,
  };
  await savePending(updated, options);
  return { ok: true, pending: updated };
}

export async function savePending(pending, options = {}) {
  const file = pendingFile(pending.correlation_id, options);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temp, `${JSON.stringify(pending, null, 2)}\n`, "utf8");
  await fs.rename(temp, file);
  return file;
}

export async function loadPending(correlationId, options = {}) {
  try {
    return JSON.parse(await fs.readFile(pendingFile(correlationId, options), "utf8"));
  } catch {
    return null;
  }
}
