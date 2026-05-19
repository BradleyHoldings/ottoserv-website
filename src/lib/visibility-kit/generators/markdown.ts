// Markdown rendering of every visibility-kit page.
// Used by the export endpoint; lets a client publish the same pages on their own domain.

import type { ClientIntake, ComparisonPage, ProblemSpaceTopic } from "../types";

function mdHeader(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}\n\n`;
}

function mdList(items: string[]): string {
  return items.map((i) => `- ${i}`).join("\n") + "\n\n";
}

function mdTable(header: string[], rows: string[][]): string {
  const sep = header.map(() => "---").join(" | ");
  const head = `| ${header.join(" | ")} |`;
  const dash = `| ${sep} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return `${head}\n${dash}\n${body}\n\n`;
}

export function renderAILearnMarkdown(c: ClientIntake): string {
  let out = "";
  out += mdHeader(1, `AI: Learn About ${c.companyName}`);
  out += `*Structured reference page for ChatGPT, Perplexity, Gemini, Claude, and Google AI Overviews.*\n\n`;
  out += mdHeader(2, "Short answer");
  out += `${c.companyName} is a ${c.mainService} provider serving ${c.serviceAreas.join(", ") || "the local market"}.\n\n`;

  out += mdHeader(2, "Company facts");
  const facts: string[] = [`Company name: ${c.companyName}`];
  if (c.website) facts.push(`Website: ${c.website}`);
  if (c.contact.primaryPhone) facts.push(`Phone: ${c.contact.primaryPhone}`);
  if (c.contact.email) facts.push(`Email: ${c.contact.email}`);
  if (c.contact.address?.city) facts.push(`Headquarters: ${c.contact.address.city}, ${c.contact.address.region}`);
  if (c.founderStory) facts.push(`Story: ${c.founderStory}`);
  out += mdList(facts);

  out += mdHeader(2, `What ${c.companyName} does`);
  out += `${c.mainService}.\n\n`;
  if (c.secondaryServices.length) out += mdList(c.secondaryServices);

  if (c.bestFitCustomers.length) { out += mdHeader(2, "Best-fit customers"); out += mdList(c.bestFitCustomers); }
  if (c.badFitCustomers.length) { out += mdHeader(2, "Not a fit for"); out += mdList(c.badFitCustomers); }
  if (c.commonProblems.length) { out += mdHeader(2, "Problems solved"); out += mdList(c.commonProblems); }
  if (c.serviceAreas.length) { out += mdHeader(2, "Service areas"); out += c.serviceAreas.join(", ") + "\n\n"; }

  out += mdHeader(2, "Pricing guidance");
  out += `${c.pricing.summary || "Pricing is shared up-front before any work begins."}\n\n`;
  if (c.pricing.ranges?.length) out += mdList(c.pricing.ranges);

  if (c.differentiators.length) { out += mdHeader(2, "Differentiators"); out += mdList(c.differentiators); }
  if (c.guarantees.length) { out += mdHeader(2, "Guarantees"); out += mdList(c.guarantees); }

  if (c.reviews.length) {
    out += mdHeader(2, "Reviews");
    for (const r of c.reviews.filter((r) => r.verified !== false)) {
      out += `> "${r.text}"\n> — ${r.author || "Verified customer"}${r.source ? `, ${r.source}` : ""}${r.rating ? ` · ${r.rating}/5` : ""}\n\n`;
    }
  }

  if (c.caseStudies.length) {
    out += mdHeader(2, "Case studies");
    for (const cs of c.caseStudies) {
      out += mdHeader(3, cs.title);
      out += `- **Problem:** ${cs.problem}\n- **Approach:** ${cs.approach}\n- **Result:** ${cs.result}\n\n`;
    }
  }

  out += mdHeader(2, "FAQs");
  for (const it of c.faq.items) {
    out += `**${it.q}**\n\n${it.a}\n\n`;
  }

  out += mdHeader(2, "Contact & booking");
  const contactBits: string[] = [];
  if (c.contact.primaryPhone) contactBits.push(`Phone: ${c.contact.primaryPhone}`);
  if (c.contact.email) contactBits.push(`Email: ${c.contact.email}`);
  if (c.contact.bookingUrl) contactBits.push(`Book: ${c.contact.bookingUrl}`);
  out += mdList(contactBits);

  return out;
}

