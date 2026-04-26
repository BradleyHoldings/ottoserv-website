import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "System Integration — OttoServ",
  description: "Connect your tools so data flows automatically between them. No more manual data entry or siloed systems.",
};

export default function SystemIntegrationPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/services" className="text-blue-400 hover:text-blue-300 text-sm mb-6 inline-block transition-colors">
            ← Back to Services
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">System Integration</h1>
          <p className="text-gray-400 text-xl leading-relaxed">
            Connect your tools so data flows automatically between them — no more copy-pasting, manual syncing, or siloed information.
          </p>
        </div>
      </section>

      {/* What It Is */}
      <section className="pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-4">What It Is</h2>
            <p className="text-gray-400 leading-relaxed text-lg">
              Most growing businesses accumulate a collection of tools — a CRM here, a project management tool there, an invoicing platform, a scheduling app — and none of them talk to each other. System Integration means connecting those tools so information flows automatically, without anyone having to manually move data between them. We use APIs, automation platforms, and custom connectors to build the pipelines that keep your systems in sync.
            </p>
          </div>

          {/* What You Get */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-6">What You Get</h2>
            <ul className="space-y-4">
              {[
                {
                  title: "API Integrations",
                  desc: "Direct connections between your tools using their native APIs for reliable, real-time data sync.",
                },
                {
                  title: "Zapier / Make / n8n Workflows",
                  desc: "Visual automation workflows that connect hundreds of tools without custom code — or full custom builds when needed.",
                },
                {
                  title: "Database Sync",
                  desc: "Keep your records consistent across systems so you always have a single source of truth.",
                },
                {
                  title: "Custom Connectors",
                  desc: "For tools without native integrations, we build the bridges that make them work with the rest of your stack.",
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
            <p className="text-gray-400 mb-4">System Integration is the right service if:</p>
            <ul className="space-y-3">
              {[
                "Your tools don't talk to each other and data has to be manually transferred between them",
                "Your team enters the same information into multiple systems",
                "You have siloed data across different platforms and no unified view of operations",
                "You have added new tools over time but never wired them together properly",
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
            Walk us through the tools you are using and we will map out how to connect them properly.
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
