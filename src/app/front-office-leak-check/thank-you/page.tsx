import Link from "next/link";

export default async function LeakCheckThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ scan?: string; report?: string }>;
}) {
  const params = await searchParams;
  const reportHref = params.report
    ? `/front-office-leak-check/report/${encodeURIComponent(params.report)}`
    : "";

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="min-h-screen px-4 py-20">
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-800 bg-[#111827] p-8 text-center md:p-10">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-400">
          Leak Check Submitted
        </p>
        <h1 className="mb-4 text-3xl font-bold text-white md:text-4xl">
          Your process scan is in.
        </h1>
        <p className="mb-8 text-gray-400">
          OttoServ created a status record and an initial report shell. We will review the
          workflow, polish the findings, and use the report as the conversion asset for a
          focused 30-day pilot if there is a clear fit.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          {reportHref && (
            <Link href={reportHref} className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              View Initial Report
            </Link>
          )}
          <Link href="/front-desk-ai" className="rounded-md border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-200 hover:border-gray-500 hover:text-white">
            See 30-Day Pilot
          </Link>
        </div>
        {params.scan && (
          <p className="mt-6 font-mono text-xs text-gray-600">Scan ID: {params.scan}</p>
        )}
      </div>
    </div>
  );
}
