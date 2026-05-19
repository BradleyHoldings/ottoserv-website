// Filesystem-backed store for client visibility kits.
// Each client is one JSON file at data/visibility-kit/clients/<slug>.json.
// MVP: no DB required. Swap this module for Supabase later without touching callers.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { ClientIntake } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "visibility-kit", "clients");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export function clientFilePath(slug: string): string {
  return path.join(DATA_DIR, `${slug}.json`);
}

export async function listClientSlugs(): Promise<string[]> {
  await ensureDir();
  const entries = await fs.readdir(DATA_DIR);
  return entries.filter((e) => e.endsWith(".json")).map((e) => e.replace(/\.json$/, ""));
}

export async function loadClient(slug: string): Promise<ClientIntake | null> {
  try {
    const raw = await fs.readFile(clientFilePath(slug), "utf8");
    return JSON.parse(raw) as ClientIntake;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function saveClient(client: ClientIntake): Promise<void> {
  await ensureDir();
  client.updatedAt = new Date().toISOString();
  await fs.writeFile(
    clientFilePath(client.slug),
    JSON.stringify(client, null, 2),
    "utf8",
  );
}

export async function listClients(): Promise<ClientIntake[]> {
  const slugs = await listClientSlugs();
  const out: ClientIntake[] = [];
  for (const slug of slugs) {
    const c = await loadClient(slug);
    if (c) out.push(c);
  }
  return out;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
