import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — OttoServ",
  description:
    "OttoServ is an AI-powered operating system for service businesses. Founded by Jonathan Bradley, powered by 7 AI agents working together to run your business smarter.",
};

export default function AboutPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">About OttoServ</h1>
          <p className="text-gray-400 text-xl leading-relaxed max-w-2xl mx-auto">
            An AI-powered operating system built for service businesses — not enterprise software
            awkwardly shoehorned to fit.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-4">Our Mission</h2>
            <p className="text-gray-400 leading-relaxed text-lg">
              Most service business owners are incredibly capable people who built something real —
              but their operations never kept pace with their growth. They end up personally fielding
              calls at 9pm, tracking jobs on whiteboards, and losing leads because no one followed up.
            </p>
            <p className="text-gray-400 leading-relaxed text-lg mt-4">
              OttoServ exists to change that. We believe every service business deserves an operating
              system that works as hard as the owner does — capturing every lead, automating the
              repetitive work, and giving the business the visibility it needs to grow. Powered by 7
              AI agents working together behind the scenes, OttoServ turns chaos into a system.
            </p>
          </div>

          {/* Platform Evolution */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-4">From Consulting Firm to AI Platform</h2>
            <p className="text-gray-400 leading-relaxed text-lg">
              OttoServ started as an operations consulting firm helping small businesses fix broken
              processes. What we learned from hundreds of audits is that the same problems show up
              everywhere in service businesses — missed leads, no job visibility, manual billing,
              forgotten follow-ups. So we built a platform that solves them all, with AI agents
              doing the work that used to require a team of assistants.
            </p>
            <p className="text-gray-400 leading-relaxed text-lg mt-4">
              Today, OttoServ is an AI-powered operating system — with industry-specific modules for
              contractors, property managers, HVAC and trades companies, smart home installers, and
              IT providers.
            </p>
          </div>

          {/* AI Agents */}
          <div className="bg-[#1e3a5f] border border-blue-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-4">
              Powered by 7 AI Agents Working Together
            </h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              OttoServ runs on a network of specialized AI agents — each one focused on a specific
              part of your business — coordinated by Jarvis, our operations intelligence layer.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: "Morgan", role: "AI Lead Response — answers calls, qualifies leads, books appointments" },
                { name: "Jarvis", role: "Operations Intelligence — coordinates agents, generates weekly briefings" },
                { name: "Scout", role: "Market Intelligence — tracks competitors, pricing, and local demand" },
                { name: "Atlas", role: "Job & Project Tracking — monitors budgets, timelines, and billing" },
                { name: "Relay", role: "Client Communications — automated follow-ups, updates, and reviews" },
                { name: "Ledger", role: "Financial Intelligence — invoice tracking, margin analysis" },
                { name: "Otto", role: "Workflow Automation — connects your tools and automates repetitive tasks" },
              ].map((agent) => (
                <div key={agent.name} className="flex items-start gap-3">
                  <span className="text-blue-400 font-bold text-sm w-16 shrink-0">{agent.name}</span>
                  <span className="text-gray-300 text-sm">{agent.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Founder */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-6">Founded by Jonathan Bradley</h2>
            <p className="text-gray-400 leading-relaxed text-lg">
              [Jonathan&apos;s story will be added here. For now: Jonathan Bradley is the founder of
              OttoServ, focused on helping service businesses build practical systems that actually
              work — combining deep operations expertise with AI-powered tools.]
            </p>
          </div>

          {/* Values */}
          <div>
            <h2 className="text-white font-bold text-2xl mb-6">What We Stand For</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  title: "Practical",
                  desc: "We build systems that work in the real world — not theoretical best practices that fall apart when someone is actually using them under pressure.",
                },
                {
                  title: "Right-sized",
                  desc: "We build for where you are, not where some enterprise playbook says you should be. The solution should fit the business.",
                },
                {
                  title: "Transparent",
                  desc: "We tell you what we can do, what we cannot do, and what we think is the right call — even when that is not what you want to hear.",
                },
                {
                  title: "Results-focused",
                  desc: "We measure success by the actual outcomes we produce — leads captured, time saved, revenue recovered. Not deliverables and slide decks.",
                },
              ].map((value) => (
                <div
                  key={value.title}
                  className="bg-[#111827] border border-gray-800 rounded-xl p-6"
                >
                  <h3 className="text-blue-400 font-semibold text-lg mb-2">{value.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Work With Us</h2>
          <p className="text-gray-400 mb-8">
            Start with a free discovery call. No pitch, no pressure — just an honest conversation
            about your business and where we can help.
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
