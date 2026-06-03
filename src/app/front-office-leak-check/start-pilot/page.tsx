import Link from "next/link";

export default async function StartPilotPage({
  searchParams,
}: {
  searchParams: Promise<{ scan?: string; workflow?: string }>;
}) {
  const params = await searchParams;
  const workflow = params.workflow || "recommended AI employee";

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="min-h-screen px-4 py-16 text-gray-200">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
            Start The 30-Day Pilot
          </p>
          <h1 className="text-3xl font-bold text-white md:text-5xl">
            Start with one workflow, then measure the leaks.
          </h1>
          <p className="mt-4 text-gray-400">
            This intake goes directly to the pilot start path. We will confirm the workflow,
            start date, and handoff details before setup.
          </p>
        </div>

        <form className="space-y-5 rounded-xl border border-gray-800 bg-[#111827] p-6 md:p-8" action="/contact">
          <input type="hidden" name="topic" value="30-day-pilot" />
          {params.scan && <input type="hidden" name="scan" value={params.scan} />}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name" name="name" required />
            <Field label="Email" name="email" type="email" required />
            <Field label="Company" name="company" required />
            <Field label="Phone" name="phone" type="tel" />
            <Field label="Preferred start date" name="preferred_start_date" type="date" />
            <Field label="Workflow to start with" name="workflow" defaultValue={workflow} />
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-300">Notes</span>
            <textarea
              name="notes"
              rows={4}
              placeholder="Anything we should know before the pilot starts?"
              className="w-full rounded-md border border-gray-700 bg-[#0d0d0d] p-3 text-sm text-gray-100 outline-none transition-colors placeholder:text-gray-600 focus:border-blue-500"
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Send Pilot Start Request
            </button>
            <Link href="/contact?topic=leak-check-review" className="rounded-md border border-gray-700 px-6 py-3 text-center text-sm font-semibold text-gray-200 hover:border-gray-500 hover:text-white">
              Book a Review Call Instead
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-gray-700 bg-[#0d0d0d] p-3 text-sm text-gray-100 outline-none transition-colors placeholder:text-gray-600 focus:border-blue-500"
      />
    </label>
  );
}
