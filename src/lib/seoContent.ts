import type { Metadata } from "next";

export const SITE_URL = "https://ottoserv.com";

export type PageKind = "industry" | "solution" | "comparison" | "resource" | "offer";

export type Faq = {
  question: string;
  answer: string;
};

export type LinkCard = {
  title: string;
  href: string;
  description: string;
};

export type PricingOffer = {
  name: string;
  price: string;
  unit: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
};

export type SeoPage = {
  slug: string;
  path: string;
  kind: PageKind;
  title: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  primaryCta?: string;
  secondaryCta?: string;
  heroBullets: string[];
  problems: { title: string; text: string }[];
  outcomes: { title: string; text: string }[];
  howItWorks: { title: string; text: string }[];
  useCases: { title: string; text: string }[];
  integrations?: string[];
  callTypes?: { title: string; urgency: string; action: string }[];
  workflows?: { title: string; steps: string[] }[];
  objections?: { concern: string; response: string }[];
  trustSignals?: { title: string; text: string }[];
  pricing?: PricingOffer[];
  comparison?: { option: string; bestFor: string; limits: string }[];
  faq: Faq[];
  internalLinks: LinkCard[];
  schemaTypes: Array<"Service" | "SoftwareApplication" | "FAQPage" | "Product" | "Offer" | "Article">;
  published: boolean;
};

const primaryCta = "Book a Demo";
const secondaryCta = "Request a Free Process Audit";

const defaultLinks: LinkCard[] = [
  {
    title: "AI Receptionist",
    href: "/ai-receptionist",
    description: "The main OttoServ offer for answering calls, qualifying leads, and booking appointments.",
  },
  {
    title: "Missed Call Recovery",
    href: "/missed-call-recovery",
    description: "Capture opportunities that would otherwise land in voicemail or go to a competitor.",
  },
  {
    title: "Pricing",
    href: "/pricing",
    description: "Simple starter pricing for the AI receptionist pilot and monthly plans.",
  },
];

function page(page: SeoPage): SeoPage {
  return {
    primaryCta,
    secondaryCta,
    ...page,
  };
}

export const publishedSeoPages: SeoPage[] = [
  page({
    slug: "ai-receptionist",
    path: "/ai-receptionist",
    kind: "offer",
    title: "AI Receptionist for Small Businesses",
    metaTitle: "AI Receptionist for Small Businesses | OttoServ",
    metaDescription:
      "OttoServ AI Receptionist answers missed and after-hours calls, qualifies leads, books appointments, and sends clean summaries for SMBs and home service companies.",
    eyebrow: "AI receptionist for SMBs",
    h1: "AI Receptionist for Small Businesses",
    intro:
      "OttoServ gives small and mid-sized businesses a front desk that answers when the team is busy, after hours, or out in the field. The AI receptionist captures caller details, asks the right qualification questions, and routes a clean summary so your team can respond faster.",
    heroBullets: [
      "Answer missed and after-hours calls without hiring another admin.",
      "Qualify leads by service need, urgency, location, and contact details.",
      "Book appointments or route callbacks using your actual business rules.",
      "Send summaries to the team so every caller has an owner.",
    ],
    problems: [
      { title: "Good calls hit voicemail", text: "Owners and dispatchers are often on jobs, in meetings, or already on another call. The caller does not wait around." },
      { title: "Lead quality is unknown", text: "A name and phone number is not enough. Your team needs service need, urgency, address, timeline, and decision context." },
      { title: "Follow-up depends on memory", text: "Without a structured handoff, leads get copied into notes, texts, inboxes, and spreadsheets." },
    ],
    outcomes: [
      { title: "Faster response", text: "Every inquiry gets a prompt first response and a clear next step." },
      { title: "Better qualified pipeline", text: "Your team can prioritize urgent, in-area, high-intent opportunities first." },
      { title: "Less admin drag", text: "Call capture, summaries, and basic routing happen automatically instead of through manual note-taking." },
    ],
    howItWorks: [
      { title: "Configure the call flow", text: "We map your service areas, business hours, lead types, escalation rules, and appointment criteria." },
      { title: "Answer and qualify", text: "The AI receptionist greets callers, captures details, asks qualification questions, and handles common next steps." },
      { title: "Route the result", text: "The team receives a structured summary by email, SMS, CRM, or workflow tool depending on the setup." },
      { title: "Review and improve", text: "Weekly summaries show what was answered, what was captured, and where process changes would help." },
    ],
    useCases: [
      { title: "Property management", text: "Leasing calls, owner inquiries, tenant questions, maintenance triage, and after-hours intake." },
      { title: "HVAC and plumbing", text: "Emergency calls, seasonal surges, quote requests, dispatch routing, and after-hours service." },
      { title: "Roofing and contractors", text: "Inspection requests, storm leads, project inquiries, qualification, and appointment booking." },
    ],
    integrations: ["Google Calendar", "Gmail", "HubSpot", "HighLevel", "Slack", "Zapier", "n8n", "Retell", "Vapi"],
    pricing: [
      {
        name: "AI Receptionist Starter",
        price: "$299",
        unit: "first 30 days",
        description: "A focused pilot to prove the lead-handling workflow before expanding.",
        features: ["Setup and call flow design", "100 AI call minutes", "Lead capture and qualification", "Call summaries", "Basic weekly performance summary"],
        cta: "Start with the pilot",
        href: "/demo",
      },
    ],
    faq: [
      { question: "Is OttoServ a real receptionist or a chatbot?", answer: "It is an AI voice receptionist for phone calls and lead intake workflows. It is designed to answer, qualify, summarize, and route instead of sitting on a website as a passive chat widget." },
      { question: "Can the AI book appointments?", answer: "Yes, when the booking rules and calendar workflow are configured. Some businesses prefer a callback summary first; others let the AI book estimates, service windows, or consultations." },
      { question: "What happens if the caller has an unusual question?", answer: "The AI captures the question, gathers contact details, and routes the request to the right person instead of pretending to know something it should not answer." },
      { question: "Who is this best for?", answer: "Small and mid-sized service businesses that lose revenue from missed calls, after-hours inquiries, slow follow-up, or manual lead intake." },
    ],
    internalLinks: [
      { title: "AI Lead Qualification Agent", href: "/lead-qualification-agent", description: "See how lead qualification works before booking or transfer." },
      { title: "After-Hours Lead Capture", href: "/solutions/after-hours-lead-capture", description: "Capture calls, forms, and messages outside business hours." },
      { title: "AI Receptionist vs Answering Service", href: "/compare/ai-receptionist-vs-answering-service", description: "Compare OttoServ with traditional answering services." },
    ],
    schemaTypes: ["Service", "SoftwareApplication", "FAQPage", "Offer", "Product"],
    published: true,
  }),
  page({
    slug: "lead-qualification-agent",
    path: "/lead-qualification-agent",
    kind: "solution",
    title: "AI Lead Qualification Agent",
    metaTitle: "AI Lead Qualification Agent | OttoServ",
    metaDescription:
      "Qualify inbound calls and web leads before booking, transfer, or follow-up. OttoServ captures urgency, service need, location, fit, and next steps.",
    eyebrow: "Lead qualification automation",
    h1: "AI Lead Qualification Agent",
    intro:
      "OttoServ qualifies inbound leads before they hit your calendar or your team. The agent asks structured questions, captures the buying context, and helps decide whether to book, route, escalate, or follow up.",
    heroBullets: ["Capture contact details and service need.", "Ask industry-specific qualification questions.", "Prioritize urgent and high-fit opportunities.", "Send structured summaries instead of loose notes."],
    problems: [
      { title: "Every caller sounds urgent", text: "Without qualification, your team treats tire-kickers, emergency jobs, and bad-fit requests the same way." },
      { title: "Booking happens too early", text: "Some leads need screening before they take a calendar slot or dispatch attention." },
      { title: "Sales notes are inconsistent", text: "Manual qualification depends on whoever answered the phone and how busy they were." },
    ],
    outcomes: [
      { title: "Cleaner handoffs", text: "Each lead summary includes the context needed for sales, dispatch, or ownership." },
      { title: "Better prioritization", text: "Urgent, in-area, high-value leads rise to the top faster." },
      { title: "Fewer wasted appointments", text: "Qualification rules help screen poor-fit requests before they consume team time." },
    ],
    howItWorks: [
      { title: "Define fit", text: "We map your service area, job types, minimum requirements, urgency levels, and booking criteria." },
      { title: "Ask the right questions", text: "The agent captures details like timeline, property type, issue, budget signals, access needs, and decision role." },
      { title: "Route by outcome", text: "Qualified leads can be booked, urgent calls can be escalated, and low-fit requests can receive a polite next step." },
    ],
    useCases: [
      { title: "Roofing inspection requests", text: "Screen storm leads by location, damage type, insurance context, and inspection availability." },
      { title: "HVAC service calls", text: "Sort emergency no-cool calls from tune-ups, quote requests, and warranty questions." },
      { title: "Property management leasing", text: "Gather unit interest, move-in timing, budget, pet needs, and showing availability." },
    ],
    integrations: ["HubSpot", "HighLevel", "Airtable", "Google Sheets", "Slack", "Gmail", "Zapier", "n8n"],
    faq: [
      { question: "Can qualification questions vary by service?", answer: "Yes. HVAC, plumbing, roofing, property management, and contractors each need different questions and routing rules." },
      { question: "Does the agent reject leads?", answer: "It can mark a lead as lower fit or route it differently, but the workflow is configured around your comfort level." },
      { question: "Can summaries go into a CRM?", answer: "Yes. OttoServ can route summaries to email, SMS, Slack, spreadsheets, or CRM workflows depending on the integration." },
    ],
    internalLinks: defaultLinks,
    schemaTypes: ["Service", "SoftwareApplication", "FAQPage"],
    published: true,
  }),
  page({
    slug: "missed-call-recovery",
    path: "/missed-call-recovery",
    kind: "solution",
    title: "Missed Call Recovery for Small Businesses",
    metaTitle: "Missed Call Recovery for Small Businesses | OttoServ",
    metaDescription:
      "Recover missed calls with AI call answering, qualification, follow-up summaries, and appointment routing for SMBs and home service businesses.",
    eyebrow: "Missed-call recovery",
    h1: "Missed Call Recovery for Small Businesses",
    intro:
      "Missed calls are often the easiest revenue leak to understand and the hardest to fix with human staffing alone. OttoServ answers the calls your team cannot catch, captures the opportunity, and creates a follow-up path before the caller moves on.",
    heroBullets: ["Cover lunch breaks, evenings, weekends, and busy seasons.", "Capture caller details before they disappear.", "Identify urgent requests that need immediate routing.", "Track missed-call patterns so you know what is leaking."],
    problems: [
      { title: "Voicemail is not a sales process", text: "Many callers do not leave a message, and the ones who do may already be calling the next company." },
      { title: "After-hours demand is real", text: "Property issues, HVAC failures, plumbing leaks, and storm damage do not wait for office hours." },
      { title: "Owners lack visibility", text: "Most businesses cannot clearly see how many opportunities were missed and why." },
    ],
    outcomes: [
      { title: "More captured opportunities", text: "Calls that previously went unanswered can become structured leads." },
      { title: "Faster callbacks", text: "Your team receives the details needed to respond with context." },
      { title: "Better staffing decisions", text: "Call summaries and trends show when coverage gaps actually happen." },
    ],
    howItWorks: [
      { title: "Forward missed calls", text: "Your phone workflow routes missed, overflow, or after-hours calls to OttoServ." },
      { title: "Answer and triage", text: "The AI captures caller details, service need, urgency, and preferred next step." },
      { title: "Notify your team", text: "Urgent requests can trigger faster alerts while routine leads get organized summaries." },
    ],
    useCases: [
      { title: "Busy owner-operators", text: "Answer calls while the owner is on a job, driving, or with a client." },
      { title: "Seasonal service spikes", text: "Handle HVAC heat waves, storm-response roofing demand, and plumbing emergencies." },
      { title: "Weekend inquiries", text: "Capture prospects who research and call outside normal office hours." },
    ],
    integrations: ["Phone forwarding", "Gmail", "Slack", "Google Sheets", "HubSpot", "HighLevel", "Zapier"],
    faq: [
      { question: "Does this replace my phone system?", answer: "No. OttoServ usually works alongside your phone system through forwarding, overflow, or after-hours routing." },
      { question: "Can urgent calls be escalated?", answer: "Yes. Escalation rules can route urgent calls differently from routine questions or quote requests." },
      { question: "Will callers know it is AI?", answer: "The experience should be clear, professional, and useful. The goal is to capture the caller and route them well, not pretend to be a human." },
    ],
    internalLinks: defaultLinks,
    schemaTypes: ["Service", "SoftwareApplication", "FAQPage"],
    published: true,
  }),
];

