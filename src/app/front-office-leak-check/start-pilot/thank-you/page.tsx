import Link from "next/link";

export default async function PilotStartThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; scan?: string }>;
}) {
  const params = await searchParams;

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="min-h-screen px-4 py-20 text-gray-200">
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-800 bg-[#111827] p-8 text-center md:p-10">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-400">
          Pilot Start Requested
        </p>
        <h1 className="mb-4 text-3xl font-bold text-white md:text-4xl">
          The next step is saved.
        </h1>
        <p className="text-gray-400">
          OttoServ has the pilot start request, contact details, consent, and source scan context.
          Jonathan can now confirm scope and the payment/start path without another redundant click.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/process-audit" className="rounded-md border border-blue-800 bg-[#0d0d0d] px-6 py-3 text-sm font-semibold text-blue-200 hover:border-blue-500">
            Full Process Audit
          </Link>
        </div>
        {params.event && <p className="mt-6 font-mono text-xs text-gray-600">Conversion event: {params.event}</p>}
      </div>
    </div>
  );
}
