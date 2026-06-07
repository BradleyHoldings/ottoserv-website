import { promises as fs } from "fs";
import path from "path";

export interface PilotStartInput {
  scan_id?: string;
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  workflow?: string;
  preferred_start_date?: string;
  notes?: string;
  consent_to_contact?: boolean;
  source_page?: string;
}

export interface PilotStartConversion {
  id: string;
  event_type: "pilot_start_requested";
  scan_id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  workflow: string;
  preferred_start_date: string;
  notes: string;
  consent_to_contact: boolean;
  source_page: string;
  created_at: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePilotStartInput(input: Partial<PilotStartInput>) {
  if (!EMAIL_RE.test(clean(input.email).toLowerCase())) return "Please enter a valid email address.";
  if (!clean(input.name)) return "Name is required.";
  if (!clean(input.company)) return "Company is required.";
  if (!clean(input.workflow)) return "Workflow is required.";
  if (!input.consent_to_contact) return "Consent to contact is required before we can start the pilot path.";
  return null;
}

export function buildPilotStartConversion(input: PilotStartInput): PilotStartConversion {
  return {
    id: `psc_${Date.now()}_${randomToken(6)}`,
    event_type: "pilot_start_requested",
    scan_id: clean(input.scan_id),
    name: clean(input.name),
    email: clean(input.email).toLowerCase(),
    company: clean(input.company),
    phone: clean(input.phone),
    workflow: clean(input.workflow),
    preferred_start_date: clean(input.preferred_start_date),
    notes: clean(input.notes),
    consent_to_contact: Boolean(input.consent_to_contact),
    source_page: clean(input.source_page) || "front_office_leak_check_start_pilot",
    created_at: new Date().toISOString(),
  };
}

export async function savePilotStartConversion(conversion: PilotStartConversion) {
  const supabase = await insertSupabaseConversion(conversion);
  if (supabase.ok) return { conversion: supabase.conversion, storage: "supabase" as const };
  if (supabase.error !== "supabase_not_configured") {
    throw new Error(supabase.error);
  }
  await saveLocalConversion(conversion);
  return { conversion, storage: "local" as const };
}

export async function listPilotStartConversions(): Promise<PilotStartConversion[]> {
  const supabase = await selectSupabaseConversions();
  if (supabase.ok) return supabase.conversions;
  return readLocalConversions();
}

async function readLocalConversions(): Promise<PilotStartConversion[]> {
  try {
    const raw = await fs.readFile(localDataPath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveLocalConversion(conversion: PilotStartConversion) {
  const conversions = await readLocalConversions();
  const dataPath = localDataPath();
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify([conversion, ...conversions], null, 2));
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

async function insertSupabaseConversion(conversion: PilotStartConversion) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { ok: false as const, error: "supabase_not_configured" };

  const res = await fetch(`${url}/rest/v1/process_scan_conversion_events?select=*`, {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(conversion),
  });
  if (!res.ok) return { ok: false as const, error: await res.text() };
  const rows = (await res.json()) as PilotStartConversion[];
  return { ok: true as const, conversion: rows[0] || conversion };
}

async function selectSupabaseConversions() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { ok: false as const, error: "supabase_not_configured" };
  const res = await fetch(`${url}/rest/v1/process_scan_conversion_events?select=*&order=created_at.desc&limit=500`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const, error: await res.text() };
  return { ok: true as const, conversions: (await res.json()) as PilotStartConversion[] };
}

function randomToken(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function localDataPath() {
  return path.join(process.cwd(), "data", "process_scan_conversion_events.json");
}