const industryPages: SeoPage[] = [
  page({
    slug: "property-management-ai-receptionist",
    path: "/industries/property-management-ai-receptionist",
    kind: "industry",
    title: "AI Receptionist for Property Management Companies",
    metaTitle: "AI Receptionist for Property Management Companies | OttoServ",
    eyebrow: "Property management AI receptionist",
    h1: "AI Receptionist for Property Management Companies",
    metaDescription:
      "AI receptionist for property managers handling leasing calls, owner inquiries, tenant questions, maintenance triage, vendor routing, AppFolio/Buildium-style workflows, and after-hours calls.",
    intro:
      "Property management communication is not one call type. A leasing prospect wants a tour, a tenant may have an active leak, an owner wants an update, and a vendor needs routing details. OttoServ gives property managers an AI receptionist and lead qualification workflow built around those differences, with escalation rules for the calls that should never sit in voicemail.",
    heroBullets: [
      "Answer leasing, tenant, owner, vendor, and maintenance calls with different intake paths.",
      "Triage after-hours requests without treating every issue like an emergency.",
      "Capture the details leasing agents and maintenance vendors need before they call back.",
      "Route summaries into AppFolio/Buildium-style inboxes, maintenance workflows, calendars, or team channels.",
    ],
    problems: [
      { title: "Leasing calls arrive while the team is showing units", text: "Prospects ask about availability, move-in dates, pet rules, deposits, income criteria, and showing windows. If no one captures that context quickly, the next property manager gets the tour." },
      { title: "Maintenance triage is not just message-taking", text: "A leak, no heat, gas smell, clogged drain, noise complaint, and payment portal question all need different handling. The intake has to ask enough clarifying questions to avoid both under-escalation and unnecessary after-hours dispatch." },
      { title: "Manual follow-up creates operational drag", text: "Staff spend time calling back for unit numbers, access permission, pet or alarm notes, photos, move-in timing, and owner context instead of leasing units or managing assets." },
      { title: "Owners and residents judge responsiveness", text: "A full voicemail box or slow callback can look like poor management, even when the team is simply overloaded with tours, inspections, vendor coordination, and resident issues." },
    ],
    outcomes: [
      { title: "Faster leasing follow-up", text: "Applicant interest is captured with preferred move-in date, unit preference, pet profile, occupancy context, eligibility questions you approve, and showing availability." },
      { title: "Cleaner maintenance intake", text: "Requests include unit, room, specific issue, active damage indicators, permission to enter, pets or alarms, and whether photos or videos should be requested." },
      { title: "Smarter after-hours routing", text: "The system can separate life-safety or habitability signals from routine requests, then escalate only according to your approved protocol." },
      { title: "Less front-office interruption", text: "Routine billing, portal, leasing, owner, and maintenance requests become structured summaries instead of scattered voicemail and inbox fragments." },
    ],
    howItWorks: [
      { title: "Map call silos", text: "We define separate paths for leasing prospects, tenants, maintenance, owners, vendors, billing or portal questions, and after-hours emergencies." },
      { title: "Build the knowledge base", text: "OttoServ uses your approved property rules, escalation policies, pet policies, tour rules, service areas, office hours, and do-not-answer topics." },
      { title: "Capture structured intake", text: "The receptionist asks different questions for a leasing prospect than it asks for an active water leak or owner update request." },
      { title: "Route to the right workflow", text: "Summaries can support AppFolio, Buildium, Yardi, Rent Manager, DoorLoop, Property Meld, Latchel, calendars, inboxes, and vendor dispatch workflows depending on access." },
    ],
    useCases: [
      { title: "Leasing inquiries", text: "Availability, unit preference, move-in timing, income or eligibility criteria you approve, pet profile, smoking rules, showing windows, and application next steps." },
      { title: "Maintenance triage", text: "Active leaks, no heat, clogged drains, appliance issues, permission to enter, pets or alarms, photo requests, and vendor routing." },
      { title: "Owner and resident questions", text: "Owner update requests, tenant portal questions, payment issues, lease renewal questions, rules, and manager follow-up requests." },
      { title: "After-hours coverage", text: "Separate life-safety and habitability signals from routine next-business-day maintenance without relying on voicemail." },
    ],
    callTypes: [
      { title: "Active water leak", urgency: "Critical", action: "Capture location and active damage, give approved shutoff guidance if provided, and escalate to the on-call manager or preferred plumber." },
      { title: "No heat / no cooling", urgency: "Potential emergency", action: "Ask temperature, resident vulnerability, unit details, and route according to weather and habitability rules." },
      { title: "Gas smell or active break-in", urgency: "Life-safety", action: "Use approved safety script that directs the caller to emergency services or utility provider, then notify management." },
      { title: "Leasing inquiry", urgency: "High commercial intent", action: "Capture move-in timing, unit interest, pet profile, eligibility context, and tour availability." },
      { title: "Payment or portal issue", urgency: "Routine admin", action: "Route to portal instructions or log for business-hour follow-up without interrupting maintenance dispatch." },
      { title: "Clogged drain or noise complaint", urgency: "Context-dependent", action: "Ask clarifying questions before deciding whether it is urgent, routine maintenance, or a policy/logging issue." },
    ],
    workflows: [
      {
        title: "Leasing prequalification",
        steps: [
          "Identify desired unit, move-in date, household/occupancy context, pets, smoking preference, and reason for relocating.",
          "Ask only the eligibility and screening questions your team approves.",
          "Book a tour or route a clean summary to leasing with the prospect's preferred times.",
        ],
      },
      {
        title: "Maintenance intake",
        steps: [
          "Capture unit, room, issue description, active damage, permission to enter, pets, alarms, and resident availability.",
          "Request photos or video through a follow-up link when your workflow supports it.",
          "Route urgent issues to escalation and routine issues to the maintenance queue.",
        ],
      },
      {
        title: "Owner and admin routing",
        steps: [
          "Separate owner questions, rent or payment portal issues, lease questions, and vendor calls.",
          "Avoid legal, Fair Housing, deposit, eviction, or policy answers unless they are explicitly approved.",
          "Send summaries to the right inbox, task list, or manager queue.",
        ],
      },
    ],
    objections: [
      { concern: "Will this make us look cheap or robotic?", response: "OttoServ positions the AI as a 24/7 assistant, not a replacement for the property manager. The goal is to prevent residents and prospects from hitting a dead end when your team is on tours, inspections, or owner calls." },
      { concern: "What if it gives the wrong legal or Fair Housing answer?", response: "The workflow is designed with guardrails. Sensitive topics such as legal advice, deposit disputes, eviction questions, or Fair Housing interpretation can be routed to a human instead of answered by the AI." },
      { concern: "Will it know our property-specific rules?", response: "The receptionist is configured from your approved knowledge base: office hours, escalation rules, pet policies, tour rules, maintenance process, preferred vendors, and topics that require human follow-up." },
      { concern: "Will implementation become another PropTech project?", response: "The first deployment can start narrowly with call forwarding, summaries, and approved scripts. Deeper AppFolio, Buildium, Yardi, Rent Manager, DoorLoop, Property Meld, or Latchel workflows can be scoped once the core intake is working." },
      { concern: "Will my team feel replaced?", response: "The strongest use case is removing routine interruption so staff can focus on lease signings, owner relationships, vendor management, inspections, and exceptions." },
    ],
    trustSignals: [
      { title: "Human escalation by design", text: "Emergency, legal, safety, owner-sensitive, or policy-sensitive calls can be routed to people instead of answered automatically." },
      { title: "Property-specific scripts", text: "The AI follows your approved intake questions and escalation rules rather than generic property-management advice from the web." },
      { title: "Software-aware implementation", text: "The workflow can start with email and call summaries, then progress toward AppFolio, Buildium, Yardi, Rent Manager, DoorLoop, Property Meld, Latchel, Lula, calendar, and communication-hub integrations where access allows." },
      { title: "Operational outcomes, not novelty", text: "Success is measured in captured leasing inquiries, cleaner maintenance tickets, fewer manual callbacks for missing information, and less after-hours interruption." },
    ],
    integrations: [
      "AppFolio-style leasing and tenant workflows",
      "Buildium-style resident communication",
      "Yardi Voyager / Breeze workflows",
      "Rent Manager",
      "DoorLoop",
      "Property Meld",
      "Latchel",
      "Lula",
      "Google Calendar",
      "Outlook Calendar",
      "RingCentral",
      "Nextiva",
      "Twilio",
      "PayNearMe / payment portal routing",
      "Gmail",
      "Slack",
      "Zapier",
      "n8n",
    ],
    faq: [
      { question: "Can OttoServ handle tenant, owner, vendor, and leasing calls differently?", answer: "Yes. Each caller type can follow a different intake path, script, escalation rule, and summary format. A leasing prospect should not be handled like a tenant with an active leak." },
      { question: "Can it triage maintenance emergencies?", answer: "Yes, within your approved rules. OttoServ can ask clarifying questions about active water, heat or cooling, life-safety issues, access, pets, alarms, and unit details, then route urgent requests according to your escalation protocol." },
      { question: "How does OttoServ avoid Fair Housing or legal-answer risk?", answer: "Sensitive topics can be blocked from AI answers and routed to a human. The AI should use the same approved, consistent intake script for every prospect and avoid making discretionary legal, eligibility, deposit, eviction, or Fair Housing judgments unless your team has explicitly approved the language." },
      { question: "Can it collect leasing prequalification details?", answer: "Yes. It can capture move-in date, unit preference, pet profile, smoking preference, household or occupancy context, showing availability, and the screening questions your team approves." },
      { question: "Can it improve maintenance tickets?", answer: "It is designed to capture the details vendors usually need: unit, room, specific issue, active damage, permission to enter, pets or alarms, and visual evidence when your workflow supports photo or video requests." },
      { question: "Does it integrate directly with AppFolio, Buildium, or Yardi?", answer: "Integration depth depends on your account, permissions, and the platform involved. OttoServ can begin with inbox routing, call summaries, forms, and automation tools, then scope deeper AppFolio, Buildium, Yardi, Rent Manager, DoorLoop, Property Meld, Latchel, or calendar workflows where access allows." },
      { question: "Will residents accept an AI receptionist?", answer: "The safest framing is not replacement; it is faster coverage. The AI is there to make sure residents, owners, and prospects are not abandoned to voicemail when the team is unavailable." },
    ],
    internalLinks: [
      { title: "After-Hours Lead Capture", href: "/solutions/after-hours-lead-capture", description: "Cover the calls that arrive after the office closes." },
      { title: "What Is an AI Receptionist?", href: "/resources/what-is-an-ai-receptionist", description: "A plain-English guide to how AI receptionists work." },
      { title: "Pricing", href: "/pricing", description: "Start with a focused AI receptionist offer." },
      { title: "AI Receptionist vs Answering Service", href: "/compare/ai-receptionist-vs-answering-service", description: "See where OttoServ differs from traditional message-taking." },
      { title: "Missed Call Recovery", href: "/missed-call-recovery", description: "Recover calls that would otherwise become voicemail or lost leasing demand." },
      { title: "Book an OttoServ Demo", href: "/demo", description: "Map your leasing, maintenance, owner, and after-hours call paths." },
    ],
    schemaTypes: ["Service", "SoftwareApplication", "FAQPage"],
    published: true,
  }),
  page({
    slug: "hvac-ai-receptionist",
    path: "/industries/hvac-ai-receptionist",
    kind: "industry",
    title: "AI Receptionist for HVAC Companies",
    metaTitle: "AI Receptionist for HVAC Companies | OttoServ",
    metaDescription:
      "AI receptionist for HVAC companies handling no-cool and no-heat calls, diagnostic repair intake, tune-up scheduling, replacement estimates, and FSM-ready dispatch notes.",
    eyebrow: "HVAC AI receptionist",
    h1: "AI Receptionist for HVAC Companies",
    intro:
      "HVAC calls are not all the same. A no-cool emergency during a heat wave, a furnace failure with elderly occupants in the home, a spring tune-up, a diagnostic-fee question, and a replacement estimate all need different intake and routing. OttoServ gives HVAC contractors an AI receptionist and lead qualification workflow built around dispatch reality, not generic message-taking.",
    heroBullets: [
      "Triage no-cool, no-heat, refrigerant, condensate, tune-up, warranty, and replacement calls.",
      "Capture equipment brand, system type, age, symptoms, service address, callback number, and diagnostic-fee acknowledgment.",
      "Route urgent calls to on-call escalation while booking routine work into approved windows.",
      "Prepare cleaner notes for ServiceTitan, Housecall Pro, Jobber, Schedule Engine, dispatch boards, and office follow-up.",
    ],
    problems: [
      { title: "Emergency callers will not wait through voicemail", text: "When an AC stops cooling in July or a furnace fails during a freeze, the caller wants a clear next step. A slow callback can turn paid marketing demand into a competitor's booked job." },
      { title: "Seasonal surges expose front-office limits", text: "Heat waves, cold snaps, shoulder-season tune-ups, and after-hours service requests create bursts of call volume that a small office or owner-operator cannot answer one at a time." },
      { title: "Dispatch quality depends on technical intake", text: "A rushed call note that misses equipment type, age, symptoms, refrigerant clues, access notes, or diagnostic-fee approval can create avoidable callbacks and wasted truck time." },
      { title: "Not every HVAC call belongs on the same path", text: "Emergency repair, diagnostic repair, maintenance membership, replacement estimate, warranty, billing, vendor, and spam calls each need different handling and different data." },
      { title: "Owners fear bad data in the FSM", text: "Many contractors have seen automation create duplicate customer records, vague tasks, or messy dispatch-board notes. OttoServ has to be configured around database hygiene and human approval points." },
    ],
    outcomes: [
      { title: "More high-intent calls captured", text: "Overflow and after-hours calls receive structured intake instead of being left to voicemail, especially during peak heating and cooling demand." },
      { title: "Cleaner service-job summaries", text: "Dispatch receives name, validated callback number, service address, system type, equipment age, symptoms, urgency, access notes, and the caller's approved next step." },
      { title: "Smarter emergency routing", text: "The workflow can flag weather-sensitive outages, vulnerable occupants, gas odor, carbon monoxide alarm language, condensate leaks, and commercial downtime signals for faster escalation." },
      { title: "Better use of routine capacity", text: "Tune-ups, maintenance memberships, filter questions, and non-urgent diagnostics can be routed into approved booking windows instead of interrupting emergency dispatch." },
      { title: "Higher-quality sales handoff", text: "Replacement and installation leads can be separated from repair calls and routed to a comfort advisor with system type, age, financing interest, and consultation timing." },
    ],
    howItWorks: [
      { title: "Map HVAC call categories", text: "We separate emergency no-cool/no-heat, diagnostic repair, tune-up, membership, replacement estimate, warranty, billing, vendor, and general questions." },
      { title: "Configure your dispatch rules", text: "OttoServ uses your approved service area, on-call rules, diagnostic-fee language, technician specialties, arrival windows, membership rules, and topics that require a human." },
      { title: "Ask trade-specific intake questions", text: "The AI captures system type, equipment brand, approximate age, symptoms like short cycling or warm air, refrigerant or condensate clues, access notes, and occupant vulnerability signals." },
      { title: "Create the right handoff", text: "Urgent calls can trigger escalation. Routine calls can become pending bookings or summaries. Sales estimates can route to a comfort advisor instead of a service technician." },
    ],
    useCases: [
      { title: "Emergency no-cool and no-heat", text: "Complete system failures, extreme weather context, vulnerable occupants, on-call escalation, and rapid callback routing." },
      { title: "Diagnostic repair intake", text: "Thermostat issues, short cycling, strange noises, lukewarm air, water near the unit, diagnostic-fee acknowledgment, and standard appointment windows." },
      { title: "Seasonal tune-ups and memberships", text: "Spring and fall maintenance, recurring service plans, filter questions, and lower-urgency booking windows that help fill the calendar." },
      { title: "Replacement and installation estimates", text: "Aging systems, second opinions, heat pumps, split systems, mini-splits, efficiency concerns, financing interest, and comfort-advisor routing." },
      { title: "Warranty, billing, and admin calls", text: "Parts-on-order questions, invoice concerns, manufacturer warranty context, and admin callback tasks instead of forcing every call into dispatch." },
      { title: "Spam and vendor filtering", text: "Solicitations and vendor inquiries can be captured or filtered so dispatch time is reserved for real customer demand." },
    ],
    callTypes: [
      { title: "No-cool during peak heat", urgency: "Emergency repair", action: "Capture indoor conditions, vulnerable occupants, system behavior, service address, and escalation preference before routing to the on-call or emergency queue." },
      { title: "No-heat during cold weather", urgency: "Emergency repair", action: "Ask whether the system is completely down, whether infants, elderly residents, or medical vulnerabilities are present, and whether emergency dispatch rules apply." },
      { title: "Short cycling or warm air", urgency: "Diagnostic repair", action: "Capture symptoms, system type, equipment age, thermostat context, and preferred arrival window for a standard service job." },
      { title: "Condensate leak or water near equipment", urgency: "Context-dependent", action: "Ask whether water is active, where it is appearing, whether there is ceiling or property damage, and whether the issue should escalate." },
      { title: "Refrigerant recharge or leak concern", urgency: "Specialty routing", action: "Flag refrigerant language so the job can be routed according to EPA 608-aware technician rules and your approved service process." },
      { title: "Seasonal tune-up or membership", urgency: "Routine scheduling", action: "Confirm membership status, equipment count, preferred timing, and calendar windows that protect higher-priority service capacity." },
      { title: "Replacement estimate", urgency: "Sales opportunity", action: "Capture equipment type, age, efficiency concerns, financing interest, timeline, and route to a comfort advisor or sales manager." },
      { title: "Billing or warranty question", urgency: "Administrative", action: "Collect account context, invoice or warranty details, and create a callback task for office staff rather than guessing on policy." },
    ],
    workflows: [
      {
        title: "Emergency dispatch triage",
        steps: [
          "Detect no-cool, no-heat, gas odor, carbon monoxide alarm, condensate leak, commercial downtime, or vulnerable-occupant language.",
          "Capture name, validated callback number, full service address, system status, safety details, and access notes.",
          "Bypass routine booking when your rules require escalation and notify the on-call technician, dispatcher, or emergency queue.",
        ],
      },
      {
        title: "Diagnostic repair booking",
        steps: [
          "Classify the symptom: short cycling, warm air, thermostat issue, strange noise, minor leak, air handler issue, mini-split concern, or standard repair.",
          "Record equipment brand, system type, approximate age, diagnostic-fee acknowledgment, and preferred arrival window.",
          "Create a clean pending booking or structured summary for ServiceTitan, Housecall Pro, Jobber, or your dispatch workflow.",
        ],
      },
      {
        title: "Replacement estimate qualification",
        steps: [
          "Separate replacement, second-opinion, high-efficiency upgrade, heat pump, split system, mini-split, and financing-interest calls from routine service.",
          "Capture project timeline, property context, existing equipment, pain point, and consultation availability.",
          "Route the lead to a comfort advisor or sales manager instead of dispatching the wrong service visit.",
        ],
      },
      {
        title: "Admin and data hygiene",
        steps: [
          "Validate caller name, phone number, address, and existing-customer context before creating new records or tasks.",
          "Route warranty, billing, parts-on-order, and office-policy questions to human follow-up when answers are not explicitly approved.",
          "Keep duplicate prevention, dispatch-board cleanliness, and approval points visible during implementation.",
        ],
      },
    ],
    objections: [
      { concern: "Will my customers hang up on a robot?", response: "The page should not pretend AI is the same as a trusted dispatcher. OttoServ is positioned as instant coverage when the alternative is voicemail, a busy office line, or a missed after-hours emergency. Human escalation stays available for sensitive calls." },
      { concern: "What if it misunderstands accents or frantic callers?", response: "The workflow uses confirmation prompts for names, addresses, and callback numbers. If the caller is too unclear or distressed, the system can capture the best reachable number and route to a human failover path." },
      { concern: "Will it quote the wrong price or promise something we cannot do?", response: "Diagnostic fees, promotions, service areas, arrival windows, warranty language, and off-script limitations are configured from your approved rules. The AI should log unknown questions instead of inventing an answer." },
      { concern: "Will it mess up ServiceTitan, Housecall Pro, or Jobber?", response: "OttoServ can start with summaries and pending tasks before deeper FSM writes. When integrations are scoped, the workflow should validate customer details and preserve dispatcher approval points instead of blindly creating jobs." },
      { concern: "Our office manager has rules that are not written down.", response: "The setup starts by documenting the real operating rules: technician zones, equipment specialties, diagnostic-fee language, emergency thresholds, membership rules, and when the owner or dispatcher must approve." },
      { concern: "What about refrigerant or specialty work?", response: "Calls involving refrigerant, high-efficiency equipment, heat pumps, mini-splits, or complex diagnostics can be tagged for EPA 608-aware and specialty-technician routing according to your team structure." },
    ],
    trustSignals: [
      { title: "HVAC-specific triage", text: "The page handles no-cool, no-heat, short cycling, condensate, refrigerant, tune-up, replacement, warranty, billing, and vendor calls as separate workflows." },
      { title: "Approved-script guardrails", text: "Diagnostic fees, promotions, service-area rules, warranties, and arrival windows come from the contractor's approved language, with human routing for policy-sensitive questions." },
      { title: "Dispatch-board hygiene", text: "The implementation can start with summaries and move toward pending jobs or FSM updates only after customer matching, address validation, and approval rules are clear." },
      { title: "Certification-aware routing", text: "Refrigerant and complex diagnostic calls can be tagged for EPA 608-aware or specialty-technician routing instead of being treated like ordinary tune-ups." },
      { title: "Peak-season resilience", text: "OttoServ is designed for summer and winter call spikes, after-hours coverage, and concurrent overflow where one office line or one VA becomes a bottleneck." },
      { title: "Owner KPI alignment", text: "Success is framed around captured calls, cleaner dispatch notes, protected marketing spend, better truck-roll preparation, and less administrative interruption." },
    ],
    integrations: [
      "ServiceTitan-style dispatch workflows",
      "Housecall Pro-style booking workflows",
      "Jobber-style customer and job workflows",
      "Schedule Engine-style online booking",
      "Google Calendar",
      "Outlook Calendar",
      "Google Local Services Ads lead handling",
      "HighLevel",
      "HubSpot",
      "Gmail",
      "Slack",
      "Twilio",
      "RingCentral",
      "Nextiva",
      "Zapier",
      "n8n",
    ],
    faq: [
      { question: "Can OttoServ tell a no-cool emergency from a routine tune-up?", answer: "Yes, when your escalation rules are configured. The AI can ask about complete system failure, local conditions, vulnerable occupants, gas odor, carbon monoxide alarm language, active water, and commercial downtime before deciding whether to escalate or book routinely." },
      { question: "Can it handle diagnostic-fee questions?", answer: "Yes. OttoServ can use your approved language for dispatch fees, diagnostic fees, credits, promotions, and exclusions. It should never guess on pricing rules that have not been approved." },
      { question: "Can it book directly into ServiceTitan, Housecall Pro, or Jobber?", answer: "Integration depth depends on your account, permissions, and the platform involved. OttoServ can begin with call summaries and pending tasks, then scope deeper ServiceTitan, Housecall Pro, Jobber, Schedule Engine, calendar, or CRM workflows where access allows." },
      { question: "How does OttoServ avoid duplicate customer records?", answer: "The workflow can be designed to validate caller name, phone number, and service address before creating new records. For deeper FSM integrations, customer matching and dispatcher approval rules should be part of the implementation." },
      { question: "Can it route refrigerant calls to the right technician?", answer: "It can flag refrigerant recharge, leak, system charge, and related language so the job can be routed according to your EPA 608-aware staffing and dispatch rules." },
      { question: "Can it qualify replacement and installation estimates?", answer: "Yes. It can capture existing system type, approximate age, efficiency concerns, timeline, financing interest, and preferred consultation times, then route the opportunity to a comfort advisor or sales manager." },
      { question: "Can it help with Google Local Services Ads calls?", answer: "It can help answer and structure inbound LSA-driven calls. The page phrases this carefully: faster response and better answer coverage can protect the value of paid lead sources, but OttoServ should not claim a guaranteed ranking lift." },
      { question: "Does it replace the office manager?", answer: "No. The strongest HVAC use case is taking repetitive intake, overflow, after-hours, and qualification work off the front desk so the office manager and dispatcher can handle exceptions, customer care, and field coordination." },
    ],
    internalLinks: [
      { title: "After-Hours Lead Capture", href: "/solutions/after-hours-lead-capture", description: "Capture emergency and after-hours HVAC calls before they become voicemail." },
      { title: "Missed Call Recovery", href: "/missed-call-recovery", description: "Recover overflow calls from seasonal HVAC spikes and paid lead campaigns." },
      { title: "AI Receptionist", href: "/ai-receptionist", description: "See the broader AI receptionist offer for SMB call answering and lead intake." },
      { title: "AI Lead Qualification Agent", href: "/lead-qualification-agent", description: "Qualify repair, tune-up, replacement, and admin calls before routing them." },
      { title: "AI Receptionist vs Answering Service", href: "/compare/ai-receptionist-vs-answering-service", description: "Compare trade-specific AI intake with traditional message-taking." },
      { title: "Pricing", href: "/pricing", description: "Start with a focused AI receptionist offer and expand by call volume and workflow depth." },
      { title: "Book an OttoServ Demo", href: "/demo", description: "Map your no-cool, no-heat, tune-up, dispatch, and replacement-call workflows." },
    ],
    schemaTypes: ["Service", "SoftwareApplication", "FAQPage"],
    published: true,
  }),
  page({
    slug: "plumbing-ai-call-answering",
    path: "/industries/plumbing-ai-call-answering",
    kind: "industry",
    title: "AI Call Answering for Plumbing Companies",
    metaTitle: "AI Call Answering for Plumbing Companies | OttoServ",
    metaDescription:
      "AI call answering for plumbing companies handling burst pipes, sewer backups, water heater calls, fixture repairs, emergency dispatch, and FSM-ready job intake.",
    eyebrow: "Plumbing AI call answering",
    h1: "AI Call Answering for Plumbing Companies",
    intro:
      "Plumbing calls are not polite calendar requests. A burst pipe, main sewer backup, leaking water heater, isolated fixture clog, backflow testing request, and billing question all need different handling. OttoServ gives plumbing contractors an AI receptionist and lead qualification workflow built around emergency triage, clean dispatch notes, and safe escalation rules.",
    heroBullets: [
      "Triage burst pipes, active flooding, sewer backups, water heater leaks, gas-smell reports, fixture repairs, and routine installs.",
      "Capture caller name, validated callback number, service address, property ownership, payment responsibility, issue scope, and access notes.",
      "Route red-flag emergencies to on-call escalation while booking routine fixture and drain work into approved windows.",
      "Prepare cleaner notes for ServiceTitan, Housecall Pro, Jobber, QuoteIQ, calendars, and dispatcher review.",
    ],
    problems: [
      { title: "Emergency plumbing callers are under pressure", text: "A homeowner with water on the floor, sewage backing up, or no running water needs a clear next step. If the call goes to voicemail, they usually keep dialing until a plumber answers." },
      { title: "Generic answering services miss the difference", text: "A running toilet, isolated sink clog, burst supply line, sewer backup, gas smell near a water heater, and commercial backflow request should not follow the same script." },
      { title: "Bad intake creates bad dispatch", text: "Missing the service address, unit number, property ownership, water shutoff status, fixture type, water heater fuel source, or diagnostic-fee acknowledgment can waste truck time and create friction on site." },
      { title: "After-hours demand is where mistakes get expensive", text: "Nights, weekends, freezes, and storm events create bursts of urgent calls. A single office line, virtual assistant, or generic call center can become a bottleneck." },
      { title: "Owners worry automation will clutter the board", text: "Plumbing shops need clean customer matching, pending-job review, route awareness, and human approval points before anything reaches the dispatch board." },
    ],
    outcomes: [
      { title: "More emergency calls captured", text: "Overflow and after-hours callers get structured intake instead of a voicemail dead end, especially for active leaks, burst pipes, sewer backups, and water heater failures." },
      { title: "Cleaner work-order context", text: "Dispatch receives validated contact details, service address, issue category, active damage status, shutoff context, fixture or equipment details, access notes, and payment/ownership context." },
      { title: "Safer red-flag routing", text: "The workflow can flag uncontrolled water, sewage in living areas, total water loss, water near electrical systems, and gas-smell language for immediate human escalation." },
      { title: "Better routine scheduling", text: "Dripping faucets, running toilets, isolated clogs, fixture upgrades, water softener installs, and backflow testing can be routed into standard booking windows." },
      { title: "Stronger commercial handoff", text: "Property management, multi-tenant, grease trap, backflow, and service-agreement calls can route to the right commercial or account-management workflow." },
    ],
    howItWorks: [
      { title: "Map plumbing call categories", text: "We separate active flooding, sewer backups, water heater calls, fixture repairs, drain cleaning, gas-line concerns, backflow/commercial work, warranty, billing, and general requests." },
      { title: "Configure dispatch guardrails", text: "OttoServ uses your approved service area, emergency thresholds, diagnostic-fee language, technician zones, commercial rules, warranty process, and human-escalation topics." },
      { title: "Ask trade-specific intake", text: "The AI captures shutoff status, fixture or drain type, multiple-fixture backup signals, water heater fuel source and location, property ownership, payment responsibility, and arrival-window preference." },
      { title: "Create the right handoff", text: "Red-flag emergencies can escalate immediately. Routine repairs can become pending work orders. Admin, warranty, and commercial requests can route to the right office or account owner." },
    ],
    useCases: [
      { title: "Burst pipes and active flooding", text: "Water everywhere, flooded basement, failed angle stop, ruptured supply line, shutoff status, electrical proximity, and on-call escalation." },
      { title: "Main sewer line backups", text: "Multiple fixtures backing up, sewage in living spaces, floor drains, tubs, toilets, rotten-egg odor, cleanout access, and rapid dispatch." },
      { title: "Water heater calls", text: "No hot water, leaking tank, pilot-light issues, gas or electric, tankless or tank, capacity, location, age, and repair-versus-replacement intent." },
      { title: "Fixtures, faucets, and slow drains", text: "Contained drips, running toilets, low water pressure, localized sink clogs, P-trap issues, and standard multi-hour arrival windows." },
      { title: "Commercial and property management", text: "Backflow testing, grease trap maintenance, multi-tenant service agreements, after-hours dispatch, and account-manager routing." },
      { title: "Warranty, billing, and parts questions", text: "Invoice disputes, permit inspection questions, parts-on-order updates, and admin callback tasks instead of guessed answers." },
    ],
    callTypes: [
      { title: "Active flooding or burst pipe", urgency: "Critical emergency", action: "Capture location, active flow, shutoff status, water near electrical systems, and route to the on-call emergency path with your approved safety script." },
      { title: "Main sewer line backup", urgency: "Health hazard", action: "Ask whether multiple fixtures are backing up, whether sewage is entering living spaces, and whether cleanout access is known before dispatch escalation." },
      { title: "Gas smell near water heater or gas line", urgency: "Life-safety", action: "Use approved safety language that directs the caller to evacuate and contact emergency services or the utility provider, then notify the plumbing team." },
      { title: "Water heater leak or no hot water", urgency: "High-value service", action: "Capture fuel source, tank or tankless, tank size if known, unit location, active leak status, and replacement interest." },
      { title: "Contained drip or isolated clog", urgency: "Routine repair", action: "Confirm fixture, severity, other working bathrooms or drains, access notes, and standard booking window." },
      { title: "Backflow, grease trap, or commercial request", urgency: "Commercial routing", action: "Capture property type, certification or compliance need, account context, and route to the commercial manager or approved queue." },
      { title: "Billing, warranty, permit, or parts question", urgency: "Administrative", action: "Log the account context and create a callback task for office staff instead of inventing a policy answer." },
    ],
    workflows: [
      {
        title: "Emergency plumbing triage",
        steps: [
          "Detect burst pipe, uncontrolled water, sewer backup, total water loss, water near electrical systems, or gas-smell language.",
          "Capture name, validated callback number, full service address, shutoff status, affected area, property type, and access notes.",
          "Bypass routine scheduling when your rules require escalation and alert the on-call technician, dispatcher, or emergency queue.",
        ],
      },
      {
        title: "Standard repair booking",
        steps: [
          "Classify fixture, drain, toilet, faucet, water pressure, P-trap, PRV, water hammer, or localized clog issue.",
          "Confirm whether the issue is contained, whether other fixtures work, and whether the caller approves your diagnostic or dispatch-fee language.",
          "Create a pending work order or structured summary for ServiceTitan, Housecall Pro, Jobber, QuoteIQ, or your calendar workflow.",
        ],
      },
      {
        title: "Water heater qualification",
        steps: [
          "Separate no-hot-water, leaking tank, pilot-light, tankless, gas, electric, and replacement-interest calls.",
          "Capture tank size if known, age, location, active leak status, ownership/payment context, and availability.",
          "Route repair calls to service and replacement-intent calls to estimate or sales follow-up.",
        ],
      },
      {
        title: "Commercial and admin routing",
        steps: [
          "Identify property managers, multi-tenant buildings, backflow testing, grease trap maintenance, service agreements, warranty, billing, parts, and permit questions.",
          "Avoid final policy, pricing, warranty, or permit answers unless your team has approved the language.",
          "Send clean notes to the account owner, commercial manager, dispatcher, or office administrator.",
        ],
      },
    ],
    objections: [
      { concern: "Will callers hang up on a robot?", response: "OttoServ should be positioned as instant coverage when the real alternative is voicemail, a busy signal, or a delayed callback. Human escalation remains available for emergencies, upset callers, and policy-sensitive situations." },
      { concern: "Our office manager has unwritten scheduling rules.", response: "The setup documents service areas, technician zones, emergency thresholds, commercial accounts, diagnostic-fee rules, and job-capacity limits before the AI handles live traffic." },
      { concern: "Will it create duplicate clients or bad dispatch data?", response: "The first deployment can start with summaries and pending tasks. Deeper FSM workflows should validate phone, name, and address before writing records and preserve dispatcher approval points." },
      { concern: "Will it quote the wrong price or make false promises?", response: "Diagnostic fees, dispatch fees, service areas, arrival windows, promotions, and warranty language come from approved scripts. Unknown or off-script questions route to human follow-up." },
      { concern: "Can it handle frantic callers or regional accents?", response: "The workflow uses confirmation prompts for names, addresses, callback numbers, and critical details. If the call remains unclear, it captures the safest callback path and escalates." },
      { concern: "What about safety instructions?", response: "Emergency scripts are approved by the plumbing company. The AI can prompt main-water shutoff guidance if provided and route gas-smell or life-safety situations to emergency-service instructions and human notification." },
    ],
    trustSignals: [
      { title: "Plumbing-specific triage", text: "The page treats active flooding, sewer backups, water heater calls, fixture repairs, backflow, grease trap, warranty, billing, and admin calls as separate workflows." },
      { title: "Approved-script guardrails", text: "Safety language, diagnostic fees, promotions, service area, warranty rules, and arrival windows come from the contractor's approved process." },
      { title: "Dispatch-board hygiene", text: "OttoServ can begin with summaries and move toward pending jobs or CRM updates only after duplicate-prevention and dispatcher-review rules are clear." },
      { title: "Commercial-aware routing", text: "Property management, multi-tenant, backflow testing, grease trap, and service-agreement calls can be routed differently from one-off residential repairs." },
      { title: "Trade terminology", text: "Intake can recognize terms like main cleanout, P-trap, PRV, water hammer, snaking, rodding, tankless, backflow, and water heater fuel source." },
      { title: "Owner KPI alignment", text: "Success is framed around captured emergency demand, cleaner work orders, fewer manual callbacks, better truck-roll preparation, and less front-office interruption." },
    ],
    integrations: [
      "ServiceTitan-style dispatch workflows",
      "Housecall Pro-style booking workflows",
      "Jobber-style customer and job workflows",
      "QuoteIQ-style estimate workflows",
      "Google Calendar",
      "Outlook Calendar",
      "Google Local Services Ads lead handling",
      "HighLevel",
      "HubSpot",
      "Gmail",
      "Slack",
      "Twilio",
      "RingCentral",
      "Nextiva",
      "Zapier",
      "n8n",
    ],
    faq: [
      { question: "Can OttoServ tell a burst pipe from a routine fixture repair?", answer: "Yes, when your escalation rules are configured. The AI can ask about active water flow, shutoff status, affected rooms, water near electrical systems, sewage backup, and whether the issue is contained before choosing an emergency or standard booking path." },
      { question: "Can it triage sewer backups?", answer: "Yes. It can ask whether multiple fixtures are backing up, whether sewage is entering living spaces, whether a cleanout is accessible, and whether the call should escalate according to your dispatch rules." },
      { question: "Can it qualify water heater repair and replacement calls?", answer: "Yes. It can capture gas or electric, tank or tankless, tank size if known, unit location, age, leak status, no-hot-water symptoms, and whether the caller is open to replacement." },
      { question: "Can it handle diagnostic or dispatch-fee questions?", answer: "Yes. OttoServ uses your approved fee language and should not guess. It can explain the fee, record acknowledgment, and route unusual pricing or warranty questions to the office." },
      { question: "Can it book directly into ServiceTitan, Housecall Pro, or Jobber?", answer: "Integration depth depends on your account, permissions, and platform access. OttoServ can start with summaries and pending tasks, then scope deeper ServiceTitan, Housecall Pro, Jobber, QuoteIQ, calendar, or CRM workflows where access allows." },
      { question: "How does OttoServ avoid duplicate customer records?", answer: "The workflow can validate caller name, phone number, and service address before creating records. For deeper FSM integrations, customer matching and dispatcher approval rules should be part of implementation." },
      { question: "Can it handle commercial plumbing calls?", answer: "Yes. Backflow testing, grease trap maintenance, property management, multi-tenant building, and service-agreement calls can be routed to a commercial account workflow instead of standard residential dispatch." },
      { question: "Does it replace the office manager?", answer: "No. The strongest plumbing use case is removing repetitive intake, overflow, after-hours, and qualification work so the office manager can handle exceptions, customer care, billing, routing, and field coordination." },
    ],
    internalLinks: [
      { title: "After-Hours Lead Capture", href: "/solutions/after-hours-lead-capture", description: "Capture emergency plumbing calls when the office is closed." },
      { title: "Missed Call Recovery", href: "/missed-call-recovery", description: "Recover overflow calls from paid search, LSA, weekends, and emergency demand." },
      { title: "AI Receptionist", href: "/ai-receptionist", description: "See the broader AI receptionist offer for call answering and lead intake." },
      { title: "AI Lead Qualification Agent", href: "/lead-qualification-agent", description: "Qualify emergency, routine, commercial, and admin calls before routing." },
      { title: "AI Receptionist vs Answering Service", href: "/compare/ai-receptionist-vs-answering-service", description: "Compare plumbing-specific AI intake with traditional message-taking." },
      { title: "Pricing", href: "/pricing", description: "Start with a focused AI receptionist offer and expand by volume and workflow depth." },
      { title: "Book an OttoServ Demo", href: "/demo", description: "Map your burst pipe, sewer backup, water heater, drain, and dispatch workflows." },
    ],
    schemaTypes: ["Service", "SoftwareApplication", "FAQPage"],
    published: true,
  }),
  page({
    slug: "roofing-lead-qualification",
    path: "/industries/roofing-lead-qualification",
    kind: "industry",
    title: "Lead Qualification for Roofing Companies",
    metaTitle: "Lead Qualification for Roofing Companies | OttoServ",
    metaDescription:
      "Lead qualification for roofing companies handling storm leads, insurance inquiries, roof inspection requests, quote qualification, service area screening, and scheduling.",
    eyebrow: "Roofing lead qualification",
    h1: "Lead Qualification for Roofing Companies",
    intro:
      "Roofing leads need fast screening. Storm response, inspection requests, insurance questions, repair calls, and replacement quotes all require different follow-up. OttoServ helps qualify the lead before your team spends time chasing it.",
    heroBullets: ["Screen storm and inspection requests.", "Capture insurance-related context.", "Confirm service area and property type.", "Route qualified estimates to scheduling."],
    problems: [
      { title: "Storm leads flood in at once", text: "The best opportunities can disappear while the team is buried in callbacks." },
      { title: "Insurance context matters", text: "Claim status, adjuster timing, damage type, and urgency affect the next step." },
      { title: "Not every lead is a fit", text: "Service area, roof type, timeline, and project scope should be clear before a sales appointment." },
    ],
    outcomes: [
      { title: "Prioritized inspections", text: "High-intent, in-area requests can be surfaced faster." },
      { title: "Better sales notes", text: "The team receives damage type, property details, insurance context, and timeline." },
      { title: "Fewer wasted calls", text: "Poor-fit or out-of-area requests can be routed appropriately." },
    ],
    howItWorks: [
      { title: "Map qualification criteria", text: "Service area, job type, insurance context, roof type, and appointment requirements." },
      { title: "Capture lead details", text: "The agent asks about storm damage, leaks, inspection needs, claim status, and decision timing." },
      { title: "Route next steps", text: "Qualified leads can move to inspection scheduling, sales callback, or follow-up automation." },
    ],
    useCases: [
      { title: "Storm response", text: "High-volume inbound requests after hail, wind, or heavy rain." },
      { title: "Inspection requests", text: "Homeowner details, property address, damage type, and preferred times." },
      { title: "Insurance questions", text: "Claim status, adjuster involvement, documentation needs, and urgency." },
    ],
    integrations: ["JobNimbus-style workflows", "Google Calendar", "Gmail", "HighLevel", "Airtable", "Zapier"],
    faq: [
      { question: "Can OttoServ qualify storm leads?", answer: "Yes. The flow can gather damage type, location, insurance context, and inspection timing." },
      { question: "Can it screen by service area?", answer: "Yes. Service area screening is a common qualification rule." },
      { question: "Can it book roof inspections?", answer: "Yes, when calendar and booking rules are configured." },
    ],
    internalLinks: defaultLinks,
    schemaTypes: ["Service", "SoftwareApplication", "FAQPage"],
    published: true,
  }),
];

