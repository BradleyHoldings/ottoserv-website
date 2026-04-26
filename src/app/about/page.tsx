import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — OttoServ",
  description: "OttoServ was founded by Jonathan Bradley to help small businesses build practical systems that free up time and scale with their growth.",
};

export default function AboutPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">About OttoServ</h1>
          <p className="text-gray-400 text-xl leading-relaxed max-w-2xl mx-auto">
            We help small businesses build practical systems that free up time and scale with their growth.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-4">Our Mission</h2>
            <p className="text-gray-400 leading-relaxed text-lg">
              Most small business owners are incredibly capable people who built something real — but their operations never kept up with their growth. They end up doing work that should be automated, managing chaos that should be systematized, and losing time they could be spending on the things that actually matter.
            </p>
            <p className="text-gray-400 leading-relaxed text-lg mt-4">
              OttoServ exists to fix that. We believe every business deserves operations that run smoothly — not because they have a massive team or an enterprise budget, but because someone took the time to build the right systems for them. That is what we do.
            </p>
          </div>

          {/* Founder */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-6">Founded by Jonathan Bradley</h2>
            <p className="text-gray-400 leading-relaxed text-lg">
              [Jonathan&apos;s story will be added here. For now: Jonathan Bradley is the founder of OttoServ, focused on helping small businesses build practical systems that actually work.]
            </p>
          </div>

          {/* Values */}
          <div>
            <h2 className="text-white font-bold text-2xl mb-6">What We Stand For</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  title: "Practical",
                  desc: "We build systems that work in the real world — not theoretical best practices that fall apart when someone is actually trying to use them.",
                },
                {
                  title: "Right-sized",
                  desc: "We build for where you are, not where some enterprise playbook says you should be. The solution should fit the business.",
                },
                {
                  title: "Transparent",
                  desc: "We tell you what we can do, what we can not do, and what we think is the right call — even when that is not what you want to hear.",
                },
                {
                  title: "Results-focused",
                  desc: "We measure our work by the actual outcomes it produces — time saved, errors eliminated, revenue recovered. Not deliverables.",
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
            Start with a free discovery call. No pitch, no pressure — just an honest conversation about your business.
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
