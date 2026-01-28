'use client';

import React from 'react';
import Link from 'next/link';

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Strategies', href: '#strategies' },
    { label: 'DealMakerIQ', href: '#dealmaker' },
  ],
  company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  support: [
    { label: 'Help Center', href: '#' },
    { label: 'Documentation', href: '#' },
    { label: 'Status', href: '#' },
  ],
};

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <Link href="/" className="logo">
              Invest<span>IQ</span>
            </Link>
            <p className="footer-tagline">
              The fastest path from address to investable decision. Analyze any property in 60 seconds.
            </p>
          </div>

          {/* Product Links */}
          <div className="footer-links">
            <h4>Product</h4>
            <ul>
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="footer-links">
            <h4>Company</h4>
            <ul>
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div className="footer-links">
            <h4>Support</h4>
            <ul>
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© 2026 InvestIQ. All rights reserved.</div>
          <div className="footer-legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
