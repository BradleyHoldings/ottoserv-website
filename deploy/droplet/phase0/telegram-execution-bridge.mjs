// ─── Telegram → execution-truth bridge (Phase 0; DRY ONLY) ───────────────────

import { runOpsRevenueNow, loadTask } from "../../../src/lib/execution/commandRail.mjs";
import { loadAllTasks } from "../../../src/lib/execution/taskLifecycle.mjs";
import { renderStatus, assertClaimConsistent } from "../../../src/lib/execution/telegramStatus.mjs";
import { runOperatingCycle } from "../../../src/lib/hermesOrchestrator.mjs";
import {
  requestOperation,
  resolvePendingForConfirmation,
  validatePendingForConfirmation,
  recordConfirmation,
  markConsumed,
} from "./pendingOperationStore.mjs";
import { authorizeActor } from "./authorization.mjs";

function clean(v) { return String(v ?? "").trim(); }
const PHASE0_MODE = "dry";

export function assertPersistentState() {
  const required = [
    "HERMES_TASKS_DIR",
    "HERMES_APPROVALS_DIR",
    "HERMES_PENDING_DIR",
    "HERMES_NOTIFY_STATE_DIR",
  ];
  const bad = required.filter((name) => {
    const value = clean(process.env[name]);
    return !value || value === "/tmp" || value.startsWith("/tmp/");
  });
  if (bad.length) {
    throw new Error(`Phase0_refuses_ephemeral_state: configure persistent ${bad.join(", ")}.`);
  }
}

async function dryRunCycle({ leads, now }) {
  return runOperatingCycle({
    now,
    state: { leads: leads || [] },
    executionMode: undefined,
    emailTransport: null,
    callTransport: null,
    persistSupabase: false,
  });
}

export async function handleOperationRequest(input = {}, options = {}) {
  assertPersistentState();
  const auth = authorizeActor(input.actor, options);
  if (!auth.ok) {
    return {
      ok: false,
      authorized: false,
      reason: auth.reason,
      reply: "You are not authorized to start operations here.",
    };
  }

  const operationType = clean(input.operationType) || "ops_revenue_now";
  const approvalScope = clean(input.approvalScope) || operationType;
  const result = await requestOperation({
    operationType,
    approvalScope,
    originalRequestMessageId: clean(input.originalRequestMessageId),
    attachmentId: input.attachmentId,
    requestedBy: auth.approved_by,
    requestedByUserId: auth.telegram_user_id,
    requestedInChatId: auth.chat_id,
    requestText: input.requestText,
    expiresAt: input.expiresAt,
    expiresInMinutes: input.expiresInMinutes,
  }, options);

  if (!result.ok) {
    return { ok: false, reason: result.reason, reply: `Could not register request (${result.reason}).` };
  }

  return {
    ok: true,
    authorized: true,
    idempotent: Boolean(result.idempotent),
    correlation_id: result.pending.correlation_id,
    pending: result.pending,
    reply: `Request received (${operationType}). Reply to confirm before ${result.pending.expires_at}. Nothing has started yet.`,
  };
}

