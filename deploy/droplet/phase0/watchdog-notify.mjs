// ─── Watchdog → proactive notifier (Phase 0) ──────────────────────────────────

import { loadAllTasks, saveTask } from "../../../src/lib/execution/taskLifecycle.mjs";
import { runWatchdog, applySafeRepair } from "../../../src/lib/execution/watchdog.mjs";
import { shouldNotify, recordSent, reconcileResolved, alertKey } from "./notificationState.mjs";
import { notifyJonathan } from "./notifier.mjs";

function clean(v) { return String(v ?? "").trim(); }

export async function runWatchdogTick(options = {}) {
  const now = options.now || new Date().toISOString();
  const autoRepair = options.autoRepair ?? (process.env.WATCHDOG_AUTOREPAIR !== "false");
  const cooldownMin = options.cooldownMin;

  const tasks = await loadAllTasks(options);
  const wd = runWatchdog(tasks, { now });

  const repairs = [];
  const handoffs = [];
  if (autoRepair) {
    for (const alert of wd.alerts) {
      const task = tasks.find((candidate) => candidate.task_id === alert.task_id);
      if (!task) continue;
      const repair = applySafeRepair(task, alert, { now });
      if (repair.applied && repair.task) {
        await saveTask(repair.task, options);
        repairs.push({ task_id: task.task_id, repair: repair.repair, new_state: repair.task.state });
      } else if (repair.correction) {
        repairs.push({ task_id: task.task_id, repair: "conversational_correction" });
      } else if (repair.handoff) {
        handoffs.push(repair.handoff);
      }
    }
  }

  const sent = [];
  const failed = [];
  const suppressed = [];
  const activeKeys = wd.alerts.map(alertKey);

  for (const alert of wd.alerts) {
    const decision = await shouldNotify(alert, { now, cooldownMin, ...options });
    if (!decision.send) {
      suppressed.push({
        task_id: alert.task_id,
        failure_class: alert.failure_class,
        reason: decision.reason,
      });
      continue;
    }

    const delivery = await notifyJonathan(alert, options);

    // Only a successful delivery starts the sent-alert cooldown.
    // A failed delivery remains eligible for retry on the next timer tick.
    if (delivery.ok) {
      await recordSent(alert, { now, ...options });
      sent.push({
        task_id: alert.task_id,
        failure_class: alert.failure_class,
        reason: decision.reason,
        transport: delivery.transport,
        ok: true,
      });
    } else {
      failed.push({
        task_id: alert.task_id,
        failure_class: alert.failure_class,
        reason: decision.reason,
        transport: delivery.transport,
        delivery_reason: delivery.reason || "delivery_failed",
        ok: false,
      });
    }
  }

  const reconciled = await reconcileResolved(activeKeys, { now, ...options });

  return {
    generated_at: now,
    summary: wd.summary,
    alerts_sent: sent,
    alerts_failed: failed,
    alerts_suppressed: suppressed,
    resolved_marked: reconciled.resolved,
    auto_repairs_applied: repairs,
    escalation_handoffs: handoffs,
  };
}

const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
  const tasksDir = clean(process.env.HERMES_TASKS_DIR);
  if (!tasksDir || tasksDir === "/tmp" || tasksDir.startsWith("/tmp/")) {
    console.error("watchdog_notify: refusing ephemeral state.");
    process.exit(2);
  }
  const output = await runWatchdogTick({
    now: process.env.HERMES_NOW || new Date().toISOString(),
  });
  console.log(JSON.stringify({ ...output, note: "No sends/dials performed." }, null, 2));
}
