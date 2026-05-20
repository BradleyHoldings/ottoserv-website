import SeoLandingPage from "@/components/content/SeoLandingPage";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { getSeoPage, metadataForPage } from "@/lib/seoContent";

const page = getSeoPage("/pricing");

export const metadata = metadataForPage(page!);

export default function PricingPage() {
  return (
    <>
      <SeoLandingPage page={page!} />
      <LeadCaptureForm
        sourcePage="/pricing"
        intent="pricing"
        title="Get pricing for your call volume"
        buttonLabel="Request Pricing"
      />
    </>
  );
}
