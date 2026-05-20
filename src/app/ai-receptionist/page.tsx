import SeoLandingPage from "@/components/content/SeoLandingPage";
import { getSeoPage, metadataForPage } from "@/lib/seoContent";

const page = getSeoPage("/ai-receptionist");

export const metadata = metadataForPage(page!);

export default function AiReceptionistPage() {
  return <SeoLandingPage page={page!} />;
}
