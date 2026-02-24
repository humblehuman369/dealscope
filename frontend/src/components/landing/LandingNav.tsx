'use client';

import { useState } from 'react';
import Link from 'next/link';

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="iq-nav">
      <Link href="/" className="nav-logo">
        DealGap<span>IQ</span>
      </Link>
      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <Link href="/about" onClick={() => setMenuOpen(false)}>What is it?</Link>
        <Link href="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
        <Link href="/login" onClick={() => setMenuOpen(false)}>Login</Link>
        <Link href="/register" className="nav-cta" onClick={() => setMenuOpen(false)}>
          Start Free
        </Link>
      </div>
      <button
        className="nav-hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        <span className={`nav-hamburger-bar ${menuOpen ? 'open' : ''}`} />
        <span className={`nav-hamburger-bar ${menuOpen ? 'open' : ''}`} />
        <span className={`nav-hamburger-bar ${menuOpen ? 'open' : ''}`} />
      </button>
    </nav>
  );
}
