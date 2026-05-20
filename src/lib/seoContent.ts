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
      "AI receptionist for HVAC companies handling emergency service calls, seasonal spikes, appointment booking, quote requests, tune-ups, and after-hours calls.",
    eyebrow: "HVAC AI receptionist",
    h1: "AI Receptionist for HVAC Companies",
    intro:
      "HVAC demand comes in waves: no-cool emergencies, no-heat calls, tune-ups, quotes, and after-hours service requests. OttoServ helps answer and qualify those calls before the lead cools off.",
    heroBullets: ["Handle seasonal call spikes.", "Capture emergency service details.", "Book tune-ups and estimate requests.", "Route after-hours calls by urgency."],
    problems: [
      { title: "Emergency callers need speed", text: "No-cool and no-heat calls often go to the first company that responds clearly." },
      { title: "Seasonal surges overload the office", text: "Heat waves and cold snaps create more calls than a small front desk can handle." },
      { title: "Quote requests need context", text: "System type, age, symptoms, location, and timeline matter before dispatch or sales follow-up." },
    ],
    outcomes: [
      { title: "More calls answered", text: "Overflow and after-hours calls get a structured intake instead of voicemail." },
      { title: "Better dispatch context", text: "Urgency, equipment issue, address, access notes, and callback details are captured." },
      { title: "More organized tune-ups", text: "Routine maintenance and seasonal tune-up requests can be booked or routed cleanly." },
    ],
    howItWorks: [
      { title: "Define call categories", text: "Emergency service, repair, replacement quote, maintenance, warranty, and general questions." },
      { title: "Capture HVAC-specific details", text: "The agent asks about no-cool/no-heat status, system type, symptoms, property access, and preferred appointment windows." },
      { title: "Route urgent calls", text: "Urgent requests can trigger faster team alerts while routine calls go to booking or follow-up." },
    ],
    useCases: [
      { title: "Emergency service", text: "No-cool, no-heat, unusual sounds, leaks, or unsafe conditions." },
      { title: "Seasonal tune-ups", text: "Maintenance requests and recurring service windows." },
      { title: "Replacement quotes", text: "System age, home size, timeline, and consultation scheduling." },
    ],
    integrations: ["Google Calendar", "ServiceTitan-style workflows", "Housecall Pro-style workflows", "HighLevel", "Slack", "Zapier"],
    faq: [
      { question: "Can the AI tell emergency calls from routine calls?", answer: "It can ask urgency questions and route based on the rules you define." },
      { question: "Can it book appointments?", answer: "Yes, if calendar access and booking rules are configured." },
      { question: "Can it handle seasonal surges?", answer: "It is designed to capture overflow and after-hours demand so the team has structured follow-up instead of missed calls." },
    ],
    internalLinks: defaultLinks,
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
      "AI call answering for plumbing companies handling emergency leaks, clogged drains, water heater calls, quote requests, dispatch routing, and after-hours service.",
    eyebrow: "Plumbing AI call answering",
    h1: "AI Call Answering for Plumbing Companies",
    intro:
      "Plumbing calls are often urgent, messy, and time-sensitive. OttoServ answers overflow and after-hours calls, captures the issue, and helps route emergencies, quotes, and service requests.",
    heroBullets: ["Capture emergency leak calls.", "Qualify clogged drain and water heater requests.", "Route urgent service to dispatch rules.", "Summarize quote requests with useful context."],
    problems: [
      { title: "Leaks cannot wait", text: "A caller with active water damage needs a clear response immediately." },
      { title: "After-hours calls are high intent", text: "Many plumbing emergencies happen outside the neat 9-to-5 window." },
      { title: "Dispatch needs details", text: "Location, fixture, severity, water shutoff status, and access notes affect the next step." },
    ],
    outcomes: [
      { title: "Faster emergency triage", text: "Urgency and safety details are captured early." },
      { title: "Cleaner quote intake", text: "Non-emergency estimate requests are organized for follow-up." },
      { title: "Less phone chaos", text: "Overflow calls become structured summaries instead of scattered voicemails." },
    ],
    howItWorks: [
      { title: "Classify the call", text: "Leak, clog, water heater, fixture, sewer, quote, warranty, or general request." },
      { title: "Ask plumbing-specific questions", text: "The agent captures active leak status, shutoff access, location, property type, and urgency." },
      { title: "Route by urgency", text: "Emergency calls can alert dispatch while routine calls are booked or summarized." },
    ],
    useCases: [
      { title: "Water leaks", text: "Active leak, shutoff status, room affected, and damage risk." },
      { title: "Clogged drains", text: "Fixture affected, severity, recurring issue, and scheduling preference." },
      { title: "Water heaters", text: "No hot water, leak, age, gas/electric, and replacement interest." },
    ],
    integrations: ["Google Calendar", "Gmail", "Slack", "HighLevel", "Zapier", "n8n"],
    faq: [
      { question: "Can OttoServ route emergency plumbing calls differently?", answer: "Yes. Emergency rules can be configured around leak status, severity, time of day, and service area." },
      { question: "Can it take quote requests?", answer: "Yes. The agent can capture job type, property type, location, timeline, and contact information for follow-up." },
      { question: "Can it work after hours?", answer: "After-hours coverage is one of the main use cases." },
    ],
    internalLinks: defaultLinks,
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
