// Minimal authenticated HTTP bridge between Hermes and a real browser adapter.
// The adapter module is supplied at runtime and owns Playwright/Chrome/session logic.
// No cookies or credentials are stored in this repository.

import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

const host = process.env.HERMES_BROWSER_BRIDGE_HOST || "127.0.0.1";
const port = Number(process.env.HERMES_BROWSER_BRIDGE_PORT || 7788);
const token = String(process.env.HERMES_BROWSER_BRIDGE_TOKEN || "").trim();
const adapterPath = String(process.env.HERMES_BROWSER_ADAPTER_MODULE || "").trim();

if (!adapterPath) {
  console.error("Set HERMES_BROWSER_ADAPTER_MODULE to an absolute .mjs adapter path.");
  process.exit(1);
}

const loaded = await import(pathToFileURL(path.resolve(adapterPath)).href);
const adapter = loaded.default || loaded.adapter || loaded;

function authorized(req) {
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function handle(req, res) {
  if (!authorized(req)) return json(res, 401, { error: "unauthorized" });
  try {
    if (req.method === "GET" && req.url === "/v1/capabilities") {
      const result = typeof adapter.capabilities === "function" ? await adapter.capabilities() : {};
      return json(res, 200, result);
    }
    if (req.method === "POST" && req.url === "/v1/research/lead") {
      if (typeof adapter.researchLead !== "function") return json(res, 501, { error: "research_not_supported" });
      const body = await readBody(req);
      return json(res, 200, await adapter.researchLead(body.lead || {}));
    }
    if (req.method === "POST" && req.url === "/v1/dm/send") {
      if (typeof adapter.sendDm !== "function") return json(res, 501, { error: "dm_not_supported" });
      const body = await readBody(req);
      return json(res, 200, await adapter.sendDm(body.packet || {}));
    }
    if (req.method === "POST" && req.url === "/v1/dm/replies") {
      if (typeof adapter.inspectDmReplies !== "function") return json(res, 501, { error: "reply_monitor_not_supported" });
      const body = await readBody(req);
      return json(res, 200, await adapter.inspectDmReplies(body));
    }
    return json(res, 404, { error: "not_found" });
  } catch (error) {
    return json(res, Number(error?.status) || 500, { error: String(error?.message || error), code: error?.code || "browser_bridge_error" });
  }
}

http.createServer(handle).listen(port, host, () => {
  console.log(JSON.stringify({ ok: true, host, port, adapter: path.resolve(adapterPath), auth: token ? "bearer" : "none" }));
});
