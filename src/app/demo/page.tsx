import Link from "next/link";
import SeoLandingPage from "@/components/content/SeoLandingPage";
import { getSeoPage, metadataForPage } from "@/lib/seoContent";

const page = getSeoPage("/demo");

export const metadata = metadataForPage(page!);

export default function DemoPage() {
  return (
    <>
      <SeoLandingPage page={page!} />
      <section className="bg-[#0a0a0a] px-4 pb-16">
        <div className="max-w-4xl mx-auto bg-[#111827] border border-gray-800 rounded-xl p-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Want the sandbox instead?
          </h2>
          <p className="text-gray-400 mb-6">
            The sales demo is the main conversion path. If you want to explore the existing sample dashboard, you can still launch the sandbox demo.
          </p>
          <Link
            href="/demo/dashboard"
            className="inline-block border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold px-6 py-3 rounded-md text-sm transition-colors"
          >
            Open the sandbox dashboard
          </Link>
        </div>
      </section>
    </>
  );
}
