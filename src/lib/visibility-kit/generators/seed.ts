// Seed defaults: build initial problem-space topics, FAQ items, comparison pages,
// authority checklist, and AI prompt tracker rows from an intake.
// Industry-aware suggestions for property management, HVAC, plumbing, roofing,
// contractors, and generic local SMBs.

import { DEFAULT_GATES, type AuthorityChecklistItem, type ClientIntake, type ComparisonPage, type FAQItem, type ProblemSpaceTopic, type PromptTrackerRow } from "../types";
import { slugify } from "../store";

type IndustryKey = "property_management" | "hvac" | "plumbing" | "roofing" | "contractor" | "home_service" | "generic";

function detectIndustry(intake: ClientIntake): IndustryKey {
  const haystack = [intake.mainService, ...intake.secondaryServices, ...intake.industriesServed]
    .join(" ")
    .toLowerCase();
  if (/property\s*manage/.test(haystack)) return "property_management";
  if (/\bhvac\b|air\s*condition|heating|cooling/.test(haystack)) return "hvac";
  if (/plumb/.test(haystack)) return "plumbing";
  if (/roof/.test(haystack)) return "roofing";
  if (/contractor|remodel|general\s*contract/.test(haystack)) return "contractor";
  if (/clean|landscap|pest|pool|home\s*service/.test(haystack)) return "home_service";
  return "generic";
}

