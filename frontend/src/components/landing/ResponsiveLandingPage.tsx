'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { StrategyCard } from './StrategyCard';
import { FeatureCard } from './FeatureCard';
import { Footer } from './Footer';
import { TryItNowModal } from './TryItNowModal';
import { strategies, features, howItWorksSteps, capabilityStats, trustStats, testimonials } from './types';
import { 
  Camera, 
  BarChart3, 
  TrendingUp as Lightbulb, 
  Check, 
  Play,
  Quote,
  Home,
  ArrowRight,
  Database,
  Shield,
  PieChart
} from 'lucide-react';

interface ResponsiveLandingPageProps {
  onPointAndScan?: () => void;
}

// Separate component to handle search params (must be wrapped in Suspense)
function AuthParamHandler() {
  const { setShowAuthModal } = useAuth();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login') {
      setShowAuthModal('login');
    } else if (authParam === 'register') {
      setShowAuthModal('register');
    }
  }, [searchParams, setShowAuthModal]);

  return null;
}

// DealMakerIQ calculation logic
function useDealMakerCalculations(buyPrice: number, downPaymentPct: number, monthlyRent: number) {
  const downPayment = buyPrice * (downPaymentPct / 100);
  const closingCosts = buyPrice * 0.03;
  const cashNeeded = downPayment + closingCosts;

  const loanAmount = buyPrice - downPayment;
  const monthlyRate = 0.07 / 12;
  const numPayments = 360;
  const mortgagePayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  const totalMonthlyExpenses = mortgagePayment +
    (buyPrice * 0.012) / 12 + // Property tax
    150 + // Insurance
    monthlyRent * 0.05 + // Vacancy
    monthlyRent * 0.05; // Maintenance

  const monthlyFlow = monthlyRent - totalMonthlyExpenses;
  const annualFlow = monthlyFlow * 12;
  const cocReturn = (annualFlow / cashNeeded) * 100;

  let verdict: string;
  if (cocReturn >= 8) verdict = 'Great Deal';
  else if (cocReturn >= 4) verdict = 'Good Deal';
  else if (cocReturn >= 0) verdict = 'Marginal';
  else verdict = 'Risky';

  return { cashNeeded, monthlyFlow, cocReturn, verdict };
}

// Format helpers
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyShort = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'K';
  }
  return formatCurrency(value);
};

