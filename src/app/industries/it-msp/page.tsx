import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OttoServ for IT Providers & MSPs",
  description:
    "AI ticket triage, after-hours support automation, knowledge base, and technician dispatch for IT providers and managed service providers.",
};

const painPoints = [
  {
    title: "Ticket Volume",
    desc: "Tickets pile up faster than your team can triage them. High-priority issues get buried under routine requests. Response SLAs slip.",
  },
  {
    title: "After-Hours Support",
    desc: "Clients expect 24/7 coverage. Staffing a real after-hours team is expensive. On-call rotations burn out your best technicians.",
  },
  {
    title: "Technician Dispatch",
    desc: "Matching the right technician to the right ticket — accounting for skills, availability, and client relationship — is manual and error-prone.",
  },
  {
    title: "Knowledge Silos",
    desc: "Your best technician knows how to fix everything. When they are out, everything takes twice as long. Institutional knowledge is not documented.",
  },
  {
    title: "Client Communication",
    desc: "Clients email, call, and Slack you directly — bypassing your ticketing system and creating tracking gaps. You are always putting out fires.",
  },
  {
    title: "Recurring Revenue Leakage",
    desc: "Managed service agreements get auto-renewed without review. Scope creep goes unbilled. Monthly invoicing is manual and inconsistent.",
  },
];

const solutions = [
  {
    title: "TechOps AI Ticket Triage",
    desc: "AI agents classify, prioritize, and route every incoming ticket — pulling relevant client history and known fixes before a human touches it.",
    link: "/techops",
  },
  {
    title: "After-Hours AI Coverage",
    desc: "Our AI handles after-hours tickets — collecting details, running common resolutions, and escalating only genuine emergencies to your on-call tech.",
    link: null,
  },
  {
    title: "Technician Dispatch",
    desc: "Smart dispatch matching based on technician skill set, client history, and current workload — reducing escalations and first-visit resolution failures.",
    link: null,
  },
  {
    title: "Knowledge Base Automation",
    desc: "Resolved tickets automatically generate knowledge base articles. New tickets search the KB before routing to a human. Your team gets smarter over time.",
    link: null,
  },
  {
    title: "Client Portal",
    desc: "Clients see their ticket status, asset inventory, recent activity, and invoices in a branded portal — reducing inbound status calls by half.",
    link: null,
  },
  {
    title: "MSP Operations Dashboard",
    desc: "One view of open tickets, SLA status, technician workload, contract utilization, and monthly recurring revenue — updated in real time.",
    link: null,
  },
];

export default function ITMSPPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            Built for IT Providers & MSPs
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 max-w-3xl">
            OttoServ for IT Providers & MSPs
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mb-8">
            IT and managed service businesses live and die by response time, ticket resolution, and
            client communication. OttoServ gives IT providers AI-powered triage, automated
            after-hours coverage, and a knowledge base that gets smarter with every ticket — so your
            team handles more without burning out.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/contact"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Book a Free Discovery Call
            </Link>
            <a
              href="tel:+14077988172"
              className="inline-flex items-center gap-2 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Call (407) 798-8172
            </a>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            What IT Providers Tell Us
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            Growing an MSP without burning out your team requires systems that scale — not just
            more bodies.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {painPoints.map((item) => (
              <div key={item.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            How OttoServ Helps
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            AI-powered operations built around the ticket-driven, SLA-governed rhythm of IT and
            managed services businesses.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {solutions.map((item) => (
              <div key={item.title} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-blue-400 font-semibold text-lg">{item.title}</h3>
                  {item.link && (
                    <Link
                      href={item.link}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors shrink-0"
                    >
                      Learn more →
                    </Link>
                  )}
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TechOps highlight */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1e3a5f] border border-blue-800 rounded-xl p-8 text-center">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-3">
              Specialized Module
            </p>
            <h2 className="text-white font-bold text-2xl mb-4">TechOps</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              TechOps is OttoServ&apos;s AI-powered technical operations module — built specifically
              for IT, MSP, and tech support companies. It includes AI triage, automated knowledge
              base generation, remote resolution workflows, and smart dispatch — all connected to
              your existing ticketing system.
            </p>
            <Link
              href="/techops"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-md transition-colors"
            >
              Learn About TechOps →
            </Link>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: "Faster first response", desc: "AI triage means every ticket is classified and routed in seconds — not 30 minutes after someone opens their queue." },
              { stat: "After-hours without on-call", desc: "Our AI handles after-hours tickets and escalates real emergencies — your team sleeps, your SLAs hold." },
              { stat: "KB that builds itself", desc: "Every resolved ticket generates knowledge. New tickets use it. Your team gets faster the more they work." },
            ].map((item) => (
              <div key={item.stat} className="bg-[#1f2937] border border-gray-700 rounded-xl p-8 text-center">
                <p className="text-blue-400 font-bold text-xl mb-3">{item.stat}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Scale Your MSP Without Burning Out Your Team
          </h2>
          <p className="text-gray-400 mb-8">
            Book a free discovery call and we will show you how TechOps and OttoServ work for your
            specific ticket volume, team size, and client base.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Book a Free Discovery Call
            </Link>
            <a
              href="tel:+14077988172"
              className="text-blue-400 hover:text-blue-300 font-semibold text-lg transition-colors"
            >
              (407) 798-8172
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
