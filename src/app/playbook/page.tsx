import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The OttoServ OS Playbook — From AI Receptionist to Full Operating System",
  description:
    "See how OttoServ starts with an AI receptionist to capture missed calls and lost leads, then expands into a complete operating system for your business.",
};

const phases = [
  {
    number: "1",
    title: "AI Receptionist",
    description:
      "Capture missed calls, answer common questions, qualify callers, and route urgent opportunities.",
  },
  {
    number: "2",
    title: "Lead Capture + Qualification",
    description:
      "Turn calls, forms, chats, and messages into structured lead records with clear next steps.",
  },
  {
    number: "3",
    title: "Follow-Up Automation",
    description:
      "Automatically follow up with leads, reduce delays, and keep opportunities from slipping through the cracks.",
  },
  {
    number: "4",
    title: "Scheduling + Handoff",
    description:
      "Book appointments, notify the right team members, and make sure every qualified lead gets handled.",
  },
  {
    number: "5",
    title: "Reporting + Visibility",
    description:
      "Give owners and managers visibility into lead volume, response times, missed opportunities, conversion rates, and workflow performance.",
  },
  {
    number: "6",
    title: "Final OS",
    description:
      "Connect the business into a full operating system with workflows, SOPs, dashboards, automations, and AI-assisted operations.",
  },
];

export default function PlaybookPage() {
  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }}>
      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-orange-400 font-semibold text-sm uppercase tracking-widest mb-4">
            OttoServ OS · Playbook
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            The OttoServ OS Playbook
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Start with an AI receptionist. Expand into a complete operating system for
            leads, follow-up, scheduling, workflows, reporting, and automation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              Book a Demo
            </Link>
            <a
              href="#video"
              className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="video" className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
            <iframe
              src="https://www.youtube.com/embed/l1RDm0yNXU8"
              title="The OttoServ OS Playbook"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
          <p className="text-gray-500 text-sm text-center mt-6">
            Watch how OttoServ starts with the highest-impact fix and builds from there.
          </p>
        </div>
      </section>

      {/* Phase Breakdown Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              The Six-Phase Rollout
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              OttoServ starts with the highest-impact operational leak first — missed
              calls, slow follow-up, and lost leads — then gradually expands into a full
              operating system for your business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {phases.map((phase) => (
              <div
                key={phase.number}
                className="bg-[#111827] border border-gray-800 rounded-xl p-6 hover:border-orange-500/50 transition-colors"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {phase.number}
                  </div>
                  <h3 className="text-white font-semibold text-lg">{phase.title}</h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {phase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-20 px-4 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to see where OttoServ would start inside your business?
          </h2>
          <p className="text-gray-400 text-lg mb-10 leading-relaxed">
            We start with the biggest revenue leak first, then build the operating system
            around what your business actually needs.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
          >
            Book a Demo
          </Link>
        </div>
      </section>
    </div>
  );
}