const additionalPublished: SeoPage[] = [
  page({
    slug: "after-hours-lead-capture",
    path: "/solutions/after-hours-lead-capture",
    kind: "solution",
    title: "After-Hours Lead Capture",
    metaTitle: "After-Hours Lead Capture | OttoServ",
    metaDescription:
      "Capture after-hours calls, forms, and messages with AI receptionist workflows that qualify leads and route clean summaries for next-day follow-up.",
    eyebrow: "After-hours lead capture",
    h1: "After-Hours Lead Capture",
    intro:
      "Your best prospects do not always call during business hours. OttoServ captures calls, forms, and messages after the office closes so the next morning starts with organized opportunities instead of mystery voicemails.",
    heroBullets: ["Answer evening and weekend calls.", "Capture form and message context.", "Separate urgent requests from routine follow-up.", "Prepare next-day summaries for the team."],
    problems: [
      { title: "The office closes before demand stops", text: "Homeowners, tenants, and business owners often research and call at night." },
      { title: "Voicemail loses context", text: "A short voicemail rarely captures enough detail to qualify or prioritize a lead." },
      { title: "Morning follow-up starts cold", text: "The team wastes time figuring out what happened instead of taking action." },
    ],
    outcomes: [
      { title: "More complete intake", text: "Each after-hours inquiry includes details, urgency, and next-step preference." },
      { title: "Better triage", text: "Urgent calls can follow escalation rules while routine leads wait for normal follow-up." },
      { title: "Less morning chaos", text: "Your team starts with a queue of structured summaries." },
    ],
    howItWorks: [
      { title: "Route after-hours traffic", text: "Calls, forms, and messages are pointed to the OttoServ intake workflow." },
      { title: "Qualify by scenario", text: "The agent asks different questions for emergencies, quotes, leasing, and general inquiries." },
      { title: "Deliver the queue", text: "Summaries go to email, CRM, Slack, spreadsheet, or task workflow." },
    ],
    useCases: [
      { title: "Property management", text: "After-hours maintenance triage and leasing inquiry capture." },
      { title: "Home services", text: "Emergency HVAC, plumbing, roofing, and repair requests." },
      { title: "Contractors", text: "Estimate requests submitted after work hours." },
    ],
    integrations: ["Phone forwarding", "Website forms", "Gmail", "Slack", "Google Sheets", "Zapier", "n8n"],
    faq: [
      { question: "Can only urgent calls alert the team?", answer: "Yes. Escalation rules can separate emergency requests from next-business-day follow-up." },
      { question: "Does this include web forms?", answer: "It can. The same intake logic can support calls, forms, and messages depending on implementation." },
      { question: "Is after-hours capture only for home services?", answer: "No. It is useful for any SMB with inbound interest outside staffed hours." },
    ],
    internalLinks: defaultLinks,
    schemaTypes: ["Service", "SoftwareApplication", "FAQPage"],
    published: true,
  }),
  page({
    slug: "ai-receptionist-vs-answering-service",
    path: "/compare/ai-receptionist-vs-answering-service",
    kind: "comparison",
    title: "AI Receptionist vs Answering Service",
    metaTitle: "AI Receptionist vs Answering Service | OttoServ",
    metaDescription:
      "Compare AI receptionists and traditional answering services for SMB call answering, lead qualification, appointment booking, after-hours coverage, and cost structure.",
    eyebrow: "Comparison guide",
    h1: "AI Receptionist vs Answering Service",
    intro:
      "Traditional answering services can be useful when you need a human to take messages. OttoServ is built for businesses that need structured qualification, faster routing, and consistent lead-handling workflows at all hours.",
    heroBullets: ["Understand where each model fits.", "Compare message-taking with structured lead qualification.", "See why workflow routing matters.", "Choose based on call type, urgency, and follow-up needs."],
    problems: [
      { title: "Message-taking is not qualification", text: "A human answering service may capture a name and note, but many businesses need structured fit and urgency data." },
      { title: "Coverage can still bottleneck", text: "Human teams can queue, vary in quality, or miss details during volume spikes." },
      { title: "Workflows matter after the call", text: "The real value comes from routing, summaries, follow-up, and booking rules." },
    ],
    outcomes: [
      { title: "Choose the right tool", text: "Use a human answering service for white-glove human reception. Use OttoServ for repeatable qualification and automation." },
      { title: "Reduce manual handoff work", text: "Structured summaries make it easier for the team to act quickly." },
      { title: "Cover spikes and after-hours", text: "AI receptionists can handle repeatable intake consistently when demand jumps." },
    ],
    howItWorks: [
      { title: "Define the call purpose", text: "Is the goal to reassure, take a message, qualify, book, triage, or update systems?" },
      { title: "Compare the handoff", text: "Look at what your team receives after the call: a loose note or a structured lead record." },
      { title: "Match the workflow", text: "Pick the model that best supports your urgency, compliance, brand, and operational needs." },
    ],
    useCases: [
      { title: "Use OttoServ when", text: "You need repeatable qualification, summaries, routing, booking, and after-hours lead capture." },
      { title: "Use an answering service when", text: "You need a live human voice for complex judgment calls or high-touch concierge interactions." },
      { title: "Use both when", text: "AI handles initial capture and overflow while humans handle sensitive escalations." },
    ],
    comparison: [
      { option: "OttoServ AI Receptionist", bestFor: "Structured lead qualification, after-hours capture, appointment routing, and summaries.", limits: "Not meant to replace human judgment for sensitive or unusual situations." },
      { option: "Traditional answering service", bestFor: "Human message-taking and warm reception.", limits: "Often less consistent for complex qualification, integrations, and workflow automation." },
      { option: "In-house receptionist", bestFor: "Deep company knowledge and relationship-heavy calls.", limits: "Limited hours, hiring cost, sick days, turnover, and call spikes." },
    ],
    faq: [
      { question: "Is an AI receptionist always better than an answering service?", answer: "No. It is better when the call flow is repeatable and the business needs qualification, routing, and summaries. A human service may be better for sensitive or highly nuanced calls." },
      { question: "Can OttoServ transfer to a human?", answer: "Yes, transfer or escalation rules can be configured when appropriate." },
      { question: "Can an answering service qualify leads?", answer: "Some can, but the consistency and integration depth vary. OttoServ is designed around structured qualification from the start." },
    ],
    internalLinks: defaultLinks,
    schemaTypes: ["Article", "FAQPage", "Service"],
    published: true,
  }),
  page({
    slug: "what-is-an-ai-receptionist",
    path: "/resources/what-is-an-ai-receptionist",
    kind: "resource",
    title: "What Is an AI Receptionist?",
    metaTitle: "What Is an AI Receptionist? | OttoServ",
    metaDescription:
      "A clear guide to AI receptionists: how they answer calls, qualify leads, book appointments, route urgent requests, and support small business operations.",
    eyebrow: "Educational guide",
    h1: "What Is an AI Receptionist?",
    intro:
      "An AI receptionist is a voice or messaging agent that answers inbound inquiries, gathers information, follows a business-approved script, and routes the result to the right person or system. For SMBs, the main value is not novelty - it is faster response and fewer missed opportunities.",
    heroBullets: ["Answers common inbound calls.", "Captures contact and service details.", "Qualifies leads with structured questions.", "Books, routes, or summarizes next steps."],
    problems: [
      { title: "Small teams cannot answer everything", text: "Owners and coordinators are busy doing the work, not sitting beside the phone all day." },
      { title: "Lead intake varies by person", text: "Different staff ask different questions, which makes follow-up harder." },
      { title: "Manual systems hide leaks", text: "Without structured intake, it is hard to see which calls were missed or mishandled." },
    ],
    outcomes: [
      { title: "Always-on first response", text: "The business can respond even when humans are busy or offline." },
      { title: "Consistent qualification", text: "The same core questions get asked every time." },
      { title: "Better operational visibility", text: "Captured calls become summaries, records, and trends." },
    ],
    howItWorks: [
      { title: "Business rules are defined", text: "The company approves what the AI can say, ask, book, and escalate." },
      { title: "Caller intent is captured", text: "The AI asks questions based on service type, urgency, location, and desired outcome." },
      { title: "The result is routed", text: "A qualified lead, appointment request, maintenance issue, or callback task is sent to the right workflow." },
    ],
    useCases: [
      { title: "Lead capture", text: "Answer inbound calls and web inquiries before they go cold." },
      { title: "Appointment booking", text: "Offer calendar options when the caller meets booking criteria." },
      { title: "After-hours triage", text: "Separate urgent requests from routine next-day follow-up." },
    ],
    faq: [
      { question: "Does an AI receptionist sound human?", answer: "Modern voice AI can sound natural, but the goal should be a useful and transparent caller experience, not deception." },
      { question: "What can an AI receptionist not do?", answer: "It should not make unsupported promises, handle sensitive judgment calls without escalation, or replace human expertise where nuance is required." },
      { question: "How is it different from a chatbot?", answer: "A chatbot usually waits on a website. An AI receptionist can answer phone calls and run a structured intake conversation." },
    ],
    internalLinks: defaultLinks,
    schemaTypes: ["Article", "FAQPage", "SoftwareApplication"],
    published: true,
  }),
  page({
    slug: "pricing",
    path: "/pricing",
    kind: "offer",
    title: "OttoServ Pricing",
    metaTitle: "OttoServ Pricing | AI Receptionist Plans",
    metaDescription:
      "Simple OttoServ pricing for AI receptionist and lead qualification workflows. Start with a focused starter offer and scale based on call minutes and workflow depth.",
    eyebrow: "Simple AI receptionist pricing",
    h1: "OttoServ Pricing",
    intro:
      "Start with the front-office revenue leak first: missed calls, slow follow-up, and unqualified leads. OttoServ pricing is built around a low-friction AI receptionist starter offer, then scales with minutes, workflow complexity, and integrations.",
    heroBullets: ["Starter monthly price for AI receptionist coverage.", "Usage-based minutes explained clearly.", "Upgrade only when call volume or workflow depth requires it.", "Process audit remains a secondary diagnostic, not the main offer."],
    problems: [
      { title: "Most automation pricing is too vague", text: "Owners need to know what they are buying before a long discovery process." },
      { title: "Minutes and workflow depth both matter", text: "A simple missed-call setup is different from deep CRM automation." },
      { title: "The first offer should be easy", text: "The goal is to start capturing missed opportunities quickly, then expand once value is visible." },
    ],
    outcomes: [
      { title: "Clear entry point", text: "Start with AI receptionist coverage instead of a giant transformation project." },
      { title: "Predictable base plan", text: "Monthly pricing covers setup, workflow support, and included usage." },
      { title: "Room to scale", text: "More minutes, booking workflows, CRM updates, and follow-up automation can be layered in." },
    ],
    howItWorks: [
      { title: "Choose the starter offer", text: "Begin with AI receptionist and lead qualification coverage." },
      { title: "Measure call volume", text: "Use included minutes first; usage beyond included minutes is billed based on volume and complexity." },
      { title: "Expand workflows", text: "Add appointment booking, CRM updates, follow-up automation, and reporting when needed." },
    ],
    useCases: [
      { title: "Starter AI receptionist", text: "For businesses that want calls answered and qualified quickly." },
      { title: "Booking and follow-up", text: "For teams ready to route appointments and automate next steps." },
      { title: "Operations automation", text: "For clients who need dashboards, SOPs, reporting, and deeper systems work." },
    ],
    pricing: [
      {
        name: "AI Receptionist Starter",
        price: "$299",
        unit: "per month",
        description: "For SMBs that want missed-call and after-hours lead capture without a large implementation.",
        features: ["AI receptionist call flow", "Lead capture and qualification", "Call summaries", "Basic routing", "Usage-based minutes after included allowance"],
        cta: "Book a demo",
        href: "/demo",
      },
      {
        name: "Growth Workflow",
        price: "$799+",
        unit: "per month",
        description: "For teams adding appointment booking, follow-up sequences, CRM updates, and reporting.",
        features: ["Everything in Starter", "Booking workflow support", "SMS/email follow-up", "CRM or spreadsheet updates", "Monthly improvement review"],
        cta: "Discuss workflow fit",
        href: "/demo",
      },
    ],
    faq: [
      { question: "Is pricing usage-based?", answer: "The starter offer includes a base monthly price. Additional call minutes or more complex workflows can add usage-based cost depending on volume and setup." },
      { question: "Can I start with only AI receptionist?", answer: "Yes. That is the intended low-friction entry point." },
      { question: "Is the process audit required?", answer: "No. The free process audit is useful for mapping bigger operational leaks, but the paid AI receptionist offer should remain the primary path." },
    ],
    internalLinks: defaultLinks,
    schemaTypes: ["Product", "Offer", "Service", "FAQPage", "SoftwareApplication"],
    published: true,
  }),
  page({
    slug: "demo",
    path: "/demo",
    kind: "offer",
    title: "Book an OttoServ Demo",
    metaTitle: "Book an OttoServ Demo | AI Receptionist for SMBs",
    metaDescription:
      "Book an OttoServ demo to see how AI receptionist, lead qualification, appointment booking, and follow-up automation can work for your business.",
    eyebrow: "Book a demo",
    h1: "Book an OttoServ Demo",
    intro:
      "Use the demo call to map your current lead-handling flow and see what OttoServ would answer, ask, book, route, and summarize for your specific business.",
    heroBullets: ["Review missed-call and after-hours coverage.", "Map lead qualification questions.", "Discuss appointment booking and escalation rules.", "Identify the fastest paid starter path."],
    problems: [
      { title: "Generic demos waste time", text: "A useful demo should be based on your calls, lead sources, and operational bottlenecks." },
      { title: "Buyers need to hear the workflow", text: "The value is in the intake path, not just the AI voice." },
      { title: "Implementation should be scoped", text: "The demo clarifies what can go live first without overbuilding." },
    ],
    outcomes: [
      { title: "Clear first workflow", text: "You leave knowing which calls or lead sources should be automated first." },
      { title: "Fit assessment", text: "We identify where AI receptionist is a strong fit and where human escalation should stay in place." },
      { title: "Next-step pricing", text: "You get a practical starting point instead of a vague platform pitch." },
    ],
    howItWorks: [
      { title: "Share your current process", text: "Tell us where calls, forms, texts, and follow-up happen today." },
      { title: "Walk through sample call flows", text: "We map how the AI receptionist would answer, qualify, and route." },
      { title: "Choose the first deployment", text: "We recommend the smallest useful workflow to launch first." },
    ],
    useCases: [
      { title: "Property management demo", text: "Leasing, tenant, owner, vendor, and maintenance call paths." },
      { title: "Home services demo", text: "Emergency calls, quote requests, booking, dispatch notes, and follow-up." },
      { title: "Contractor demo", text: "Inspection requests, project inquiries, qualification, and scheduling." },
    ],
    faq: [
      { question: "How long is the demo?", answer: "Most demos can be handled in 20 to 30 minutes if you know your current lead process." },
      { question: "Do I need technical details ready?", answer: "No. Bring your current phone, form, calendar, and CRM setup if you know it. We can start with workflow questions." },
      { question: "Will the demo include pricing?", answer: "Yes. The goal is to identify a commercially sensible starting point." },
    ],
    internalLinks: [
      { title: "Pricing", href: "/pricing", description: "Review the starter offer before the demo." },
      { title: "Process Audit", href: "/process-audit", description: "Use the audit if you want a deeper operational diagnostic first." },
      { title: "AI Receptionist", href: "/ai-receptionist", description: "Read the main commercial offer." },
    ],
    schemaTypes: ["Service", "SoftwareApplication", "FAQPage"],
    published: true,
  }),
  page({
    slug: "process-audit",
    path: "/process-audit",
    kind: "offer",
    title: "Free Process Audit",
    metaTitle: "Free Process Audit | OttoServ",
    metaDescription:
      "Request a free OttoServ process audit to identify missed-call, follow-up, scheduling, admin, and handoff leaks before automating.",
    eyebrow: "Secondary diagnostic offer",
    h1: "Free Process Audit",
    intro:
      "The process audit is for businesses that want a broader operational diagnosis before or alongside the AI receptionist starter offer. It looks at lead intake, follow-up, scheduling, admin work, handoffs, and tools.",
    heroBullets: ["Identify where leads are leaking.", "Map manual admin work.", "Prioritize automation opportunities.", "Keep AI receptionist as the fastest paid starting point."],
    problems: [
      { title: "The first leak is not always obvious", text: "Some businesses lose revenue through missed calls. Others lose it through slow follow-up, scheduling friction, or handoff confusion." },
      { title: "Tools do not equal process", text: "A CRM, calendar, and inbox still fail if the workflow between them is unclear." },
      { title: "Owners need prioritization", text: "The audit helps decide what to automate first instead of trying to fix everything." },
    ],
    outcomes: [
      { title: "Clear process map", text: "You see where intake, follow-up, scheduling, and admin work break down." },
      { title: "Ranked opportunities", text: "We identify the highest-leverage automation path." },
      { title: "Practical next step", text: "For many SMBs, the next step is the AI receptionist starter workflow." },
    ],
    howItWorks: [
      { title: "Submit the audit request", text: "Share your lead sources, tools, response times, and bottlenecks." },
      { title: "Review the leaks", text: "OttoServ reviews missed-call, follow-up, scheduling, and admin patterns." },
      { title: "Choose a first fix", text: "You receive a practical recommendation for where automation should start." },
    ],
    useCases: [
      { title: "Lead-handling audit", text: "Calls, forms, texts, speed-to-lead, and follow-up gaps." },
      { title: "Operations audit", text: "Manual admin work, handoffs, reporting, and coordination issues." },
      { title: "Tooling audit", text: "CRM, calendar, inbox, spreadsheet, and automation stack review." },
    ],
    faq: [
      { question: "Is the audit the main offer?", answer: "No. It is a trust-building diagnostic. The primary paid wedge is AI receptionist and lead qualification." },
      { question: "Who should request an audit?", answer: "Businesses that know operations are leaking but are not sure whether calls, follow-up, scheduling, or admin work is the biggest issue." },
      { question: "What happens after the audit?", answer: "You get a recommended first workflow, which may be AI receptionist, follow-up automation, booking, or broader process automation." },
    ],
    internalLinks: defaultLinks,
    schemaTypes: ["Service", "FAQPage"],
    published: true,
  }),
];

