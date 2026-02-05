'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Footer } from './Footer';
import { TryItNowModal } from './TryItNowModal';
import { 
  iqStats, 
  priceIQData, 
  inputMethods, 
  verdictTypes, 
  founderStats, 
  founderInfo,
  iqFeatures,
  strategies
} from './types';
import { Play, Check } from 'lucide-react';

interface ResponsiveLandingPageProps {
  onPointAndScan?: () => void;
}

// Separate component to handle search params (must be wrapped in Suspense)
function AuthParamHandler() {
  const { setShowAuthModal } = useAuth();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const authParam = searchParams.get('auth');
    // Handle all auth-related query params
    // 'required' is set by the proxy when accessing protected routes
    if (authParam === 'login' || authParam === 'required') {
      setShowAuthModal('login');
    } else if (authParam === 'register') {
      setShowAuthModal('register');
    }
  }, [searchParams, setShowAuthModal]);

  return null;
}

// Format helpers
const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value.toLocaleString()}`;
};

export function ResponsiveLandingPage({ onPointAndScan }: ResponsiveLandingPageProps) {
  const { user, isAuthenticated, setShowAuthModal } = useAuth();
  const [showTryItNowModal, setShowTryItNowModal] = useState(false);
  
  // ModelIQ State
  const [sliderValues, setSliderValues] = useState({
    askingPrice: 385000,
    downPayment: 25,
    monthlyRent: 2950,
    interestRate: 6.5
  });

  const handleSliderChange = (name: string, value: string) => {
    setSliderValues(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleTryItNow = () => {
    setShowTryItNowModal(true);
  };

  const handleScanProperty = () => {
    if (onPointAndScan) {
      onPointAndScan();
    }
  };

  const handleInputMethodClick = (action: 'scan' | 'address' | 'link') => {
    if (action === 'scan') {
      handleScanProperty();
    } else {
      setShowTryItNowModal(true);
    }
  };

  return (
    <div className="landing-page">
      {/* Handle auth query params */}
      <Suspense fallback={null}>
        <AuthParamHandler />
      </Suspense>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            {/* Text Content */}
            <div className="hero-text">
              <div className="hero-badge-wrapper">
                <div className="hero-badge">
                  <span className="hero-badge-dot" />
                  Early Access — Limited Release
                </div>
              </div>
              
              <h1 className="font-display">
                Know Exactly What to Offer in<br />
                <span className="iq">60 Seconds</span>
              </h1>
              <p className="hero-subtitle">
                Point your phone at any property. Get the <span className="highlight">Breakeven</span>, <span className="highlight">Target Buy</span>, and <span className="highlight">Wholesale</span> Price instantly — plus analysis across 6 investment strategies.
              </p>
              <div className="hero-cta">
                <button onClick={handleTryItNow} className="btn btn-glow">
                  Get Your Target Price Free
                </button>
                <button onClick={handleTryItNow} className="btn btn-outline">
                  <Play size={20} />
                  Watch Demo
                </button>
              </div>
              <p className="hero-fine-print">No credit card required • 3 free property analyses</p>
            </div>

            {/* Phone Mockup */}
            <div className="phone-container">
              <div className="phone-mockup">
                <div className="phone-outer">
                  <div className="phone-inner">
                    <div className="phone-header">
                      <span className="phone-logo font-display">
                        DealMaker<span className="iq-cyan">IQ</span>
                      </span>
                      <div className="phone-status">
                        <span className="phone-status-dot" />
                        <span className="phone-status-text">Live</span>
                      </div>
                    </div>

                    <div className="phone-scan-card">
                      <p className="phone-scan-label">
                        Scan<span className="iq-cyan">IQ</span> Detected
                      </p>
                    </div>

                    {/* Target Hero - Featured Number */}
                    <div className="phone-target-hero">
                      <div className="phone-target-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="6" />
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                      </div>
                      <p className="phone-target-label font-display">
                        Target<span style={{ color: 'white' }}>IQ</span>
                      </p>
                      <p className="phone-target-value font-display">$766,733</p>
                      <p className="phone-target-sub">Your optimal offer price</p>
                    </div>

                    {/* Breakeven Row */}
                    <div className="phone-breakeven-row">
                      <div className="phone-breakeven-left">
                        <p className="phone-breakeven-label">
                          Breakeven<span className="iq-cyan">IQ</span>
                        </p>
                        <p className="phone-breakeven-value font-display">$807,087</p>
                      </div>
                      <p className="phone-breakeven-sub">Ceiling — don&apos;t cross it</p>
                    </div>

                    {/* Verdict */}
                    <div className="phone-verdict">
                      <p className="phone-verdict-label">
                        Verdict<span style={{ color: 'white' }}>IQ</span>
                      </p>
                      <p className="phone-verdict-text font-display">✓ Strong Buy</p>
                      <p className="phone-verdict-desc">
                        Starting offer - $699K below Target<span style={{ color: 'white' }}>IQ</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IQ Stats Bar */}
      <section className="iq-stats-bar">
        <div className="container">
          <div className="iq-stats-grid">
            {iqStats.map((stat, i) => (
              <div key={i} className="iq-stat-item">
                <div className="iq-stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={stat.icon} />
                  </svg>
                </div>
                <p className="iq-stat-name font-display">
                  {stat.name}<span className="iq">IQ</span>
                </p>
                <p className="iq-stat-desc">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PriceIQ Section */}
      <section id="priceiq" className="priceiq-section">
        <div className="container">
          <div className="priceiq-header">
            <p className="priceiq-label">
              Price<span className="iq-cyan">IQ</span> — The Core Difference
            </p>
            <h2 className="priceiq-title font-display">
              Stop Guessing What to Offer
            </h2>
            <p className="priceiq-subtitle">
              DealMaker<span className="iq">IQ</span> doesn&apos;t just tell you if it&apos;s a deal. It tells you exactly what to pay — and why.
            </p>
          </div>

          <div className="priceiq-card">
            <div className="priceiq-sample">
              <p className="priceiq-sample-address font-display">
                The only site that looks at residential real estate as an investor.
              </p>
            </div>

            <div className="priceiq-prices">
              {priceIQData.map((price, i) => (
                <div key={i} className={`price-card ${price.featured ? 'featured' : ''}`}>
                  <div className="price-card-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      {price.featured ? (
                        <>
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="6" />
                          <circle cx="12" cy="12" r="2" />
                        </>
                      ) : i === 0 ? (
                        <line x1="5" y1="12" x2="19" y2="12" />
                      ) : (
                        <>
                          <polyline points="17 1 21 5 17 9" />
                          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                          <polyline points="7 23 3 19 7 15" />
                          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </>
                      )}
                    </svg>
                  </div>
                  <p className="price-card-name font-display">
                    {price.name}<span className={price.featured ? '' : 'iq-cyan'}>{price.suffix}</span>
                  </p>
                  <p className="price-card-value font-display">{price.value}</p>
                  <p className="price-card-desc">{price.description}</p>
                  <p className={`price-card-subtext ${i === 0 ? 'price-card-subtext-nowrap' : ''}`}>{price.subtext}</p>
                  {price.subtext2 && <p className="price-card-subtext">{price.subtext2}</p>}
                </div>
              ))}
            </div>

            <div className="priceiq-difference">
              <p className="priceiq-difference-title font-display">
                The Difference That Matters
              </p>
              <p className="priceiq-difference-text">
                Most calculators tell you what your ROI <em>would be</em> at a given price.<br />
                DealMaker<span className="iq">IQ</span> tells you what price <em>to offer</em> to hit your target returns.<br />
                <strong>That&apos;s the difference between analysis and action.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ScanIQ Input Methods Section */}
      <section id="how-it-works" className="scaniq-section">
        <div className="container">
          <div className="section-header">
            <p className="section-label">
              Scan<span className="iq">IQ</span> Input
            </p>
            <h2 className="section-title font-display">
              Feed It Any Property
            </h2>
            <p className="section-subtitle">
              Scan a For Sale sign. Paste an address. Drop in an MLS link. DealMaker<span className="iq">IQ</span> doesn&apos;t care how you find deals — it analyzes them all.
            </p>
          </div>

          <div className="input-methods-grid">
            {inputMethods.map((method, i) => (
              <button
                key={i}
                className="input-method-card"
                onClick={() => handleInputMethodClick(method.action)}
              >
                <div className="input-method-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={method.icon} />
                  </svg>
                </div>
                <h3 className="input-method-title font-display">{method.title}</h3>
                <p className="input-method-desc">{method.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ModelIQ Demo Section */}
      <section className="modeliq-section">
        <div className="container">
          <div className="section-header">
            <p className="section-label">
              Model<span className="iq">IQ</span> Engine
            </p>
            <h2 className="section-title font-display">
              Dial In Your Numbers. Get Your Prices.
            </h2>
            <p className="section-subtitle">
              Adjust the deal. Watch your Price<span className="iq">IQ</span> update in real time. This is how professionals model offers.
            </p>
          </div>

          <div className="modeliq-card">
            <div className="modeliq-sliders">
              <h4 className="font-display">
                Model<span className="iq-cyan">IQ</span> Variables
              </h4>
              
              {[
                { name: 'askingPrice', label: 'Asking Price', min: 200000, max: 600000, format: (v: number) => `$${v.toLocaleString()}` },
                { name: 'downPayment', label: 'Down Payment', min: 5, max: 50, format: (v: number) => `${v}%` },
                { name: 'monthlyRent', label: 'Monthly Rent', min: 1500, max: 5000, format: (v: number) => `$${v.toLocaleString()}` },
                { name: 'interestRate', label: 'Interest Rate', min: 4, max: 10, format: (v: number) => `${v}%`, step: 0.1 },
              ].map((slider) => (
                <div key={slider.name} className="slider-group">
                  <div className="slider-header">
                    <span className="slider-label">{slider.label}</span>
                    <span className="slider-value font-display">
                      {slider.format(sliderValues[slider.name as keyof typeof sliderValues])}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="slider-input"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step || 1}
                    value={sliderValues[slider.name as keyof typeof sliderValues]}
                    onChange={(e) => handleSliderChange(slider.name, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="modeliq-results">
              <h4 className="font-display">
                Price<span className="iq-cyan">IQ</span> Results
              </h4>
              <div className="modeliq-results-grid">
                <div className="result-card">
                  <p className="result-label">Breakeven</p>
                  <p className="result-value font-display">$456K</p>
                </div>
                <div className="result-card featured">
                  <p className="result-label">Target</p>
                  <p className="result-value font-display">{formatCurrency(sliderValues.askingPrice)}</p>
                </div>
                <div className="result-card">
                  <p className="result-label">Wholesale</p>
                  <p className="result-value font-display">$319K</p>
                </div>
              </div>
              <div className="metrics-grid">
                <div className="metric-card">
                  <p className="metric-label">Monthly Flow</p>
                  <p className="metric-value font-display positive">+$412</p>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Cash-on-Cash</p>
                  <p className="metric-value font-display">9.7%</p>
                </div>
              </div>
              <div className="modeliq-verdict">
                <p className="modeliq-verdict-label">VerdictIQ</p>
                <p className="modeliq-verdict-value font-display">✓ Strong Buy</p>
              </div>
            </div>
          </div>

          <div className="modeliq-cta">
            <button onClick={handleTryItNow} className="btn btn-glow">
              Try Model<span className="iq">IQ</span> Free
            </button>
          </div>
        </div>
      </section>

      {/* VerdictIQ Section */}
      <section className="verdictiq-section">
        <div className="container">
          <div className="section-header">
            <p className="section-label">
              Verdict<span className="iq">IQ</span> Output
            </p>
            <h2 className="section-title font-display">
              Get a Verdict, Not a Spreadsheet
            </h2>
            <p className="section-subtitle">
              Verdict<span className="iq">IQ</span> tells you what the numbers mean — based on where the asking price falls relative to your Price<span className="iq">IQ</span>.
            </p>
          </div>

          <div className="verdict-cards">
            {verdictTypes.map((item, i) => (
              <div key={i} className={`verdict-card ${item.color}`}>
                <span className="verdict-badge">{item.verdict}</span>
                <h3 className="verdict-title font-display">{item.title}</h3>
                <p className="verdict-desc">{item.description}</p>
                <div className="verdict-logic">
                  <strong>Logic:</strong> {item.logic}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* StrategyIQ Section */}
      <section id="strategies" className="strategyiq-section">
        <div className="container">
          <div className="section-header">
            <p className="section-label">
              Strategy<span className="iq">IQ</span> Framework
            </p>
            <h2 className="section-title font-display">
              One Property. Six Opportunities.
            </h2>
            <p className="section-subtitle">
              Most investors analyze one strategy at a time. DealMaker<span className="iq">IQ</span> shows you all six — instantly.
            </p>
          </div>

          <div className="strategy-grid">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="strategy-card">
                {strategy.badge && (
                  <span className="strategy-badge">{strategy.badge}</span>
                )}
                <h3 className="strategy-name font-display">{strategy.name}</h3>
                <span className="strategy-metric">
                  {strategy.statValue} {strategy.statLabel}
                </span>
                <p className="strategy-desc">{strategy.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section id="founder" className="founder-section">
        <div className="container">
          <div className="founder-content-centered">
            <p className="founder-label">
              From the Pioneer Behind the Platforms You Already Use
            </p>
            <p className="founder-quote">
              &ldquo;I built <strong>HomePath.com</strong> for Fannie Mae and <strong>HomeSteps.com</strong> for Freddie Mac. Founded <strong>Foreclosure.com</strong> before data platforms existed and spent 35 years building the infrastructure institutions depend on. <span className="highlight">DealMakerIQ</span> puts that same intelligence in your hands.&rdquo;
            </p>
            <p className="founder-name font-display">{founderInfo.name}</p>
            <p className="founder-title">{founderInfo.title}</p>
            <div className="founder-credentials-inline">
              {founderInfo.credentials.map((cred, i) => (
                <span key={i} className="founder-credential">{cred}</span>
              ))}
            </div>
            <div className="founder-stats">
              {founderStats.map((stat, i) => (
                <div key={i} className="founder-stat">
                  <p className="founder-stat-value font-display">{stat.value}</p>
                  <p className="founder-stat-label">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <p className="section-label">
              Complete <span className="iq">IQ</span> Toolkit
            </p>
            <h2 className="section-title font-display">
              Everything You Need to Analyze Deals
            </h2>
          </div>

          <div className="features-grid">
            {iqFeatures.map((feature, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
                  </svg>
                </div>
                <h3 className="feature-name font-display">
                  {feature.name}{feature.hasIQ && <span className="iq">IQ</span>}
                  {!feature.hasIQ && ' Analysis'}
                </h3>
                <p className="feature-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container cta-content">
          <h2 className="cta-title font-display">
            Get Your Target Price Free
          </h2>
          <p className="cta-subtitle">
            Point. Scan. Know exactly what to offer in 60 seconds.
          </p>
          <button onClick={handleTryItNow} className="btn btn-glow" style={{ fontSize: '1.125rem', padding: '20px 40px' }}>
            Start Your Free Analysis
          </button>
          <p className="cta-tagline font-display">
            Point. Scan. Know.
          </p>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Try It Now Modal */}
      <TryItNowModal
        isOpen={showTryItNowModal}
        onClose={() => setShowTryItNowModal(false)}
        onScanProperty={handleScanProperty}
      />
    </div>
  );
}
