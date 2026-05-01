import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services — OttoServ",
  description:
    "OttoServ services: AI Lead Response, Operations Audit, Automation Build, OttoServ OS Dashboard, TechOps, Contractor OS, Client Experience Optimization, and AI Reports.",
};

const services = [
  {
    title: "AI Lead Response",
    tag: "Morgan AI",
    description:
      "Morgan, our AI assistant, answers every inbound call and web inquiry 24/7 — qualifying leads, booking appointments, and notifying your team before a competitor has a chance to pick up.",
    highlights: [
      "Answers calls and texts instantly, 24/7",
      "Qualifies leads with smart intake questions",
      "Books appointments directly to your calendar",
      "Sends lead summaries to your team in real time",
    ],
    cta: "Learn More",
    href: "/contact",
  },
  {
    title: "Operations Audit",
    tag: "Starting Point",
    description:
      "We map every process in your business — intake, scheduling, job management, billing, and follow-up — and give you a prioritized roadmap for fixing what's costing you time and money.",
    highlights: [
      "Full workflow documentation",
      "Gap and bottleneck analysis",
      "Prioritized fix roadmap",
      "Clear, actionable deliverable",
    ],
    cta: "Book a Discovery Call",
    href: "/contact",
  },
  {
    title: "Automation Build",
    tag: "Core Service",
    description:
      "We build the automations, integrations, and workflows that make your operations run without constant manual effort — from lead intake to job completion and billing.",
    highlights: [
      "Custom n8n / Make / Zapier workflows",
      "CRM and scheduling integrations",
      "Automated follow-up sequences",
      "Cross-platform data sync",
    ],
    cta: "Book a Discovery Call",
    href: "/contact",
  },
  {
    title: "OttoServ OS Dashboard",
    tag: "Platform",
    description:
      "Your business command center. See every job, lead, team member, project, and revenue number in one live dashboard — purpose-built for service companies.",
    highlights: [
      "Jobs, projects, CRM, and billing in one view",
      "Real-time visibility across your operation",
      "Client portal for project updates and invoices",
      "Mobile-friendly for on-the-go teams",
    ],
    cta: "See the Platform",
    href: "/contact",
  },
  {
    title: "TechOps",
    tag: "For IT & AV Companies",
    description:
      "AI-powered technical operations for IT providers, MSPs, and smart home companies — AI triage, dispatch packets, knowledge base, and remote resolution workflows.",
    highlights: [
      "AI ticket triage and routing",
      "Technician dispatch packets",
      "Knowledge base automation",
      "Remote resolution workflows",
    ],
    cta: "Learn About TechOps",
    href: "/techops",
  },
  {
    title: "Contractor OS",
    tag: "For Contractors",
    description:
      "Everything a contractor or remodeler needs to run projects profitably — job costing, scheduling, progress billing, materials tracking, and subcontractor management.",
    highlights: [
      "Job costing and budget tracking",
      "Schedule and dispatch management",
      "Progress billing and invoice generation",
      "Materials and vendor management",
    ],
    cta: "Learn More",
    href: "/industries/contractors",
  },
  {
    title: "Client Experience Optimization",
    tag: "CXB",
    description:
      "We assess your entire client journey — first contact through final invoice — and build systems that make clients feel taken care of and leave five-star reviews.",
    highlights: [
      "Client journey assessment",
      "Communication improvement",
      "Automated review request system",
      "Satisfaction tracking",
    ],
    cta: "Book a Discovery Call",
    href: "/contact",
  },
  {
    title: "AI Reports & Intelligence",
    tag: "Weekly Briefings",
    description:
      "A weekly AI-generated brief that tells you what needs attention in your business — revenue trends, job profitability, team performance, and market insights — without you having to dig.",
    highlights: [
      "Weekly operations intelligence brief",
      "Revenue and margin analysis",
      "Lead source and conversion tracking",
      "Pricing recommendations",
    ],
    cta: "Book a Discovery Call",
    href: "/contact",
  },
];

export default function ServicesPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Our Services</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Eight services built for service businesses — from AI lead capture to full operations
            automation and weekly intelligence reports.
          </p>
        </div>
      </section>

      {/* Service Cards */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-[#111827] border border-gray-800 rounded-xl p-8 flex flex-col"
            >
              <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
                {service.tag}
              </span>
              <h2 className="text-white font-bold text-2xl mb-4">{service.title}</h2>
              <p className="text-gray-400 leading-relaxed mb-6">{service.description}</p>
              <ul className="space-y-2 mb-8 flex-1">
                {service.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-blue-400 mt-0.5">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={service.href}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-md text-sm transition-colors text-center"
              >
                {service.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Not Sure Where to Start?</h2>
          <p className="text-gray-400 mb-6">
            Book a free discovery call and we will tell you exactly which services fit your situation.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Or call us directly —{" "}
            <a href="tel:+14077988172" className="text-blue-400 hover:text-blue-300 transition-colors">
              (407) 798-8172
            </a>
            . Morgan will answer immediately.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
          >
            Book a Free Discovery Call
          </Link>
        </div>
      </section>
    </div>
  );
}
