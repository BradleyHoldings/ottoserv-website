import assert from "node:assert/strict";
import test from "node:test";

import {
  claimOpportunityIntent,
  persistOpportunityIntent,
  writeBookingEvidence,
} from "../src/lib/opportunityRail/store.mjs";

function fakeClient() {
  const byId = new Map();
  const byKey = new Map();
  const bookings = new Map();
  return {
    async readIntent(intent_id) {
      return byId.get(intent_id) || null;
    },
    async upsertIntent(intent, expectedVersion) {
      const current = byId.get(intent.intent_id);
      if (current && Number(current.version) !== expectedVersion) {
        return { ok: false, status: "conflict", reason: "version_conflict", current_version: current.version };
      }
      const existingId = byKey.get(intent.idempotency_key);
      if (existingId && existingId !== intent.intent_id) {
        return { ok: false, status: "duplicate", reason: "duplicate_idempotency_key", existing_intent_id: existingId };
      }
      byId.set(intent.intent_id, { raw_intent: intent, version: intent.version, lifecycle_state: intent.lifecycle_state });
      byKey.set(intent.idempotency_key, intent.intent_id);
      return { ok: true };
    },
    async claim(intent_id, owner, leaseSeconds, now) {
      const row = byId.get(intent_id);
      if (!row) return { ok: false, status: "missing" };
      const intent = row.raw_intent;
      if (intent.lease_owner && new Date(intent.lease_expires_at) > new Date(now)) {
        return { ok: false, status: "leased", lease_owner: intent.lease_owner };
      }
      const leaseExpires = new Date(new Date(now).getTime() + leaseSeconds * 1000).toISOString();
      const claimed = { ...intent, lifecycle_state: "claimed", lease_owner: owner, lease_expires_at: leaseExpires, version: intent.version + 1 };
      byId.set(intent_id, { raw_intent: claimed, version: claimed.version, lifecycle_state: claimed.lifecycle_state });
      return { ok: true, intent: claimed, lease_expires_at: leaseExpires };
    },
    async writeBookingEvidence(row) {
      if (bookings.has(row.provider_event_id)) return { ok: true, deduped: true, rows: [] };
      bookings.set(row.provider_event_id, row);
      return { ok: true, rows: [row], deduped: false };
    },
    async readBookingEvidence(provider_event_id) {
      return bookings.get(provider_event_id) || null;
    },
  };
}

const intent = {
  intent_id: "oppact_1",
  idempotency_key: "lead-1:v1:gmail-reply-1:send_meeting_link",
  lead_ref: { lead_id: "lead-1", version: 1 },
  lifecycle_state: "approved",
  selected_action: "send_meeting_link",
  version: 1,
};

test("persistOpportunityIntent verifies read-after-write and rejects duplicate idempotency keys", async () => {
  const client = fakeClient();

  const persisted = await persistOpportunityIntent(intent, { client });
  assert.equal(persisted.ok, true);
  assert.equal(persisted.status, "persisted");

  const duplicate = await persistOpportunityIntent({ ...intent, intent_id: "oppact_other" }, { client });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.status, "duplicate_idempotency");
});

test("claimOpportunityIntent allows one lease owner until timeout then permits restart recovery", async () => {
  const client = fakeClient();
  await persistOpportunityIntent(intent, { client });

  const first = await claimOpportunityIntent("oppact_1", { owner: "worker-a", now: "2026-06-09T14:00:00.000Z", leaseSeconds: 60, client });
  assert.equal(first.ok, true);
  assert.equal(first.intent.lease_owner, "worker-a");

  const second = await claimOpportunityIntent("oppact_1", { owner: "worker-b", now: "2026-06-09T14:00:30.000Z", leaseSeconds: 60, client });
  assert.equal(second.ok, false);
  assert.equal(second.status, "leased");

  const afterTimeout = await claimOpportunityIntent("oppact_1", { owner: "worker-b", now: "2026-06-09T14:02:00.000Z", leaseSeconds: 60, client });
  assert.equal(afterTimeout.ok, true);
  assert.equal(afterTimeout.intent.lease_owner, "worker-b");
});

test("writeBookingEvidence is idempotent and read-after-write verified", async () => {
  const client = fakeClient();
  const row = {
    booking_id: "book_1",
    provider_event_id: "cal_evt_1",
    lead_id: "lead-1",
    intent_id: "oppact_1",
    attendee: "jonathan+phase4@example.com",
    scheduled_start_at: "2026-06-10T15:00:00.000Z",
    status: "confirmed",
  };

  const first = await writeBookingEvidence(row, { client });
  const second = await writeBookingEvidence(row, { client });

  assert.equal(first.ok, true);
  assert.equal(first.deduped, false);
  assert.equal(second.ok, true);
  assert.equal(second.deduped, true);
});
