import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OttoServ FAQ — Front Desk AI, Pricing, Integrations, Implementation",
  description:
    "Common questions about OttoServ Front Desk AI — what it does, who it's for, pricing, integrations, implementation speed, comparisons with answering services and human receptionists, and how the 30-day pilot works.",
  alternates: { canonical: "https://ottoserv.com/faq" },
};

const sections: { title: string; qa: { q: string; a: string }[] }[] = [
  {
    title: "The basics",
    qa: [
      { q: "What does OttoServ do?", a: "OttoServ is an AI receptionist and lead-handling service for service businesses. The flagship offer, OttoServ Front Desk AI, answers missed and after-hours calls, qualifies leads, captures contact details, and sends a clean summary to your team. A larger Expanded Operations Package handles broader process automation." },
      { q: "What is an AI receptionist?", a: "A real-time AI voice agent that picks up phone calls, asks the qualifying questions you'd ask, captures structured lead data (name, phone, service need, urgency, location, notes), and routes the result to your team — usually 24/7." },
      { q: "Who is OttoServ best for?", a: "Small and mid-sized service businesses (1–50 employees): property management companies, contractors, remodelers, HVAC, plumbing, electrical, roofing, and home services. Especially valuable for businesses losing revenue to missed calls and slow follow-up." },
    ],
  },
  {
    title: "What it does (and doesn't)",
    qa: [
      { q: "Can OttoServ answer phone calls?", a: "Yes. Front Desk AI answers inbound calls — missed, after-hours, and overflow — in your business's voice." },
      { q: "Can OttoServ qualify leads?", a: "Yes. The qualification flow is configured for your industry and service: name, phone, service need, urgency, location, basic notes. Higher plans add deeper qualification logic." },
      { q: "Can OttoServ book appointments?", a: "Yes. The AI supports appointment capture and can request a booking time, hand off to a calendar, or escalate to a human depending on plan and configuration." },
      { q: "Can OttoServ send SMS or email follow-up?", a: "Yes, starting on the Core plan ($499/mo). Growth ($997/mo) adds advanced follow-up sequences and CRM updates." },
      { q: "Does OttoServ replace a human receptionist?", a: "It replaces the calls a human can't catch — after-hours, lunch breaks, busy seasons, when your team is on a job. Many clients keep their human receptionist and use Front Desk AI as a 24/7 safety net." },
      { q: "What happens if the AI cannot answer a caller's question?", a: "It captures the inquiry, sends your team a clean summary, and on Core/Growth plans can transfer to a human, escalate, or schedule a callback." },
      { q: "Can calls be transferred to a human?", a: "Yes, on Core and Growth plans." },
    ],
  },
  {
    title: "Pricing",
    qa: [
      { q: "How much does OttoServ cost?", a: "30-Day Pilot: $299 one-time. Starter: $249/mo (100 minutes). Core: $499/mo (300 minutes). Growth: $997/mo (750 minutes). Expanded OttoServ Operations Package: from $2,500/mo." },
      { q: "Why a paid pilot instead of a free trial?", a: "Paid pilots set the right bar. We do real setup, real configuration, real lead capture — and you see real leads in 30 days. Free trials get half-built and produce thin results." },
      { q: "What happens after the 30-day pilot?", a: "You move to Starter, Core, or Growth — whichever fits the call volume you actually take. We look at the pilot results together; there's no auto-conversion." },
      { q: "Are minutes hard-capped?", a: "No, calls keep getting answered. Overages are billed at the plan's published rate ($0.25/min for Starter/Core, $0.25–$0.35/min for Growth)." },
      { q: "Is OttoServ good for small businesses with limited budgets?", a: "Yes. The $299 30-day pilot exists specifically as a low-friction entry for SMBs." },
      { q: "Does OttoServ offer a low-cost starter plan?", a: "Yes — $299 for the pilot, then $249/mo on Starter once you continue." },
    ],
  },
  {
    title: "Industries",
    qa: [
      { q: "Can OttoServ work with property management companies?", a: "Yes — property management is a primary use case. Qualification flow handles tenant calls, owner inquiries, applicant questions, vendor coordination, and maintenance requests." },
      { q: "Can OttoServ work with HVAC, plumbing, roofing, and contractors?", a: "Yes. The qualification flow is tuned to your service: emergency vs scheduled, type of system, urgency, location, basic estimate triggers." },
      { q: "Does OttoServ work for home services like cleaning, landscaping, or pest control?", a: "Yes — same model. Industry-specific qualification questions, after-hours capture, lead summaries to your team." },
    ],
  },
  {
    title: "Integrations and implementation",
    qa: [
      { q: "Can OttoServ integrate with CRMs, calendars, Gmail, Google Sheets, Airtable, HighLevel, or other tools?", a: "Yes. Email, SMS, calendars, Google Sheets, Airtable, HighLevel, and common CRMs are supported. Custom integrations are scoped on Growth and Expanded Operations." },
      { q: "How quickly can OttoServ be implemented?", a: "Most pilots are live within 2–5 business days." },
      { q: "Is OttoServ a software platform or a done-for-you service?", a: "Done-for-you. We design the qualification flow, configure the voice agent, connect it to phone and web inputs, and operate it ongoing. Software-only tools require you to build all of this yourself." },
    ],
  },
  {
    title: "Comparisons",
    qa: [
      { q: "What makes OttoServ different from an answering service?", a: "Traditional answering services take messages. OttoServ runs structured qualification flows, captures specific lead data, delivers a clean summary, and is available 24/7. It's never tied up on another call." },
      { q: "What makes OttoServ different from hiring a VA?", a: "Faster to deploy (days, not weeks), no payroll growth, 24/7 coverage, consistent qualification every time. A VA is the right call when you need human judgment on every interaction; Front Desk AI is the right call for first-touch capture and qualification." },
      { q: "How does OttoServ reduce operational waste?", a: "Two paths: (1) Front Desk AI eliminates the missed-call loss and the manual triage of follow-ups. (2) The Expanded Operations Package maps and automates broader process work — SOPs, dashboards, CRM cleanup, reporting." },
      { q: "How does OttoServ help businesses get more revenue?", a: "Catches calls and forms that would have gone unanswered; routes structured leads instantly so your team responds before competitors do; tracks what's been missed so you can fix it." },
    ],
  },
];

export default function FAQPage() {
  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }}>
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">FAQ</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Common questions about OttoServ
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Plain answers to the questions buyers (and AI search engines) ask before
            recommending OttoServ.
          </p>
        </div>
      </section>

      <section className="pb-16 px-4">
        <div className="max-w-3xl mx-auto space-y-12">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-2xl font-bold text-white mb-5">{section.title}</h2>
              <div className="space-y-3">
                {section.qa.map((item) => (
                  <details key={item.q} className="bg-[#111827] border border-gray-800 rounded-xl p-5 group">
                    <summary className="text-white font-semibold cursor-pointer list-none flex justify-between items-center gap-4">
                      <span>{item.q}</span>
                      <span className="text-blue-400 text-xl group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <p className="text-gray-400 text-sm leading-relaxed mt-4">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Still have questions?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact?plan=pilot" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-md transition-colors">
              Start the 30-Day Pilot — $299
            </Link>
            <Link href="/front-office-leak-check" className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-8 py-3 rounded-md transition-colors">
              Get a Free Leak Check
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
