import assert from "node:assert/strict";
import test from "node:test";

import {
  computeCrmMetrics,
  normalizeCrmCollections,
  getJarvisCrmResponse,
} from "../src/lib/crm.mjs";

test("normalizes missing CRM collections to safe empty arrays", () => {
  const crm = normalizeCrmCollections({});

  assert.deepEqual(crm.contacts, []);
  assert.deepEqual(crm.companies, []);
  assert.deepEqual(crm.deals, []);
  assert.deepEqual(crm.tasks, []);
  assert.deepEqual(crm.activities, []);
});

test("computes zero metrics when CRM data is empty", () => {
  const metrics = computeCrmMetrics(normalizeCrmCollections({}));

  assert.equal(metrics.totalContacts, 0);
  assert.equal(metrics.activeLeads, 0);
  assert.equal(metrics.openDeals, 0);
  assert.equal(metrics.pipelineValue, 0);
  assert.equal(metrics.tasksDue, 0);
  assert.equal(metrics.winRate, 0);
});

test("normalizes malformed CRM records before computing metrics", () => {
  const crm = normalizeCrmCollections({
    contacts: [{ id: "c1", firstName: "Ada", status: "lead" }],
    deals: [
      { id: "d1", stage: "proposal sent", value: "12500", status: "open" },
      { id: "d2", stage: "Won", value: 3000 },
      { id: "d3", stage: "lost", value: null },
    ],
    tasks: [{ id: "t1", status: "open" }, { id: "t2", status: "done" }],
    activities: [{ id: "a1", description: null, createdAt: null }],
  });

  assert.equal(crm.activities[0].type, "note");
  assert.equal(crm.activities[0].description, "CRM activity logged.");

  const metrics = computeCrmMetrics(crm);
  assert.equal(metrics.totalContacts, 1);
  assert.equal(metrics.activeLeads, 1);
  assert.equal(metrics.openDeals, 1);
  assert.equal(metrics.pipelineValue, 12500);
  assert.equal(metrics.tasksDue, 1);
  assert.equal(metrics.winRate, 50);
});

test("Jarvis follow-up prompt safely returns an empty-state answer", () => {
  const response = getJarvisCrmResponse(
    "Which leads need follow-up today?",
    normalizeCrmCollections({})
  );

  assert.match(response.title, /follow-up/i);
  assert.match(response.body, /No follow-ups/i);
});
