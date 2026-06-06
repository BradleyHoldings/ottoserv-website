import assert from "node:assert/strict";
import test from "node:test";

import { deriveStableLeadId } from "../src/lib/leads/canonicalLeadCore.mjs";

function legacyLeadId(company, contactKey, row) {
  const base = `${company}-${contactKey}-${row}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `lead_${base.slice(0, 80) || row}`;
}

test("Phase 1 identity does not change when CSV row changes", () => {
  const input = {
    company_name: "Bravo Plumbing LLC",
    normalized_phone: "4072220198",
    email: "dispatch@bravoplumbing.com",
    website: "https://bravoplumbing.com",
    city: "Orlando",
    state: "FL",
  };

  assert.notEqual(
    legacyLeadId(input.company_name, input.normalized_phone, 2),
    legacyLeadId(input.company_name, input.normalized_phone, 11),
    "legacy ID demonstrates the row-order defect",
  );

  assert.equal(deriveStableLeadId(input), deriveStableLeadId({ ...input }));
});

test("domain-first identity remains stable when phone or email changes", () => {
  const first = deriveStableLeadId({
    company_name: "Bravo Plumbing LLC",
    phone: "4072220198",
    email: "dispatch@bravoplumbing.com",
    website: "https://www.bravoplumbing.com/contact",
    city: "Orlando",
    state: "FL",
  });
  const changedContact = deriveStableLeadId({
    company_name: "Bravo Plumbing LLC",
    phone: "4072220200",
    email: "office@bravoplumbing.com",
    website: "bravoplumbing.com",
    city: "Orlando",
    state: "FL",
  });
  assert.equal(first, changedContact);
});

test("identity is deterministic for a company-location fallback", () => {
  const first = deriveStableLeadId({ company_name: "No Website Electric", city: "Cocoa", state: "FL" });
  const second = deriveStableLeadId({ company: "No Website Electric", city: "COCOA", state: "fl" });
  assert.equal(first, second);
  assert.match(first, /^lead_v1_[a-f0-9]{24}$/);
});
