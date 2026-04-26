import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Lead Automation — OttoServ",
  description: "Automated systems that capture, qualify, and follow up with leads without manual effort. Stop losing revenue to slow follow-up.",
};

export default function LeadAutomationPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/services" className="text-blue-400 hover:text-blue-300 text-sm mb-6 inline-block transition-colors">
            ← Back to Services
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Lead Automation</h1>
          <p className="text-gray-400 text-xl leading-relaxed">
            Automated systems that capture, qualify, and follow up with leads without any manual effort — so no opportunity ever falls through the cracks.
          </p>
        </div>
      </section>

      {/* What It Is */}
      <section className="pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-4">What It Is</h2>
            <p className="text-gray-400 leading-relaxed text-lg">
              Lead Automation means building the systems that handle your lead lifecycle automatically — from the moment someone expresses interest to the point they become a customer. We integrate your existing tools, set up automated follow-up sequences, and create the workflows that ensure every lead is contacted quickly and consistently, regardless of who is working that day.
            </p>
          </div>

          {/* What You Get */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-6">What You Get</h2>
            <ul className="space-y-4">
              {[
                {
                  title: "CRM Integration",
                  desc: "We connect your lead sources directly to your CRM so every lead is captured and tracked automatically.",
                },
                {
                  title: "Automated Email & SMS Follow-up",
                  desc: "Personalized follow-up sequences triggered automatically when a lead comes in, books a call, or goes quiet.",
                },
                {
                  title: "Lead Scoring",
                  desc: "Automated scoring rules so your team knows exactly which leads to prioritize and when.",
                },
                {
                  title: "Pipeline Visibility",
                  desc: "Real-time dashboards showing where every lead stands so nothing gets missed.",
                },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="text-blue-400 text-lg mt-0.5">&#10003;</span>
                  <div>
                    <p className="text-white font-medium">{item.title}</p>
                    <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Good Fit */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-6">Is This a Good Fit For You?</h2>
            <p className="text-gray-400 mb-4">Lead Automation is ideal if:</p>
            <ul className="space-y-3">
              {[
                "Your sales team is missing follow-ups because there are too many leads to track manually",
                "You have a high lead volume and need to respond faster than your team can manage",
                "You are still relying on manual outreach, spreadsheets, or sticky notes to track prospects",
                "You want to increase conversion without increasing headcount",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-gray-300 text-sm">
                  <span className="text-blue-400 mt-0.5">&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Start With a Free Discovery Call</h2>
          <p className="text-gray-400 mb-8">
            We will walk through your current lead process and show you exactly where automation can make the biggest difference.
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
