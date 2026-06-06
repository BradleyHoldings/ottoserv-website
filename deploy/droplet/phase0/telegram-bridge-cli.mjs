#!/usr/bin/env node

import {
  handleOperationRequest,
  handleRevenueConfirmation,
  statusFor,
} from "./telegram-execution-bridge.mjs";

async function readInput() {
  let body = "";
  for await (const chunk of process.stdin) body += chunk;
  return body.trim() ? JSON.parse(body) : {};
}

try {
  const action = process.argv[2];
  const input = await readInput();

  let result;

  if (action === "request") {
    result = await handleOperationRequest(input);
  } else if (action === "confirm") {
    result = await handleRevenueConfirmation(input);

    if (result && typeof result === "object") {
      const state = String(result.final_state || "");

      if (state === "partially_completed") {
        result.reply =
          "DRY RUN — partially completed. Remaining work is pending; no external outreach was sent.";
      } else if (typeof result.reply === "string") {
        result.reply = `DRY RUN — ${result.reply}`;
      }

      result.phase0_mode = "dry";
      result.external_outreach_sent = false;
    }
  } else if (action === "status") {
    result = await statusFor(input);
  } else {
    throw new Error(
      "Usage: telegram-bridge-cli.mjs request|confirm|status",
    );
  }

  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(result?.ok === false ? 1 : 0);
} catch (error) {
  process.stdout.write(
    `${JSON.stringify({
      ok: false,
      reason: "bridge_cli_error",
      error: String(error?.message || error),
    })}\n`,
  );
  process.exit(1);
}
