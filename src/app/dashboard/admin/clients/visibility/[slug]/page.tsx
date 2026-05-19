import Link from "next/link";
import { notFound } from "next/navigation";
import { loadClientWithDefaults } from "@/lib/visibility-kit/load";
import { GateToggles, RegenerateButton, StatusSelect } from "../_components/KitControls";

export const dynamic = "force-dynamic";

export default async function VisibilityKitDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await loadClientWithDefaults(slug);
  if (!c) notFound();
  const base = `/clients/${c.slug}`;

  return (
    <div className="min-h-screen bg-[#0b1220] text-gray-100 p-8">
      <p className="text-sm text-gray-500 mb-2">
        <Link href="/dashboard/admin/clients/visibility" className="underline">← All clients</Link>
      </p>
      <h1 className="text-3xl font-bold text-white">{c.companyName}</h1>
      <p className="text-gray-400">{c.mainService} · {c.serviceAreas.join(", ")}</p>

      <div className="mt-6">
        <RegenerateButton slug={c.slug} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card title="AI Learn About Us page" status={c.aiLearnPageStatus}>
          <PageLink href={`${base}/ai-learn-about-us`}>View live page</PageLink>
          <div className="mt-2"><StatusSelect slug={c.slug} field="aiLearnPageStatus" value={c.aiLearnPageStatus} /></div>
        </Card>
        <Card title="Pricing & Fit page" status={c.pricingPageStatus}>
          <PageLink href={`${base}/pricing`}>View live page</PageLink>
          <div className="mt-2"><StatusSelect slug={c.slug} field="pricingPageStatus" value={c.pricingPageStatus} /></div>
        </Card>
        <Card title="FAQ page" status={c.faq.status}>
          <PageLink href={`${base}/faq`}>View live page</PageLink>
          <p className="text-xs text-gray-500 mt-2">{c.faq.items.length} questions</p>
        </Card>
        <Card title="Schema status" status={c.aiLearnPageGates.schemaValidated ? "approved" : "draft"}>
          <p className="text-sm text-gray-300">Organization · LocalBusiness · ProfessionalService · FAQPage · Breadcrumb · Service · Article{c.reviews.length ? " · Review" : ""}</p>
        </Card>
      </div>

      <Section title="Problem-space pages">
        <ul className="space-y-2">
          {c.problemSpaceTopics.map((t) => (
            <li key={t.slug} className="bg-[#111827] border border-gray-800 rounded p-3 flex justify-between items-center">
              <div>
                <p className="text-white">{t.title}</p>
                <p className="text-xs text-gray-500">{t.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={t.status} />
                <PageLink href={`${base}/problems/${t.slug}`}>View</PageLink>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Comparison pages">
        <ul className="space-y-2">
          {c.comparisonPages.map((cp) => (
            <li key={cp.slug} className="bg-[#111827] border border-gray-800 rounded p-3 flex justify-between items-center">
              <div>
                <p className="text-white">{c.companyName} vs {cp.competitorName}</p>
                <p className="text-xs text-gray-500">{cp.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={cp.status} />
                <PageLink href={`${base}/compare/${cp.slug}`}>View</PageLink>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="AI prompt visibility tracker">
        <div className="overflow-x-auto">
          <table className="w-full text-left border border-gray-800 text-sm">
            <thead className="bg-[#111827]">
              <tr>
                <th className="p-2 border-b border-gray-800">Prompt</th>
                <th className="p-2 border-b border-gray-800">Category</th>
                <th className="p-2 border-b border-gray-800">Mentioned</th>
                <th className="p-2 border-b border-gray-800">Status</th>
                <th className="p-2 border-b border-gray-800">Next action</th>
              </tr>
            </thead>
            <tbody>
              {c.promptTracker.map((r) => (
                <tr key={r.id} className="border-b border-gray-800">
                  <td className="p-2 text-gray-200">{r.promptText}</td>
                  <td className="p-2 text-gray-400">{r.category}</td>
                  <td className="p-2 text-gray-300">{r.clientMentioned ? "yes" : "—"}</td>
                  <td className="p-2"><StatusPill status={r.status} /></td>
                  <td className="p-2 text-gray-400">{r.nextAction || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="External authority checklist">
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {c.authorityChecklist.map((a) => (
            <li key={a.channel} className="bg-[#111827] border border-gray-800 rounded p-3 flex justify-between items-center">
              <div>
                <p className="text-white">{a.label}</p>
                <p className="text-xs text-gray-500">{a.channel}</p>
              </div>
              <StatusPill status={a.status} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Review gates (AI Learn page)">
        <GateToggles slug={c.slug} field="aiLearnPageGates" gates={c.aiLearnPageGates} />
      </Section>

      <Section title="Review gates (Pricing page)">
        <GateToggles slug={c.slug} field="pricingPageGates" gates={c.pricingPageGates} />
      </Section>
    </div>
  );
}

function Card({ title, status, children }: { title: string; status: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded p-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-white font-semibold">{title}</h2>
        <StatusPill status={status} />
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
      {children}
    </section>
  );
}

function PageLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="text-blue-400 underline text-sm" href={href} target="_blank">{children}</Link>;
}

function StatusPill({ status }: { status: string }) {
  const color: Record<string, string> = {
    draft: "bg-gray-700 text-gray-200",
    in_review: "bg-yellow-700 text-yellow-100",
    needs_revision: "bg-red-700 text-red-100",
    approved: "bg-emerald-700 text-emerald-100",
    published: "bg-blue-700 text-blue-100",
    open: "bg-gray-700 text-gray-200",
    in_progress: "bg-yellow-700 text-yellow-100",
    fixed: "bg-emerald-700 text-emerald-100",
    wontfix: "bg-gray-600 text-gray-200",
    not_started: "bg-gray-700 text-gray-200",
    claimed: "bg-blue-700 text-blue-100",
    verified: "bg-emerald-700 text-emerald-100",
    skipped: "bg-gray-600 text-gray-200",
  };
  return <span className={`inline-block text-xs px-2 py-1 rounded ${color[status] || "bg-gray-700 text-gray-200"}`}>{status}</span>;
}

