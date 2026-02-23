'use client';

import Link from 'next/link';

export function LandingNav() {
  return (
    <nav className="iq-nav">
      <Link href="/" className="nav-logo">
        DealGap<span>IQ</span>
      </Link>
      <div className="nav-links">
        <Link href="/about">What is it?</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/login">Login</Link>
        <Link href="/register" className="nav-cta">
          Start Free
        </Link>
      </div>
    </nav>
  );
}
