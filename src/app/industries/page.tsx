import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Industries — OttoServ",
  description:
    "OttoServ serves contractors, property managers, HVAC, plumbing, electrical, roofing, smart home, and IT/MSP companies with AI-powered operations.",
};

const industries = [
  {
    name: "Contractors & Remodelers",
    href: "/industries/contractors",
    icon: "🏗️",
    desc: "Job costing, scheduling, progress billing, AI lead response, and project visibility — built for how contractors actually work.",
    pain: "Missed estimate calls, job costing on spreadsheets, chasing invoices",
  },
  {
    name: "Property Managers",
    href: "/industries/property-management",
    icon: "🏢",
    desc: "Work order automation, owner reports, tenant communication, and AI after-hours coverage for your entire portfolio.",
    pain: "After-hours inquiries, maintenance tracking, owner reporting",
  },
  {
    name: "HVAC / Plumbing / Electrical",
    href: "/industries/trades",
    icon: "⚡",
    desc: "AI dispatch, job costing, technician scheduling, and automated follow-ups for service call businesses.",
    pain: "Dispatch chaos, missed service calls, no job costing visibility",
  },
  {
    name: "Roofing",
    href: "/industries/contractors",
    icon: "🏠",
    desc: "Estimate-to-closeout workflows, AI lead capture, material tracking, and insurance job management.",
    pain: "Storm season lead floods, insurance workflows, subcontractor coordination",
  },
  {
    name: "Smart Home & AV",
    href: "/industries/smart-home",
    icon: "📡",
    desc: "TechOps AI triage, dispatch packets, client portal, and tech support automation for smart home installers.",
    pain: "Tech support calls, device troubleshooting, dispatch coordination",
  },
  {
    name: "IT Providers & MSPs",
    href: "/industries/it-msp",
    icon: "💻",
    desc: "AI ticket triage, after-hours support automation, knowledge base, and technician dispatch for IT companies.",
    pain: "Ticket volume, after-hours support, technician dispatch",
  },
];

export default function IndustriesPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Industries We Serve</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            OttoServ is built specifically for service businesses — with industry-specific modules,
            workflows, and AI agents tailored to how each industry actually operates.
          </p>
        </div>
      </section>

      {/* Industry Cards */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {industries.map((industry) => (
            <Link
              key={industry.name}
              href={industry.href}
              className="bg-[#111827] border border-gray-800 hover:border-blue-600 rounded-xl p-8 flex flex-col transition-colors group"
            >
              <div className="text-4xl mb-4">{industry.icon}</div>
              <h2 className="text-white font-bold text-xl mb-3 group-hover:text-blue-400 transition-colors">
                {industry.name}
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">{industry.desc}</p>
              <p className="text-gray-600 text-xs italic mb-4">Common pain points: {industry.pain}</p>
              <span className="text-blue-400 group-hover:text-blue-300 text-sm font-medium transition-colors">
                Learn more →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Don&apos;t See Your Industry?
          </h2>
          <p className="text-gray-400 mb-8">
            If you run a service business, we can help. Book a free discovery call and let us show
            you what OttoServ looks like for your specific situation.
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
