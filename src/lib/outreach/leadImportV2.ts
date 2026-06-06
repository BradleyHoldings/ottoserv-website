import {
  ACCEPTED_LEAD_FIELDS,
  leadDuplicateKeys,
  parseCsv,
  parseJsonPayload,
  scoreAndNormalizeLead,
  type ImportError,
  type ImportResult,
  type NormalizedLead,
  type RawLeadInput,
} from "./leadImport";
import { deriveStableLeadId } from "../leads/canonicalLeadCore.mjs";

export {
  ACCEPTED_LEAD_FIELDS,
  parseCsv,
  parseJsonPayload,
  type ImportError,
  type ImportResult,
  type NormalizedLead,
  type RawLeadInput,
};

/**
 * Compatibility adapter for the existing call-import route.
 *
 * It preserves the current scoring/tiering behavior while replacing the legacy
 * row-number-dependent ID with the Phase 1 deterministic identity contract.
 * It does not send email, dial calls, post social content, or touch payments.
 */
export function importLeadRows(
  rows: RawLeadInput[],
  existing: NormalizedLead[],
  dryRun: boolean,
): ImportResult {
  const imported: NormalizedLead[] = [];
  const rejected: ImportError[] = [];
  const duplicates: ImportError[] = [];
  const existingKeys = new Set(existing.flatMap(leadDuplicateKeys));

  rows.forEach((row, index) => {
    const scored = scoreAndNormalizeLead(row, index + 2, imported.length);
    if (scored.error) {
      rejected.push(scored.error);
      return;
    }

    const legacyLead = scored.lead!;
    const deterministicId = deriveStableLeadId({
      company_name: legacyLead.company,
      normalized_phone: legacyLead.normalized_phone,
      email: legacyLead.email,
      website: legacyLead.website_url,
      city: legacyLead.city,
      state: legacyLead.state,
    });

    const lead: NormalizedLead = {
      ...legacyLead,
      lead_id: deterministicId || legacyLead.lead_id,
    };

    const duplicateKey = leadDuplicateKeys(lead).find((key) => existingKeys.has(key));
    if (duplicateKey) {
      duplicates.push({
        row: index + 2,
        company: lead.company || undefined,
        phone: lead.phone || undefined,
        field: "duplicate",
        code: "duplicate_lead",
        message: `Duplicate lead skipped using key: ${duplicateKey}.`,
      });
      return;
    }

    leadDuplicateKeys(lead).forEach((key) => existingKeys.add(key));
    imported.push(lead);
  });

  return {
    dry_run: dryRun,
    accepted_count: imported.length,
    rejected_count: rejected.length,
    duplicate_count: duplicates.length,
    imported,
    duplicates,
    rejected,
    accepted_fields: ACCEPTED_LEAD_FIELDS,
  };
}
