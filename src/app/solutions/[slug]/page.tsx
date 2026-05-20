import { notFound } from "next/navigation";
import SeoLandingPage from "@/components/content/SeoLandingPage";
import { allPublishedSeoPages, metadataForPage } from "@/lib/seoContent";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return allPublishedSeoPages
    .filter((page) => page.path.startsWith("/solutions/"))
    .map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = allPublishedSeoPages.find((item) => item.path === `/solutions/${slug}`);
  if (!page) return {};
  return metadataForPage(page);
}

export default async function SolutionSeoPage({ params }: Props) {
  const { slug } = await params;
  const page = allPublishedSeoPages.find((item) => item.path === `/solutions/${slug}`);
  if (!page) notFound();
  return <SeoLandingPage page={page} />;
}
