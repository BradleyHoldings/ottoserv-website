import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OttoServ — Business Operations & Automation Consulting",
  description: "Stop running your business on workarounds. OttoServ helps you build practical systems that free up time and scale with your growth.",
};

export default function Home() {
  return (
    <div className="bg-[#0a0a0a]">
      {/* Hero */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Stop Running Your Business<br className="hidden md:block" /> on Workarounds
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            We help small and medium businesses replace manual chaos with practical systems and automation — so you can focus on growth, not firefighting.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-md text-lg transition-colors"
          >
            Book a Free Discovery Call
          </Link>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            Sound Familiar?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Hours Lost to Manual Work",
                desc: "Your team spends hours every week on tasks that should be automated — data entry, follow-ups, scheduling.",
              },
              {
                title: "Leads Go Cold",
                desc: "Potential clients fall through the cracks because follow-up is slow, inconsistent, or simply forgotten.",
              },
              {
                title: "Inconsistent Processes",
                desc: "Every team member does things differently. Quality suffers and nothing is scalable.",
              },
              {
                title: "No Visibility Into Operations",
                desc: "You don't have a clear picture of what's happening in your business until something breaks.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-[#111827] border border-gray-800 rounded-xl p-6"
              >
                <h3 className="text-white font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            What We Do
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            We follow a proven three-step process to diagnose your operations and build systems that actually work.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "Map",
                title: "Map Your Operations",
                desc: "We document every process, workflow, and tool in your business to get a full picture of how things actually work.",
              },
              {
                step: "Identify",
                title: "Identify the Gaps",
                desc: "We analyze what's causing slowdowns, errors, dropped balls, and wasted time — and prioritize what to fix first.",
              },
              {
                step: "Build",
                title: "Build the Systems",
                desc: "We build the automations, integrations, and workflows that fix the real problems and scale with your growth.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center"
              >
                <span className="inline-block bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full mb-4">
                  {item.step}
                </span>
                <h3 className="text-white font-semibold text-xl mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Work With */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Who We Work With
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            We work with small and medium businesses that are growing faster than their systems can keep up with. If you have a team that is constantly working around your tools, spending hours on tasks that should be automated, or struggling to maintain consistent processes as you scale — we built OttoServ for you. Our ideal clients are founders and operations leaders who know something is broken but don&apos;t have the time or technical bandwidth to fix it themselves.
          </p>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            Results We&apos;ve Delivered
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                stat: "12 hrs/week recovered",
                title: "Streamlining Scheduling",
                desc: "A service business was manually coordinating every appointment. We automated scheduling, reminders, and confirmations — saving 12+ hours per week.",
              },
              {
                stat: "80% faster lead follow-up",
                title: "Automated CRM Workflows",
                desc: "A sales team was losing leads to slow manual follow-up. We integrated their CRM with automated email and SMS sequences triggered the moment a lead came in.",
              },
              {
                stat: "Consistent across all team members",
                title: "Standardized Processes",
                desc: "A growing team was doing things differently depending on who handled it. We documented and automated their core processes to ensure consistent quality at scale.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-[#1f2937] border border-gray-700 rounded-xl p-8"
              >
                <p className="text-blue-400 font-bold text-xl mb-2">{item.stat}</p>
                <h3 className="text-white font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            Our Services
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            From initial workflow analysis to full system implementation, we cover everything your operations need.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Workflow Mapping",
                desc: "Document and analyze your current processes to find what is slowing you down.",
                href: "/services/workflow-mapping",
              },
              {
                title: "Lead Automation",
                desc: "Automated systems that capture, qualify, and follow up with leads without manual effort.",
                href: "/services/lead-automation",
              },
              {
                title: "Admin Automation",
                desc: "Eliminate repetitive admin tasks like scheduling, invoicing, and data entry.",
                href: "/services/admin-automation",
              },
              {
                title: "System Integration",
                desc: "Connect your tools so data flows automatically between them.",
                href: "/services/system-integration",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-[#111827] border border-gray-800 rounded-xl p-6 flex flex-col"
              >
                <h3 className="text-white font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed flex-1">{item.desc}</p>
                <Link
                  href={item.href}
                  className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  Learn More →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Build Systems That Work?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Start with a free discovery call. We will learn about your business, identify your biggest operational bottlenecks, and outline a practical plan.
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
