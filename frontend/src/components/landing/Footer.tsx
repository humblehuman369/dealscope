'use client';

import React from 'react';
import Link from 'next/link';

const footerLinks = {
  product: [
    { label: 'Features', href: '#priceiq' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Strategies', href: '#strategies' },
    { label: 'Pricing', href: '#' },
  ],
  company: [
    { label: 'About DealGapIQ', href: '#founder' },
    { label: 'Blog', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  support: [
    { label: 'Help Center', href: '#' },
    { label: 'Documentation', href: '#' },
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
              <span className="logo-text font-display">
                DealMaker<span className="iq">IQ</span>
              </span>
              <span className="logo-subtext">by DealGapIQ</span>
            </Link>
            <p className="footer-tagline">
              Know exactly what to offer in 60 seconds. Price<span className="iq">IQ</span> gives you the three numbers that define every deal.
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
          <div>© 2026 DealGapIQ. All rights reserved.</div>
          <div className="footer-legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
