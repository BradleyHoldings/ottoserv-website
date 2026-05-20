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

export const ACCEPTED_LEAD_FIELDS = [
  "company",
  "contact_name",
  "name",
  "phone",
  "email",
  "website",
  "website_url",
  "industry",
  "city",
  "state",
  "source_url",
  "notes",
  "description",
  "buying_signal",
  "pain_signal",
  "timezone",
  "local_timezone",
];

const TARGET_STATES = new Set(["FL", "GA", "TX", "NC", "SC", "TN"]);
const TOLL_FREE_PREFIXES = new Set(["800", "888", "877", "866", "855", "844", "833", "822"]);
const ICP_TERMS = ["rentals", "leasing", "hoa", "apartments", "maintenance", "tenant placement", "property management"];
const PAIN_TERMS = [
  "missed call",
  "missed calls",
  "hiring admin",
  "hiring leasing",
  "hiring dispatcher",
  "hiring receptionist",
  "slow response",
  "slow follow",
  "manual process",
  "manual processes",
  "bad review",
  "communication complaint",
  "voicemail",
];
const BAD_FIT_TERMS = [
  "broker only",
  "broker-only",
  "vendor",
  "software vendor",
  "recruiter",
  "job seeker",
  "candidate",
  "supplier",
  "wholesale list",
  "data provider",
  "marketing agency",
];

const STATE_TIMEZONES: Record<string, string> = {
  FL: "America/New_York",
  GA: "America/New_York",
  NC: "America/New_York",
  SC: "America/New_York",
  TN: "America/Chicago",
  TX: "America/Chicago",
  CA: "America/Los_Angeles",
  AZ: "America/Phoenix",
  CO: "America/Denver",
  IL: "America/Chicago",
  NY: "America/New_York",
};

export function parseCsv(text: string): RawLeadInput[] {
  const rows = parseCsvRows(text.trim());
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => normalizeKey(header));
  return rows.slice(1).filter((row) => row.some((cell) => cell.trim())).map((row) => {
    const item: RawLeadInput = {};
    headers.forEach((header, index) => {
      if (header) item[header] = row[index] || "";
    });
    return item;
  });
}

export function parseJsonPayload(payload: unknown): RawLeadInput[] {
  if (Array.isArray(payload)) return payload as RawLeadInput[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.leads)) return obj.leads as RawLeadInput[];
    if (Array.isArray(obj.records)) return obj.records as RawLeadInput[];
    return [obj];
  }
  return [];
}

export function scoreAndNormalizeLead(input: RawLeadInput, row: number, slotIndex: number): { lead?: NormalizedLead; error?: ImportError } {
  const company = pick(input, ["company", "business", "business_name", "name"]);
  const contactName = pick(input, ["contact_name", "contact", "person", "owner_name"]);
  const rawPhone = pick(input, ["phone", "phone_number", "mobile", "telephone"]);
  const email = pick(input, ["email", "email_address"]);
  const website = normalizeUrl(pick(input, ["website_url", "website", "domain"]));
  const industry = pick(input, ["industry", "category", "business_type"]);
  const city = pick(input, ["city", "locality"]);
  const state = pick(input, ["state", "region"]).toUpperCase();
  const sourceUrl = normalizeUrl(pick(input, ["source_url", "source", "profile_url", "listing_url"]));
  const notes = pick(input, ["notes", "description", "summary", "evidence"]);
  const buyingSignal = pick(input, ["buying_signal", "intent", "signal"]);
  const painSignal = pick(input, ["pain_signal", "pain", "review_signal"]);
  const timezone = pick(input, ["timezone", "local_timezone"]) || STATE_TIMEZONES[state] || "America/New_York";
  const phoneCheck = validatePhone(rawPhone);

  if (!company && !contactName) {
    return { error: error(row, company, rawPhone, "company", "missing_identity", "Each lead needs at least a company or contact name.") };
  }

  const text = [company, contactName, industry, city, state, website, notes, buyingSignal, painSignal].join(" ").toLowerCase();
  const emailValid = isValidEmail(email);
  const hasBadFit = BAD_FIT_TERMS.some((term) => text.includes(term));

  if (rawPhone.trim() && !phoneCheck.valid) {
    return { error: error(row, company, rawPhone, "phone", phoneCheck.code || "invalid_phone", phoneCheck.message) };
  }

  if (!phoneCheck.valid && !emailValid) {
    return { error: error(row, company, rawPhone, "phone", phoneCheck.code || "missing_contact", `${phoneCheck.message} Provide a valid email if this lead should be email-only.`) };
  }

  let score = 0;
  const scoreReasons: string[] = [];

  if (text.includes("property management") || text.includes("property manager") || industry.toLowerCase().includes("property")) addScore(30, "property management company");
  if (TARGET_STATES.has(state) || text.includes("florida")) addScore(20, "Florida or target-market location");
  if (phoneCheck.valid) addScore(20, "valid callable phone");
  if (emailValid) addScore(10, "valid email");
  if (website) addScore(10, "website found");
  if (ICP_TERMS.some((term) => text.includes(term))) addScore(15, "ICP terms present");
  if (PAIN_TERMS.some((term) => text.includes(term))) addScore(20, "pain signal present");
  if (hasBadFit) {
    score -= 60;
    scoreReasons.push("bad-fit or vendor-only signal");
  }

  score = Math.max(0, Math.min(100, score));
  const tier = classifyLead(score, phoneCheck.valid, emailValid, hasBadFit);
  const status = tier === "A-tier" ? "ready_to_call" : tier === "B-tier" ? "ready_to_email" : tier === "C-tier" ? "needs_enrichment" : "rejected";
  const suggestedOwner = tier === "A-tier" ? "jarvis" : tier === "B-tier" || tier === "C-tier" ? "cowork" : "codex";

  if (tier === "Reject") {
    return { error: error(row, company, rawPhone, "fit", "rejected_fit", `Rejected by scoring guardrails: ${scoreReasons.join(", ") || "low score/no safe next action"}.`) };
  }

  return {
    lead: {
      lead_id: stableLeadId(company, phoneCheck.normalized || email || website, row),
      company,
      contact_name: contactName,
      phone: rawPhone,
      normalized_phone: phoneCheck.normalized || "",
      email,
      website_url: website,
      industry,
      city,
      state,
      source_url: sourceUrl,
      notes,
      buying_signal: buyingSignal,
      pain_signal: painSignal,
      timezone,
      score,
      tier,
      score_reasons: scoreReasons,
      status,
      suggested_owner: suggestedOwner,
      scheduled_call_local: tier === "A-tier" ? scheduledLocalBusinessTime(timezone, slotIndex) : null,
      created_at: new Date().toISOString(),
    },
  };

  function addScore(points: number, reason: string) {
    score += points;
    scoreReasons.push(`+${points} ${reason}`);
  }
}

