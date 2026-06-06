// ─── Phase 1 lead rail: dedupe + identity reconciliation ──────────────────────
// PURE. Reconciles current identity keys plus durable alias matches while keeping
// the original canonical lead_id stable.

import { identityKeys, deriveLeadId, normalizeDomain, normalizePhone, normalizeEmail } from "./identity.mjs";

function clean(v) { return String(v ?? "").trim(); }
function freshness(rec) {
  const t = Date.parse(clean(rec.last_validated_at) || clean(rec.imported_at) || clean(rec.updated_at) || clean(rec.created_at));
  return Number.isNaN(t) ? 0 : t;
}

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
  const ordered = [...members].sort((a, b) => freshness(a.record) - freshness(b.record));
  const merged = {};
  const FIELDS = ["company_name", "contact_name", "normalized_phone", "email", "website",
    "industry", "city", "state", "timezone", "source_url", "source_type", "source_evidence",
    "discovered_at", "imported_at", "score", "tier", "score_reasons", "scoring_version", "pipeline_stage",
    "eligibility", "next_action", "enrichment_status", "record_status", "contact_validation",
    "fit_validation", "quarantine_reasons", "external_outreach_allowed", "schema_version", "last_validated_at"];
  for (const m of ordered) for (const f of FIELDS) {
    const val = m.record[f];
    if (val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)) merged[f] = val;
  }
  return merged;
}

export function dedupeAndReconcile(incoming = [], existing = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const inc = Array.isArray(incoming) ? incoming : [];
  const exist = Array.isArray(existing) ? existing : [];
  const aliasMatches = options.aliasMatches instanceof Map
    ? options.aliasMatches
    : new Map(Object.entries(options.aliasMatches || {}));

  const uf = new UnionFind();
  const members = [];
  const addMember = (record, origin, incomingIndex) => {
    const keys = identityKeys(record);
    const idx = members.length;
    members.push({ record, origin, incomingIndex, keys });
    const selfNode = `m:${idx}`;
    uf.find(selfNode);
    for (const k of keys) {
      uf.union(selfNode, `k:${k}`);
      if (origin === "incoming" && aliasMatches.has(k)) uf.union(selfNode, `lead:${clean(aliasMatches.get(k))}`);
    }
    if (origin === "existing" && clean(record.lead_id)) uf.union(selfNode, `lead:${clean(record.lead_id)}`);
    members[idx].node = selfNode;
  };

  exist.forEach((r) => addMember(r, "existing"));
  inc.forEach((r, i) => addMember(r, "incoming", i));

  const groups = new Map();
  members.forEach((m) => {
    const root = uf.find(m.node);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(m);
  });

  const upserts = [];
  const all = [];
  const aliases = [];
  const stats = { incoming: inc.length, new: 0, updated: 0, duplicates: 0, stale_skipped: 0, unchanged: 0, alias_matched: 0 };

  for (const group of groups.values()) {
    const existingMembers = group.filter((m) => m.origin === "existing");
    const incomingMembers = group.filter((m) => m.origin === "incoming");
    const baseExisting = existingMembers[0]?.record || null;

    if (!baseExisting) {
      const merged = mergeAttributes(incomingMembers);
      const baseShape = incomingMembers[0]?.record || {};
      const lead_id = deriveLeadId(merged) || clean(incomingMembers[0]?.record?.lead_id);
      const record = { ...baseShape, ...merged, lead_id, version: 1, created_at: clean(incomingMembers[0]?.record?.created_at) || now, updated_at: now };
      upserts.push(record);
      all.push(record);
      stats.new += 1;
      stats.duplicates += Math.max(0, incomingMembers.length - 1);
      continue;
    }

    if (incomingMembers.length === 0) {
      all.push(baseExisting);
      stats.unchanged += 1;
      continue;
    }

    if (incomingMembers.some((m) => m.keys.some((k) => clean(aliasMatches.get(k)) === clean(baseExisting.lead_id)))) stats.alias_matched += 1;

    const freshestIncoming = [...incomingMembers].sort((a, b) => freshness(b.record) - freshness(a.record))[0].record;
    if (freshness(freshestIncoming) < freshness(baseExisting)) {
      all.push(baseExisting);
      stats.duplicates += incomingMembers.length;
      stats.stale_skipped += incomingMembers.length;
      continue;
    }

    const merged = mergeAttributes([...existingMembers, ...incomingMembers]);
    const lead_id = clean(baseExisting.lead_id) || deriveLeadId(merged);
    const changed = detectAliasChanges(baseExisting, merged);
    const record = {
      ...baseExisting,
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
  // The change object describes the canonical FIELD that changed (normalized_phone,
  // email, website) with already-normalized from/to values. The persistence layer
  // translates these into canonical stored alias keys (phone:/email:/domain:).
  const specs = [
    { kind: "normalized_phone", field: "normalized_phone", normalize: normalizePhone },
    { kind: "email", field: "email", normalize: normalizeEmail },
    { kind: "website", field: "website", normalize: normalizeDomain },
  ];
  const changed = [];
  for (const spec of specs) {
    const from = spec.normalize(existing[spec.field]);
    const to = spec.normalize(merged[spec.field]);
    if (from && to && from !== to) changed.push({ kind: spec.kind, from, to });
  }
  return changed;
}
