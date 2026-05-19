import { NextResponse } from "next/server";
import { loadClientWithDefaults } from "@/lib/visibility-kit/load";
import {
  renderAILearnMarkdown,
  renderComparisonMarkdown,
  renderFAQMarkdown,
  renderPricingMarkdown,
  renderProblemMarkdown,
} from "@/lib/visibility-kit/generators/markdown";
import {
  articleSchema,
  breadcrumbSchema,
  faqPageSchema,
  localBusinessSchema,
  organizationSchema,
  professionalServiceSchema,
  reviewSchema,
  serviceSchema,
  stripUndefined,
} from "@/lib/visibility-kit/generators/schema";

export const dynamic = "force-dynamic";

// Returns a portable bundle a client can publish on their own domain:
//   - markdown per page
//   - JSON-LD schemas per page
//   - a manifest with suggested file paths
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await loadClientWithDefaults(slug);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  const review = reviewSchema(c);

  const pages: Array<{
    path: string;
    markdown: string;
    jsonLd: unknown[];
  }> = [];

  // AI Learn About Us
  pages.push({
    path: "ai-learn-about-us.md",
    markdown: renderAILearnMarkdown(c),
    jsonLd: [
      stripUndefined(organizationSchema(c)),
      stripUndefined(localBusinessSchema(c)),
      stripUndefined(professionalServiceSchema(c)),
      faqPageSchema(c.faq.items),
      breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: c.companyName, url: "/ai-learn-about-us" },
      ]),
      review ? stripUndefined(review) : null,
    ].filter(Boolean),
  });

  // FAQ
  pages.push({
    path: "faq.md",
    markdown: renderFAQMarkdown(c),
    jsonLd: [faqPageSchema(c.faq.items)],
  });

  // Pricing
  pages.push({
    path: "pricing.md",
    markdown: renderPricingMarkdown(c),
    jsonLd: [
      breadcrumbSchema([
        { name: c.companyName, url: "/ai-learn-about-us" },
        { name: "Pricing", url: "/pricing" },
      ]),
    ],
  });

  // Problem-space
  for (const t of c.problemSpaceTopics) {
    pages.push({
      path: `problems/${t.slug}.md`,
      markdown: renderProblemMarkdown(c, t),
      jsonLd: [
        stripUndefined(serviceSchema(c, t)),
        t.faqs?.length ? faqPageSchema(t.faqs) : null,
      ].filter(Boolean) as unknown[],
    });
  }

  // Comparisons
  for (const cp of c.comparisonPages) {
    pages.push({
      path: `compare/${cp.slug}.md`,
      markdown: renderComparisonMarkdown(c, cp),
      jsonLd: [
        stripUndefined(articleSchema(c, cp)),
        cp.faqs?.length ? faqPageSchema(cp.faqs) : null,
      ].filter(Boolean) as unknown[],
    });
  }

  return NextResponse.json({
    slug: c.slug,
    companyName: c.companyName,
    generatedAt: new Date().toISOString(),
    pageCount: pages.length,
    pages,
  });
}