export function ResponsiveLandingPage({ onPointAndScan }: ResponsiveLandingPageProps) {
  const { user, isAuthenticated, setShowAuthModal } = useAuth();
  const [showTryItNowModal, setShowTryItNowModal] = useState(false);
  
  // DealMakerIQ State
  const [buyPrice, setBuyPrice] = useState(350000);
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [monthlyRent, setMonthlyRent] = useState(2800);
  
  const metrics = useDealMakerCalculations(buyPrice, downPaymentPct, monthlyRent);

  const handleTryItNow = () => {
    setShowTryItNowModal(true);
  };

  const handleScanProperty = () => {
    if (onPointAndScan) {
      onPointAndScan();
    }
  };

  return (
    <div className="landing-page">
      {/* Handle auth query params */}
      <Suspense fallback={null}>
        <AuthParamHandler />
      </Suspense>

      {/* Header */}
      <header className="landing-header">
        <div className="container header-inner">
          <Link href="/" className="logo">
            Invest<span>IQ</span>
          </Link>
          
          <nav className="nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#strategies">Strategies</a>
            <a href="#features">Features</a>
          </nav>
          
          <div className="header-cta">
            {isAuthenticated && user ? (
              <Link href="/dashboard" className="btn btn-ghost">
                Dashboard
              </Link>
            ) : (
              <>
                <button 
                  onClick={() => setShowAuthModal('login')} 
                  className="btn btn-ghost"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowAuthModal('register')} 
                  className="btn btn-primary"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero" id="demo">
        <div className="container">
          <div className="hero-grid">
            {/* Text Content */}
            <div className="hero-text">
              <div className="hero-eyebrow">
                <span className="hero-eyebrow-icon">🚀</span>
                <span className="hero-eyebrow-text">Early Access — Limited Beta</span>
              </div>
              
              <h1>
                Point. Scan.<br/>
                <span className="highlight">Invest Smarter.</span>
              </h1>
              <p className="hero-subtitle">
                Point your phone at any property and get professional-grade investment analysis across 6 strategies in 60 seconds. No spreadsheets. No guesswork.
              </p>
              <div className="hero-cta">
                <button onClick={handleTryItNow} className="btn btn-primary btn-large">
                  Scan Your First Property Free
                </button>
                <button onClick={handleTryItNow} className="btn btn-ghost">
                  <Play size={20} />
                  Watch Demo
                </button>
              </div>
              <div className="trust-signals">
                <span>
                  <Check className="icon" size={16} />
                  No credit card required
                </span>
                <span>
                  <Check className="icon" size={16} />
                  3 free property scans
                </span>
              </div>
              
              {/* Trust Stats Bar - Data credibility signals */}
              <div className="trust-stats-bar">
                {trustStats.map((stat, idx) => {
                  const IconComponent = stat.icon === 'chart' ? PieChart : stat.icon === 'database' ? Database : Shield;
                  return (
                    <div key={idx} className="trust-stat-item">
                      <IconComponent size={14} className="trust-stat-icon" />
                      <span className="trust-stat-value">{stat.value}</span>
                      <span className="trust-stat-label">{stat.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phone Visual */}
            <div className="hero-visual">
              <div className="phone-glow"></div>
              <div className="phone-mockup">
                <div className="phone-screen">
                  <div className="phone-notch"></div>
                  <div className="phone-content">
                    <div className="phone-header">
                      <div className="phone-logo">IQ</div>
                      <span className="phone-title">InvestIQ</span>
                    </div>

                    <div className="scan-animation">
                      <div className="phone-house-scan">
                        <div className="phone-house-container">
                          <svg viewBox="0 0 100 100" fill="none">
                            <path d="M50 10L10 40V90H40V65H60V90H90V40L50 10Z" stroke="#00D4FF" strokeWidth="2" />
                            <rect x="42" y="45" width="16" height="16" stroke="#00D4FF" strokeWidth="1.5" />
                            <path d="M10 40L50 10L90 40" stroke="#00D4FF" strokeWidth="2" />
                          </svg>
                          <div className="phone-scan-line-overlay">
                            <div className="phone-scan-line"></div>
                          </div>
                          <div className="phone-scan-brackets">
                            <div className="phone-scan-bracket tl"></div>
                            <div className="phone-scan-bracket tr"></div>
                            <div className="phone-scan-bracket bl"></div>
                            <div className="phone-scan-bracket br"></div>
                          </div>
                        </div>
                      </div>
                      <div className="scan-status">
                        <div className="scan-status-text">Scanning Property...</div>
                        <div className="scan-status-address">1842 Investor Lane, Denver</div>
                      </div>
                    </div>

                    <div className="phone-results">
                      <div className="phone-results-header">
                        <span className="phone-results-label">Analysis Complete</span>
                        <span className="phone-results-badge">✓ 6 Strategies</span>
                      </div>
                      <div className="phone-results-grid">
                        <div className="phone-result-item">
                          <div className="phone-result-value cyan">14.3%</div>
                          <div className="phone-result-label">ROI</div>
                        </div>
                        <div className="phone-result-item">
                          <div className="phone-result-value cyan">$187</div>
                          <div className="phone-result-label">Cash Flow</div>
                        </div>
                        <div className="phone-result-item">
                          <div className="phone-result-value cyan">8.2%</div>
                          <div className="phone-result-label">Cap Rate</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capability Stats Bar */}
      <section className="capability-bar">
        <div className="container">
          <div className="capability-inner">
            {capabilityStats.map((stat, idx) => (
              <div key={idx} className="capability-item">
                <div className="capability-value">{stat.value}</div>
                <div className="capability-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Simple 3-Step Process</div>
            <h2 className="section-title">How <span className="highlight">Point & Scan</span> Works</h2>
            <p className="section-subtitle">
              No more spreadsheets. No more guesswork. Professional-grade analysis in the time it takes to snap a photo.
            </p>
          </div>

          <div className="steps-grid">
            {howItWorksSteps.map((step) => {
              const StepIcon = step.number === 1 ? Camera : step.number === 2 ? BarChart3 : Lightbulb;
              return (
                <div key={step.number} className={`step-card step-${step.number}`}>
                  <div className="step-icon">
                    <StepIcon size={28} />
                  </div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-description">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DealMakerIQ Section */}
      <section className="dealmaker-section" id="dealmaker">
        <div className="container">
          <div className="dealmaker-header">
            <span className="dealmaker-badge">Deal<span className="dealmaker-badge-accent">Maker</span>IQ</span>
            <h2 className="dealmaker-title">Dial In Your Perfect Deal</h2>
            <p className="dealmaker-subtitle">
              Adjust the numbers and watch your returns update in real time. This is how smart investors model deals before making offers.
            </p>
          </div>

          <div className="dealmaker-card">
            {/* Property Header */}
            <div className="dealmaker-property">
              <div className="dealmaker-property-icon">
                <Home size={22} className="text-teal-600" />
              </div>
              <div className="dealmaker-property-info">
                <div className="dealmaker-property-address">3742 Lighthouse Circle, Boca Raton, FL</div>
                <div className="dealmaker-property-specs">4 bed · 2 bath · 1,850 sqft</div>
              </div>
              <div className="dealmaker-sample-badge">Sample</div>
            </div>

            {/* Interactive Sliders */}
            <div className="dealmaker-sliders">
              <div className="dealmaker-slider-group">
                <div className="dealmaker-slider-label">
                  <span className="dealmaker-slider-label-text">Buy Price</span>
                  <span className="dealmaker-slider-value">{formatCurrency(buyPrice)}</span>
                </div>
                <input
                  type="range"
                  className="dealmaker-slider"
                  min="200000"
                  max="600000"
                  step="5000"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(parseInt(e.target.value))}
                />
                <div className="dealmaker-slider-range">
                  <span>$200K</span>
                  <span>$600K</span>
                </div>
              </div>

              <div className="dealmaker-slider-group">
                <div className="dealmaker-slider-label">
                  <span className="dealmaker-slider-label-text">Down Payment</span>
                  <span className="dealmaker-slider-value">{downPaymentPct}%</span>
                </div>
                <input
                  type="range"
                  className="dealmaker-slider"
                  min="5"
                  max="50"
                  step="1"
                  value={downPaymentPct}
                  onChange={(e) => setDownPaymentPct(parseInt(e.target.value))}
                />
                <div className="dealmaker-slider-range">
                  <span>5%</span>
                  <span>50%</span>
                </div>
              </div>

              <div className="dealmaker-slider-group">
                <div className="dealmaker-slider-label">
                  <span className="dealmaker-slider-label-text">Monthly Rent</span>
                  <span className="dealmaker-slider-value">{formatCurrency(monthlyRent)}</span>
                </div>
                <input
                  type="range"
                  className="dealmaker-slider"
                  min="1500"
                  max="5000"
                  step="50"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(parseInt(e.target.value))}
                />
                <div className="dealmaker-slider-range">
                  <span>$1,500</span>
                  <span>$5,000</span>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="dealmaker-metrics">
              <div className="dealmaker-metric">
                <div className="dealmaker-metric-label">Cash Needed</div>
                <div className="dealmaker-metric-value">{formatCurrencyShort(metrics.cashNeeded)}</div>
              </div>
              <div className="dealmaker-metric">
                <div className="dealmaker-metric-label">Monthly Flow</div>
                <div className={`dealmaker-metric-value ${metrics.monthlyFlow >= 0 ? 'positive' : 'negative'}`}>
                  {metrics.monthlyFlow >= 0 ? '+' : ''}{formatCurrency(Math.round(metrics.monthlyFlow))}
                </div>
              </div>
              <div className="dealmaker-metric">
                <div className="dealmaker-metric-label">COC Return</div>
                <div className={`dealmaker-metric-value ${metrics.cocReturn >= 4 ? 'positive' : metrics.cocReturn >= 0 ? '' : 'negative'}`}>
                  {metrics.cocReturn.toFixed(1)}%
                </div>
              </div>
              <div className="dealmaker-metric verdict">
                <div className="dealmaker-metric-label">IQ Verdict</div>
                <div className="dealmaker-metric-value verdict-text">{metrics.verdict}</div>
              </div>
            </div>

            {/* CTA Button */}
            <button className="dealmaker-cta" onClick={handleTryItNow}>
              Try DealMakerIQ Free
              <ArrowRight size={20} />
            </button>
          </div>

          {/* Feature Pills */}
          <div className="dealmaker-pills">
            {['15+ Variables', '6 Strategies', 'Instant Updates', 'PDF Reports'].map((pill) => (
              <div key={pill} className="dealmaker-pill">
                <Check size={16} className="text-teal-600" />
                {pill}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Quote Section */}
      <section className="founder-quote">
        <div className="container">
          <div className="founder-quote-inner">
            <div className="founder-quote-icon">
              <Quote size={24} />
            </div>
            <p className="founder-quote-text">
              &ldquo;I analyzed 200+ properties manually before my first purchase—each taking 30+ minutes in spreadsheets. InvestIQ is the tool I wish existed. Now you can screen deals in seconds, not hours.&rdquo;
            </p>
            <div className="founder-quote-author">
              <div className="founder-avatar">H</div>
              <div className="founder-info">
                <h4>Humble</h4>
                <p>Founder, InvestIQ</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <div className="section-header">
            <div className="section-label">What Investors Say</div>
            <h2 className="section-title">Real Results from <span className="highlight">Real Investors</span></h2>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-quote">
                  <Quote size={20} className="testimonial-quote-icon" />
                </div>
                <p className="testimonial-text">&ldquo;{testimonial.text}&rdquo;</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{testimonial.initials}</div>
                  <div className="testimonial-info">
                    <h4>{testimonial.authorName}</h4>
                    <p>{testimonial.authorTitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategies Section */}
      <section className="strategies-section" id="strategies">
        <div className="container">
          <div className="section-header">
            <div className="section-label">6 Investment Strategies</div>
            <h2 className="section-title">One Property, Multiple Opportunities</h2>
            <p className="section-subtitle">
              See how any property performs across all major real estate investment strategies—instantly.
            </p>
          </div>
          <div className="strategy-grid">
            {strategies.map((strategy) => (
              <StrategyCard key={strategy.id} strategy={strategy} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Everything You Need</div>
            <h2 className="section-title">What You Get with <span className="highlight">InvestIQ</span></h2>
          </div>
          <div className="features-grid">
            {features.map((feature, idx) => (
              <FeatureCard key={idx} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container cta-content">
          <div className="section-label">Get Started Today</div>
          <h2 className="cta-title">
            Analyze Your First Property <span className="highlight">Free</span>
          </h2>
          <p className="cta-subtitle">
            Point your camera at any property and get genius-level analysis across 6 strategies. No credit card required.
          </p>
          <div className="cta-buttons">
            <button onClick={handleTryItNow} className="btn btn-primary btn-large">
              Start Your Free Analysis
            </button>
          </div>
          <div className="app-badges">
            <a href="#" className="app-badge">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="app-badge-text">
                <div className="app-badge-small">Download on the</div>
                <div className="app-badge-large">App Store</div>
              </div>
            </a>
            <a href="#" className="app-badge">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.25-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.59.69.59 1.19s-.22.9-.57 1.18l-2.29 1.32-2.5-2.5 2.5-2.5 2.27 1.31zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z"/>
              </svg>
              <div className="app-badge-text">
                <div className="app-badge-small">Get it on</div>
                <div className="app-badge-large">Google Play</div>
              </div>
            </a>
          </div>
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
