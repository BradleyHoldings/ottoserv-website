// Load a client and lazily materialize generated content if missing.
// Read-only: does NOT write back to disk (callers do that via API).

import { loadClient } from "./store";
import { regenerateGeneratedContent } from "./generators/seed";
import type { ClientIntake } from "./types";

export async function loadClientWithDefaults(slug: string): Promise<ClientIntake | null> {
  const c = await loadClient(slug);
  if (!c) return null;
  return regenerateGeneratedContent(c);
}
