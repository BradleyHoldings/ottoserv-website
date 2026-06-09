import { createOpportunityIntent } from "./intent.mjs";
import { persistOpportunityIntent } from "./store.mjs";

function asArray(v) { return Array.isArray(v) ? v : []; }
function clean(v) { return String(v ?? "").trim(); }

export async function createOpportunityIntentsFromEvidence({ leads = [], evidence = [] } = {}, options = {}) {
  const byLead = new Map(asArray(leads).map((lead) => [clean(lead.lead_id), lead]));
  const results = [];
  for (const source of asArray(evidence)) {
    const lead = byLead.get(clean(source.lead_id));
    if (!lead) {
      results.push({ ok: false, reason: "lead_not_found", source });
      continue;
    }
    const intent = createOpportunityIntent({ lead, source }, options);
    const persistence = options.persist === false ? { ok: true, status: "skipped" } : await persistOpportunityIntent(intent, options);
    results.push({ ok: persistence.ok !== false, intent, persistence });
  }
  return {
    ok: results.every((r) => r.ok),
    created: results.filter((r) => r.intent).length,
    results,
  };
}
