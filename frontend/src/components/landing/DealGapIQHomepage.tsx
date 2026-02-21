'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession, useLogout } from '@/hooks/useSession';
import { useAuthModal } from '@/hooks/useAuthModal';
import { Search, User, LogOut } from 'lucide-react';
import { DealGapIQGateway } from './DealGapIQGateway';
import { DealGapIQHeroSection } from './DealGapIQHeroSection';
import './dealgapiq-homepage.css';

interface DealGapIQHomepageProps {
  onPointAndScan?: () => void;
}

/** Handles ?auth=login / ?auth=register query params (must be in Suspense) */
function AuthParamHandler({ onOpenGateway }: { onOpenGateway?: () => void }) {
  const { openAuthModal } = useAuthModal();
  const searchParams = useSearchParams();

  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login' || authParam === 'required') {
      openAuthModal('login');
    } else if (authParam === 'register') {
      openAuthModal('register');
    }

    const actionParam = searchParams.get('action');
    if (actionParam === 'analyze' && onOpenGateway) {
      onOpenGateway();
    }
  }, [searchParams, openAuthModal, onOpenGateway]);

  return null;
}

export function DealGapIQHomepage({ onPointAndScan }: DealGapIQHomepageProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useSession();
  const logoutMutation = useLogout();
  const { openAuthModal } = useAuthModal();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<(HTMLDivElement | HTMLElement | null)[]>([]);
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [gatewayStep, setGatewayStep] = useState<'start' | 'address' | 'scan'>('start');
  const [ctaAddress, setCtaAddress] = useState('');
  const [ctaFocused, setCtaFocused] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = (e.target as HTMLElement).dataset.idx;
            if (idx) setVisibleSections((prev) => new Set([...prev, idx]));
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const fadeClass = (idx: number): string =>
    `fade-in ${visibleSections.has(String(idx)) ? 'visible' : ''}`;

  const handleEnterAddress = () => {
    setGatewayStep('address');
    setGatewayOpen(true);
  };

  const handleScanProperty = () => {
    setGatewayStep('scan');
    setGatewayOpen(true);
  };

  const handleLoginRegister = () => {
    openAuthModal('login');
  };

  const handleStartAnalysis = () => {
    setGatewayStep('start');
    setGatewayOpen(true);
  };

  const handleCtaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = ctaAddress.trim();
    if (trimmed) {
      router.push(`/analyzing?address=${encodeURIComponent(trimmed)}`);
    } else {
      handleStartAnalysis();
    }
  };

  return (
    <div className="iq-landing">
      <Suspense fallback={null}>
        <AuthParamHandler onOpenGateway={handleStartAnalysis} />
      </Suspense>

      <div className="grid-bg" />

      {/* NAV */}
      <nav className="iq-nav">
        <div className="nav-inner">
          <Link href="/" className="logo">
            <div className="logo-text">DealGap<span>IQ</span></div>
          </Link>
          <div className="nav-links" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <a href="#strategies" style={{ color: '#94A3B8', fontSize: '0.82rem', fontWeight: 500, textDecoration: 'none' }}>Product</a>
            <Link href="/pricing" style={{ color: '#0EA5E9', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}>Pricing</Link>
          </div>
          <div className="nav-actions">
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => router.push('/search')}
                  className="btn-icon"
                  aria-label="Search properties"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/profile')}
                  className="btn-icon"
                  aria-label="Account"
                >
                  <User className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="btn-ghost"
                  style={{ fontSize: '0.875rem', color: '#94A3B8' }}
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <button type="button" className="btn-ghost" onClick={handleLoginRegister}>
                  Login
                </button>
                <Link
                  href="/register"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #0EA5E9, #06B6D4)',
                    color: '#fff',
                    textDecoration: 'none',
                  }}
                >
                  Start free trial
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <DealGapIQHeroSection
        onAnalyzeAddress={(addr) => router.push(`/analyzing?address=${encodeURIComponent(addr)}`)}
        onOpenGateway={handleEnterAddress}
        onScanProperty={handleScanProperty}
      />

      {/* DEAL GAP EXPLAINER */}
      <section
        className={`verdict-section ${fadeClass(0)}`}
        data-idx="0"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[0] = el; }}
      >
        <div className="verdict-container">
          <div className="deal-gap-explainer">
            <h2 className="explainer-headline">Most Investors Search for <span className="cyan">Deals</span>. DealGap<span className="cyan">IQ</span> Calculates Them.</h2>
            <p>
              Most investors search the same listings, use the same filters, and chase the same narrow pool of &ldquo;deals&rdquo; — competing on speed instead of strategy. That race is over.
            </p>
            <p>
              DealGapIQ takes a fundamentally different approach. Instead of filtering for properties that <em>look</em> like deals, we analyze every property to find the ones that actually <em>are</em> deals — by calculating the exact price that delivers your target return.
            </p>
            <p>
              We call that distance between the asking price and your ideal buy price the <strong style={{ color: '#2dd4bf' }}>Deal Gap.</strong> It&apos;s the one metric that tells you whether a deal is worth pursuing — and no other platform calculates it.
            </p>
            <p className="explainer-cta">Find Your Deal. Close Your Gap.</p>
          </div>
        </div>
      </section>

      {/* SCAN DEMO */}
      <section
        className={`verdict-section ${fadeClass(1)}`}
        data-idx="1"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[1] = el; }}
      >
        <div className="verdict-container">
          <div className="verdict-header">
            <div className="section-label">See It In Action</div>
            <h2>&ldquo;Is This a Good Deal?&rdquo; Answered in Three Numbers.</h2>
            <p>Income Value shows where you break even. Target Buy shows where you profit. Deal Gap shows how far you need to negotiate.</p>
          </div>

          <div className="scan-demo-card">
            {/* Property Header */}
            <div className="prop-header">
              <div>
                <div className="prop-address">1847 Oakridge Drive, Tampa, FL 33612</div>
                <div className="prop-details">3 bed &middot; 2 bath &middot; 1,640 sqft &middot; Built 2004</div>
              </div>
              <div>
                <div className="prop-price-label">List Price</div>
                <div className="prop-price">$349,900</div>
              </div>
            </div>

            {/* Price Spectrum */}
            <div className="story-section">
              <div className="story-label">Your Price Spectrum</div>

              <div className="spectrum-container">
                <div className="deal-gap-dimension">
                  <div className="dim-line-left" />
                  <span className="dim-label">DEAL GAP&nbsp; 17.4%</span>
                  <div className="dim-line-right" />
                </div>

                <div className="spectrum-track">
                  <div className="spectrum-zone-profit" />
                  <div className="spectrum-zone-loss" />
                </div>

                <div className="markers">
                  <div className="marker target-buy" style={{ left: '30%' }}>
                    <div className="marker-line" />
                    <div className="marker-value">$289K</div>
                    <div className="marker-label">Target Buy</div>
                    <div className="marker-zone-label" style={{ color: 'var(--green)' }}>Profit</div>
                  </div>
                  <div className="marker income-value" style={{ left: '65%' }}>
                    <div className="marker-line" />
                    <div className="marker-value">$312K</div>
                    <div className="marker-label">Income Value</div>
                    <div className="marker-zone-label" style={{ color: 'var(--gold)' }}>Breakeven</div>
                  </div>
                  <div className="marker list-price" style={{ left: '92%' }}>
                    <div className="marker-line" />
                    <div className="marker-value">$349.9K</div>
                    <div className="marker-label">List Price</div>
                    <div className="marker-zone-label" style={{ color: 'var(--red)' }}>Loss</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Deal Gap Banner */}
            <div className="deal-gap-section">
              <div className="deal-gap-banner">
                <div className="deal-gap-left">
                  <div className="deal-gap-label-row">
                    <span className="deal-gap-label-text">Deal Gap</span>
                    <span className="deal-gap-badge-new">Only on DealGapIQ</span>
                  </div>
                  <div className="deal-gap-value">&minus;17.4%</div>
                  <div className="deal-gap-explain">
                    The list price is <strong>$61K above</strong> your Target Buy. This is the negotiating distance — the discount you&apos;d need to make this deal hit your return target.
                  </div>
                </div>
                <div className="deal-gap-right">
                  <div className="difficulty-label">Negotiation Difficulty</div>
                  <div className="difficulty-meter">
                    <div className="diff-bar active g" />
                    <div className="diff-bar active g" />
                    <div className="diff-bar active y" />
                    <div className="diff-bar active y" />
                    <div className="diff-bar" />
                    <div className="diff-bar" />
                    <div className="diff-bar" />
                  </div>
                  <div className="difficulty-rating">Moderate</div>
                  <div className="difficulty-hint">15–20% discounts require skill</div>
                </div>
              </div>
            </div>

            {/* Verdict + Seller Motivation */}
            <div className="bottom-row">
              <div className="verdict-cell">
                <div className="verdict-ring">
                  <svg viewBox="0 0 52 52">
                    <circle className="ring-bg" cx="26" cy="26" r="22" />
                    <circle className="ring-fill" cx="26" cy="26" r="22" />
                  </svg>
                  <span className="verdict-score">53</span>
                </div>
                <div className="verdict-text">
                  <h4>Verdict: Possible</h4>
                  <p>Tight margins, but potential with negotiation.</p>
                </div>
              </div>
              <div className="motivation-cell">
                <div className="motivation-label">Seller Motivation</div>
                <div className="motivation-dots">
                  <div className="mot-dot active" />
                  <div className="mot-dot active" />
                  <div className="mot-dot active" />
                  <div className="mot-dot" />
                  <div className="mot-dot" />
                </div>
                <div className="motivation-rating">Medium</div>
              </div>
            </div>

            {/* Context Callouts */}
            <div className="context-row">
              <div className="context-item">
                <h5 style={{ color: 'var(--gold)' }}>Income Value</h5>
                <p>The maximum price the rental income supports. Above it, you lose money. No other platform calculates this.</p>
              </div>
              <div className="context-item">
                <h5 style={{ color: 'var(--green)' }}>Target Buy</h5>
                <p>The price that hits your desired return. Change your return target, loan terms, or expenses — it recalculates instantly.</p>
              </div>
              <div className="context-item">
                <h5 style={{ color: 'var(--blue-deep)' }}>Deal Gap</h5>
                <p>The discount between the asking price and your Target Buy. The bigger the gap, the better the deal — but the harder the negotiation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FUNNEL / HOW PROS INVEST */}
      <section
        className={`funnel-section ${fadeClass(2)}`}
        data-idx="2"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[2] = el; }}
      >
        <div className="funnel-container">
          <div className="funnel-header">
            <div className="section-label">How Pros Invest</div>
            <h2>Experienced Investors Pass on<br />90% of Deals in Minutes.<br /><span className="grad">Now So Can You — in 60 Seconds.</span></h2>
            <p>Most properties aren&apos;t worth your time. IQ Verdict tells you which ones are — so you only go deep when it matters.</p>
          </div>

          {/* Funnel Flow */}
          <div className="funnel-flow">
            <div className="funnel-step">
              <div className="funnel-number fn-cyan">100</div>
              <h4>Properties Scanned</h4>
              <p>Quick 60-second screen on every property that catches your eye</p>
            </div>
            <div className="funnel-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div className="funnel-step">
              <div className="funnel-number fn-teal">12</div>
              <h4>Worth Exploring</h4>
              <p>Deals that pass the screen get your full attention and analysis</p>
            </div>
            <div className="funnel-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div className="funnel-step">
              <div className="funnel-number fn-green">3</div>
              <h4>Deals Closed</h4>
              <p>Confident offers backed by full financial analysis</p>
            </div>
          </div>

          {/* Section CTA */}
          <div className="funnel-cta-wrap">
            <button type="button" className="btn-funnel-cta" onClick={handleStartAnalysis}>
              Start Scanning Free &rarr;
            </button>
            <p className="funnel-note">
              <strong>60-second analysis</strong> · No credit card required
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              <Link href="/register" style={{ color: '#38bdf8', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}>
                Sign up for free trial &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* FOUNDER */}
      <div
        className={fadeClass(3)}
        data-idx="3"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[3] = el; }}
      >
        <div className="founder-bar">
          <div className="founder-inner">
            <div className="founder-info">
              <div className="founder-name">Brad Geisen</div>
              <div className="founder-role">Founder, Foreclosure.com</div>
            </div>
            <div className="founder-quote-text">
              &ldquo;I built the infrastructure behind <strong>HomePath.com</strong> (Fannie Mae) and <strong>HomeSteps.com</strong> (Freddie Mac). DealGapIQ isn&apos;t a calculator; it&apos;s 35 years of institutional intelligence, now in your hands.&rdquo;
            </div>
          </div>
        </div>
      </div>

      {/* ADJUST FOR REALITY — own section, dark background */}
      <section className="adjust-section">
        <div className={`adjust-section-inner ${fadeClass(3)}`} data-idx="3">
          <div className="val-section">
            <div className="val-intro">
              <h3 className="val-intro-headline">Adjust for Reality.</h3>
              <p className="val-intro-subline">Every property is different. Fine-tune condition, location, and rehab estimates to see how they change your Income Value.</p>
            </div>
            <div className="val-panel">
            <div className="val-header">
              <div className="val-header-title">Valuation Controls</div>
              <div className="val-header-badge">Edit Mode: On</div>
            </div>
            <div className="val-body">
              <div className="slider-row">
                <div className="slider-top">
                  <span className="slider-label">Property Condition</span>
                  <span className="slider-badge gold">Needs Rehab (-$85k)</span>
                </div>
                <div className="slider-track">
                  <div className="slider-fill gold-fill" style={{ width: '42%' }} />
                  <div className="slider-thumb" style={{ left: 'calc(42% - 9px)' }} />
                </div>
                <div className="slider-scale"><span>Distressed</span><span>Average</span><span>Turnkey</span></div>
              </div>
              <div className="slider-row">
                <div className="slider-top">
                  <span className="slider-label">Location Premium</span>
                  <span className="slider-badge gold">High Demand (+5%)</span>
                </div>
                <div className="slider-track">
                  <div className="slider-fill gold-fill" style={{ width: '58%' }} />
                  <div className="slider-thumb" style={{ left: 'calc(58% - 9px)' }} />
                </div>
                <div className="slider-scale"><span>Poor</span><span>Standard</span><span>Premium</span></div>
              </div>
              <div className="val-result">
                <div>
                  <div className="val-result-label">Adjusted Value</div>
                  <div className="val-result-value">$766,733</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="val-result-label">Impact</div>
                  <div className="val-result-impact">+ $12,400</div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* INVESTMENT STRATEGIES */}
      <section
        className={`section section-alt ${fadeClass(4)}`}
        id="strategies"
        data-idx="4"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[4] = el; }}
      >
        <div className="section-inner">
          <div className="section-header">
            <div className="strategies-label">6 Investment Strategies</div>
            <h2 className="section-title">One Property, Multiple Opportunities</h2>
            <p className="section-desc">Instantly see how any property performs across all major real estate investment strategies.</p>
          </div>
          <div className="strategies-grid">
            <Link href="/strategies/long-term-rental" className="strat-card strat-green">
              <div className="strat-card-top">
                <div className="strat-name">Long-Term Rental</div>
                <div className="strat-metric">
                  <div className="strat-metric-value green">8-12%</div>
                  <div className="strat-metric-label">Cash-on-Cash</div>
                </div>
              </div>
              <div className="strat-subtitle">Steady income &amp; build equity</div>
              <p className="strat-body">Buy and hold properties for consistent monthly rental income. Build long-term wealth through appreciation and mortgage paydown.</p>
            </Link>
            <Link href="/strategies/short-term-rental" className="strat-card strat-blue">
              <div className="strat-card-top">
                <div className="strat-name">Short-Term Rental</div>
                <div className="strat-metric">
                  <div className="strat-metric-value blue">15-25%</div>
                  <div className="strat-metric-label">Cash-on-Cash</div>
                </div>
              </div>
              <div className="strat-subtitle">Vacation &amp; business rental income</div>
              <p className="strat-body">Maximize income through Airbnb or VRBO rentals. Higher returns with more active management and seasonal demand.</p>
            </Link>
            <Link href="/strategies/brrrr" className="strat-card strat-purple">
              <div className="strat-card-top">
                <div className="strat-name">BRRRR</div>
                <div className="strat-metric">
                  <svg className="strat-trend-icon" width="24" height="16" viewBox="0 0 24 16" fill="none">
                    <path d="M1 14L8 7L13 10L23 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M17 1H23V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="strat-metric-label">Scale</div>
                </div>
              </div>
              <div className="strat-subtitle">Buy-Rehab-Rent-Refi-Repeat wealth builder</div>
              <p className="strat-body">Buy distressed property, renovate, rent, refinance to pull out capital, then repeat. Build a portfolio with the same initial investment.</p>
            </Link>
            <Link href="/strategies/fix-flip" className="strat-card strat-red">
              <div className="strat-card-top">
                <div className="strat-name">Fix &amp; Flip</div>
                <div className="strat-metric">
                  <div className="strat-metric-value red">$50K+</div>
                  <div className="strat-metric-label">Profit</div>
                </div>
              </div>
              <div className="strat-subtitle">Buy low, fix up, sell high</div>
              <p className="strat-body">Purchase undervalued properties, renovate strategically, and sell for profit. Quick returns with active project management.</p>
            </Link>
            <Link href="/strategies/house-hack" className="strat-card strat-teal">
              <div className="strat-card-top">
                <div className="strat-name">House Hack</div>
                <div className="strat-metric">
                  <div className="strat-metric-value teal">75%</div>
                  <div className="strat-metric-label">Cost Savings</div>
                </div>
              </div>
              <div className="strat-subtitle">Cut your housing costs up to 100%</div>
              <p className="strat-body">Live in one unit while renting others. Eliminate your housing payment and start building wealth from day one.</p>
            </Link>
            <Link href="/strategies/wholesale" className="strat-card strat-gold">
              <div className="strat-card-top">
                <div className="strat-name">Wholesale</div>
                <div className="strat-metric">
                  <div className="strat-metric-value gold">$10K+</div>
                  <div className="strat-metric-label">Per Deal</div>
                </div>
              </div>
              <div className="strat-subtitle">Find deals, assign contracts, profit</div>
              <p className="strat-body">Find properties under market value, get them under contract, then assign to other investors for a fee. Zero capital required.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* TOOLKIT */}
      <section
        className={`section ${fadeClass(5)}`}
        id="toolkit"
        data-idx="5"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[5] = el; }}
      >
        <div className="section-inner">
          <div className="section-header">
            <h2 className="section-title">When a <span style={{ color: 'var(--cyan)' }}>Deal Passes</span> the Screen,<br />Everything You Need Is Ready.</h2>
            <p className="section-desc">Go deep with investor-grade tools built for confident decision-making.</p>
          </div>
          <div className="toolkit-strip" aria-label="Toolkit features">
            <div className="toolkit-grid">
            <div className="toolkit-card">
              <div className="tk-icon pr">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <div className="tk-title">Scan</div>
              <p className="tk-text">The field companion app. Snap a photo of any property or For Sale sign to pull data instantly. Syncs to desktop.</p>
            </div>
            <div className="toolkit-card">
              <div className="tk-icon gr">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="tk-title">Verdict</div>
              <p className="tk-text">Input your specific &ldquo;Buy Box&rdquo; criteria (e.g., 12% CoC Return). The system flags properties as PASS, MARGINAL, or BUY.</p>
            </div>
            <div className="toolkit-card">
              <div className="tk-icon bl">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div className="tk-title">Strategy</div>
              <p className="tk-text">Why analyze one way? Run Flip, BRRRR, Wholesale, and Long-Term Rental models simultaneously.</p>
            </div>
            <div className="toolkit-card">
              <div className="tk-icon cy">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div className="tk-title">Price</div>
              <p className="tk-text">Three numbers that define your deal: Income Value, Target, and Wholesale — calculated in 60 seconds flat.</p>
            </div>
            <div className="toolkit-card">
              <div className="tk-icon go">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="tk-title">Report</div>
              <p className="tk-text">Lender-ready PDF reports. Share with partners, lenders, or your investment team.</p>
            </div>
            <div className="toolkit-card">
              <div className="tk-icon bl">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="tk-title">Pipeline</div>
              <p className="tk-text">Save deals, track offers, and compare opportunities side-by-side from underwriting to close.</p>
            </div>
          </div>
            </div>
        </div>
      </section>

      {/* CREDIBILITY — Why Trust DealGapIQ */}
      <section style={{ padding: '4rem 1.5rem', borderTop: '1px solid rgba(148,163,184,0.08)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#14b8a6', marginBottom: '1rem' }}>
            Built by Investors, for Investors
          </p>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.3, marginBottom: '1rem' }}>
            From the founder of Foreclosure.com — the most trusted name in distressed real estate.
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: '540px', margin: '0 auto 2.5rem' }}>
            35+ years in real estate data, 80+ companies, a 30+ year GSE partnership, and 500+ projects — the same analytical rigor, now available to every investor. DealGapIQ is in beta and your feedback drives what ships next.
          </p>

          {/* Trust Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', maxWidth: '560px', margin: '0 auto' }}>
            {[
              { val: '35+', label: 'Years in RE Data', color: '#38bdf8' },
              { val: '80+', label: 'Companies', color: '#2dd4bf' },
              { val: '30+', label: 'Year GSE Partnership', color: '#a78bfa' },
              { val: '500+', label: 'Projects', color: '#fbbf24' },
            ].map((m, i) => (
              <div key={i} style={{ padding: '1rem', borderRadius: '12px', background: `${m.color}08`, border: `1px solid ${m.color}18` }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 800, color: m.color, marginBottom: '0.2rem' }}>{m.val}</p>
                <p style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1.3 }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className={`cta-section ${fadeClass(6)}`}
        data-idx="6"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[6] = el; }}
      >
        <div className="cta-inner">
          <h2 className="cta-title">Find Your Deal.<br />Close Your Gap.</h2>
          <p className="cta-desc">Every property has a Deal Gap. Only DealGapIQ measures it.</p>
          <form onSubmit={handleCtaSubmit} className="cta-address-form">
            <div
              className="cta-address-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#0D1424',
                border: `1px solid ${ctaFocused ? 'rgba(14,165,233,0.35)' : 'rgba(148,163,184,0.1)'}`,
                borderRadius: '10px',
                padding: '4px 4px 4px 16px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: ctaFocused ? '0 0 0 3px rgba(14,165,233,0.06)' : 'none',
                maxWidth: '520px',
                margin: '0 auto',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7.5" cy="7.5" r="5.5" stroke="#475569" strokeWidth="1.5" />
                <path d="M12 12L16 16" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={ctaAddress}
                onChange={(e) => setCtaAddress(e.target.value)}
                onFocus={() => setCtaFocused(true)}
                onBlur={() => setCtaFocused(false)}
                placeholder="Enter any property address..."
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: '#E2E8F0',
                  fontSize: '14px',
                  padding: '12px 12px',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '10px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.2s',
                }}
              >
                Analyze
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </form>
          <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b' }}>
            Free during beta · <Link href="/pricing" style={{ color: '#38bdf8', textDecoration: 'none' }}>View pricing plans</Link>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="iq-footer">
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem' }}>
          {/* Footer grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem', textAlign: 'left' }}>
            {/* Brand column */}
            <div>
              <div className="footer-logo" style={{ marginBottom: '0.75rem' }}>DealGap<span>IQ</span></div>
              <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.8rem', lineHeight: 1.7 }}>
                Professional real estate intelligence for every investor.
              </p>
            </div>

            {/* Product column */}
            <div>
              <p style={{ color: '#e2e8f0', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Product</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="#strategies" style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', textDecoration: 'none' }}>Strategies</a>
                <a href="#toolkit" style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', textDecoration: 'none' }}>Toolkit</a>
                <Link href="/pricing" style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', textDecoration: 'none' }}>Pricing</Link>
              </div>
            </div>

            {/* Legal column */}
            <div>
              <p style={{ color: '#e2e8f0', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Legal</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link href="/privacy" style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', textDecoration: 'none' }}>Privacy Policy</Link>
                <Link href="/terms" style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', textDecoration: 'none' }}>Terms of Service</Link>
              </div>
            </div>

            {/* Support column */}
            <div>
              <p style={{ color: '#e2e8f0', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Support</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="/help" style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', textDecoration: 'none' }}>Help Center</a>
                <a href="mailto:support@dealgapiq.com" style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', textDecoration: 'none' }}>support@dealgapiq.com</a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(148,163,184,0.1)', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p className="footer-copy">&copy; 2026 DealGapIQ. All rights reserved. Professional use only. Not a lender.</p>
          </div>
        </div>
      </footer>

      {/* Gateway Modal */}
      {gatewayOpen && (
        <DealGapIQGateway
          key={gatewayStep}
          initialStep={gatewayStep}
          onClose={() => setGatewayOpen(false)}
          onScanProperty={onPointAndScan}
        />
      )}
    </div>
  );
}

export default DealGapIQHomepage;
