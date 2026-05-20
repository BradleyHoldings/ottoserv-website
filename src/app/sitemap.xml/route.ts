import { listClients } from "@/lib/visibility-kit/store";
import { allPublishedSeoPages } from "@/lib/seoContent";

export const dynamic = "force-dynamic";

const SITE = "https://ottoserv.com";

type Entry = { path: string; changefreq: string; priority: string };

const STATIC_ENTRIES: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/front-desk-ai", changefreq: "weekly", priority: "0.98" },
  { path: "/ai-learn-about-ottoserv", changefreq: "weekly", priority: "0.95" },
  { path: "/ai-receptionist-property-management", changefreq: "weekly", priority: "0.9" },
  { path: "/missed-call-recovery-service-businesses", changefreq: "weekly", priority: "0.9" },
  { path: "/ai-lead-qualification-contractors", changefreq: "weekly", priority: "0.9" },
  { path: "/ai-appointment-booking-home-services", changefreq: "weekly", priority: "0.9" },
  { path: "/front-office-leak-check", changefreq: "monthly", priority: "0.85" },
  { path: "/process-audit", changefreq: "weekly", priority: "0.85" },
  { path: "/demo", changefreq: "weekly", priority: "0.85" },
  { path: "/faq", changefreq: "weekly", priority: "0.85" },
  { path: "/pricing", changefreq: "weekly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.8" },
  { path: "/jarvis-voice", changefreq: "monthly", priority: "0.7" },
  { path: "/techops", changefreq: "monthly", priority: "0.7" },
  { path: "/newsletter", changefreq: "monthly", priority: "0.6" },
  { path: "/services", changefreq: "weekly", priority: "0.85" },
  { path: "/services/admin-automation", changefreq: "monthly", priority: "0.75" },
  { path: "/services/lead-automation", changefreq: "monthly", priority: "0.75" },
  { path: "/services/system-integration", changefreq: "monthly", priority: "0.75" },
  { path: "/services/workflow-mapping", changefreq: "monthly", priority: "0.75" },
  { path: "/services/ottoserv-vs-servicetitan", changefreq: "monthly", priority: "0.8" },
  { path: "/industries", changefreq: "monthly", priority: "0.7" },
  { path: "/industries/contractors", changefreq: "monthly", priority: "0.8" },
  { path: "/industries/property-management", changefreq: "monthly", priority: "0.8" },
  { path: "/industries/trades", changefreq: "monthly", priority: "0.75" },
  { path: "/industries/smart-home", changefreq: "monthly", priority: "0.75" },
  { path: "/industries/it-msp", changefreq: "monthly", priority: "0.75" },
  { path: "/blog", changefreq: "weekly", priority: "0.6" },
  { path: "/blog/5-signs-your-business-has-outgrown-its-systems", changefreq: "monthly", priority: "0.55" },
  { path: "/blog/why-most-small-business-automation-fails", changefreq: "monthly", priority: "0.55" },
  { path: "/blog/the-hidden-cost-of-manual-processes", changefreq: "monthly", priority: "0.55" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

const SEO_ENTRIES: Entry[] = allPublishedSeoPages.map((page) => ({
  path: page.path,
  changefreq: page.kind === "resource" ? "monthly" : "weekly",
  priority:
    page.path === "/ai-receptionist" ||
    page.path === "/lead-qualification-agent" ||
    page.path === "/pricing" ||
    page.path === "/demo"
      ? "0.95"
      : "0.85",
}));

function renderEntry(e: Entry, lastmod: string): string {
  return `  <url>\n    <loc>${SITE}${e.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`;
}

export async function GET() {
  const lastmod = new Date().toISOString();
  const mergedEntries = [...STATIC_ENTRIES, ...SEO_ENTRIES].filter(
    (entry, index, arr) => arr.findIndex((candidate) => candidate.path === entry.path) === index
  );
  const entries: string[] = mergedEntries.map((e) => renderEntry(e, lastmod));

  // Visibility-kit clients whose AI Learn page is published. Drafts stay out of sitemaps
  // so AI search engines only see content the kit's review workflow approved.
  try {
    const clients = await listClients();
    for (const c of clients) {
      if (c.aiLearnPageStatus !== "published") continue;
      entries.push(renderEntry({ path: `/clients/${c.slug}/ai-learn-about-us`, changefreq: "weekly", priority: "0.85" }, c.updatedAt || lastmod));
      entries.push(renderEntry({ path: `/clients/${c.slug}/faq`, changefreq: "weekly", priority: "0.7" }, c.updatedAt || lastmod));
      entries.push(renderEntry({ path: `/clients/${c.slug}/pricing`, changefreq: "weekly", priority: "0.7" }, c.updatedAt || lastmod));
      for (const t of c.problemSpaceTopics) {
        if (t.status !== "published") continue;
        entries.push(renderEntry({ path: `/clients/${c.slug}/problems/${t.slug}`, changefreq: "monthly", priority: "0.7" }, c.updatedAt || lastmod));
      }
      for (const cp of c.comparisonPages) {
        if (cp.status !== "published") continue;
        entries.push(renderEntry({ path: `/clients/${c.slug}/compare/${cp.slug}`, changefreq: "monthly", priority: "0.7" }, c.updatedAt || lastmod));
      }
    }
  } catch {
    // store may not be readable at build time; static entries still ship.
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;

  return new Response(sitemap, {
    headers: { "Content-Type": "application/xml" },
  });
}