export const allPublishedSeoPages: SeoPage[] = [
  ...publishedSeoPages,
  ...industryPages,
  ...additionalPublished,
];

export const futureSeoPages = [
  "/appointment-booking-agent",
  "/after-hours-ai-receptionist",
  "/smb-operations-automation",
  "/business-process-automation",
  "/ai-operations-platform",
  "/industries/property-management-lead-qualification",
  "/industries/property-management-operations-automation",
  "/industries/hvac-lead-qualification",
  "/industries/plumbing-emergency-call-triage",
  "/industries/roofing-ai-receptionist",
  "/industries/electrical-contractor-ai-receptionist",
  "/industries/home-services-ai-receptionist",
  "/industries/general-contractors-ai-receptionist",
  "/industries/remodeling-contractor-lead-qualification",
  "/industries/landscaping-ai-receptionist",
  "/industries/pest-control-ai-receptionist",
  "/industries/cleaning-company-ai-receptionist",
  "/industries/real-estate-investor-lead-handling",
  "/industries/real-estate-wholesale-lead-management",
  "/solutions/stop-missing-calls",
  "/solutions/respond-to-leads-faster",
  "/solutions/qualify-leads-before-booking",
  "/solutions/book-more-appointments",
  "/solutions/route-urgent-calls",
  "/solutions/follow-up-automation",
  "/solutions/inbound-call-automation",
  "/solutions/outbound-call-automation",
  "/solutions/crm-update-automation",
  "/solutions/google-sheets-automation",
  "/solutions/email-follow-up-automation",
  "/solutions/text-message-follow-up",
  "/solutions/voice-agent-for-small-business",
  "/solutions/ai-admin-assistant",
  "/solutions/operations-dashboard",
  "/solutions/sop-automation",
  "/solutions/client-onboarding-automation",
  "/solutions/process-audit-reporting",
  "/solutions/automated-lead-intake",
  "/compare/ai-receptionist-vs-virtual-assistant",
  "/compare/ai-receptionist-vs-hiring-admin",
  "/compare/ottoserv-vs-call-center",
  "/compare/voice-agent-vs-chatbot",
  "/compare/business-process-automation-vs-hiring-staff",
  "/resources/how-ai-receptionists-work",
  "/resources/how-missed-calls-cost-small-businesses",
  "/resources/ai-receptionist-pricing",
  "/resources/ai-receptionist-for-small-business",
  "/resources/ai-lead-qualification",
  "/resources/business-process-automation-for-small-business",
  "/resources/how-to-automate-lead-follow-up",
  "/resources/how-to-choose-an-ai-receptionist",
  "/resources/voice-ai-for-home-services",
  "/resources/voice-ai-for-property-management",
  "/resources/smb-automation-playbook",
  "/resources/ai-operations-agent",
  "/resources/ai-agents-for-small-business",
  "/resources/llms-ai-search-guide",
  "/security",
  "/data-handling",
  "/integrations",
  "/integrations/google-calendar",
  "/integrations/gmail",
  "/integrations/hubspot",
  "/integrations/highlevel",
  "/integrations/airtable",
  "/integrations/slack",
  "/integrations/zapier",
  "/integrations/n8n",
  "/integrations/vapi",
  "/integrations/retell",
] as const;

