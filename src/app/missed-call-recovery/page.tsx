import SeoLandingPage from "@/components/content/SeoLandingPage";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { getSeoPage, metadataForPage } from "@/lib/seoContent";

const page = getSeoPage("/missed-call-recovery");

export const metadata = metadataForPage(page!);

export default function MissedCallRecoveryPage() {
  return (
    <>
      <SeoLandingPage page={page!} />
      <LeadCaptureForm
        sourcePage="/missed-call-recovery"
        intent="missed_call_recovery"
        title="Find out what missed calls are costing you"
        buttonLabel="Request Missed-Call Review"
      />
    </>
  );
}
