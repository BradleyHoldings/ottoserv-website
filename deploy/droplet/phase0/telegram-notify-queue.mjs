#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

function clean(value) {
  return String(value ?? "").trim();
}

const queueDir = clean(process.env.HERMES_NOTIFY_QUEUE_DIR);
const token = clean(process.env.TELEGRAM_BOT_TOKEN);
const chatId = clean(process.env.TELEGRAM_HOME_CHANNEL);
const threadId = clean(process.env.TELEGRAM_HOME_CHANNEL_THREAD_ID);

if (!queueDir) {
  console.error("notify_queue: HERMES_NOTIFY_QUEUE_DIR is missing");
  process.exit(2);
}

if (!token || !chatId) {
  console.error("notify_queue: Telegram destination is not configured");
  process.exit(2);
}

async function listQueueFiles() {
  try {
    return (await fs.readdir(queueDir))
      .filter((name) => name.endsWith(".json"))
      .sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function sendTelegram(text) {
  const payload = {
    chat_id: chatId,
    text,
  };

  if (threadId) {
    payload.message_thread_id = threadId;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const body = await response.json().catch(() => ({}));

  return {
    ok: response.ok && body?.ok === true,
    status: response.status,
    telegram_message_id: body?.result?.message_id ?? null,
    description: body?.description ?? "",
  };
}

const files = await listQueueFiles();
const delivered = [];
const failed = [];

for (const name of files) {
  const file = path.join(queueDir, name);

  try {
    const record = JSON.parse(await fs.readFile(file, "utf8"));
    const alert = record.alert ?? record;
    const text = clean(
      alert.proactive_message
      ?? alert.message
      ?? record.message,
    );

    if (!text) {
      failed.push({
        file: name,
        reason: "missing_message",
      });
      continue;
    }

    const result = await sendTelegram(text);

    if (!result.ok) {
      failed.push({
        file: name,
        reason: "telegram_delivery_failed",
        status: result.status,
        description: result.description,
      });
      continue;
    }

    await fs.unlink(file);

    delivered.push({
      file: name,
      telegram_message_id: result.telegram_message_id,
    });
  } catch (error) {
    failed.push({
      file: name,
      reason: String(error?.message ?? error),
    });
  }
}

console.log(JSON.stringify({
  scanned: files.length,
  delivered,
  failed,
}, null, 2));

process.exit(failed.length > 0 ? 1 : 0);
