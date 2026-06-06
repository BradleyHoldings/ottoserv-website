// ─── Phase 1 lead rail: dedupe + identity reconciliation ──────────────────────
//
// Deduplicates against (a) the current import, (b) existing Supabase records, and
// (c) ALIASES — records whose phone/email/domain changed but that are still the
// same lead by another shared durable key. A repeated import UPDATES/RECONCILES one
// lead; it never creates a second. Includes STALE-IMPORT PROTECTION: a fresher
// existing record is never overwritten by an older import. PURE.

import { identityKeys, deriveLeadId } from "./identity.mjs";

function clean(v) {
  return String(v ?? "").trim();
}
function freshness(rec) {
  const t = Date.parse(clean(rec.last_validated_at) || clean(rec.imported_at) || clean(rec.updated_at) || clean(rec.created_at));
  return Number.isNaN(t) ? 0 : t;
}

// Union-find over identity keys so any chain of shared keys forms one lead group.
class UnionFind {
  constructor() { this.parent = new Map(); }
  find(x) {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root);
    while (this.parent.get(x) !== root) { const next = this.parent.get(x); this.parent.set(x, root); x = next; }
    return root;
  }
  union(a, b) { this.parent.set(this.find(a), this.find(b)); }
}

function mergeAttributes(members) {
  // Freshest-wins per field; never overwrite a present value with an empty one.
  const ordered = [...members].sort((a, b) => freshness(a.record) - freshness(b.record)); // old → new
  const merged = {};
  const FIELDS = ["company_name", "contact_name", "normalized_phone", "email", "website",
    "industry", "city", "state", "timezone", "source_url", "source_type", "source_evidence",
    "discovered_at", "score", "tier", "score_reasons", "scoring_version", "pipeline_stage",
    "eligibility", "next_action", "enrichment_status", "record_status", "contact_validation",
    "fit_validation", "quarantine_reasons", "schema_version", "last_validated_at"];
  for (const m of ordered) {
    for (const f of FIELDS) {
      const val = m.record[f];
      if (val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)) {
        merged[f] = val;
      }
    }
  }
  return merged;
}

/**
 * Reconcile incoming canonical leads against existing canonical records.
 * Returns {
 *   upserts[],        // new + updated records to persist (canonical leads, version bumped)
 *   all[],            // full reconciled set (incl. unchanged existing)
 *   aliases[],        // { lead_id, changed:[{kind, from, to}] }
 *   stats: { incoming, new, updated, duplicates, stale_skipped, unchanged }
 * }
 */
export function dedupeAndReconcile(incoming = [], existing = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const inc = Array.isArray(incoming) ? incoming : [];
  const exist = Array.isArray(existing) ? existing : [];

  const uf = new UnionFind();
  const members = []; // { record, origin: 'existing'|'incoming', incomingIndex? }

  const addMember = (record, origin, incomingIndex) => {
    const keys = identityKeys(record);
    const idx = members.length;
    members.push({ record, origin, incomingIndex, keys });
    // Anchor each record to its own node so a keyless record still forms a group.
    const selfNode = `m:${idx}`;
    uf.find(selfNode);
    for (const k of keys) uf.union(selfNode, `k:${k}`);
    members[idx].node = selfNode;
  };

  exist.forEach((r) => addMember(r, "existing"));
  inc.forEach((r, i) => addMember(r, "incoming", i));

  // Group members by union root.
  const groups = new Map();
  members.forEach((m) => {
    const root = uf.find(m.node);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(m);
  });

  const upserts = [];
  const all = [];
  const aliases = [];
  const stats = { incoming: inc.length, new: 0, updated: 0, duplicates: 0, stale_skipped: 0, unchanged: 0 };

  for (const group of groups.values()) {
    const existingMembers = group.filter((m) => m.origin === "existing");
    const incomingMembers = group.filter((m) => m.origin === "incoming");
    const baseExisting = existingMembers[0]?.record || null;

    if (!baseExisting) {
      // Brand-new lead. Collapse any within-file duplicates into one.
      const merged = mergeAttributes(incomingMembers);
      const lead_id = deriveLeadId(merged) || clean(incomingMembers[0].record.lead_id);
      const record = { ...merged, lead_id, version: 1, created_at: clean(incomingMembers[0].record.created_at) || now, updated_at: now };
      upserts.push(record);
      all.push(record);
      stats.new += 1;
      stats.duplicates += Math.max(0, incomingMembers.length - 1);
      continue;
    }

    // Existing lead in this group.
    if (incomingMembers.length === 0) {
      all.push(baseExisting);
      stats.unchanged += 1;
      continue;
    }

    const freshestIncoming = [...incomingMembers].sort((a, b) => freshness(b.record) - freshness(a.record))[0].record;
    // STALE PROTECTION: do not overwrite a fresher existing record with an older import.
    if (freshness(freshestIncoming) < freshness(baseExisting)) {
      all.push(baseExisting);
      stats.duplicates += incomingMembers.length;
      stats.stale_skipped += incomingMembers.length;
      continue;
    }

    // Reconcile: keep the STABLE existing lead_id, merge freshest attributes, bump version.
    const merged = mergeAttributes([...existingMembers, ...incomingMembers]);
    const lead_id = clean(baseExisting.lead_id) || deriveLeadId(merged);
    const changed = detectAliasChanges(baseExisting, merged);
    const record = {
      ...merged,
      lead_id,
      version: Number(baseExisting.version || 1) + 1,
      created_at: clean(baseExisting.created_at) || now,
      updated_at: now,
      previous_lead_id: clean(baseExisting.lead_id) !== lead_id ? clean(baseExisting.lead_id) : undefined,
    };
    if (changed.length) aliases.push({ lead_id, changed });
    upserts.push(record);
    all.push(record);
    stats.updated += 1;
    stats.duplicates += Math.max(0, incomingMembers.length - 1);
  }

  return { upserts, all, aliases, stats };
}

function detectAliasChanges(existing, merged) {
  const changed = [];
  for (const kind of ["normalized_phone", "email", "website"]) {
    const from = clean(existing[kind]);
    const to = clean(merged[kind]);
    if (from && to && from !== to) changed.push({ kind, from, to });
  }
  return changed;
}