export function importLeadRows(rows: RawLeadInput[], existing: NormalizedLead[], dryRun: boolean): ImportResult {
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
    const lead = scored.lead!;
    const duplicateKey = leadDuplicateKeys(lead).find((key) => existingKeys.has(key));
    if (duplicateKey) {
      duplicates.push(error(index + 2, lead.company, lead.phone, "duplicate", "duplicate_lead", `Duplicate lead skipped using key: ${duplicateKey}.`));
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

export function leadDuplicateKeys(lead: Pick<NormalizedLead, "normalized_phone" | "email" | "website_url" | "company">): string[] {
  const keys: string[] = [];
  if (lead.normalized_phone) keys.push(`phone:${lead.normalized_phone}`);
  if (lead.email) keys.push(`email:${lead.email.toLowerCase()}`);
  if (lead.website_url) keys.push(`website:${lead.website_url.toLowerCase()}`);
  if (lead.company) keys.push(`company:${lead.company.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
  return keys;
}

export function validatePhone(phone: string): { valid: boolean; normalized?: string; code?: string; message: string } {
  if (!phone.trim()) return { valid: false, code: "missing_phone", message: "Missing phone number." };
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (normalized.length !== 10) return { valid: false, code: "malformed_phone", message: "Phone must have 10 US digits after normalization." };
  if (normalized.includes("555")) return { valid: false, code: "reserved_555_phone", message: "555 test/reserved numbers are blocked." };
  if (normalized.includes("000")) return { valid: false, code: "placeholder_000_phone", message: "000 placeholder numbers are blocked." };
  if (TOLL_FREE_PREFIXES.has(normalized.slice(0, 3))) return { valid: false, code: "toll_free_phone", message: "Toll-free numbers are blocked for outbound call queue imports." };
  return { valid: true, normalized, message: "Valid US phone." };
}

export function classifyLead(score: number, hasValidPhone: boolean, hasValidEmail: boolean, badFit: boolean): LeadTier {
  if (badFit || (!hasValidPhone && !hasValidEmail) || score < 20) return "Reject";
  if (score >= 75 && hasValidPhone) return "A-tier";
  if (score >= 50 && hasValidEmail) return "B-tier";
  return "C-tier";
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function pick(input: RawLeadInput, keys: string[]): string {
  for (const key of keys) {
    const value = input[key] ?? input[normalizeKey(key)];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function stableLeadId(company: string, contactKey: string, row: number): string {
  const base = `${company}-${contactKey}-${row}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `lead_${base.slice(0, 80) || row}`;
}

function scheduledLocalBusinessTime(timezone: string, slotIndex: number): string {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  local.setSeconds(0, 0);
  if (local.getHours() >= 17) local.setDate(local.getDate() + 1);
  if (local.getHours() < 9 || local.getHours() >= 17) local.setHours(9, 0, 0, 0);
  const minutesToAdd = slotIndex * 12;
  local.setMinutes(local.getMinutes() + minutesToAdd);
  while (local.getHours() >= 17 || local.getDay() === 0 || local.getDay() === 6) {
    local.setDate(local.getDate() + 1);
    local.setHours(9, 0, 0, 0);
  }
  return `${local.toISOString().slice(0, 16)} ${timezone}`;
}

function error(row: number, company: string, phone: string, field: string, code: string, message: string): ImportError {
  return { row, company: company || undefined, phone: phone || undefined, field, code, message };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}
