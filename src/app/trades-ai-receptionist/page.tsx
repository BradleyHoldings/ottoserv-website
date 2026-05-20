import Link from "next/link";

export const metadata = {
  title: "AI Lead Handler for Trades | OttoServ",
  description:
    "AI lead handler for home service companies that need call answering, missed-call recovery, lead qualification, appointment booking, and follow-up automation.",
  alternates: { canonical: "https://ottoserv.com/trades-ai-receptionist" },
};

export default function TradesAiReceptionistPage() {
  return (
    <main className="bg-[#0a0a0a] min-h-screen text-white">
      <section className="px-4 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-4">
            Home services AI receptionist
          </p>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            AI Lead Handler for Property Managers and Home Service Companies
          </h1>
          <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-3xl mb-8">
            OttoServ helps trades teams answer overflow calls, qualify urgent requests, recover missed calls, book appointments, and route cleaner notes to the office. This page is a scaffold for the broader trades offer while Gemini/Cowork research fills in sharper trade-by-trade proof.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/demo" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-4 rounded-md text-center">
              Book a Demo
            </Link>
            <Link href="/process-audit" className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-7 py-4 rounded-md text-center">
              Request a Free Process Audit
            </Link>
          </div>
        </div>
      </section>
      <section className="px-4 py-16 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            ["HVAC", "/industries/hvac-ai-receptionist", "No-cool/no-heat triage, tune-up scheduling, replacement estimates, and dispatch-ready notes."],
            ["Plumbing", "/industries/plumbing-ai-call-answering", "Burst pipes, sewer backups, water heater calls, fixture repairs, and emergency routing."],
            ["Roofing", "/industries/roofing-lead-qualification", "Storm leads, inspection requests, quote qualification, and fast follow-up."],
          ].map(([title, href, text]) => (
            <Link key={href} href={href} className="bg-[#111827] border border-gray-800 hover:border-blue-700 rounded-xl p-6 transition-colors">
              <h2 className="text-xl font-semibold mb-3">{title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{text}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
