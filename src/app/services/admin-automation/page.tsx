import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Automation — OttoServ",
  description: "Eliminate repetitive admin tasks like scheduling, invoicing, and data entry. Free up hours every week for higher-value work.",
};

export default function AdminAutomationPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* Header */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/services" className="text-blue-400 hover:text-blue-300 text-sm mb-6 inline-block transition-colors">
            ← Back to Services
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Admin Automation</h1>
          <p className="text-gray-400 text-xl leading-relaxed">
            Eliminate the repetitive admin tasks that drain your team every week — scheduling, invoicing, data entry, and document workflows.
          </p>
        </div>
      </section>

      {/* What It Is */}
      <section className="pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-4">What It Is</h2>
            <p className="text-gray-400 leading-relaxed text-lg">
              Admin Automation targets the repetitive, low-value tasks that eat up your team&apos;s time every single day. These are the tasks that feel small individually but add up to dozens of hours per week across your team. We identify which admin tasks can be automated, build the workflows to handle them automatically, and free your people up to focus on work that actually moves the business forward.
            </p>
          </div>

          {/* What You Get */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 mb-8">
            <h2 className="text-white font-bold text-2xl mb-6">What You Get</h2>
            <ul className="space-y-4">
              {[
                {
                  title: "Scheduling Automation",
                  desc: "Automated booking, reminders, confirmations, and rescheduling flows — no more back-and-forth emails.",
                },
                {
                  title: "Invoice Generation",
                  desc: "Invoices created and sent automatically based on triggers like job completion, contract milestones, or recurring dates.",
                },
                {
                  title: "Document Workflows",
                  desc: "Automated document creation, e-signature requests, and filing so paperwork moves without manual intervention.",
                },
                {
                  title: "Data Sync Between Systems",
                  desc: "Automatic data transfer between your tools so nothing needs to be entered twice.",
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
            <p className="text-gray-400 mb-4">Admin Automation is a strong fit if:</p>
            <ul className="space-y-3">
              {[
                "Your team spends hours each week on tasks that feel like they should just happen automatically",
                "You have repetitive manual steps in your delivery or operations process",
                "Data entry errors are causing problems because information is being moved by hand",
                "You want to scale without proportionally increasing your administrative overhead",
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
            Tell us about the tasks your team does on repeat and we will show you what can be automated.
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
