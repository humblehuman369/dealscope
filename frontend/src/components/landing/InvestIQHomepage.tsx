'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/hooks/useSession';
import { useAuthModal } from '@/hooks/useAuthModal';
import { Search, User } from 'lucide-react';
import { InvestIQGateway } from './InvestIQGateway';
import './investiq-homepage.css';

interface InvestIQHomepageProps {
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

export function InvestIQHomepage({ onPointAndScan }: InvestIQHomepageProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useSession();
  const { openAuthModal } = useAuthModal();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<(HTMLDivElement | HTMLElement | null)[]>([]);
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [gatewayStep, setGatewayStep] = useState<'start' | 'address' | 'scan'>('start');

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

  return (
    <div className="iq-landing">
      <Suspense fallback={null}>
        <AuthParamHandler onOpenGateway={handleStartAnalysis} />
      </Suspense>

      <div className="grid-bg" />

      {/* NAV */}
      <nav className="iq-nav">
        <div className="nav-inner">
          <a href="/" className="logo" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
            <div className="logo-text">Invest<span>IQ</span></div>
          </a>
          <div className="nav-links" />
          <div className="nav-actions">
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => router.push('/search')}
                  className="btn-icon"
                  aria-label="Search properties"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button
                  onClick={() => router.push('/profile')}
                  className="btn-icon"
                  aria-label="Account"
                >
                  <User className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button className="btn-ghost" onClick={handleLoginRegister}>
                Login/Register
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* BETA BANNER */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(14,165,233,0.12) 0%, rgba(20,184,166,0.08) 100%)',
        borderBottom: '1px solid rgba(14,165,233,0.15)',
        padding: '0.5rem 1rem',
        textAlign: 'center',
        position: 'relative',
        zIndex: 40,
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(14,165,233,0.2)', padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '0.5rem' }}>
            Beta
          </span>
          Free early access — help shape the future of real estate analytics
        </p>
      </div>

      {/* HERO */}
      <section className="hero hero-centered">
        <div className="hero-badge"><span className="badge-dot" /> Real estate investment intelligence</div>

        <h1 className="hero-headline">
          Stop Researching Deals<br />
          That Were <span className="grad">Never Going<br />to Work.</span>
        </h1>

        <p className="hero-subtitle">
          Scan any property and know in 60 seconds if it&apos;s worth your time — before you waste a weekend running numbers.
        </p>

        <div className="hero-inputs">
          <button className="input-group" onClick={handleEnterAddress}>
            <span className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <span className="input-placeholder">Enter property address...</span>
            <span className="btn-analyze">Analyze</span>
          </button>
          <button className="btn-scan" onClick={handleScanProperty}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M1 7V3a2 2 0 012-2h4M17 1h4a2 2 0 012 2v4M23 17v4a2 2 0 01-2 2h-4M7 23H3a2 2 0 01-2-2v-4" />
            </svg>
            Scan Property
          </button>
        </div>

        <p className="hero-note">
          <strong>60-second analysis</strong> · No credit card required
        </p>
      </section>