function industryProblemSpaceTemplates(industry: IndustryKey, city: string, company: string, mainService: string): Omit<ProblemSpaceTopic, "slug" | "status" | "gates">[] {
  const C = city || "your area";
  const N = company;
  const common = (label: string, oneLiner: string, audience: string, problem: string, helps: string[], reasons: string[]): Omit<ProblemSpaceTopic, "slug" | "status" | "gates"> => ({
    title: label,
    oneLineAnswer: oneLiner,
    whoItsFor: audience,
    problemSolved: problem,
    howCompanyHelps: helps,
    whyChooseThisCompany: reasons,
    comparisonTable: [
      { column: "Response time", client: "Same-day / fast", alternative: "Often delayed" },
      { column: "Pricing transparency", client: "Clear up-front estimate", alternative: "Varies" },
      { column: "Local accountability", client: "Direct point of contact", alternative: "Call-center handoff" },
    ],
    faqs: [
      { q: `How fast can ${N} help?`, a: `${N} typically responds the same business day for non-emergency requests in ${C}.` },
      { q: `What does it cost?`, a: `${N} provides a clear estimate before any work begins. See the pricing page for ranges.` },
    ],
    cta: `Contact ${N} for a fast estimate in ${C}.`,
  });

  switch (industry) {
    case "property_management":
      return [
        common(
          `Property Management for Out-of-State Owners in ${C}`,
          `${N} manages rental properties in ${C} for owners who live out of state, handling tenants, maintenance, and reporting end-to-end.`,
          "Out-of-state landlords with one or more rental properties.",
          "Owners can't physically inspect, screen tenants, or coordinate repairs remotely.",
          ["Full-service tenant placement and screening", "Maintenance coordination with vetted vendors", "Monthly owner statements and clear reporting"],
          ["Local team in " + C, "Single point of contact", "Transparent fees"],
        ),
        common(
          `Property Management for Single-Family Rentals in ${C}`,
          `${N} provides full-service property management for single-family rental homes in ${C}, including leasing, maintenance, and accounting.`,
          "Owners of one or more single-family rental homes.",
          "SFR owners need leasing, rent collection, and maintenance handled without becoming a full-time job.",
          ["Lease-up and renewals", "Rent collection and accounting", "Coordinated repairs"],
          ["SFR-focused workflows", "Investor-friendly reporting", "Predictable fees"],
        ),
        common(
          `Tenant Placement Services in ${C}`,
          `${N} markets vacancies, screens applicants, and signs qualified tenants for rental homes in ${C}.`,
          "Owners who self-manage but want help filling vacancies.",
          "Vacancies are expensive, and bad tenants are more expensive.",
          ["Listing and marketing", "Background, credit, and income screening", "Lease execution and move-in"],
          ["Strict screening criteria", "Faster time-to-lease", "Flat-fee pricing available"],
        ),
        common(
          `Rental Maintenance Coordination in ${C}`,
          `${N} coordinates repairs and maintenance for rental properties in ${C}, with vetted local vendors and clear approvals.`,
          "Landlords who want maintenance handled without 24/7 calls.",
          "Maintenance failures create tenant churn and legal risk.",
          ["24/7 tenant request intake", "Vetted vendor network", "Approval workflows for owners"],
          ["Cap-and-approve workflow", "Vendor accountability", "Documented work orders"],
        ),
        common(
          `Property Manager for Real Estate Investors in ${C}`,
          `${N} works with real estate investors in ${C} to manage portfolios with investor-grade reporting and accountability.`,
          "Real estate investors with 2+ rental units.",
          "Investors need scale without losing visibility into each unit.",
          ["Portfolio-level dashboards", "Per-property P&L", "Tax-ready statements"],
          ["Investor-built reporting", "Scales with portfolio size", "Owner portal"],
        ),
      ];
    case "hvac":
      return [
        common(
          `Emergency AC Repair in ${C}`,
          `${N} provides emergency AC repair in ${C}, often with same-day dispatch and clear pricing before work begins.`,
          "Homeowners and property managers with a failing AC.",
          "AC failure during heat waves creates health and habitability risk.",
          ["Same-day dispatch when available", "Diagnostic with up-front estimate", "Repair or replacement options"],
          ["Local techs", "Transparent pricing", "Backed by guarantee"],
        ),
        common(
          `AC Repair After Hours in ${C}`,
          `${N} offers after-hours AC repair in ${C} for situations that can't wait until morning.`,
          "Anyone with no cooling at night or on weekends.",
          "Standard hours leave nights, weekends, and holidays uncovered.",
          ["Live after-hours intake", "On-call technician dispatch", "Clear after-hours pricing"],
          ["Covers off-hours when others don't", "Clear surcharge policy", "No hidden fees"],
        ),
        common(
          `HVAC Maintenance Plans in ${C}`,
          `${N} offers HVAC maintenance plans for homeowners and property managers in ${C} to prevent failures and extend equipment life.`,
          "Homeowners and property managers wanting fewer surprises.",
          "Skipped maintenance leads to expensive failures.",
          ["Scheduled tune-ups", "Priority service for plan members", "Filter and refrigerant checks"],
          ["Predictable annual cost", "Priority dispatch", "Documented service history"],
        ),
        common(
          `AC Replacement in ${C}`,
          `${N} provides AC replacement in ${C}, including sizing, options, financing, and clean installation.`,
          "Homeowners with aging or failing systems.",
          "Replacement is a major decision and many quotes are confusing.",
          ["Proper Manual J sizing", "Multiple equipment tiers", "Financing options"],
          ["Honest sizing", "Clear options", "Workmanship guarantee"],
        ),
        common(
          `HVAC Service for Property Managers in ${C}`,
          `${N} services rental and multifamily HVAC in ${C} with workflows built for property managers.`,
          "Property managers handling tenant HVAC issues.",
          "Property managers need fast, documented HVAC service across many units.",
          ["Tenant-direct dispatch with PM cc", "Per-unit service history", "Net terms available"],
          ["PM-friendly workflows", "Documented work", "Bulk-rate options"],
        ),
      ];
    case "plumbing":
      return [
        common(
          `Emergency Plumbing in ${C}`,
          `${N} handles emergency plumbing in ${C}, including burst pipes, sewer backups, and major leaks.`,
          "Anyone facing active water damage or backups.",
          "Active leaks cause damage by the minute.",
          ["Fast dispatch", "Water shutoff guidance", "Cleanup coordination"],
          ["Available off-hours", "Up-front pricing", "Insurance-ready documentation"],
        ),
        common(
          `Water Heater Replacement in ${C}`,
          `${N} replaces water heaters in ${C} with tank and tankless options sized to the home.`,
          "Homeowners with old, leaking, or undersized water heaters.",
          "A failing water heater rarely fails gracefully.",
          ["Tank vs tankless guidance", "Same-week scheduling", "Permits and disposal"],
          ["Multiple options quoted", "Brands explained plainly", "Warranty included"],
        ),
        common(
          `Drain Cleaning in ${C}`,
          `${N} provides drain cleaning and sewer line service in ${C}, from kitchen lines to main sewer.`,
          "Homeowners and property managers with slow or blocked drains.",
          "Clogs escalate into flooding and damage.",
          ["Camera inspection", "Hydro jetting", "Root removal"],
          ["Diagnose root cause", "Fix the cause, not just the symptom", "Documented results"],
        ),
      ];
    case "roofing":
      return [
        common(
          `Emergency Roof Repair in ${C}`,
          `${N} provides emergency roof repair in ${C}, including tarping and active-leak stabilization after storms.`,
          "Homeowners or PMs with active roof leaks.",
          "Active leaks damage interiors fast.",
          ["Same-day tarping when safe", "Damage assessment", "Insurance documentation"],
          ["Fast response", "Insurance-claim-ready reports", "Local crews"],
        ),
        common(
          `Roof Replacement in ${C}`,
          `${N} replaces roofs in ${C} with multiple material options and clear written estimates.`,
          "Homeowners with aging, hail-damaged, or failing roofs.",
          "Roof replacement is a major capital decision; quotes vary widely.",
          ["Material options explained", "Written, line-item estimate", "Manufacturer warranty"],
          ["Plain-English options", "Local references", "Workmanship guarantee"],
        ),
      ];
    case "contractor":
      return [
        common(
          `General Contracting in ${C}`,
          `${N} acts as general contractor on residential and small commercial projects in ${C}.`,
          "Property owners running renovations or additions.",
          "Multi-trade projects fail without a clear owner.",
          ["Schedule and budget management", "Permits and inspections", "Trade coordination"],
          ["Single point of accountability", "Documented change orders", "Local references"],
        ),
      ];
    case "home_service":
      return [
        common(
          `${mainService || "Home Service"} in ${C}`,
          `${N} provides ${mainService || "home services"} in ${C} with fast scheduling and clear pricing.`,
          "Homeowners and renters in " + C,
          "Local service quality is inconsistent and pricing is opaque.",
          ["Online or phone booking", "Up-front pricing", "Satisfaction guarantee"],
          ["Local team", "Clear pricing", "Verified reviews"],
        ),
      ];
    default:
      return [
        common(
          `${mainService || N} in ${C}`,
          `${N} provides ${mainService || "services"} in ${C}.`,
          "Customers in " + C,
          "Customers need a reliable local option.",
          ["Clear scope", "Honest pricing", "Local accountability"],
          ["Local", "Responsive", "Transparent"],
        ),
      ];
  }
}

