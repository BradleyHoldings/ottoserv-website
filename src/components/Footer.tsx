import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-gray-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold text-white mb-3">OttoServ</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Business operations and automation consulting for small and medium businesses.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">Home</Link></li>
              <li><Link href="/services" className="text-gray-400 hover:text-white transition-colors text-sm">Services</Link></li>
              <li><Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors text-sm">How It Works</Link></li>
              <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors text-sm">About</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors text-sm">Contact</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors text-sm">Blog</Link></li>
              <li><Link href="/login" className="text-gray-400 hover:text-white transition-colors text-sm">Client Login</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact</h4>
            <a
              href="mailto:jonathan@ottoservco.com"
              className="text-gray-400 hover:text-white transition-colors text-sm block"
            >
              jonathan@ottoservco.com
            </a>
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
