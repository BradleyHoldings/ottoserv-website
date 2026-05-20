import { existsSync, mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

export const testLedgerNames = [
  "leads.json",
  "outreach_queue.json",
  "daily_metrics.json",
  "form_submissions.json",
  "call_outcomes.json",
  "jarvis_call_packets.json",
];

export function testLedgerDir(root, name) {
  return path.join(root, ".tmp", "test-ledgers", name);
}

export function cleanupTestLedgers(root = process.cwd(), dataDir = path.join(root, "data", "call-imports")) {
  mkdirSync(dataDir, { recursive: true });
  for (const name of testLedgerNames) {
    const file = path.join(dataDir, name);
    if (existsSync(file)) rmSync(file);
  }
}

export function startNextServer(root, port, env = {}) {
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  return { server, getOutput: () => output };
}

export async function waitForServer(base, output) {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    try {
      const res = await fetch(base);
      if (res.status < 500) return;
    } catch {
      // Keep waiting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Next server did not start. Output:\n${output()}`);
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}