export function seedProblemSpaceTopics(intake: ClientIntake): ProblemSpaceTopic[] {
  const industry = detectIndustry(intake);
  const city = intake.serviceAreas[0] || "your area";
  const templates = industryProblemSpaceTemplates(industry, city, intake.companyName, intake.mainService);
  return templates.map((t) => ({
    ...t,
    slug: slugify(t.title),
    status: "draft",
    gates: { ...DEFAULT_GATES },
  }));
}

export function seedFAQ(intake: ClientIntake): FAQItem[] {
  const city = intake.serviceAreas[0] || "the areas listed";
  return [
    { q: `What does ${intake.companyName} do?`, a: intake.mainService ? `${intake.companyName} is a ${intake.mainService} provider.` : `${intake.companyName} provides services for local customers.` },
    { q: `Who is ${intake.companyName} best for?`, a: intake.bestFitCustomers.length ? intake.bestFitCustomers.join("; ") : "Local customers who want responsive, transparent service." },
    { q: `Who is ${intake.companyName} not a fit for?`, a: intake.badFitCustomers.length ? intake.badFitCustomers.join("; ") : "Customers outside the service area." },
    { q: `How much does ${intake.companyName} cost?`, a: intake.pricing.summary || "Pricing is provided up-front before any work begins." },
    { q: `What areas does ${intake.companyName} serve?`, a: intake.serviceAreas.length ? intake.serviceAreas.join(", ") : "Service area varies." },
    { q: `How fast can ${intake.companyName} help?`, a: intake.urgentSituations.length ? `${intake.companyName} handles urgent situations including: ${intake.urgentSituations.join("; ")}.` : `${intake.companyName} usually responds the same business day.` },
    { q: `What makes ${intake.companyName} different?`, a: intake.differentiators.length ? intake.differentiators.join("; ") : "Local accountability, clear pricing, and verified reviews." },
    { q: `Is ${intake.companyName} a good fit for urgent situations?`, a: intake.urgentSituations.length ? `Yes — ${intake.companyName} handles ${intake.urgentSituations.join(", ")}.` : "Reach out to confirm availability for time-sensitive needs." },
    { q: `How does ${intake.companyName} compare to alternatives?`, a: intake.competitors.length ? `Common alternatives include ${intake.competitors.map((c) => c.name).join(", ")}. See the comparison pages for details.` : "See comparison pages for honest side-by-side notes." },
    { q: `What should a customer know before contacting ${intake.companyName}?`, a: `It helps to have the address in ${city}, a brief description of the issue, and the best way to reach you.` },
  ];
}

