import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-gray-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold text-white mb-3">OttoServ</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              AI-powered operating system for service businesses. Capture every lead, automate
              operations, and grow without adding headcount.
            </p>
            <a
              href="tel:+14077988172"
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
            >
              (407) 798-8172
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">Home</Link></li>
              <li><Link href="/services" className="text-gray-400 hover:text-white transition-colors text-sm">Services</Link></li>
              <li><Link href="/industries" className="text-gray-400 hover:text-white transition-colors text-sm">Industries</Link></li>
              <li><Link href="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</Link></li>
              <li><Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors text-sm">How It Works</Link></li>
              <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors text-sm">About</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors text-sm">Contact</Link></li>
              <li><Link href="/techops" className="text-gray-400 hover:text-white transition-colors text-sm">TechOps</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors text-sm">Blog</Link></li>
              <li><Link href="/platform/login" className="text-gray-400 hover:text-white transition-colors text-sm">Client Login</Link></li>
            </ul>
          </div>

          {/* Industries */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Industries</h4>
            <ul className="space-y-2">
              <li><Link href="/industries/contractors" className="text-gray-400 hover:text-white transition-colors text-sm">Contractors & Remodelers</Link></li>
              <li><Link href="/industries/property-management" className="text-gray-400 hover:text-white transition-colors text-sm">Property Managers</Link></li>
              <li><Link href="/industries/trades" className="text-gray-400 hover:text-white transition-colors text-sm">HVAC / Plumbing / Electrical</Link></li>
              <li><Link href="/industries/smart-home" className="text-gray-400 hover:text-white transition-colors text-sm">Smart Home & AV</Link></li>
              <li><Link href="/industries/it-msp" className="text-gray-400 hover:text-white transition-colors text-sm">IT / MSP Support</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact</h4>
            <div className="space-y-3">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Phone</p>
                <a
                  href="tel:+14077988172"
                  className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
                >
                  (407) 798-8172
                </a>
                <p className="text-gray-500 text-xs mt-1">Morgan answers immediately, 24/7</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Email</p>
                <a
                  href="mailto:jonathan@ottoservco.com"
                  className="text-gray-400 hover:text-white transition-colors text-sm block"
                >
                  jonathan@ottoservco.com
                </a>
              </div>
              <div className="pt-2">
                <Link
                  href="/contact"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  Book a Discovery Call
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-gray-500 text-sm">© 2026 OttoServ. All rights reserved.</p>
          <Link href="/privacy" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
