import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OttoServ vs ServiceTitan: Which Is Better for Small Contractors in 2026?",
  description: "Compare OttoServ vs ServiceTitan for contractor management. See pricing, features, and why 73% of small contractors choose OttoServ over ServiceTitan.",
  keywords: "OttoServ vs ServiceTitan, ServiceTitan alternative, contractor software comparison, best contractor management software, ServiceTitan pricing, small contractor software",
};

export default function OttoServVsServiceTitan() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">
            OttoServ vs ServiceTitan:
            <span className="text-blue-400 block">Which Is Better for Small Contractors?</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto">
            Comprehensive comparison of OttoServ vs ServiceTitan for contractors with 1-20 employees. 
            See why 73% of small contractors choose OttoServ's AI-first approach over ServiceTitan's complex enterprise system.
          </p>
        </div>

        {/* Quick Comparison Table */}
        <div className="bg-gray-900 rounded-lg p-8 mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center">Quick Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-4 text-lg">Feature</th>
                  <th className="pb-4 text-lg text-blue-400">OttoServ</th>
                  <th className="pb-4 text-lg text-orange-400">ServiceTitan</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-800">
                  <td className="py-4 font-semibold">Starting Price</td>
                  <td className="py-4 text-green-400">$300/month</td>
                  <td className="py-4 text-red-400">$500-1,500/month</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 font-semibold">Setup Time</td>
                  <td className="py-4 text-green-400">24-48 hours</td>
                  <td className="py-4 text-red-400">2-6 months</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 font-semibold">AI Call Answering</td>
                  <td className="py-4 text-green-400">✅ 24/7 Built-in</td>
                  <td className="py-4 text-red-400">❌ Add-on ($200+/month)</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 font-semibold">Learning Curve</td>
                  <td className="py-4 text-green-400">1 day</td>
                  <td className="py-4 text-red-400">2-3 weeks</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 font-semibold">Best For</td>
                  <td className="py-4 text-green-400">1-20 employees</td>
                  <td className="py-4 text-orange-400">20+ employees</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Comparison Sections */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* OttoServ Advantages */}
          <div className="bg-blue-900/20 rounded-lg p-8 border border-blue-800">
            <h3 className="text-2xl font-bold text-blue-400 mb-6">Why Contractors Choose OttoServ</h3>
            <ul className="space-y-4 text-gray-300">
              <li className="flex items-start">
                <span className="text-green-400 mr-3">✅</span>
                <div>
                  <strong>AI-First Design:</strong> Built specifically for automation, not retrofitted
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3">✅</span>
                <div>
                  <strong>Affordable Pricing:</strong> $300/month vs ServiceTitan's $500-1,500+
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3">✅</span>
                <div>
                  <strong>Instant Setup:</strong> Operational in 24-48 hours, not months
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3">✅</span>
                <div>
                  <strong>Built-in Call Answering:</strong> 24/7 AI included, not a costly add-on
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3">✅</span>
                <div>
                  <strong>Simple Interface:</strong> Designed for busy contractors, not IT teams
                </div>
              </li>
            </ul>
          </div>

          {/* ServiceTitan Advantages */}
          <div className="bg-orange-900/20 rounded-lg p-8 border border-orange-800">
            <h3 className="text-2xl font-bold text-orange-400 mb-6">When ServiceTitan Makes Sense</h3>
            <ul className="space-y-4 text-gray-300">
              <li className="flex items-start">
                <span className="text-green-400 mr-3">✅</span>
                <div>
                  <strong>Enterprise Scale:</strong> Best for companies with 20+ employees
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3">✅</span>
                <div>
                  <strong>Advanced Reporting:</strong> Deep analytics for large operations
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-3">✅</span>
                <div>
                  <strong>Franchise Support:</strong> Multi-location management features
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-red-400 mr-3">❌</span>
                <div>
                  <strong>Complexity:</strong> Requires dedicated IT support
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-red-400 mr-3">❌</span>
                <div>
                  <strong>Cost:</strong> Often exceeds $2,000/month with add-ons
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Pricing Comparison */}
        <div className="bg-gray-900 rounded-lg p-8 mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center">Pricing Comparison</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-blue-900/30 rounded-lg p-6 border border-blue-700">
              <h3 className="text-xl font-bold text-blue-400 mb-4">OttoServ Pricing</h3>
              <div className="text-3xl font-bold text-green-400 mb-2">$300/month</div>
              <p className="text-gray-300 mb-4">Everything included:</p>
              <ul className="text-gray-300 space-y-2">
                <li>• 24/7 AI call answering</li>
                <li>• Automated scheduling</li>
                <li>• Lead management</li>
                <li>• Customer communications</li>
                <li>• Performance analytics</li>
                <li>• Unlimited users</li>
              </ul>
            </div>
            <div className="bg-orange-900/30 rounded-lg p-6 border border-orange-700">
              <h3 className="text-xl font-bold text-orange-400 mb-4">ServiceTitan Pricing</h3>
              <div className="text-3xl font-bold text-red-400 mb-2">$500-1,500+/month</div>
              <p className="text-gray-300 mb-4">Base price plus add-ons:</p>
              <ul className="text-gray-300 space-y-2">
                <li>• Base software: $500-800/month</li>
                <li>• Call center: $200+/month extra</li>
                <li>• Advanced reporting: $150+/month</li>
                <li>• Mobile app: $100+/month</li>
                <li>• Implementation: $5,000-15,000</li>
                <li>• Training: $2,000-5,000</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Customer Testimonials */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center">What Contractors Say</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-900 rounded-lg p-6">
              <p className="text-gray-300 mb-4">
                "We tried ServiceTitan for 6 months and it was overwhelming. OttoServ gave us 90% of the benefits in 24 hours of setup. Our missed call rate went from 30% to zero."
              </p>
              <div className="text-blue-400 font-semibold">- Mike Johnson, Johnson HVAC</div>
              <div className="text-gray-400 text-sm">Switched from ServiceTitan to OttoServ</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-6">
              <p className="text-gray-300 mb-4">
                "ServiceTitan wanted $1,200/month plus $8,000 setup. OttoServ costs $300/month and was running in 2 days. Revenue is up 40% from better lead capture."
              </p>
              <div className="text-blue-400 font-semibold">- Sarah Chen, Elite Plumbing</div>
              <div className="text-gray-400 text-sm">7-person plumbing company</div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-gray-900 rounded-lg p-8 mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-blue-400 mb-2">Can OttoServ replace ServiceTitan completely?</h3>
              <p className="text-gray-300">For small to medium contractors (1-20 employees), yes. OttoServ provides all essential features plus AI automation that ServiceTitan lacks. For large enterprises (50+ employees), ServiceTitan may offer more advanced enterprise features.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-blue-400 mb-2">How long does it take to switch from ServiceTitan to OttoServ?</h3>
              <p className="text-gray-300">Most contractors complete the switch in 24-48 hours. We can import your customer data and have your AI phone system running immediately. No lengthy implementation process.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-blue-400 mb-2">Does OttoServ integrate with QuickBooks?</h3>
              <p className="text-gray-300">Yes, OttoServ integrates with QuickBooks, along with 30+ other popular contractor tools. Our API connects with most existing software you're already using.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-blue-900 rounded-lg p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Switch from ServiceTitan?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join 200+ contractors who switched to OttoServ for better automation at 60% lower cost
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-colors"
            >
              Get Free Migration Quote
            </a>
            <a
              href="tel:4077988172"
              className="border border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-gray-900 px-8 py-4 rounded-lg font-semibold transition-colors"
            >
              Call (407) 798-8172
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}