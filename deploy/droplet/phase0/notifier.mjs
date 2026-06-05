// ─── Phase 0: notifyJonathan() interface ─────────────────────────────────────
// Transport order: injected notifier, local queue, direct Telegram fallback,
// then stdout/journald. Failed delivery is never treated as success.

import { promises as fs } from "node:fs";
import path from "node:path";

function clean(v) { return String(v ?? "").trim(); }

async function enqueueLocal(alert, dir) {
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `alert-${clean(alert.task_id)}-${Date.now()}.json`);
  const temp = `${file}.tmp-${process.pid}`;
  await fs.writeFile(temp, `${JSON.stringify({ at: new Date().toISOString(), alert }, null, 2)}\n`, "utf8");
  await fs.rename(temp, file);
  return { ok: true, transport: "local_queue", ref: file };
}

async function sendTelegramDirect(alert) {
  const token = clean(process.env.TELEGRAM_BOT_TOKEN);
  const chat = clean(process.env.TELEGRAM_CHAT_ID);
  if (!token || !chat) return { ok: false, transport: "none", reason: "telegram_unconfigured" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: alert.proactive_message }),
    });
    if (!res.ok) return { ok: false, transport: "telegram_api", status: res.status, reason: `telegram_http_${res.status}` };
    return { ok: true, transport: "telegram_api", status: res.status };
  } catch (err) {
    return { ok: false, transport: "telegram_api", reason: String(err?.message || err) };
  }
}

export async function notifyJonathan(alert, options = {}) {
  if (typeof options.notify === "function") {
    const result = await options.notify(alert);
    return { ok: result?.ok !== false, transport: "injected", ...(result || {}) };
  }

  const queueDir = clean(process.env.HERMES_NOTIFY_QUEUE_DIR);
  if (queueDir) return enqueueLocal(alert, queueDir);

  const direct = await sendTelegramDirect(alert);
  if (direct.transport !== "none") return direct;

  console.log("[notifyJonathan — no transport configured]", alert.proactive_message);
  return { ok: false, transport: "stdout", reason: "no_notification_transport" };
}
