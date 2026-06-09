import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("n8n workflow exports autonomous Hermes Gmail reply lookup using n8n Gmail runtime", () => {
  const exported = JSON.parse(readFileSync("n8n-workflows.json", "utf8"));
  const workflow = exported.workflows.find((w) => w.webhook_endpoint === "/hermes-controlled-gmail-reply-lookup");
  assert.ok(workflow, "reply lookup workflow exists");
  assert.equal(workflow.trigger.method, "POST");
  assert.equal(workflow.trigger.path, "/hermes-controlled-gmail-reply-lookup");

  const nodeTypes = workflow.nodes.map((n) => n.type);
  assert.ok(nodeTypes.includes("gmail"), "uses n8n Gmail node, not an out-of-band connector");
  assert.ok(nodeTypes.includes("function"), "normalizes evidence inside workflow");
  assert.equal(exported.webhook_urls.hermes_controlled_gmail_reply_lookup, "https://n8n.ottoserv.com/webhook/hermes-controlled-gmail-reply-lookup");

  const code = workflow.nodes.map((n) => n.config?.code || "").join("\n");
  assert.match(code, /reply_found: true/);
  assert.match(code, /status: 'not_found'/);
  assert.match(code, /provider_event_id/);
});
