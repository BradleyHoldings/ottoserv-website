#!/usr/bin/env node
// Verify Beehiiv credentials and list available publications.
// Usage:  node scripts/check-beehiiv.mjs
// Reads:  BEEHIIV_API_KEY (required), BEEHIIV_PUBLICATION_ID (optional)
//
// The API key never touches stdout. Only publication ID / name / counts print.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

const apiKey = process.env.BEEHIIV_API_KEY;
const expectedPubId = process.env.BEEHIIV_PUBLICATION_ID;

if (!apiKey) {
  console.error('BEEHIIV_API_KEY not set. Add it to .env.local or your shell env.');
  process.exit(1);
}

const res = await fetch('https://api.beehiiv.com/v2/publications', {
  headers: { Authorization: `Bearer ${apiKey}` },
});

if (!res.ok) {
  console.error(`Beehiiv API error ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const body = await res.json();
const pubs = body?.data ?? [];

if (pubs.length === 0) {
  console.log('No publications found on this Beehiiv account.');
  process.exit(0);
}

console.log(`Found ${pubs.length} publication(s):\n`);
for (const p of pubs) {
  const marker = p.id === expectedPubId ? '  <-- matches BEEHIIV_PUBLICATION_ID' : '';
  console.log(`  id:           ${p.id}${marker}`);
  console.log(`  name:         ${p.name}`);
  if (p.organization_id) console.log(`  organization: ${p.organization_id}`);
  if (typeof p.subscriber_count === 'number') console.log(`  subscribers:  ${p.subscriber_count}`);
  console.log('');
}

if (expectedPubId && !pubs.some((p) => p.id === expectedPubId)) {
  console.error(`WARNING: BEEHIIV_PUBLICATION_ID=${expectedPubId} not found in the publications list above.`);
  process.exit(2);
}
