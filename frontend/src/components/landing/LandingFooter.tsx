'use client';

import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="iq-footer">
      <div className="footer-grid">
        <div>
          <div className="footer-brand">
            DealGap<span>IQ</span>
          </div>
          <p className="footer-tagline">
            Professional real estate intelligence for every investor.
          </p>
        </div>
        <div>
          <div className="footer-col-title">Product</div>
          <div className="footer-links">
            <a href="#strategies">Strategies</a>
            <a href="#toolkit">Toolkit</a>
            <Link href="/pricing">Pricing</Link>
          </div>
        </div>
        <div>
          <div className="footer-col-title">Legal</div>
          <div className="footer-links">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
        <div>
          <div className="footer-col-title">Support</div>
          <div className="footer-links">
            <Link href="/help">Help Center</Link>
            <a href="mailto:support@dealgapiq.com">support@dealgapiq.com</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>
          &copy; 2026{' '}
          <strong>
            DealGap<span className="brand-iq">IQ</span>
          </strong>
          . All rights reserved. Professional use only. Not a lender.
        </p>
      </div>
    </footer>
  );
}
