// Read-only capability probe for the Hermes browser bridge. No navigation, send,
// login, or credential mutation occurs here.

import { browserBridgeConfig, createBrowserProvider, summarizeBrowserCapabilities } from "../src/lib/hermesBrowserProvider.mjs";

const config = browserBridgeConfig();
if (!config.configured) {
  console.log(JSON.stringify({
    ok: false,
    configured: false,
    provider: config.provider,
    missing_env: ["HERMES_BROWSER_BRIDGE_URL"],
    note: "Set the bridge URL where Hermes runs. HERMES_BROWSER_BRIDGE_TOKEN is optional but strongly recommended.",
  }, null, 2));
  process.exit(0);
}

const provider = createBrowserProvider({ config });
try {
  const raw = await provider.capabilities();
  console.log(JSON.stringify({ ok: true, configured: true, provider: config.provider, capabilities: summarizeBrowserCapabilities(raw) }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ ok: false, configured: true, provider: config.provider, error: String(error?.message || error), details: error?.details || null }, null, 2));
  process.exitCode = 1;
}
