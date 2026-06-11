// Hermes browser research executor. Turns seed leads into the existing
// research-results.json contract. It never contacts a lead and accepts contact
// details only when the browser provider returns a public source URL proving them.

function clean(value) { return String(value ?? "").trim(); }
function asArray(value) { return Array.isArray(value) ? value : []; }
function lower(value) { return clean(value).toLowerCase(); }

function validEmail(value) {
  const email = lower(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function validPhone(value) {
  const raw = clean(value);
  if (/https?:\/\//i.test(raw)) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

function validUrl(value) {
  const url = clean(value);
  return /^https?:\/\//i.test(url) ? url : "";
}

export function normalizeResearchResult(seed = {}, result = {}, now = new Date().toISOString()) {
  const officialWebsite = validUrl(result.official_website || result.website);
  const email = validEmail(result.public_email || result.email);
  const phone = validPhone(result.public_phone || result.phone);
  const contactSources = asArray(result.contact_sources).map(validUrl).filter(Boolean);
  const sourceUrl = validUrl(seed.source_url) || validUrl(asArray(seed.intent?.source_urls)[0]) || validUrl(result.intent_source_url);
  const evidenceSnippet = clean(seed.evidence_snippet || seed.intent_evidence_summary || seed.notes || result.intent_evidence_snippet);
  const dateOfSignal = clean(seed.date_of_signal || seed.created_at || result.date_of_signal);
  const socialProfiles = asArray(result.social_profiles)
    .map((p) => ({ platform: lower(p?.platform), url: validUrl(p?.url), verified: p?.verified === true, source_url: validUrl(p?.source_url) }))
    .filter((p) => p.platform && p.url && p.verified && p.source_url);

  // A contact path must be tied to public evidence. Website itself can be the
  // contact path; email/phone require at least one contact source URL.
  const provenEmail = email && contactSources.length ? email : "";
  const provenPhone = phone && contactSources.length ? phone : "";
  const hasContact = Boolean(officialWebsite || provenEmail || provenPhone || socialProfiles.length);

  return {
    business_name: clean(seed.business_name || seed.company || result.business_name),
    industry: clean(seed.industry || result.industry),
    location: clean(seed.location || result.location),
    website: officialWebsite,
    email: provenEmail,
    phone: provenPhone,
    decision_maker: clean(result.decision_maker || seed.decision_maker),
    social_profiles: socialProfiles,
    intent_type: clean(seed.intent_type || result.intent_type || "evergreen_fit"),
    source_url: sourceUrl,
    evidence_snippet: evidenceSnippet,
    date_of_signal: dateOfSignal,
    pain_point: clean(seed.pain_point || seed.pain_signal || result.pain_point),
    recommended_offer: clean(seed.recommended_offer || seed.intent?.recommended_offer || result.recommended_offer),
    intent_evidence_summary: clean(seed.intent_evidence_summary || result.intent_evidence_summary),
    enrichment: {
      researched_at: now,
      provider: clean(result.provider) || "hermes_browser",
      contact_sources: contactSources,
      verified_contact_path: hasContact,
      notes: asArray(result.notes).map(clean).filter(Boolean),
    },
  };
}

export async function researchSeedLeads(seeds = [], options = {}) {
  const provider = options.provider;
  const now = options.now || new Date().toISOString();
  const limit = Math.max(1, Number(options.limit || 10));
  if (!provider || typeof provider.researchLead !== "function") {
    return { ok: false, reason: "browser_research_provider_not_wired", results: [], summary: { attempted: 0, enriched: 0, needs_verification: asArray(seeds).length } };
  }

  const results = [];
  for (const seed of asArray(seeds).slice(0, limit)) {
    try {
      const raw = await provider.researchLead(seed);
      const normalized = normalizeResearchResult(seed, raw, now);
      const ready = Boolean(normalized.business_name && normalized.industry && (normalized.website || normalized.email || normalized.phone || normalized.social_profiles.length));
      results.push({ ...normalized, enrichment_status: ready ? "enriched" : "needs_verification" });
    } catch (error) {
      results.push({
        business_name: clean(seed.business_name || seed.company),
        industry: clean(seed.industry),
        source_url: clean(seed.source_url),
        enrichment_status: "needs_verification",
        enrichment: { researched_at: now, provider: "hermes_browser", verified_contact_path: false, notes: [clean(error?.message) || "browser_research_failed"] },
      });
    }
  }

  return {
    ok: true,
    results,
    summary: {
      attempted: results.length,
      enriched: results.filter((r) => r.enrichment_status === "enriched").length,
      needs_verification: results.filter((r) => r.enrichment_status !== "enriched").length,
      email_ready: results.filter((r) => r.email).length,
      call_ready: results.filter((r) => r.phone).length,
      dm_ready: results.filter((r) => asArray(r.social_profiles).length).length,
    },
  };
}
