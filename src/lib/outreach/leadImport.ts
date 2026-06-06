export type LeadTier = "A-tier" | "B-tier" | "C-tier" | "Reject";

export type RawLeadInput = Record<string, unknown>;

export type NormalizedLead = {
  lead_id: string;
  company: string;
  contact_name: string;
  phone: string;
  normalized_phone: string;
  email: string;
  website_url: string;
  industry: string;
  city: string;
  state: string;
  source_url: string;
  notes: string;
  buying_signal: string;
  pain_signal: string;
  timezone: string;
  score: number;
  tier: LeadTier;
  score_reasons: string[];
  status: "ready_to_call" | "ready_to_email" | "needs_enrichment" | "rejected";
  suggested_owner: "jarvis" | "cowork" | "codex" | "jonathan";
  scheduled_call_local: string | null;
  created_at: string;
};

export type ImportError = {
  row: number;
  company?: string;
  phone?: string;
  field?: string;
  code: string;
  message: string;
};

export type ImportResult = {
  dry_run: boolean;
  accepted_count: number;
  rejected_count: number;
  duplicate_count: number;
  imported: NormalizedLead[];
  duplicates: ImportError[];
  rejected: ImportError[];
  accepted_fields: string[];
};

// Compatibility surface only. Behavior is delegated to the canonical leadRail
// implementation so there is one identity, validator, scorer, dedupe path, and
// enrichment contract.
// @ts-ignore TypeScript does not infer declarations from this local ESM adapter.
export {
  ACCEPTED_LEAD_FIELDS,
  classifyLead,
  importLeadRows,
  isValidEmail,
  leadDuplicateKeys,
  parseCsv,
  parseJsonPayload,
  scoreAndNormalizeLead,
  validatePhone,
} from "./leadImport.mjs";
