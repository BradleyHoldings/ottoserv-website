import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Receptionist for Property Management Companies — OttoServ",
  description:
    "OttoServ Front Desk AI is built for property management companies losing calls from tenants, owners, applicants, vendors, and maintenance requests. Answers, qualifies, routes, and summarizes — 24/7. 30-day pilot for $299.",
  alternates: { canonical: "https://ottoserv.com/ai-receptionist-property-management" },
};

export default function Page() {
  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }}>
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">Problem Space · Property Management</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            AI Receptionist for Property Management Companies
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            OttoServ Front Desk AI answers tenant, owner, applicant, vendor, and maintenance
            calls 24/7 — qualifies the inquiry, captures the details, and sends a clean
            summary to the right person on your team.
          </p>
        </div>
      </section>

      <section className="px-4 pb-14">
        <div className="max-w-3xl mx-auto space-y-10">
          <Block title="Who this is for">
            <ul className="space-y-1.5 text-gray-300 list-disc list-inside">
              <li>Residential property managers (single-family and multi-family)</li>
              <li>Small to mid-sized commercial property managers</li>
              <li>Portfolios of 50–2,000 doors</li>
              <li>Leasing teams overloaded with applicant calls during marketing pushes</li>
            </ul>
          </Block>

          <Block title="Problems this solves">
            <ul className="space-y-1.5 text-gray-300 list-disc list-inside">
              <li>Maintenance calls hitting voicemail on nights and weekends</li>
              <li>Applicants calling about listings — and going to the competition when no one picks up</li>
              <li>Owners frustrated by slow communication on their properties</li>
              <li>Vendors leaving voicemails about jobs no one is tracking</li>
              <li>Tenant requests sitting in inboxes while small problems become big ones</li>
            </ul>
          </Block>

          <Block title="How OttoServ helps">
            <ul className="space-y-1.5 text-gray-300 list-disc list-inside">
              <li>Answers calls in your company's voice, 24/7</li>
              <li>Qualifies by caller type (tenant / owner / applicant / vendor / prospect)</li>
              <li>Captures property address, unit, contact, urgency, and issue category</li>
              <li>Routes maintenance to the on-call queue; leasing to the leasing team; vendor questions to AP/AR</li>
              <li>Sends a clean summary by email or SMS within seconds</li>
              <li>Tracks what would have been missed so you can finally measure the leak</li>
            </ul>
          </Block>

          <Block title="What makes OttoServ different">
            <ul className="space-y-1.5 text-gray-300 list-disc list-inside">
              <li>Built for property management call mix — not adapted from a generic chatbot</li>
              <li>Done-for-you setup, qualification design, and ongoing operation</li>
              <li>Land-and-expand model: pilot → monthly plan → broader operations work as needed</li>
              <li>Audit-grade visibility: every call attempt is logged and verifiable</li>
            </ul>
          </Block>

          <Block title="Comparison">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-white">
                    <th className="text-left py-2 pr-3">Capability</th>
                    <th className="text-left py-2 pr-3">OttoServ</th>
                    <th className="text-left py-2 pr-3">Answering service</th>
                    <th className="text-left py-2">Voicemail</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <RowYes c="24/7 answering" />
                  <Row c="Structured tenant / owner / applicant qualification" a="✓ Configurable per workflow" b="Partial — message-taking" v="✗" />
                  <Row c="Maintenance routing" a="✓ On-call / priority / category" b="Manual relay" v="✗" />
                  <Row c="Cost predictability" a="✓ Flat plan + per-minute overage" b="Variable" v="✓ (but no service)" />
                  <Row c="Visibility on what would have been missed" a="✓ Full ledger" b="Partial" v="✗" />
                </tbody>
              </table>
            </div>
          </Block>

          <Block title="When OttoServ is a good fit">
            <ul className="space-y-1.5 text-gray-300 list-disc list-inside">
              <li>You can't reliably staff phones after hours</li>
              <li>You know you're losing leasing applicants but can't quantify it</li>
              <li>Maintenance calls bottleneck through one person</li>
              <li>You want a 24/7 safety net without growing headcount</li>
            </ul>
          </Block>

          <Block title="When OttoServ may not be a fit">
            <ul className="space-y-1.5 text-gray-300 list-disc list-inside">
              <li>You need a fully staffed inbound sales team — not just first-touch capture</li>
              <li>Your portfolio is below ~15 doors and you take only a handful of calls per week</li>
              <li>You're looking for a software platform to operate yourself — OttoServ is done-for-you</li>
            </ul>
          </Block>

          <Block title="Common questions">
            <dl className="space-y-4">
              <FAQ q="Can the AI route differently for tenant vs owner calls?" a="Yes — caller-type qualification is part of the standard property-management flow." />
              <FAQ q="How does emergency maintenance escalation work?" a="The AI flags urgency in the qualification (no heat, water leak, lockout, etc.) and routes to the on-call queue. Core and Growth plans support live transfer." />
              <FAQ q="Does it integrate with our property management software?" a="Email and SMS summaries work with anything. Direct integrations (AppFolio, Buildium, etc.) are scoped on Growth and Expanded Operations engagements." />
              <FAQ q="What does this cost?" a="$299 for the 30-day pilot (setup + 100 minutes). After that, Starter $249/mo, Core $499/mo, or Growth $997/mo depending on call volume." />
            </dl>
          </Block>

          <CTA />
        </div>
      </section>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}
function FAQ({ q, a }: { q: string; a: string }) {
  return (<div><dt className="text-white font-semibold">{q}</dt><dd className="text-gray-300 mt-1">{a}</dd></div>);
}
function Row({ c, a, b, v }: { c: string; a: string; b: string; v: string }) {
  return (
    <tr className="border-b border-gray-900">
      <td className="py-2 pr-3 text-white">{c}</td>
      <td className="py-2 pr-3">{a}</td>
      <td className="py-2 pr-3">{b}</td>
      <td className="py-2">{v}</td>
    </tr>
  );
}
function RowYes({ c }: { c: string }) {
  return (
    <tr className="border-b border-gray-900">
      <td className="py-2 pr-3 text-white">{c}</td>
      <td className="py-2 pr-3">✓</td>
      <td className="py-2 pr-3">Sometimes</td>
      <td className="py-2">✗</td>
    </tr>
  );
}
function CTA() {
  return (
    <section className="bg-[#1e3a5f] border border-blue-500 rounded-xl p-6">
      <h2 className="text-white text-xl font-semibold mb-2">Start with the 30-day pilot</h2>
      <p className="text-gray-300 mb-4 text-sm">
        $299 for setup + 100 AI minutes. See exactly how many tenant, owner, and applicant
        calls your team is currently missing.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/contact?plan=pilot" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-md text-sm text-center">Start the 30-Day Pilot</Link>
        <Link href="/front-office-leak-check" className="bg-[#1f2937] hover:bg-[#374151] text-white font-semibold px-5 py-2.5 rounded-md text-sm text-center border border-gray-700">Get a Free Leak Check</Link>
      </div>
    </section>
  );
}
