import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services — OttoServ",
  description: "Explore OttoServ's services: Workflow Mapping, Lead Automation, Admin Automation, and System Integration.",
};

const services = [
  {
    title: "Workflow Mapping",
    description:
      "We document and analyze your current processes to find exactly what is slowing you down. You will get a clear picture of your operations and a prioritized roadmap for improvement.",
    href: "/services/workflow-mapping",
    highlights: ["Process documentation", "Bottleneck analysis", "Prioritized improvement roadmap", "Stakeholder interviews"],
  },
  {
    title: "Lead Automation",
    description:
      "Automated systems that capture, qualify, and follow up with leads without any manual effort. Stop losing revenue to slow follow-up and inconsistent outreach.",
    href: "/services/lead-automation",
    highlights: ["CRM integration", "Automated email & SMS follow-up", "Lead scoring", "Pipeline visibility"],
  },
  {
    title: "Admin Automation",
    description:
      "Eliminate the repetitive admin tasks that drain your team — scheduling, invoicing, data entry, and more. Free up hours every week for higher-value work.",
    href: "/services/admin-automation",
    highlights: ["Scheduling automation", "Invoice generation", "Document workflows", "Data sync between systems"],
  },
  {
    title: "System Integration",
    description:
      "Connect your tools so data flows automatically between them. No more copy-pasting between apps or manually syncing spreadsheets.",
    href: "/services/system-integration",
    highlights: ["API integrations", "Zapier / Make / n8n workflows", "Database sync", "Custom connectors"],
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
            We offer a focused set of services designed to eliminate operational chaos and replace it with practical, scalable systems.
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
                Learn More
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Not Sure Where to Start?</h2>
          <p className="text-gray-400 mb-8">
            Book a free discovery call and we will help you figure out which service fits your situation best.
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
