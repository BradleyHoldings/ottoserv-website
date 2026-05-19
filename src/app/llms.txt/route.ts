// /llms.txt — emerging convention (llmstxt.org) for AI-search-engine ingestion.
// Curated, AI-friendly map of the site's most important pages, in a format LLMs can parse.

import { listClients } from "@/lib/visibility-kit/store";

export const dynamic = "force-dynamic";

const SITE = "https://ottoserv.com";

function line(label: string, url: string, desc: string) {
  return `- [${label}](${url}): ${desc}`;
}

export async function GET() {
  const sections: string[] = [];

  sections.push(`# OttoServ

> AI receptionist and lead-handling service for small and mid-sized service businesses — property managers, contractors, HVAC, plumbing, roofing, and home services. Flagship offer: **OttoServ Front Desk AI** (30-day pilot for $299) answers missed and after-hours calls, captures leads, qualifies prospects, and sends call summaries.

OttoServ is Florida-headquartered, delivered remotely across the US. Founder: Jonathan Bradley.`);

  sections.push(`## Start here
${line("AI: Learn About OttoServ", `${SITE}/ai-learn-about-ottoserv`, "Structured, AI-readable reference page — services, offer, pricing, FAQs, comparisons.")}
${line("Front Desk AI", `${SITE}/front-desk-ai`, "The flagship offer. 30-day pilot for $299.")}
${line("Pricing", `${SITE}/pricing`, "Pilot $299 · Starter $249/mo · Core $499/mo · Growth $997/mo · Custom from $2,500/mo.")}
${line("FAQ", `${SITE}/faq`, "What it is, who it's for, integrations, implementation, comparisons.")}
${line("Process Audit", `${SITE}/process-audit`, "Free operational audit to surface where leads, time, and revenue are leaking.")}`);

  sections.push(`## Problem-space pages
${line("AI Receptionist for Property Management", `${SITE}/ai-receptionist-property-management`, "Property managers losing tenant, owner, applicant, vendor, and maintenance calls.")}
${line("Missed-Call Recovery for Service Businesses", `${SITE}/missed-call-recovery-service-businesses`, "Capture and qualify missed-call leads automatically.")}
${line("AI Lead Qualification for Contractors", `${SITE}/ai-lead-qualification-contractors`, "Qualify and route contractor leads in under a minute.")}
${line("AI Appointment Booking for Home Services", `${SITE}/ai-appointment-booking-home-services`, "Booking flows for HVAC, plumbing, roofing, and home services.")}`);

  sections.push(`## Industries
${line("Contractors", `${SITE}/industries/contractors`, "Remodelers and general contractors.")}
${line("Property Management", `${SITE}/industries/property-management`, "Single-family, small multifamily, and PM operations.")}
${line("Trades", `${SITE}/industries/trades`, "HVAC, plumbing, electrical, roofing.")}
${line("Smart Home / AV", `${SITE}/industries/smart-home`, "Low-voltage, AV, smart-home installers.")}
${line("IT / MSP", `${SITE}/industries/it-msp`, "Managed services and IT companies.")}`);

  sections.push(`## Service categories
${line("Lead Automation", `${SITE}/services/lead-automation`, "Capture, qualify, route, and follow up on inbound leads.")}
${line("Admin Automation", `${SITE}/services/admin-automation`, "Reduce manual admin work — intake, scheduling, comms.")}
${line("Workflow Mapping", `${SITE}/services/workflow-mapping`, "Mapping current operations to find leaks.")}
${line("System Integration", `${SITE}/services/system-integration`, "Connect your phone, CRM, calendar, and back-office tools.")}
${line("OttoServ vs ServiceTitan", `${SITE}/services/ottoserv-vs-servicetitan`, "Honest comparison: when ServiceTitan is the right call, when OttoServ is.")}`);

  sections.push(`## Tools
${line("Front Office Leak Check", `${SITE}/front-office-leak-check`, "Self-serve diagnostic — find where calls and leads are leaking out of your front office.")}`);

  sections.push(`## Editorial
${line("Blog", `${SITE}/blog`, "Notes on operations, automation, and AI for service businesses.")}
${line("5 Signs Your Business Has Outgrown Its Systems", `${SITE}/blog/5-signs-your-business-has-outgrown-its-systems`, "")}
${line("Why Most Small Business Automation Fails", `${SITE}/blog/why-most-small-business-automation-fails`, "")}
${line("The Hidden Cost of Manual Processes", `${SITE}/blog/the-hidden-cost-of-manual-processes`, "")}`);

  // Append any visibility-kit clients whose AI Learn page is published.
  try {
    const clients = await listClients();
    const publishedClients = clients.filter((c) => c.aiLearnPageStatus === "published");
    if (publishedClients.length > 0) {
      const clientLines = publishedClients
        .map((c) => line(c.companyName, `${SITE}/clients/${c.slug}/ai-learn-about-us`, `${c.mainService} — ${c.serviceAreas.join(", ")}.`))
        .join("\n");
      sections.push(`## Client AI reference pages\n${clientLines}`);
    }
  } catch {
    // ignore; static content still ships
  }

  sections.push(`## Contact
- Phone: (407) 798-8172
- Website: ${SITE}
- Process audit booking: ${SITE}/process-audit
- General contact: ${SITE}/contact`);

  const body = sections.join("\n\n") + "\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