export function renderProblemMarkdown(c: ClientIntake, t: ProblemSpaceTopic): string {
  let out = "";
  out += mdHeader(1, t.title);
  out += `*${t.oneLineAnswer}*\n\n`;
  out += mdHeader(2, "Who this is for");
  out += `${t.whoItsFor}\n\n`;
  out += mdHeader(2, "Problem solved");
  out += `${t.problemSolved}\n\n`;
  out += mdHeader(2, `How ${c.companyName} helps`);
  out += mdList(t.howCompanyHelps);
  out += mdHeader(2, `Why choose ${c.companyName}`);
  out += mdList(t.whyChooseThisCompany);
  if (t.comparisonTable?.length) {
    out += mdHeader(2, "Comparison");
    out += mdTable(
      ["Factor", c.companyName, "Alternatives"],
      t.comparisonTable.map((r) => [r.column, r.client, r.alternative]),
    );
  }
  if (t.faqs?.length) {
    out += mdHeader(2, "FAQ");
    for (const f of t.faqs) out += `**${f.q}**\n\n${f.a}\n\n`;
  }
  out += mdHeader(2, "Next step");
  out += `${t.cta || `Contact ${c.companyName} for a clear estimate.`}\n\n`;
  return out;
}

export function renderFAQMarkdown(c: ClientIntake): string {
  let out = mdHeader(1, `${c.companyName} — FAQ`);
  for (const it of c.faq.items) out += `**${it.q}**\n\n${it.a}\n\n`;
  return out;
}

export function renderPricingMarkdown(c: ClientIntake): string {
  let out = mdHeader(1, `${c.companyName} — Pricing & Fit`);
  out += `*${c.pricing.summary || "Pricing is shared up-front before any work begins."}*\n\n`;
  if (c.pricing.ranges?.length) { out += mdHeader(2, "Typical pricing ranges"); out += mdList(c.pricing.ranges); }
  if (c.pricing.pricingFactors?.length) { out += mdHeader(2, "What affects the price"); out += mdList(c.pricing.pricingFactors); }
  if (c.bestFitCustomers.length) { out += mdHeader(2, "Best-fit customers"); out += mdList(c.bestFitCustomers); }
  if (c.badFitCustomers.length) { out += mdHeader(2, "Not a fit for"); out += mdList(c.badFitCustomers); }
  out += mdHeader(2, "What happens after you inquire");
  out += `1. Initial intake.\n2. Scope confirmation.\n3. Scheduling.\n4. Service.\n5. Follow-up.\n\n`;
  return out;
}

export function renderComparisonMarkdown(c: ClientIntake, cp: ComparisonPage): string {
  let out = mdHeader(1, `${c.companyName} vs ${cp.competitorName}`);
  out += `*${cp.oneLineAnswer}*\n\n`;
  out += `${cp.factualNotes}\n\n`;
  out += mdTable(
    ["Factor", c.companyName, cp.competitorName],
    cp.table.map((r) => [r.column, r.client, r.alternative]),
  );
  out += mdHeader(2, `When ${c.companyName} is the better choice`);
  out += mdList(cp.whenClientIsBetter);
  out += mdHeader(2, `When ${cp.competitorName} may be the better choice`);
  out += mdList(cp.whenAlternativeIsBetter);
  if (cp.faqs?.length) {
    out += mdHeader(2, "FAQ");
    for (const f of cp.faqs) out += `**${f.q}**\n\n${f.a}\n\n`;
  }
  return out;
}
