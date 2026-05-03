"use client";

/**
 * Navbar Component - Main site navigation
 * 
 * PRIORITY 3 IMPLEMENTATION:
 * - Standardized navigation elements using nav-link classes
 * - Brand color application throughout interactive states
 * - Systematic spacing using design system scale
 * - Consistent button treatments for CTAs
 * - Progressive disclosure for mobile menu
 * - Touch target compliance on mobile
 */

import { useState } from "react";
import Link from "next/link";

const industryLinks = [
  { name: "Contractors & Remodelers", href: "/industries/contractors" },
  { name: "Property Managers", href: "/industries/property-management" },
  { name: "HVAC / Plumbing / Electrical", href: "/industries/trades" },
  { name: "Smart Home & AV", href: "/industries/smart-home" },
  { name: "IT / MSP Support", href: "/industries/it-msp" },
  { name: "All Industries →", href: "/industries" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);

  return (
    <nav className="border-b sticky top-0 z-50 bg-hierarchy-1 border-hierarchy-1">
      <div className="max-w-6xl mx-auto" style={{ padding: '0 var(--space-4)' }}>
        <div className="flex items-center justify-between" style={{ height: '64px' }}>
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-bold text-white hover:text-blue-400 transition-colors"
          >
            OttoServ
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors text-sm">
              Home
            </Link>
            <Link href="/services" className="text-gray-300 hover:text-white transition-colors text-sm">
              Services
            </Link>

            {/* Industries Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIndustriesOpen(true)}
              onMouseLeave={() => setIndustriesOpen(false)}
            >
              <Link
                href="/industries"
                className="text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-1"
              >
                Industries
                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              {industriesOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-[#111827] border border-gray-700 rounded-lg shadow-xl py-2">
                  {industryLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#1f2937] transition-colors"
                      onClick={() => setIndustriesOpen(false)}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/how-it-works" className="text-gray-300 hover:text-white transition-colors text-sm">
              How It Works
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors text-sm">
              About
            </Link>
            <Link href="/contact" className="nav-link text-sm">
              Contact
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="tel:+14077988172"
              className="text-gray-300 hover:text-blue-400 transition-colors text-sm font-medium"
            >
              (407) 798-8172
            </a>
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              OttoServ OS
            </Link>
            <Link
              href="/contact"
              className="btn btn-primary text-sm"
            >
              Book a Call
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden text-gray-300 hover:text-white focus:outline-none"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800 flex flex-col gap-3">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors text-sm py-1" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <Link href="/services" className="text-gray-300 hover:text-white transition-colors text-sm py-1" onClick={() => setMenuOpen(false)}>
              Services
            </Link>
            <Link href="/industries" className="text-gray-300 hover:text-white transition-colors text-sm py-1 font-medium" onClick={() => setMenuOpen(false)}>
              Industries
            </Link>
            <div className="pl-4 flex flex-col gap-2">
              {industryLinks.slice(0, -1).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-400 hover:text-white transition-colors text-xs py-0.5"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <Link href="/how-it-works" className="text-gray-300 hover:text-white transition-colors text-sm py-1" onClick={() => setMenuOpen(false)}>
              How It Works
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors text-sm py-1" onClick={() => setMenuOpen(false)}>
              About
            </Link>
            <Link href="/contact" className="text-gray-300 hover:text-white transition-colors text-sm py-1" onClick={() => setMenuOpen(false)}>
              Contact
            </Link>
            <a
              href="tel:+14077988172"
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm py-1 font-medium"
              onClick={() => setMenuOpen(false)}
            >
              (407) 798-8172
            </a>
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm py-1" onClick={() => setMenuOpen(false)}>
              OttoServ OS
            </Link>
            <Link
              href="/contact"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md transition-colors font-medium text-center mt-2"
              onClick={() => setMenuOpen(false)}
            >
              Book a Call
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
