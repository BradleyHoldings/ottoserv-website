import { assert, cleanupTestLedgers, startNextServer, testLedgerDir, waitForServer } from "./server-test-utils.mjs";

const root = process.cwd();
const port = 3102;
const base = `http://localhost:${port}`;
const dataDir = testLedgerDir(root, "verify-revenue-flow");

cleanupTestLedgers(root, dataDir);
const { server, getOutput } = startNextServer(root, port, { OTTO_CALL_IMPORT_DATA_DIR: dataDir });

try {
  await waitForServer(`${base}/`, getOutput);

  const capture = await post("/api/leads/capture", {
    name: "Taylor Morgan",
    company: "Orlando Property Management Group",
    email: "taylor@example.com",
    phone: "407-222-0199",
    website: "https://orlandopm.example",
    industry: "Property Management",
    estimated_call_volume: "75 calls/week",
    missed_call_concern: "leasing calls and after-hours maintenance calls are missed",
    message: "We handle rentals, leasing, HOA, apartments, tenant placement, and maintenance. Slow response complaints are showing up.",
    source_page: "/demo",
    intent: "book_demo",
    consent_to_contact: true,
  });
  assert(capture.status === "captured", "lead capture should import the demo request");
  assert(capture.imported?.[0]?.tier === "A-tier", "strong ICP inquiry should score as A-tier");

  const audit = await post("/api/audit/request", {
    name: "Morgan Lee",
    company_name: "Tampa Rentals PM",
    email: "morgan@example.com",
    phone: "813-222-0198",
    website: "https://tamparentals.example",
    business_type: "Property Management",
    biggest_operational_bottleneck: "missed calls and slow follow-up",
    consent_to_contact: true,
    source: "process_audit_page",
    pain_points: ["missed_calls", "slow_followup"],
    intake_summary: "Leasing, rentals, maintenance, tenant placement, and owner inquiries need faster routing.",
  });
  assert(audit.local_ops_status === "queued", "process audit should also enter the local ops queue");

  const packets = await fetch(`${base}/calls/jarvis-packets`).then((res) => res.json());
  assert(packets.count >= 1, "A-tier lead should produce a Jarvis call packet");
  assert(packets.packets[0].required_logging_fields_after_call.includes("status"), "packet should include required logging fields");

  const outcome = await post("/calls/outcomes", {
    lead_id: capture.imported[0].lead_id,
    phone: capture.imported[0].normalized_phone,
    status: "booked_meeting",
    summary: "Connected and booked a demo.",
    next_action: "Send calendar invite and prep demo.",
    follow_up_due: "2026-05-21",
    booking_link: "https://cal.example/demo",
    agent: "jarvis",
    source: "verify-revenue-flow",
  });
  assert(outcome.status === "logged", "call outcome should be logged");

  const status = await fetch(`${base}/calls/status`).then((res) => res.json());
  assert(status.dashboard.leads_imported_today >= 1, "status should show imported lead");
  assert(status.dashboard.jarvis_call_packets_ready >= 1, "status should show Jarvis packet");
  assert(status.dashboard.calls_completed >= 1, "status should show completed calls");
  assert(status.dashboard.appointments_booked >= 1, "status should show booked appointment");

  console.log("verify-revenue-flow: ok");
} finally {
  server.kill();
  cleanupTestLedgers(root, dataDir);
}

async function post(route, body) {
  const res = await fetch(`${base}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
