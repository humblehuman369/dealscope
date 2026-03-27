'use client';

import React, { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthModal } from '@/hooks/useAuthModal';
import './dealgapiq-homepage.css';
import { HowItWorksSection } from './HowItWorksSection';
import { DataSourcesSection } from './DataSourcesSection';

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

interface DealGapIQHomepageProps {
  onPointAndScan?: () => void;
}

export function DealGapIQHomepage({ onPointAndScan: _onPointAndScan }: DealGapIQHomepageProps) {
  const router = useRouter();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isDealGapVideoPlaying, setIsDealGapVideoPlaying] = useState(false);
  const [founderImgError, setFounderImgError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dealGapVideoRef = useRef<HTMLVideoElement>(null);

  const handleAnalyzeClick = () => {
    router.push('/search');
  };

  const scrollToHow = () => {
    const el = document.querySelector('.how');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const playVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play();
    setIsVideoPlaying(true);
  };

  const handleVideoEnded = () => {
    setIsVideoPlaying(false);
  };

  const playDealGapVideo = () => {
    const video = dealGapVideoRef.current;
    if (!video) return;
    video.play();
    setIsDealGapVideoPlaying(true);
  };

  const handleDealGapVideoEnded = () => {
    setIsDealGapVideoPlaying(false);
  };

  return (
    <div style={{ background: 'var(--surface-base)', color: 'var(--text-body)', lineHeight: 1.6, overflowX: 'hidden' }}>

      <Suspense fallback={null}>
        <AuthParamHandler />
      </Suspense>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">Built for Real Estate Investors</div>
        <div className="hero-pre">Not a listing site. A decision engine.</div>
        <h1>
          See Every Property Through<br />
          <span className="accent">an Investor Lens.</span>
        </h1>
        <p className="hero-sub">
          Every property listing you&apos;ve ever seen was designed to sell you on that property.{' '}
          <strong>DealGapIQ answers the only question that matters to an investor:</strong>{' '}
          <strong>is this a good deal?</strong>
        </p>
        <div className="hero-cta-group">
          <button className="cta-primary" onClick={handleAnalyzeClick}>
            Analyze a Property Free →
          </button>
          <button className="cta-ghost" onClick={scrollToHow}>
            See How It Works
          </button>
        </div>
        <p className="hero-note">
          <span>No account needed</span>
          <span>Results in seconds</span>
          <span>3 free analyses per month</span>
        </p>
        <div className="hero-founder">
          <img
            src="/brad-geisen.png"
            alt="Brad Geisen"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span>
            Built by <strong>Brad Geisen</strong> — Creator of HomePath.com &amp; HomeSteps.com
          </span>
        </div>
      </section>

      {/* VIDEO */}
      <section className="video-section">
        <div className="video-inner">
          <div
            className="video-container"
            onClick={!isVideoPlaying ? playVideo : undefined}
          >
            <video
              ref={videoRef}
              preload="metadata"
              playsInline
              controls={isVideoPlaying}
              src="/videos/intro-to-dealgapiq.mp4"
              poster="/images/intro-video-poster.png"
              onEnded={handleVideoEnded}
              onPause={() => {
                if (videoRef.current?.ended) setIsVideoPlaying(false);
              }}
            />
            <div className={`video-poster-overlay${isVideoPlaying ? ' hidden' : ''}`}>
              <div className="video-play-btn">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <polygon points="6,3 20,12 6,21" />
                </svg>
              </div>
              <div className="video-label">See How DealGapIQ Works in 90 Seconds</div>
            </div>
          </div>
        </div>
      </section>

      {/* PARADIGM SHIFT */}
      <section className="paradigm">
        <div className="paradigm-inner">
          <div className="paradigm-label">The Difference</div>
          <h2>Real Estate Sites Market Properties.<br />We Analyze Them.</h2>
          <p className="paradigm-sub">
            Every property listing you&apos;ve ever seen was designed to do one thing: sell you on that property.
            DealGapIQ was built for a completely different person with a completely different question.
          </p>

          <div className="compare-grid">
            {/* THEM */}
            <div className="compare-card compare-them">
              <div className="compare-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7C8CA0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h3>Listing Sites</h3>
              <p className="compare-tagline">Designed for home buyers &amp; agents</p>
              <ul className="compare-list">
                <li>Curated photos that sell an emotion</li>
                <li>Agent remarks written to market</li>
                <li>Zestimate built for homeowners</li>
                <li>No rental income data</li>
                <li>No cash flow analysis</li>
                <li>No investment strategy tools</li>
                <li>Shows you what a property looks like</li>
              </ul>
            </div>

            {/* VS */}
            <div className="compare-vs">
              <div className="vs-badge">VS</div>
            </div>

            {/* US */}
            <div className="compare-card compare-us">
              <div className="compare-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3>DealGapIQ</h3>
              <p className="compare-tagline">Built for residential real estate investors</p>
              <ul className="compare-list">
                <li>Numbers that tell the truth</li>
                <li>Cross-referenced data from 5 sources</li>
                <li>IQ Estimate built for investors</li>
                <li>Rental income analysis included</li>
                <li>Full cash flow &amp; DSCR breakdown</li>
                <li>6 investment strategies analyzed</li>
                <li>Shows you what a property is worth</li>
              </ul>
            </div>
          </div>

          {/* MANIFESTO — inside paradigm so it centers between cards and section bottom */}
          <div className="manifesto-inline">
            <p className="manifesto-quote">
              &ldquo;You&apos;re not asking <span className="em">do I love this kitchen?</span><br />
              You&apos;re asking <span className="em">does this property cash flow?</span>&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <HowItWorksSection />

      {/* THREE PRICE THRESHOLDS */}
      <section className="prices">
        <div className="prices-inner">
          <div className="section-label">Your Three Numbers</div>
          <h2>Every Property Has Three Price Thresholds</h2>
          <p className="prices-sub">
            These are the numbers listing sites will never show you — because they were never built to calculate them.
          </p>

          <img
            src="/images/three-price-thresholds-bar-graph.png"
            alt="Three Price Thresholds — Deal Gap and Price Gap explained with Target Buy, Income Value, and Market Price"
            style={{ width: '100%', height: 'auto', borderRadius: 12, display: 'block' }}
            draggable={false}
          />

          <div
            className="video-container"
            style={{ marginTop: '3rem', maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}
            onClick={!isDealGapVideoPlaying ? playDealGapVideo : undefined}
          >
            <video
              ref={dealGapVideoRef}
              preload="metadata"
              playsInline
              controls={isDealGapVideoPlaying}
              src="/videos/what-is-dealgapiq.mp4"
              onEnded={handleDealGapVideoEnded}
              onPause={() => {
                if (dealGapVideoRef.current?.ended) setIsDealGapVideoPlaying(false);
              }}
            />
            <div className={`video-poster-overlay${isDealGapVideoPlaying ? ' hidden' : ''}`}>
              <div className="video-play-btn">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <polygon points="6,3 20,12 6,21" />
                </svg>
              </div>
              <div className="video-label">What is DealGapIQ?</div>
            </div>
          </div>
        </div>
      </section>

      {/* COMP-BASED APPRAISAL */}
      <section className="comp-appraisal">
        <div className="comp-inner">
          <div className="comp-layout">
            <div className="comp-image">
              <img
                src="/images/comps-appraisal-preview.png"
                alt="Comp-Based Appraisal — Adjustment breakdown, match scores, comp details, and proximity map"
                draggable={false}
              />
            </div>

            <div className="comp-content">
              <div className="section-label">Comp-Based Appraisal</div>
              <h2>Price Property Like a Professional</h2>
              <p className="comp-tagline">Select the comps. Review the logic. Set the value.</p>

              <div className="comp-features">
                {[
                  { title: 'Pick your own comps', desc: 'Select from recent sales within your target radius. You control which properties inform the appraisal.' },
                  { title: 'See every adjustment', desc: 'Size, bedrooms, bathrooms, age, lot — each adjustment is transparent and follows appraisal methodology.' },
                  { title: 'Know your confidence', desc: 'A weighted similarity score tells you exactly how reliable the estimate is.' },
                  { title: 'Download a URAR-style report', desc: 'Professional Form 1004 format — ready for partners, lenders, or your records.' },
                ].map((item, i) => (
                  <div className="comp-feature" key={i}>
                    <span className="comp-check">✓</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="comp-disclaimer">
                <strong>Not a licensed appraisal.</strong> An investor-grade comp analysis modeled after the industry standard — so you can price property with the same rigor the professionals use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DATA SOURCES */}
      <DataSourcesSection />

      {/* FOUNDER */}
      <section className="founder">
        <div className="founder-inner">
          <div className="founder-photo">
            {founderImgError ? (
              <span>BG</span>
            ) : (
              <img
                src="/brad-geisen.png"
                alt="Brad Geisen"
                onError={() => setFounderImgError(true)}
              />
            )}
          </div>
          <div className="founder-content">
            <h2>35 Years of Real Estate Data, One Tool for Investors</h2>
            <div className="founder-quote">
              &ldquo;I spent 35 years in real estate data — building HomePath.com for Fannie Mae, HomeSteps.com for Freddie Mac, and founding Foreclosure.com. Today there&apos;s more data than ever, but investors still spend hours piecing it together. DealGapIQ was built to think like an investor, not market like an agent.&rdquo;
            </div>
            <div className="founder-stats">
              {[
                { value: '35+', label: 'Years in RE Data' },
                { value: '30+', label: 'Yr GSE Partnerships' },
                { value: '35+', label: 'Years RE Investor' },
              ].map((stat, i) => (
                <div className="founder-stat" key={i}>
                  <span className="founder-stat-value">{stat.value}</span>
                  <span className="founder-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <h2>Stop Browsing Like a Buyer.<br />Start Thinking Like an Investor.</h2>
        <p className="final-cta-sub">
          Search or paste any address. See the three price thresholds, the Verdict Score, and which strategy makes it work.
        </p>
        <button className="cta-primary" onClick={handleAnalyzeClick}>
          Analyze a Property Free →
        </button>
        <div className="final-meta">
          <span><span className="check">✓</span> No credit card</span>
          <span><span className="check">✓</span> 3 free analyses/month</span>
          <span><span className="check">✓</span> Every assumption editable</span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="dgiq-footer">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div className="footer-logo">
            <span className="logo-deal">Deal</span>
            <span className="logo-gap">Gap</span>
            <span className="logo-iq">IQ</span>
          </div>
        </Link>
        <p>© 2026 DealGapIQ. All rights reserved.</p>
        <div className="footer-links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/help">Help</Link>
        </div>
      </footer>
    </div>
  );
}

export default DealGapIQHomepage;
