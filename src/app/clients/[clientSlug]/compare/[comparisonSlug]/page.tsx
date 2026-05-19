import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadClientWithDefaults } from "@/lib/visibility-kit/load";
import JsonLd from "@/lib/visibility-kit/JsonLd";
import {
  articleSchema,
  breadcrumbSchema,
  faqPageSchema,
  stripUndefined,
} from "@/lib/visibility-kit/generators/schema";

type Params = { clientSlug: string; comparisonSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { clientSlug, comparisonSlug } = await params;
  const c = await loadClientWithDefaults(clientSlug);
  const cp = c?.comparisonPages.find((p) => p.slug === comparisonSlug);
  if (!c || !cp) return { title: "Comparison not found" };
  return {
    title: `${c.companyName} vs ${cp.competitorName}`,
    description: cp.oneLineAnswer,
    alternates: { canonical: `/clients/${c.slug}/compare/${cp.slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function ComparisonPageRoute({ params }: { params: Promise<Params> }) {
  const { clientSlug, comparisonSlug } = await params;
  const c = await loadClientWithDefaults(clientSlug);
  if (!c) notFound();
  const cp = c.comparisonPages.find((p) => p.slug === comparisonSlug);
  if (!cp) notFound();
  const base = `/clients/${c.slug}`;

  return (
    <div style={{ backgroundColor: "var(--otto-gray-900)" }} className="text-gray-200">
      <JsonLd data={stripUndefined(articleSchema(c, cp))} />
      {cp.faqs?.length ? <JsonLd data={faqPageSchema(cp.faqs)} /> : null}
      <JsonLd
        data={breadcrumbSchema([
          { name: c.companyName, url: `${base}/ai-learn-about-us` },
          { name: "Compare", url: base },
          { name: `${c.companyName} vs ${cp.competitorName}`, url: `${base}/compare/${cp.slug}` },
        ])}
      />

      <article className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {c.companyName} vs {cp.competitorName}
        </h1>
        <p className="text-blue-200 text-lg mb-6">{cp.oneLineAnswer}</p>
        <p className="text-gray-300 mb-8">{cp.factualNotes}</p>

        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left text-gray-300 border border-gray-800">
            <thead className="bg-[#111827] text-white">
              <tr>
                <th className="p-3 border-b border-gray-800">Factor</th>
                <th className="p-3 border-b border-gray-800">{c.companyName}</th>
                <th className="p-3 border-b border-gray-800">{cp.competitorName}</th>
              </tr>
            </thead>
            <tbody>
              {cp.table.map((row) => (
                <tr key={row.column} className="border-b border-gray-800">
                  <td className="p-3">{row.column}</td>
                  <td className="p-3">{row.client}</td>
                  <td className="p-3">{row.alternative}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mb-8">
          <h2 className="text-white text-xl font-semibold mb-3">When {c.companyName} is the better choice</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            {cp.whenClientIsBetter.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-white text-xl font-semibold mb-3">When {cp.competitorName} may be the better choice</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            {cp.whenAlternativeIsBetter.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </section>

        {cp.faqs?.length ? (
          <section className="mb-8">
            <h2 className="text-white text-xl font-semibold mb-3">FAQ</h2>
            <ul className="space-y-3 text-gray-300">
              {cp.faqs.map((f, i) => (
                <li key={i}>
                  <p className="text-white font-semibold">{f.q}</p>
                  <p>{f.a}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-sm text-gray-500">
          <Link href={`${base}/ai-learn-about-us`} className="underline">Back to {c.companyName} overview</Link>
        </p>
      </article>
    </div>
  );
}
