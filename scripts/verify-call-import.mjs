import { assert, cleanupTestLedgers, startNextServer, testLedgerDir, waitForServer } from "./server-test-utils.mjs";

const root = process.cwd();
const port = 3100;
const base = `http://localhost:${port}`;
const key = "6622eb1f90ba8cd78b66b316efaa3423c3ae50128e0a4012975188fffc0bc3b8";
const dataDir = testLedgerDir(root, "verify-call-import");

cleanupTestLedgers(root, dataDir);

const { server, getOutput } = startNextServer(root, port, { OTTO_CALL_IMPORT_DATA_DIR: dataDir });

try {
  await waitForServer(`${base}/calls/import`, getOutput);
  await runChecks();
  console.log("verify-call-import: ok");
} finally {
  server.kill();
  cleanupTestLedgers(root, dataDir);
}

async function runChecks() {
  const docs = await fetch(`${base}/calls/import`);
  assert(docs.status === 200, "GET /calls/import should return 200");
  const docsJson = await docs.json();
  assert(docsJson.accepted_fields.includes("company"), "GET docs should list accepted fields");

  const noAuth = await fetch(`${base}/calls/import`, { method: "POST", body: JSON.stringify({ leads: [] }), headers: { "content-type": "application/json" } });
  assert(noAuth.status === 401, "POST without x-task-key should return 401");

  const dryRun = await postJson("/calls/import?dry_run=1", {
    leads: [
      validLead("Orlando Property Management", "407-222-1188"),
      validLead("Email Only Property Management", ""),
      { company: "Bad 555", phone: "407-555-0100", email: "bad@example.com", state: "FL" },
      { company: "Bad 000", phone: "407-000-0100", email: "bad000@example.com", state: "FL" },
      { company: "Toll Free", phone: "800-222-0100", email: "tf@example.com", state: "FL" },
    ],
  });
  assert(dryRun.accepted_count === 2, "dry-run should accept valid callable and email-only leads");
  assert(dryRun.rejected_count === 3, "dry-run should reject 555, 000, and toll-free numbers");
  assert(dryRun.rejected.some((row) => row.code === "reserved_555_phone"), "555 rejection should be explicit");
  assert(dryRun.rejected.some((row) => row.code === "placeholder_000_phone"), "000 rejection should be explicit");
  assert(dryRun.rejected.some((row) => row.code === "toll_free_phone"), "toll-free rejection should be explicit");

  const written = await postJson("/calls/import", { leads: [validLead("Tampa Property Management", "813-222-0191")] });
  assert(written.accepted_count === 1, "JSON write should import one lead");
  assert(written.imported[0].tier === "A-tier", "strong property management lead should be A-tier");
  assert(Boolean(written.imported[0].scheduled_call_local), "A-tier lead should receive local business-hours slot");

  const duplicate = await postJson("/calls/import", { leads: [validLead("Tampa Property Management", "813-222-0191")] });
  assert(duplicate.accepted_count === 0 && duplicate.duplicate_count === 1, "duplicate import should be skipped");

  const csv = [
    "company,phone,email,website,industry,city,state,notes,pain_signal",
    "Miami Rentals,305-222-0192,hello@miamirentals.example,miamirentals.example,Property Management,Miami,FL,leasing maintenance rentals,manual processes and missed calls",
    "Malformed,123,bad@bad.example,,Property Management,Miami,FL,,",
  ].join("\n");
  const csvResult = await fetch(`${base}/calls/import?validate=1`, {
    method: "POST",
    headers: { "content-type": "text/csv", "x-task-key": key },
    body: csv,
  }).then((res) => res.json());
  assert(csvResult.accepted_count === 1, "CSV validate should accept valid CSV row");
  assert(csvResult.rejected.some((row) => row.code === "malformed_phone"), "CSV validate should reject malformed phone");

  const status = await fetch(`${base}/calls/status`).then((res) => res.json());
  assert(status.dashboard.a_tier_leads_ready_to_call >= 1, "status report should show A-tier leads");
  assert(status.dashboard.calls_scheduled >= 1, "status report should show scheduled calls");
  assert(status.dashboard.jarvis_call_packets_ready >= 1, "status report should show Jarvis call packets");
}

function validLead(company, phone) {
  return {
    company,
    phone,
    email: `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
    website: `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.example`,
    industry: "Property Management",
    city: "Orlando",
    state: "FL",
    notes: "rentals leasing HOA apartments maintenance tenant placement property management",
    pain_signal: "missed calls and slow response complaints",
  };
}

async function postJson(route, body) {
  const res = await fetch(`${base}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-task-key": key },
    body: JSON.stringify(body),
  });
  return res.json();
}
