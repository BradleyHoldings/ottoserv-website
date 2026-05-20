import assert from "node:assert/strict";
import test from "node:test";

import {
  getActionState,
  getComingSoonState,
  getIntegrationRequiredState,
  getNotConfiguredState,
} from "../src/lib/dashboardActions.mjs";

test("integration required state names the integration and next step", () => {
  const state = getIntegrationRequiredState("QuickBooks", "Connect a billing source to create invoices.");

  assert.equal(state.tone, "integration_required");
  assert.equal(state.title, "QuickBooks required");
  assert.match(state.description, /Connect QuickBooks/);
  assert.match(state.description, /billing source/);
  assert.equal(state.primaryLabel, "Open integrations");
});

test("coming soon state uses feature-specific copy", () => {
  const state = getComingSoonState("Marketplace packages");

  assert.equal(state.tone, "coming_soon");
  assert.equal(state.title, "Marketplace packages coming soon");
  assert.match(state.description, /is not wired yet/);
  assert.equal(state.primaryLabel, "Got it");
});

test("not configured state explains setup is needed", () => {
  const state = getNotConfiguredState("Team / Labor");

  assert.equal(state.tone, "not_configured");
  assert.equal(state.title, "Team / Labor is not configured yet");
  assert.match(state.description, /settings or connect an integration/);
  assert.equal(state.primaryLabel, "Open settings");
});

test("generic action state falls back safely", () => {
  const state = getActionState("info", { featureName: "Reports" });

  assert.equal(state.tone, "info");
  assert.equal(state.title, "Reports");
  assert.match(state.description, /No action was taken/);
});
