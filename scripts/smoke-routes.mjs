import { assert, startNextServer, waitForServer } from "./server-test-utils.mjs";

const root = process.cwd();
const port = 3103;
const base = `http://localhost:${port}`;

const routes = [
  ["/", 200],
  ["/pricing", 200],
  ["/demo", 200],
  ["/process-audit", 200],
  ["/ai-receptionist", 200],
  ["/missed-call-recovery", 200],
  ["/lead-qualification-agent", 200],
  ["/lead-qualification", 307],
  ["/industries/property-management-ai-receptionist", 200],
  ["/property-management-ai-receptionist", 307],
  ["/trades-ai-receptionist", 200],
  ["/api/leads/capture", 405],
  ["/calls/import", 200],
  ["/calls/status", 200],
  ["/calls/jarvis-packets", 200],
];

const { server, getOutput } = startNextServer(root, port);

try {
  await waitForServer(`${base}/`, getOutput);
  for (const [route, expected] of routes) {
    const res = await fetch(`${base}${route}`, { redirect: "manual" });
    assert(res.status === expected, `${route} expected ${expected}, got ${res.status}`);
  }
  console.log("smoke-routes: ok");
} finally {
  server.kill();
}