export function getSeoPage(path: string): SeoPage | undefined {
  return allPublishedSeoPages.find((p) => p.path === path);
}

export function getSeoPageBySlug(kind: PageKind, slug: string): SeoPage | undefined {
  return allPublishedSeoPages.find((p) => p.kind === kind && p.slug === slug);
}

export function metadataForPage(page: SeoPage): Metadata {
  const url = `${SITE_URL}${page.path}`;
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      siteName: "OttoServ",
      type: page.kind === "resource" || page.kind === "comparison" ? "article" : "website",
      images: [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630, alt: page.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
      images: [`${SITE_URL}/twitter-card.jpg`],
    },
  };
}

export function schemaForPage(page: SeoPage) {
  const url = `${SITE_URL}${page.path}`;
  const featureList = [
    ...page.heroBullets,
    ...page.howItWorks.map((step) => step.title),
    ...page.useCases.map((useCase) => useCase.title),
    ...(page.callTypes?.map((callType) => callType.title) || []),
    ...(page.workflows?.map((workflow) => workflow.title) || []),
  ];
  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: page.title,
      description: page.metaDescription,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
    },
  ];

  if (page.schemaTypes.includes("Service")) {
    graph.push({
      "@type": "Service",
      "@id": `${url}#service`,
      name: page.title,
      description: page.metaDescription,
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: "US",
      serviceType: page.kind,
      audience: {
        "@type": "BusinessAudience",
        audienceType: page.kind === "industry" ? page.title.replace(/^AI Receptionist for /, "") : "Small and mid-sized businesses",
      },
      serviceOutput: page.outcomes.map((outcome) => outcome.title),
      keywords: featureList,
      url,
    });
  }

  if (page.schemaTypes.includes("SoftwareApplication")) {
    graph.push({
      "@type": "SoftwareApplication",
      "@id": `${url}#software`,
      name: "OttoServ AI Receptionist",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "AI receptionist, lead qualification, appointment booking, and operations automation workflows for SMBs.",
      featureList,
      offers: { "@type": "Offer", priceCurrency: "USD", price: page.pricing?.[0]?.price.replace(/[^0-9]/g, "") || "299" },
    });
  }

  if (page.schemaTypes.includes("FAQPage")) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: page.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  if (page.schemaTypes.includes("Product") || page.schemaTypes.includes("Offer")) {
    graph.push({
      "@type": "Product",
      "@id": `${url}#product`,
      name: page.title,
      description: page.metaDescription,
      brand: { "@id": `${SITE_URL}/#organization` },
      offers: (page.pricing || []).map((offer) => ({
        "@type": "Offer",
        name: offer.name,
        price: offer.price.replace(/[^0-9]/g, "") || undefined,
        priceCurrency: "USD",
        url: `${SITE_URL}${offer.href}`,
        description: offer.description,
        availability: "https://schema.org/InStock",
      })),
    });
  }

  if (page.schemaTypes.includes("Article")) {
    graph.push({
      "@type": "Article",
      "@id": `${url}#article`,
      headline: page.title,
      description: page.metaDescription,
      author: { "@id": `${SITE_URL}/#organization` },
      publisher: { "@id": `${SITE_URL}/#organization` },
      mainEntityOfPage: { "@id": `${url}#webpage` },
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "OttoServ",
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description: "OttoServ helps SMBs stop losing revenue from missed calls, slow follow-up, and manual processes with AI receptionists, lead qualification, appointment booking, and operations automation.",
        founder: { "@type": "Person", name: "Jonathan Bradley" },
        areaServed: "US",
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+1-407-798-8172",
          contactType: "sales",
          areaServed: "US",
          availableLanguage: "English",
        },
        knowsAbout: [
          "AI receptionist",
          "Lead qualification",
          "Missed-call recovery",
          "Appointment booking",
          "After-hours lead capture",
          "SMB operations automation",
          "Property management call answering",
          "HVAC call answering",
          "Plumbing call answering",
          "Roofing lead qualification",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "OttoServ",
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}
