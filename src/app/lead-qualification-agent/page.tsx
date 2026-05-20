import SeoLandingPage from "@/components/content/SeoLandingPage";
import { getSeoPage, metadataForPage } from "@/lib/seoContent";

const page = getSeoPage("/lead-qualification-agent");

export const metadata = metadataForPage(page!);

export default function LeadQualificationAgentPage() {
  return <SeoLandingPage page={page!} />;
}