export async function handleRevenueConfirmation(input = {}, options = {}) {
  assertPersistentState();
  const auth = authorizeActor(input.actor, options);
  if (!auth.ok) {
    return {
      ok: false,
      authorized: false,
      reason: auth.reason,
      reply: "You are not authorized to approve or start operations here.",
    };
  }

  const operationType = clean(input.operationType) || "ops_revenue_now";
  const approvalScope = clean(input.approvalScope) || operationType;
  const originalRequestMessageId = clean(input.originalRequestMessageId);
  const confirmationMessageId = clean(input.confirmationMessageId);

  if (!originalRequestMessageId) {
    return { ok: false, reason: "missing_original_request_message_id", reply: "Cannot confirm without the original request." };
  }
  if (!confirmationMessageId) {
    return { ok: false, reason: "missing_confirmation_message_id", reply: "Cannot confirm without the confirmation message id." };
  }

  const pending = await resolvePendingForConfirmation({
    operationType,
    originalRequestMessageId,
    attachmentId: input.attachmentId,
  }, options);

  const validation = validatePendingForConfirmation(pending, {
    operationType,
    approvalScope,
    attachmentId: input.attachmentId,
    actorUserId: auth.telegram_user_id,
    actorChatId: auth.chat_id,
  }, options);

  if (!validation.ok) {
    return {
      ok: false,
      authorized: true,
      reason: validation.reason,
      reply: `Cannot confirm this operation (${validation.reason}). Nothing has started.`,
    };
  }

  const recorded = await recordConfirmation(pending, confirmationMessageId, options);
  if (!recorded.ok) return { ok: false, reason: recorded.reason, reply: "Confirmation could not be recorded." };
  const updatedPending = recorded.pending;

  const result = await runOpsRevenueNow({
    correlation_id: updatedPending.correlation_id,
    approved_by: auth.approved_by,
    source_message_id: confirmationMessageId,
    source_text: clean(input.sourceText) || "yes, please start",
    leads: [],
    mode: PHASE0_MODE,
    runCycle: dryRunCycle,
  });

  let finalPending = updatedPending;
  if (result.task?.task_id) {
    finalPending = (await markConsumed(updatedPending, result.task.task_id, options)).pending;
  }

  return {
    ok: result.ok,
    authorized: true,
    idempotent: Boolean(result.idempotent),
    correlation_id: finalPending.correlation_id,
    original_request_message_id: originalRequestMessageId,
    confirmation_message_id: confirmationMessageId,
    confirmation_message_ids: finalPending.confirmation_message_ids,
    duplicate_confirmation: recorded.duplicate_confirmation,
    task_id: result.task?.task_id || finalPending.task_id || null,
    final_state: result.task?.state || null,
    telegram_messages: (result.transcript || []).map((entry) => entry.text),
    reply: result.final_status?.text || renderStatus(result.task || {}).text,
  };
}

const OPERATIONAL_CLAIM = new RegExp([
  "\\b(status|progress|queued|queue|running|executing|in progress|started|starting)\\b",
  "\\b(completed|complete|done|finished|sent|delivered|emailed|called|dialed|published|deployed|imported|enriched|booked)\\b",
  "\\b(task|operation|execution|outreach|campaign)\\b.*\\b(state|stage|step)\\b",
].join("|"), "i");

export function isOperationalClaim(text) {
  return OPERATIONAL_CLAIM.test(clean(text));
}

export function safeReply(candidateText, task = null) {
  const text = clean(candidateText);
  if (!isOperationalClaim(text)) return { text, overridden: false, operational: false };
  if (!task || !clean(task.state)) {
    return {
      text: "There is no active operation backing that status. Nothing has been created or started.",
      overridden: true,
      operational: true,
      reason: "no_task",
    };
  }

  const check = assertClaimConsistent(text, task);
  if (check.ok) return { text, overridden: false, operational: true };
  return {
    text: renderStatus(task).text,
    overridden: true,
    operational: true,
    violations: check.violations,
  };
}

export async function statusFor(
  { taskId, operationType = "ops_revenue_now", correlationId } = {},
  options = {},
) {
  assertPersistentState();
  let task = null;
  if (clean(taskId)) task = await loadTask(clean(taskId));
  if (!task && clean(correlationId)) {
    const all = await loadAllTasks(options);
    task = all.find((candidate) =>
      clean(candidate.operation_type) === clean(operationType)
      && clean(candidate.correlation_id) === clean(correlationId)) || null;
  }
  if (!task) {
    return { found: false, text: "No durable task found for that request. Nothing has been created or started." };
  }
  const status = renderStatus(task);
  return {
    found: true,
    task_id: task.task_id,
    state: status.state,
    started: status.started,
    completed: status.completed,
    text: status.text,
  };
}
