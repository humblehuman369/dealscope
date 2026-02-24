'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthModal } from '@/hooks/useAuthModal';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';
import { DemoCard } from './DemoCard';
import { FunnelSection } from './FunnelSection';
import { FounderSection } from './FounderSection';
import { ValuationControls } from './ValuationControls';
import { StrategyGrid } from './StrategyGrid';
import { ToolkitGrid } from './ToolkitGrid';
import { SocialProof } from './SocialProof';
import { CtaSection } from './CtaSection';
import './dealgapiq-homepage.css';

interface DealGapIQHomepageProps {
  onPointAndScan?: () => void;
}

function AuthParamHandler() {
  const { openAuthModal } = useAuthModal();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login' || authParam === 'required') {
      openAuthModal('login');
    } else if (authParam === 'register') {
      openAuthModal('register');
    }
  }, [searchParams, openAuthModal]);

  return null;
}

export function DealGapIQHomepage({ onPointAndScan }: DealGapIQHomepageProps) {
  const router = useRouter();
  const [address, setAddress] = useState('');

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    router.push(`/analyzing?address=${encodeURIComponent(address.trim())}`);
  };

  return (
    <div className="iq-landing">
      <Suspense fallback={null}>
        <AuthParamHandler />
      </Suspense>

      <LandingNav />

      {/* HERO */}
      <header className="hero">
        <div className="label anim" style={{ fontSize: '.7rem', marginBottom: '1.75rem', display: 'inline-block' }}>
          Real Analytics for Real Estate Investors
        </div>
        <h1 className="anim d1">
          Is That Property a Good Deal?<br />Find Out in 60 Seconds.
        </h1>
        <p className="hero-desc anim d2">
          Enter any address. <strong>DealGap<span className="brand-iq">IQ</span></strong> calculates three numbers that define every deal: the price where cash flow breaks even, the price that hits your target return, and the gap between what they&apos;re asking and what actually works.
        </p>
        <form className="hero-search anim d3" onSubmit={handleAnalyze}>
          <input
            className="hero-input"
            type="text"
            placeholder="Enter any address..."
            name="address"
            autoComplete="street-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button className="hero-btn" type="submit">Analyze</button>
        </form>
        <div className="hero-meta anim d3">6 strategies &middot; No credit card required</div>
        <div className="hero-stats anim d4">
          <div className="card-sm hero-stat">
            <div className="hero-stat-num">3</div>
            <div className="hero-stat-label">Price Signals</div>
            <div className="hero-stat-sub">Income Value &middot; Target Buy &middot; Deal Gap</div>
          </div>
          <div className="card-sm hero-stat">
            <div className="hero-stat-num">6</div>
            <div className="hero-stat-label">Strategy Models</div>
            <div className="hero-stat-sub">Rental &middot; STR &middot; BRRRR &middot; Flip &middot; Hack &middot; Wholesale</div>
          </div>
          <div className="card-sm hero-stat">
            <div className="hero-stat-num">35+</div>
            <div className="hero-stat-label">Years of RE Data</div>
            <div className="hero-stat-sub">Built by the founder of Foreclosure.com</div>
          </div>
        </div>
      </header>

      <div className="dw"><div className="div-c"></div></div>

      {/* THESIS */}
      <section className="sec thesis">
        <div className="sec-title">
          Most Investors Search for Deals.<br />
          <strong>DealGap<span className="brand-iq">IQ</span></strong> Calculates Them.
        </div>
        <p>Most investors search the same listings, use the same filters, and chase the same narrow pool of &ldquo;deals&rdquo; &mdash; competing on speed instead of strategy. That race is over.</p>
        <p><strong>DealGap<span className="brand-iq">IQ</span></strong> takes a fundamentally different approach. Instead of filtering for properties that <em>look</em> like deals, we analyze every property to find the ones that actually <em>are</em> deals &mdash; by calculating the exact price that delivers your target return.</p>
        <p>We call that distance between the asking price and your ideal buy price the <strong>Deal Gap.</strong> It&apos;s the one metric that tells you whether a deal is worth pursuing &mdash; and no other platform calculates it.</p>
      </section>

      <div className="dw"><div className="div-e"></div></div>

      {/* DEMO CARD */}
      <section className="sec">
        <div style={{ textAlign: 'center', marginBottom: '.75rem' }}>
          <div className="label">See It In Action</div>
        </div>
        <div className="sec-title" style={{ textAlign: 'center', marginBottom: '.75rem' }}>
          &ldquo;Is This a Good Deal?&rdquo; Answered in Three Numbers.
        </div>
        <div className="sec-sub" style={{ textAlign: 'center', margin: '0 auto 3rem', maxWidth: '600px' }}>
          Income Value shows where you break even. Target Buy shows where you profit. Deal Gap shows how far you need to negotiate.
        </div>
        <DemoCard />
      </section>

      <div className="dw"><div className="div-b"></div></div>

      {/* FUNNEL */}
      <FunnelSection />

      <div className="dw"><div className="div-c"></div></div>

      {/* FOUNDER */}
      <FounderSection />

      <div className="dw"><div className="div-b"></div></div>

      {/* VALUATION CONTROLS */}
      <ValuationControls />

      <div className="dw"><div className="div-e"></div></div>

      {/* 6 STRATEGIES */}
      <StrategyGrid />

      <div className="dw"><div className="div-b"></div></div>

      {/* TOOLKIT */}
      <ToolkitGrid />

      <div className="dw"><div className="div-c"></div></div>

      {/* SOCIAL PROOF */}
      <SocialProof />

      <div className="dw"><div className="div-b"></div></div>

      {/* BOTTOM CTA */}
      <CtaSection />

      {/* FOOTER */}
      <LandingFooter />
    </div>
  );
}

export default DealGapIQHomepage;