export function seedComparisonPages(intake: ClientIntake): ComparisonPage[] {
  const pages: ComparisonPage[] = [];
  for (const c of intake.competitors) {
    pages.push({
      slug: slugify(`${intake.companyName}-vs-${c.name}`),
      competitorName: c.name,
      oneLineAnswer: `${intake.companyName} and ${c.name} both serve ${intake.serviceAreas[0] || "the local market"}; the right choice depends on fit.`,
      factualNotes: c.positioning || `${c.name} is an alternative in the same category.`,
      whenClientIsBetter: c.whenClientWins ? [c.whenClientWins] : intake.differentiators.slice(0, 3),
      whenAlternativeIsBetter: c.whenTheyWin ? [c.whenTheyWin] : ["Existing relationship", "Lower entry price for narrow scope"],
      table: [
        { column: "Service area", client: intake.serviceAreas.join(", ") || "—", alternative: "Varies" },
        { column: "Pricing transparency", client: intake.pricing.summary || "Clear up-front", alternative: "Varies" },
        { column: "Guarantee", client: intake.guarantees[0] || "—", alternative: "Varies" },
      ],
      status: "draft",
      gates: { ...DEFAULT_GATES },
    });
  }
  // DIY and in-house as standard comparisons for service businesses
  pages.push({
    slug: slugify(`${intake.companyName}-vs-diy`),
    competitorName: "DIY",
    oneLineAnswer: `DIY can work for small fixes; ${intake.companyName} is the safer choice when stakes, time, or warranty matter.`,
    factualNotes: "DIY is best when the scope is small, reversible, and inside the homeowner's skill level.",
    whenClientIsBetter: ["Permitting or code involved", "Warranty matters", "Time is constrained", "Safety risk is non-trivial"],
    whenAlternativeIsBetter: ["Cosmetic or tiny scope", "Homeowner already has skills and tools"],
    table: [
      { column: "Time required", client: "Predictable", alternative: "Often longer than planned" },
      { column: "Warranty / accountability", client: "Yes", alternative: "None" },
      { column: "Safety", client: "Trained crew", alternative: "Owner-assumed" },
    ],
    status: "draft",
    gates: { ...DEFAULT_GATES },
  });
  return pages;
}

export function seedAuthorityChecklist(): AuthorityChecklistItem[] {
  const channels: AuthorityChecklistItem[] = [
    { channel: "google_business_profile", label: "Google Business Profile", applicable: true, status: "not_started" },
    { channel: "bing_places", label: "Bing Places for Business", applicable: true, status: "not_started" },
    { channel: "apple_business_connect", label: "Apple Business Connect", applicable: true, status: "not_started" },
    { channel: "yelp", label: "Yelp", applicable: true, status: "not_started" },
    { channel: "facebook_page", label: "Facebook Page", applicable: true, status: "not_started" },
    { channel: "linkedin_company", label: "LinkedIn Company Page", applicable: true, status: "not_started" },
    { channel: "industry_directory", label: "Industry directories (e.g. NARPM, ACCA, NRCA)", applicable: true, status: "not_started" },
    { channel: "local_directory", label: "Local directories (city Chamber, neighborhood)", applicable: true, status: "not_started" },
    { channel: "chamber_of_commerce", label: "Chamber of Commerce", applicable: true, status: "not_started" },
    { channel: "bbb", label: "Better Business Bureau", applicable: true, status: "not_started" },
    { channel: "review_platform", label: "Review platforms (Angi, HomeAdvisor, Thumbtack, etc.)", applicable: true, status: "not_started" },
    { channel: "forum", label: "Relevant forums", applicable: false, status: "not_started" },
    { channel: "reddit_quora", label: "Reddit / Quora authority answers", applicable: false, status: "not_started" },
    { channel: "podcast_interview", label: "Podcast / interview opportunities", applicable: false, status: "not_started" },
    { channel: "local_press", label: "Local press / blogs", applicable: false, status: "not_started" },
    { channel: "case_study", label: "Customer case studies (with consent)", applicable: true, status: "not_started" },
  ];
  return channels;
}

