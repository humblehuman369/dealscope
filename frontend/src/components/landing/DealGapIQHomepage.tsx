'use client';

import React, { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthModal } from '@/hooks/useAuthModal';
import './dealgapiq-homepage.css';
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

  const scrollToPrices = () => {
    const el = document.querySelector('.prices');
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

  const handleDealGapVideoLoadedData = () => {
    const video = dealGapVideoRef.current;
    if (!video || isDealGapVideoPlaying) return;

    // Force-render a real opening frame instead of a static image poster.
    if (video.currentTime < 0.01) {
      video.currentTime = 0.01;
    }
  };

  return (
    <div style={{ background: 'var(--surface-base)', color: 'var(--text-body)', lineHeight: 1.6, overflowX: 'hidden' }}>

      <Suspense fallback={null}>
        <AuthParamHandler />
      </Suspense>

      {/* HERO */}
      <section className="hero">
        <div className="hero-columns">
          <div className="hero-text">
            <div className="hero-pre">Not a listing site. A deal decision engine.</div>
            <h1>
              See Every Property<br />Through<br />
              <span className="accent">an Investors Lens</span>
            </h1>
            <p className="hero-sub">
              Every listing is designed to sell you.{' '}
              <strong>DealGap<span className="accent-inline">IQ</span> answers the only question that matters to an investor: is this a good deal?</strong>
            </p>
            <div className="hero-cta-group">
              <button className="cta-primary" onClick={handleAnalyzeClick}>
                Analyze Any Property
              </button>
              <button className="cta-ghost" onClick={scrollToPrices}>
                What is DealGapIQ?
              </button>
            </div>
            <p className="hero-note">
              Built for first-time investors. Trusted by experienced buyers.
            </p>
          </div>
          <div className="hero-visual" />
        </div>
      </section>

      {/* FOUNDER SEPARATOR */}
      <section className="founder-separator">
        <div className="founder-separator-inner">
          <img
            src="/images/brad-geisen-separator.png"
            alt="Brad Geisen"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="founder-separator-text">
            <p className="founder-separator-name">Built by Brad Geisen</p>
            <p className="founder-separator-bio">35 years in real estate data, founded Foreclosure.com,<br />built HomePath.com, HomeSteps.com and<br />other industry leading platforms.</p>
          </div>
        </div>
      </section>

      {/* THREE PRICE THRESHOLDS */}
      <section className="prices">
        <div className="prices-inner">
          <div className="section-label">Know the number. See the gap.</div>
          <h2>Every Property Has Three Key Prices</h2>
          <p className="prices-sub">
            DealGapIQ shows what it&apos;s worth (Market Value), what it takes to break even
            (Income Value), and what you should pay to profit (Target Buy), plus exactly how far the asking
            price is from each.
          </p>

          <div
            className={`video-container dealgap-video-combined${isDealGapVideoPlaying ? ' is-playing' : ''}`}
            style={{ maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}
            onClick={!isDealGapVideoPlaying ? playDealGapVideo : undefined}
          >
            <video
              ref={dealGapVideoRef}
              preload="auto"
              playsInline
              controls={isDealGapVideoPlaying}
              src="/videos/what-is-dealgapiq.mp4"
              onLoadedData={handleDealGapVideoLoadedData}
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

      {/* SCAN PROPERTY */}
      <section className="scan-property">
        <div className="scan-inner">
          <div className="scan-layout">
            <div className="scan-image-wrap">
              <img
                src="/images/scan-property-hero.png"
                alt="Investor scanning a property with her phone using DealGapIQ"
                draggable={false}
              />
              <div className="scan-image-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Point &amp; Scan</span>
              </div>
            </div>

            <div className="scan-content">
              <div className="section-label">Scan Any Property</div>
              <h2>See a Property. Scan It.<br />Know the Deal.</h2>
              <p className="scan-lead">
                Spot a house while you&apos;re out? Don&apos;t guess — <strong>scan it.</strong>
              </p>
              <p className="scan-body">
                With DealGapIQ, simply point your phone, tap once, and instantly capture the property.
                Behind the scenes, DealGapIQ analyzes value, cash flow potential, and deal viability in seconds — so you know if it&apos;s worth pursuing before anyone else does.
              </p>

              <div className="scan-highlights">
                <div className="scan-highlight">
                  <div className="scan-highlight-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div>
                    <h3>No Address Entry. No Delays.</h3>
                    <p>Just real-time investment intelligence.</p>
                  </div>
                </div>
                <div className="scan-highlight">
                  <div className="scan-highlight-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <div>
                    <h3>Saved to Your Dashboard</h3>
                    <p>Scan now — come back for full analysis whenever you&apos;re ready.</p>
                  </div>
                </div>
                <div className="scan-highlight">
                  <div className="scan-highlight-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <h3>Never Miss an Opportunity</h3>
                    <p>DealGapIQ captures, analyzes, and saves — so deals don&apos;t slip by.</p>
                  </div>
                </div>
              </div>

              <p className="scan-closing">
                Opportunities don&apos;t wait until you get back to your desk. <strong>Now, neither does your analysis.</strong>
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
