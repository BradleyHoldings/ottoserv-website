// Hermes execution watchdog runner. Scans durable task state, detects stalls /
// mismatches / unverifiable completions, applies SAFE idempotent repairs, demotes
// false completions to verification_failed, and emits PROACTIVE alerts the droplet
// must forward to Jonathan WITHOUT being asked. Safe to schedule (cron / loop).
//
// It triggers no sends/dials/payments. Non-auto-repairable issues produce a repair
// handoff (to operator / Codex/Opus) instead of silent failure.
//
// Env: HERMES_TASKS_DIR, HERMES_NOW, WATCHDOG_AUTOREPAIR (default true).

import { loadAllTasks, saveTask } from "../src/lib/execution/taskLifecycle.mjs";
import { runWatchdog, applySafeRepair } from "../src/lib/execution/watchdog.mjs";

const now = process.env.HERMES_NOW || new Date().toISOString();
const autoRepair = process.env.WATCHDOG_AUTOREPAIR !== "false";

const tasks = await loadAllTasks({});
const wd = runWatchdog(tasks, { now });

const repairs = [];
const handoffs = [];
if (autoRepair) {
  for (const alert of wd.alerts) {
    const task = tasks.find((t) => t.task_id === alert.task_id);
    if (!task) continue;
    const r = applySafeRepair(task, alert, { now });
    if (r.applied && r.task) { await saveTask(r.task, {}); repairs.push({ task_id: task.task_id, repair: r.repair, new_state: r.task.state }); }
    else if (r.correction) { repairs.push({ task_id: task.task_id, repair: "conversational_correction", correction: r.correction }); }
    else if (r.handoff) { handoffs.push(r.handoff); }
  }
}

console.log(JSON.stringify({
  generated_at: now,
  summary: wd.summary,
  proactive_alerts: wd.alerts.map((a) => ({ task_id: a.task_id, failure_class: a.failure_class, severity: a.severity, message: a.proactive_message })),
  auto_repairs_applied: repairs,
  escalation_handoffs: handoffs,
  note: "Proactive: these alerts are sent to Jonathan without being asked. No sends/dials performed.",
}, null, 2));
