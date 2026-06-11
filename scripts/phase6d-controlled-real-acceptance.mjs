#!/usr/bin/env node

import { runControlledRealServiceDeliveryAcceptance } from "../src/lib/serviceDeliveryControlledAcceptance.mjs";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const report = await runControlledRealServiceDeliveryAcceptance({
  now: arg("now") || process.env.PHASE6D_NOW || undefined,
  runId: arg("run-id") || process.env.SERVICE_DELIVERY_ACCEPTANCE_RUN_ID || undefined,
});

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
