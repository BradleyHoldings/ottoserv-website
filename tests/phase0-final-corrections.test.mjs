// Final Phase-0 correction tests.

import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

async function setup(name) {
  const root = path.join(process.cwd(), ".phase0-test", `${name}-${Date.now()}`);
  await fs.mkdir(root, { recursive: true });
  process.env.HERMES_STATE_ROOT = root;
  process.env.HERMES_TASKS_DIR = path.join(root, "tasks");
  process.env.HERMES_APPROVALS_DIR = path.join(root, "approvals");
  process.env.HERMES_PENDING_DIR = path.join(root, "pending");
  process.env.HERMES_NOTIFY_STATE_DIR = path.join(root, "notify");
  process.env.HERMES_ALLOWED_TELEGRAM_USER_IDS = "111,222";
  process.env.HERMES_ALLOWED_CHAT_IDS = "999,888";
  return root;
}
const actor = { telegramUserId: "111", chatId: "999", verified: true, displayName: "Jonathan" };

test("confirmation requires an existing pending operation", async () => {
  const root = await setup("missing");
  try {
    const { handleRevenueConfirmation } = await import("../deploy/droplet/phase0/telegram-execution-bridge.mjs");
    const result = await handleRevenueConfirmation({
      actor,
      originalRequestMessageId: "req-missing",
      confirmationMessageId: "confirm-1",
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "pending_operation_not_found");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("expired pending operation is rejected", async () => {
  const root = await setup("expired");
  try {
    const bridge = await import("../deploy/droplet/phase0/telegram-execution-bridge.mjs");
    await bridge.handleOperationRequest({
      actor,
      originalRequestMessageId: "req-expired",
      expiresAt: "2020-01-01T00:00:00.000Z",
    });
    const result = await bridge.handleRevenueConfirmation({
      actor,
      originalRequestMessageId: "req-expired",
      confirmationMessageId: "confirm-expired",
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "pending_operation_expired");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("different requester or chat cannot confirm", async () => {
  const root = await setup("owner");
  try {
    const bridge = await import("../deploy/droplet/phase0/telegram-execution-bridge.mjs");
    await bridge.handleOperationRequest({ actor, originalRequestMessageId: "req-owner" });
    const other = { telegramUserId: "222", chatId: "888", verified: true, displayName: "Other" };
    const result = await bridge.handleRevenueConfirmation({
      actor: other,
      originalRequestMessageId: "req-owner",
      confirmationMessageId: "confirm-other",
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /requester_(user|chat)_mismatch/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("failed watchdog delivery is retried next tick", async () => {
  const root = await setup("retry");
  try {
    const { saveTask } = await import("../src/lib/execution/taskLifecycle.mjs");
    const { runWatchdogTick } = await import("../deploy/droplet/phase0/watchdog-notify.mjs");
    const now = "2026-06-05T12:30:00.000Z";
    await saveTask({
      task_id: "task-stalled",
      operation_type: "ops_revenue_now",
      correlation_id: "retry",
      state: "queued",
      created_at: "2026-06-05T12:00:00.000Z",
      updated_at: "2026-06-05T12:00:00.000Z",
      history: [],
    });

    let calls = 0;
    const fail = async () => { calls += 1; return { ok: false, reason: "offline" }; };
    const first = await runWatchdogTick({ now, notify: fail, autoRepair: false });
    const second = await runWatchdogTick({ now: "2026-06-05T12:32:00.000Z", notify: fail, autoRepair: false });

    assert.equal(first.alerts_failed.length, 1);
    assert.equal(second.alerts_failed.length, 1);
    assert.equal(calls, 2, "failed delivery was retried rather than suppressed");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