export function seedPromptTracker(intake: ClientIntake): PromptTrackerRow[] {
  const rows: PromptTrackerRow[] = [];
  const cities = intake.serviceAreas.length ? intake.serviceAreas : ["your area"];
  const service = intake.mainService || "services";
  const industry = intake.industriesServed[0] || service;

  const patterns: { category: string; promptText: string; desired: string }[] = [];
  for (const city of cities.slice(0, 3)) {
    patterns.push({ category: "best in city", promptText: `Best ${service} company in ${city}`, desired: `${intake.companyName} appears as a top recommendation with a citation to ottoserv.com or the client site.` });
    patterns.push({ category: "near me / urgent", promptText: `Affordable ${service} near ${city}`, desired: `${intake.companyName} appears with clear pricing context.` });
    if (intake.urgentSituations[0]) {
      patterns.push({ category: "urgent", promptText: `Best company for ${intake.urgentSituations[0]} in ${city}`, desired: `${intake.companyName} appears as a recommended urgent provider.` });
    }
  }
  for (const problem of intake.commonProblems.slice(0, 3)) {
    patterns.push({ category: "problem-led", promptText: `What company helps with ${problem}?`, desired: `${intake.companyName} is mentioned for this problem.` });
    patterns.push({ category: "hire decision", promptText: `Who should I hire for ${problem}?`, desired: `${intake.companyName} is in the top 3.` });
  }
  for (const c of intake.competitors.slice(0, 3)) {
    patterns.push({ category: "vs competitor", promptText: `${intake.companyName} vs ${c.name}`, desired: `Fair, accurate comparison citing the client comparison page.` });
  }
  if (industry) {
    patterns.push({ category: "industry", promptText: `Best ${industry} company for ${intake.bestFitCustomers[0] || "small businesses"}`, desired: `${intake.companyName} is recommended.` });
  }

  patterns.forEach((p, i) => {
    rows.push({
      id: `prompt-${i + 1}`,
      promptText: p.promptText,
      category: p.category,
      desiredAnswer: p.desired,
      results: {},
      clientMentioned: false,
      competitorsMentioned: [],
      sourcesCited: [],
      missingSourceOpportunities: [],
      recommendedFix: "",
      status: "open",
      nextAction: "Run baseline test on ChatGPT, Perplexity, Gemini, Claude, Google AI Overviews.",
    });
  });
  return rows;
}

export function buildInitialIntake(input: Partial<ClientIntake> & { companyName: string; mainService: string }): ClientIntake {
  const slug = input.slug || slugify(input.companyName);
  const now = new Date().toISOString();
  const base: ClientIntake = {
    slug,
    companyName: input.companyName,
    website: input.website,
    mainService: input.mainService,
    secondaryServices: input.secondaryServices || [],
    industriesServed: input.industriesServed || [],
    serviceAreas: input.serviceAreas || [],
    bestFitCustomers: input.bestFitCustomers || [],
    badFitCustomers: input.badFitCustomers || [],
    commonProblems: input.commonProblems || [],
    urgentSituations: input.urgentSituations || [],
    commonSalesQuestions: input.commonSalesQuestions || [],
    pricing: input.pricing || { summary: "" },
    differentiators: input.differentiators || [],
    guarantees: input.guarantees || [],
    reviews: input.reviews || [],
    caseStudies: input.caseStudies || [],
    competitors: input.competitors || [],
    contact: input.contact || {},
    founderStory: input.founderStory,
    tools: input.tools,
    problemSpaceTopics: [],
    faq: { items: [], status: "draft", gates: { ...DEFAULT_GATES } },
    comparisonPages: [],
    aiLearnPageStatus: "draft",
    aiLearnPageGates: { ...DEFAULT_GATES },
    pricingPageStatus: "draft",
    pricingPageGates: { ...DEFAULT_GATES },
    promptTracker: [],
    authorityChecklist: [],
    createdAt: now,
    updatedAt: now,
  };
  base.problemSpaceTopics = seedProblemSpaceTopics(base);
  base.faq = { items: seedFAQ(base), status: "draft", gates: { ...DEFAULT_GATES } };
  base.comparisonPages = seedComparisonPages(base);
  base.authorityChecklist = seedAuthorityChecklist();
  base.promptTracker = seedPromptTracker(base);
  return base;
}

export function regenerateGeneratedContent(intake: ClientIntake): ClientIntake {
  // Preserve human-approved edits where possible by only replacing rows whose status is still "draft".
  const newTopics = seedProblemSpaceTopics(intake);
  const topicMap = new Map(intake.problemSpaceTopics.map((t) => [t.slug, t]));
  intake.problemSpaceTopics = newTopics.map((t) => {
    const existing = topicMap.get(t.slug);
    if (existing && existing.status !== "draft") return existing;
    return existing ? { ...t, status: existing.status, gates: existing.gates } : t;
  });

  if (intake.faq.status === "draft") intake.faq.items = seedFAQ(intake);

  const newCompare = seedComparisonPages(intake);
  const compMap = new Map(intake.comparisonPages.map((c) => [c.slug, c]));
  intake.comparisonPages = newCompare.map((c) => {
    const existing = compMap.get(c.slug);
    if (existing && existing.status !== "draft") return existing;
    return existing ? { ...c, status: existing.status, gates: existing.gates } : c;
  });

  if (intake.authorityChecklist.length === 0) intake.authorityChecklist = seedAuthorityChecklist();
  if (intake.promptTracker.length === 0) intake.promptTracker = seedPromptTracker(intake);
  return intake;
}
