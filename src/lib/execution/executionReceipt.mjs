// ─── Execution receipt validator (anti-false-claim gate) ──────────────────────
//
// THE DEFECT THIS FIXES
// Hermes claimed execution with no artifact behind it. This module defines what
// counts as a DURABLE EXECUTION RECEIPT and refuses anything that is merely intent:
// a plan, a proposed command, a tool intention, a natural-language statement, or an
// in-memory flag are NOT receipts. A state that claims work happened can only be
// entered with a receipt that validates here.
//
// It ALSO separates STUB evidence (tests / disabled transports) from PRODUCTION
// evidence, so a stub send can never be presented to Jonathan as a real send.

function clean(v) { return String(v ?? "").trim(); }

// Things that are explicitly NOT evidence, no matter how they are dressed up.
const NON_EVIDENCE_KINDS = new Set([
  "plan", "intent", "tool_intention", "proposed_command", "statement",
  "natural_language", "in_memory_flag", "assumption", "belief",
]);

// What a valid receipt looks like per rail. Each rail requires at least one
// durable, verifiable identifier field.
const RAIL_RECEIPT_FIELDS = {
  queue:      ["queue_record_id", "db_row_id", "task_id"],
  worker:     ["worker_ack_id", "worker_id"],
  running:    ["process_id", "workflow_execution_id", "run_id", "heartbeat_at"],
  stage:      ["stage_evidence_ref", "evidence_reference", "message_id", "call_id", "row_id"],
  completion: ["completion_evidence_ref", "evidence_reference", "message_id", "call_id"],
  email:      ["message_id", "smtp_id", "provider_message_id"],
  call:       ["call_id", "retell_call_id"],
  api:        ["request_id", "response_id"],
  transport:  ["transport_receipt_id", "message_id", "call_id"],
};

/**
 * Validate an execution receipt. Returns { ok, reason, reference, production }.
 *
 * @param {object} receipt the candidate evidence object
 * @param {object} options { expectedRail, allowStub }
 *   - expectedRail: one of RAIL_RECEIPT_FIELDS keys (the state's required rail)
 *   - allowStub: when true, a receipt explicitly marked source:"stub" is accepted
 *     as a receipt BUT flagged production:false (for tests / disabled transports).
 */
export function validateReceipt(receipt, options = {}) {
  const rail = clean(options.expectedRail);
  if (!receipt || typeof receipt !== "object") {
    return { ok: false, reason: "no_receipt", reference: "", production: false };
  }
  const kind = clean(receipt.kind || receipt.type);
  if (NON_EVIDENCE_KINDS.has(kind)) {
    return { ok: false, reason: `not_evidence:${kind}`, reference: "", production: false };
  }

  const source = clean(receipt.source || receipt.evidence_source).toLowerCase();
  const isStub = source === "stub" || source === "mock" || source === "test" || receipt.stub === true || receipt.simulated === true;
  if (isStub && !options.allowStub) {
    return { ok: false, reason: "stub_evidence_not_allowed_in_production", reference: "", production: false };
  }

  // Find a durable identifier matching the expected rail (or any rail if unspecified).
  const fieldSets = rail && RAIL_RECEIPT_FIELDS[rail] ? [RAIL_RECEIPT_FIELDS[rail]] : Object.values(RAIL_RECEIPT_FIELDS);
  let reference = "";
  for (const fields of fieldSets) {
    for (const f of fields) {
      if (clean(receipt[f])) { reference = clean(receipt[f]); break; }
    }
    if (reference) break;
  }
  if (!reference) {
    return { ok: false, reason: rail ? `missing_durable_id_for_${rail}` : "missing_durable_id", reference: "", production: false };
  }

  // A persisted=true / durable=true claim must be backed by a reference (it is).
  return { ok: true, reason: "valid", reference, production: !isStub };
}

// Strict production check: a completion claim shown to Jonathan must be production
// evidence (not stub), unless the caller explicitly operates in test/dry mode.
export function isProductionReceipt(receipt, expectedRail) {
  const r = validateReceipt(receipt, { expectedRail, allowStub: true });
  return r.ok && r.production === true;
}

// Build a stub receipt (clearly labeled) for tests / disabled transports.
export function stubReceipt(rail, reference, extra = {}) {
  return { kind: "receipt", source: "stub", expected_rail: rail, evidence_reference: reference, ...extra };
}
