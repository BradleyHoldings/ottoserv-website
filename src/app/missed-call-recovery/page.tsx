import SeoLandingPage from "@/components/content/SeoLandingPage";
import { getSeoPage, metadataForPage } from "@/lib/seoContent";

const page = getSeoPage("/missed-call-recovery");

export const metadata = metadataForPage(page!);

export default function MissedCallRecoveryPage() {
  return <SeoLandingPage page={page!} />;
}