      {/* VERDICT DEMO */}
      <section
        className={`verdict-section ${fadeClass(0)}`}
        data-idx="0"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[0] = el; }}
      >
        <div className="verdict-container">
          <div className="verdict-header">
            <div className="section-label">IQ Verdict</div>
            <h2>One Scan. Four Signals.<br />Your Answer.</h2>
            <p>InvestIQ evaluates every property in 60 seconds across four key factors that determine if a deal is worth pursuing.</p>
          </div>

          {/* Four Signal Cards */}
          <div className="signals-grid">
            <div className="signal-card">
              <div className="signal-icon cyan-bg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <h4>Deal Gap</h4>
              <p>Distance between market value and your target buy price</p>
              <div className="signal-value cyan">$38K</div>
            </div>
            <div className="signal-card">
              <div className="signal-icon teal-bg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h4>Rental Income</h4>
              <p>Annual income analysis to determine breakeven price</p>
              <div className="signal-value teal">$2,180/mo</div>
            </div>
            <div className="signal-card">
              <div className="signal-icon green-bg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h4>Target Price</h4>
              <p>The price you&apos;d need to pay to make money</p>
              <div className="signal-value green">$312K</div>
            </div>
            <div className="signal-card">
              <div className="signal-icon gold-bg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h4>Seller Urgency</h4>
              <p>Signals indicating motivation to negotiate</p>
              <div className="signal-value gold">Medium</div>
            </div>
          </div>

          {/* Verdict Result */}
          <div className="verdict-result">
            <div className="verdict-gauge">
              <div className="gauge-ring" />
              <div className="gauge-progress" />
              <div className="gauge-inner">
                <div className="gauge-score">53</div>
                <div className="gauge-label">Deal Score</div>
              </div>
            </div>
            <div className="verdict-content">
              <div className="verdict-tag gold">&#9888; Marginal Deal</div>
              <h3>Possible, but the margins are tight.</h3>
              <p>There&apos;s potential here depending on your strategy and terms. The deal gap is narrow, which means your negotiation and financing approach will make or break this one.</p>
              <button className="verdict-cta" onClick={handleStartAnalysis}>
                Run full analysis to find the angle that works &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FUNNEL / HOW PROS INVEST */}
      <section
        className={`funnel-section ${fadeClass(1)}`}
        data-idx="1"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[1] = el; }}
      >
        <div className="funnel-container">
          <div className="funnel-header">
            <div className="section-label">How Pros Invest</div>
            <h2>Experienced Investors Pass on<br />90% of Deals in Minutes.<br /><span className="grad">Now You Can Too.</span></h2>
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
            <button className="btn-funnel-cta" onClick={handleStartAnalysis}>
              Start Scanning Free &rarr;
            </button>
            <p className="funnel-note">
              <strong>60-second analysis</strong> · No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* FOUNDER + VALUATION CONTROLS */}
      <div
        className={fadeClass(2)}
        data-idx="2"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[2] = el; }}
      >
        <div className="founder-bar">
          <div className="founder-inner">
            <div className="founder-info">
              <div className="founder-meta">Architecture By</div>
              <div className="founder-name">Brad Geisen</div>
              <div className="founder-role">Founder, Foreclosure.com</div>
            </div>
            <div className="founder-quote-text">
              &ldquo;I built the infrastructure behind <strong>HomePath.com</strong> (Fannie Mae) and <strong>HomeSteps.com</strong> (Freddie Mac). InvestIQ isn&apos;t a calculator; it&apos;s 35 years of institutional intelligence, now in your hands.&rdquo;
            </div>
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

      {/* INVESTMENT STRATEGIES */}
      <section
        className={`section section-alt ${fadeClass(3)}`}
        id="strategies"
        data-idx="3"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[3] = el; }}
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

      {/* INVESTMENT OS */}
      <section
        className={`section section-alt ${fadeClass(4)}`}
        id="workflow"
        data-idx="4"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[4] = el; }}
      >
        <div className="section-inner">
          <div className="os-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '640px', margin: '0 auto' }}>
            <div>
              <div className="os-label">02 — Workflow OS</div>
              <h2 className="os-title">Your Investment<br />Operating System.</h2>
              <p className="os-desc">
                Stop managing millions of dollars in spreadsheets and text messages. <strong>DealVaultIQ</strong> centralizes your entire workflow from lead to close.
              </p>
              <div className="os-bullet"><div className="os-dot b" /><p><strong>DealVaultIQ:</strong> Saves every photo, comp, and underwriting assumption forever.</p></div>
              <div className="os-bullet"><div className="os-dot g" /><p><strong>Side-by-Side:</strong> Compare Rental Cashflow vs. Flip Profit instantly for the same address.</p></div>
              <div className="os-bullet"><div className="os-dot o" /><p><strong>Export:</strong> Download lender-ready PDF reports and share analysis with your team.</p></div>
            </div>
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
            <h2 className="section-title">When a Deal Passes the Screen, Everything You Need Is Ready.</h2>
            <p className="section-desc">Go deep with investor-grade tools built for confident decision-making.</p>
          </div>
          <div className="toolkit-grid">
            <div className="toolkit-card">
              <div className="tk-icon bl">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div className="tk-title">Strategy<span>IQ</span></div>
              <p className="tk-text">Why analyze one way? Run Flip, BRRRR, Wholesale, and Long-Term Rental models simultaneously.</p>
            </div>
            <div className="toolkit-card">
              <div className="tk-icon gr">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="tk-title">Verdict<span>IQ</span></div>
              <p className="tk-text">Input your specific &ldquo;Buy Box&rdquo; criteria (e.g., 12% CoC Return). The system flags properties as PASS, MARGINAL, or BUY.</p>
            </div>
            <div className="toolkit-card">
              <div className="tk-icon pr">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <div className="tk-title">Scan<span>IQ</span></div>
              <p className="tk-text">The field companion app. Snap a photo of any property or For Sale sign to pull data instantly. Syncs to desktop.</p>
            </div>
            <div className="toolkit-card">
              <div className="tk-icon cy">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div className="tk-title">Price<span>IQ</span></div>
              <p className="tk-text">Three numbers that define your deal: Breakeven, Target, and Wholesale — calculated in 60 seconds flat.</p>
            </div>
            <div className="toolkit-card">
              <div className="tk-icon go">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="tk-title">Report<span>IQ</span></div>
              <p className="tk-text">Lender-ready PDF reports. Share with partners, lenders, or your investment team.</p>
            </div>
            <div className="toolkit-card">
              <div className="tk-icon bl">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="tk-title">Pipeline<span>IQ</span></div>
              <p className="tk-text">Save deals, track offers, and compare opportunities side-by-side from underwriting to close.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BETA CREDIBILITY */}
      <section style={{ padding: '4rem 1.5rem', borderTop: '1px solid rgba(148,163,184,0.08)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#14b8a6', marginBottom: '1rem' }}>
            Early Access
          </p>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.3, marginBottom: '1rem' }}>
            We&apos;re building InvestIQ in public — and your feedback drives what ships next.
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: '540px', margin: '0 auto 2.5rem' }}>
            InvestIQ is in beta. Every analysis you run, every deal you save, and every feature request you make helps us build the tool serious investors actually need.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.25rem' }}>6</p>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>Investment Strategies</p>
            </div>
            <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.12)' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2dd4bf', marginBottom: '0.25rem' }}>60s</p>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>Analysis Time</p>
            </div>
            <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.25rem' }}>Free</p>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>During Beta</p>
            </div>
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
          <h2 className="cta-title">Stop wondering. Start knowing.</h2>
          <p className="cta-desc">Built by the founder of Foreclosure.com. Now in beta — try it free and help shape what it becomes.</p>
          <button className="btn-cta" onClick={handleStartAnalysis}>Start Free Analysis</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="iq-footer">
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem' }}>
          {/* Footer grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem', textAlign: 'left' }}>
            {/* Brand column */}
            <div>
              <div className="footer-logo" style={{ marginBottom: '0.75rem' }}>Invest<span>IQ</span></div>
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
                <a href="#workflow" style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', textDecoration: 'none' }}>Workflow</a>
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
                <a href="mailto:support@investiq.com" style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', textDecoration: 'none' }}>support@investiq.com</a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(148,163,184,0.1)', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p className="footer-copy">&copy; 2026 InvestIQ. All rights reserved. Professional use only. Not a lender.</p>
          </div>
        </div>
      </footer>

      {/* Gateway Modal */}
      {gatewayOpen && (
        <InvestIQGateway
          key={gatewayStep}
          initialStep={gatewayStep}
          onClose={() => setGatewayOpen(false)}
          onScanProperty={onPointAndScan}
        />
      )}
    </div>
  );
}

export default InvestIQHomepage;
