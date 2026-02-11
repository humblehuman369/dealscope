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
function AuthParamHandler() {
  const { openAuthModal } = useAuthModal();
  const searchParams = useSearchParams();

  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login' || authParam === 'required') {
      openAuthModal('login');
    } else if (authParam === 'register') {
      openAuthModal('register');
    }
  }, [searchParams, openAuthModal]);

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
        <AuthParamHandler />
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

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-badge"><span className="badge-dot" /> Platform 1.0 Live</div>
            <h1>Don&apos;t Just Analyze.<br /><span className="grad">Engineer Your Deal.</span></h1>
            <p className="hero-desc">
              The first platform that combines automated speed with <strong>appraisal autonomy</strong>. Select your own comps. Weight your assumptions. Manage your pipeline.
            </p>
            <div className="hero-actions">
              <button className="action-card" onClick={handleEnterAddress}>
                <div className="action-icon">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div><div className="action-label">Enter Address</div><div className="action-sub">Search MLS Nationwide</div></div>
                <div className="action-arrow">&rarr;</div>
              </button>
              <button className="action-card" onClick={handleScanProperty}>
                <div className="action-icon">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </div>
                <div><div className="action-label">Scan Property</div><div className="action-sub">Snap a Photo</div></div>
                <div className="action-arrow">&rarr;</div>
              </button>
            </div>
            <div className="hero-ticker">
              <strong>Institutional Data Intelligence</strong>
              <span style={{ display: 'block', marginTop: '0.375rem' }}>Analyze 50 deals in the time it takes to do 1.</span>
            </div>
          </div>

          {/* VerdictIQ Card */}
          <div className="hero-visual">
            <div className="verdict-card">
              <div className="verdict-card-question">Is this worth your time as an<br /><em>investment?</em></div>
              <div style={{ height: '1rem' }} />
              <div className="verdict-score-ring">
                <svg viewBox="0 0 140 140" className="verdict-ring-svg">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  <circle cx="70" cy="70" r="60" fill="none" stroke="url(#verdictGrad)" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray="377" strokeDashoffset="177" transform="rotate(-90 70 70)" />
                  <defs>
                    <linearGradient id="verdictGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="verdict-score-num">53</div>
                <div className="verdict-score-den">/ 100</div>
              </div>
              <div className="verdict-badge gold">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                Marginal Deal
              </div>
              <div className="verdict-card-desc">This property <strong>could work as an investment</strong> — but only at a significant discount. The income potential is there, but the numbers don&apos;t add up at the asking price.</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER + VALUATION CONTROLS */}
      <div
        className={fadeClass(0)}
        data-idx="0"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[0] = el; }}
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

      {/* BLACK BOX */}
      <section
        className={`section ${fadeClass(1)}`}
        id="pricechecker"
        data-idx="1"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[1] = el; }}
      >
        <div className="section-inner">
          <div className="bb-centered">
            <div className="bb-label">01 — Appraisal Autonomy</div>
            <h2 className="bb-title">The End of the<br />&ldquo;Black Box&rdquo; Estimate.</h2>
            <p className="bb-desc">
              Traditional AVMs give you a number but hide the math. <strong>PriceCheckerIQ</strong> is transparent. The AI gathers the data, but you act as the Appraiser.
            </p>
            <div className="bb-features-row">
              <div className="bb-feature">
                <div className="bb-feature-icon">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div><h4>Curate Your Comps</h4><p>Don&apos;t like a comp? Uncheck it. See the valuation update instantly.</p></div>
              </div>
              <div className="bb-feature">
                <div className="bb-feature-icon">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                </div>
                <div><h4>Weighted Adjustments</h4><p>Apply appraiser-style adjustments for pools, renovations, and square footage.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INVESTMENT STRATEGIES */}
      <section
        className={`section section-alt ${fadeClass(2)}`}
        id="strategies"
        data-idx="2"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[2] = el; }}
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
        className={`section section-alt ${fadeClass(3)}`}
        id="dealhub"
        data-idx="3"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[3] = el; }}
      >
        <div className="section-inner">
          <div className="os-grid">
            <div>
              <div className="os-label">02 — Workflow OS</div>
              <h2 className="os-title">Your Investment<br />Operating System.</h2>
              <p className="os-desc">
                Stop managing millions of dollars in spreadsheets and text messages. <strong>DealVaultIQ</strong> centralizes your entire workflow from lead to close.
              </p>
              <div className="os-bullet"><div className="os-dot b" /><p><strong>DealVaultIQ:</strong> Saves every photo, comp, and underwriting assumption forever.</p></div>
              <div className="os-bullet"><div className="os-dot g" /><p><strong>Side-by-Side:</strong> Compare Rental Cashflow vs. Flip Profit instantly for the same address.</p></div>
              <div className="os-bullet"><div className="os-dot o" /><p><strong>Export:</strong> Generate PDF lender packages in one click.</p></div>
            </div>
            <div className="iq-avatar-wrap">
              <div className="iq-avatar-box">
                <img
                  src="/images/iq-icon-blue.png"
                  alt="InvestIQ"
                  style={{ width: '160px', height: '160px', objectFit: 'contain', position: 'relative' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOOLKIT */}
      <section
        className={`section ${fadeClass(4)}`}
        id="toolkit"
        data-idx="4"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[4] = el; }}
      >
        <div className="section-inner">
          <div className="section-header">
            <h2 className="section-title">The Complete Toolkit</h2>
            <p className="section-desc">Everything you need to underwrite with confidence.</p>
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
              <p className="tk-text">Generate lender-ready PDF reports. Share with partners, lenders, or your investment team.</p>
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

      {/* CTA */}
      <section
        className={`cta-section ${fadeClass(5)}`}
        data-idx="5"
        ref={(el: HTMLDivElement | null) => { sectionRefs.current[5] = el; }}
      >
        <div className="cta-inner">
          <h2 className="cta-title">Stop wondering. Start knowing.</h2>
          <p className="cta-desc">Join thousands of serious investors using InvestIQ to uncover value others miss.</p>
          <button className="btn-cta" onClick={handleStartAnalysis}>Start Free Analysis</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="iq-footer">
        <div className="footer-logo">Invest<span>IQ</span></div>
        <p className="footer-tagline">Professional Real Estate Intelligence for Everyone.</p>
        <p className="footer-copy">&copy; 2026 InvestIQ. All rights reserved.<br />Professional use only. Not a lender.</p>
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
