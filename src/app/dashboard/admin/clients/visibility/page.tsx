import Link from "next/link";
import { listClients } from "@/lib/visibility-kit/store";
import CreateClientForm from "./_components/CreateClientForm";

export const dynamic = "force-dynamic";

export default async function VisibilityKitList() {
  const clients = await listClients();
  return (
    <div className="min-h-screen bg-[#0b1220] text-gray-100 p-8">
      <header className="mb-8">
        <p className="text-blue-400 text-xs uppercase tracking-widest font-semibold">AI Search Visibility Kit</p>
        <h1 className="text-3xl font-bold text-white mt-1">Client Visibility Kits</h1>
        <p className="text-gray-400 mt-2">
          Reusable AEO module. Each client below has a generated set of AI-friendly pages, schema, prompt tracker,
          and authority checklist that can be reviewed and published.
        </p>
      </header>

      <div className="mb-6">
        <CreateClientForm />
      </div>

      <table className="w-full text-left border border-gray-800">
        <thead className="bg-[#111827]">
          <tr>
            <th className="p-3 border-b border-gray-800">Client</th>
            <th className="p-3 border-b border-gray-800">Main service</th>
            <th className="p-3 border-b border-gray-800">Cities</th>
            <th className="p-3 border-b border-gray-800">Problem pages</th>
            <th className="p-3 border-b border-gray-800">Comparisons</th>
            <th className="p-3 border-b border-gray-800">Tracker rows</th>
            <th className="p-3 border-b border-gray-800">Status</th>
            <th className="p-3 border-b border-gray-800">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-6 text-gray-400 text-center">
                No clients yet. Drop a JSON file in <code>data/visibility-kit/clients/</code> or POST to <code>/api/visibility/clients</code>.
              </td>
            </tr>
          ) : (
            clients.map((c) => (
              <tr key={c.slug} className="border-b border-gray-800 hover:bg-gray-900">
                <td className="p-3">
                  <Link className="text-blue-400 underline" href={`/dashboard/admin/clients/visibility/${c.slug}`}>{c.companyName}</Link>
                  <div className="text-xs text-gray-500">{c.slug}</div>
                </td>
                <td className="p-3 text-gray-300">{c.mainService}</td>
                <td className="p-3 text-gray-300">{c.serviceAreas.slice(0, 2).join(", ")}{c.serviceAreas.length > 2 ? "…" : ""}</td>
                <td className="p-3 text-gray-300">{c.problemSpaceTopics.length}</td>
                <td className="p-3 text-gray-300">{c.comparisonPages.length}</td>
                <td className="p-3 text-gray-300">{c.promptTracker.length}</td>
                <td className="p-3"><StatusPill status={c.aiLearnPageStatus} /></td>
                <td className="p-3 space-x-3">
                  <Link className="text-blue-400 underline" href={`/clients/${c.slug}/ai-learn-about-us`} target="_blank">View live</Link>
                  <Link className="text-blue-400 underline" href={`/dashboard/admin/clients/visibility/${c.slug}`}>Review</Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color: Record<string, string> = {
    draft: "bg-gray-700 text-gray-200",
    in_review: "bg-yellow-700 text-yellow-100",
    needs_revision: "bg-red-700 text-red-100",
    approved: "bg-emerald-700 text-emerald-100",
    published: "bg-blue-700 text-blue-100",
  };
  return <span className={`inline-block text-xs px-2 py-1 rounded ${color[status] || "bg-gray-700 text-gray-200"}`}>{status}</span>;
}
