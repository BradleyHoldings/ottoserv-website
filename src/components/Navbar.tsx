"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-[#0a0a0a] border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
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
            <Link href="/how-it-works" className="text-gray-300 hover:text-white transition-colors text-sm">
              How It Works
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors text-sm">
              About
            </Link>
            <Link href="/blog" className="text-gray-300 hover:text-white transition-colors text-sm">
              Blog
            </Link>
            <Link href="/contact" className="text-gray-300 hover:text-white transition-colors text-sm">
              Contact
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Client Login
            </Link>
            <Link
              href="/contact"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md transition-colors font-medium"
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
            <Link href="/how-it-works" className="text-gray-300 hover:text-white transition-colors text-sm py-1" onClick={() => setMenuOpen(false)}>
              How It Works
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors text-sm py-1" onClick={() => setMenuOpen(false)}>
              About
            </Link>
            <Link href="/blog" className="text-gray-300 hover:text-white transition-colors text-sm py-1" onClick={() => setMenuOpen(false)}>
              Blog
            </Link>
            <Link href="/contact" className="text-gray-300 hover:text-white transition-colors text-sm py-1" onClick={() => setMenuOpen(false)}>
              Contact
            </Link>
            <Link href="/login" className="text-gray-400 hover:text-white transition-colors text-sm py-1" onClick={() => setMenuOpen(false)}>
              Client Login
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
