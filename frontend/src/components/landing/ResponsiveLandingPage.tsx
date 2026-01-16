'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { StrategyCard } from './StrategyCard';
import { FeatureCard } from './FeatureCard';
import { Footer } from './Footer';
import { ScanDemoSection } from './ScanDemoSection';
import { TryItNowModal } from './TryItNowModal';
import { strategies, features, stats, howItWorksSteps, testimonials, aboutCards } from './types';
import { 
  Camera, 
  BarChart3, 
  Lightbulb, 
  Check, 
  Play,
  Quote,
  Database,
  Calculator,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

interface ResponsiveLandingPageProps {
  onPointAndScan?: () => void;
}

export function ResponsiveLandingPage({ onPointAndScan }: ResponsiveLandingPageProps) {
  const { user, isAuthenticated, setShowAuthModal } = useAuth();
  const [showTryItNowModal, setShowTryItNowModal] = useState(false);
  const searchParams = useSearchParams();

  // Check for auth query param to open auth modal (e.g., after email verification)
  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login') {
      setShowAuthModal('login');
    } else if (authParam === 'register') {
      setShowAuthModal('register');
    }
  }, [searchParams, setShowAuthModal]);

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
      {/* Header */}
      <header className="landing-header">
        <div className="container header-inner">
          <Link href="/" className="logo">
            Invest<span>IQ</span>
          </Link>
          
          <nav className="nav-links">
            <a href="#demo">Demo</a>
            <a href="#strategies">Strategies</a>
            <a href="#features">Features</a>
          </nav>
          
          <div className="header-cta">
            {isAuthenticated && user ? (
              <>
                <Link href="/dashboard" className="btn btn-ghost">
                  Dashboard
                </Link>
              </>
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
          <div className="hero-content">
            <div className="hero-grid">
              {/* Text Content */}
              <div className="hero-text">
                <div className="hero-eyebrow">
                  <span className="hero-eyebrow-text">Intel for Real Estate Investors</span>
                </div>
                
                <h1>
                  Point. Scan.<br/>
                  <span className="highlight">Invest Smarter.</span>
                </h1>
                <p className="hero-subtitle">
                  Just point your phone at a property, IQ collects<br/>
                  real-time multi-source market info and analyzes across<br/>
                  <strong>six investment strategies</strong> in 60 seconds.
                </p>
                <div className="hero-cta">
                  <button onClick={handleTryItNow} className="btn btn-primary btn-large">
                    <Camera size={20} />
                    Try It Now Free
                  </button>
                  <a href="#cta" className="btn btn-ghost">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    Enter Address
                  </a>
                </div>
                <div className="trust-signals">
                  <span>
                    <Check className="icon" size={16} />
                    Start Free
                  </span>
                  <span>
                    <Check className="icon" size={16} />
                    No Credit Card
                  </span>
                  <span>
                    <Check className="icon" size={16} />
                    Instant Results
                  </span>
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
                        {/* House Being Scanned */}
                        <div className="phone-house-scan">
                          <div className="phone-house-container">
                            <svg viewBox="0 0 300 320" fill="none" xmlns="http://www.w3.org/2000/svg">
                              {/* House body fill */}
                              <path d="M150 50 L260 130 L260 290 L40 290 L40 130 Z" fill="rgba(77, 208, 225, 0.03)" stroke="rgba(77, 208, 225, 0.5)" strokeWidth="1.5"/>
                              {/* Roof */}
                              <path d="M150 30 L20 120 L40 120 L40 130 L150 50 L260 130 L260 120 L280 120 Z" fill="rgba(77, 208, 225, 0.05)" stroke="rgba(77, 208, 225, 0.7)" strokeWidth="2"/>
                              {/* Chimney */}
                              <rect x="195" y="65" width="25" height="45" fill="rgba(77, 208, 225, 0.03)" stroke="rgba(77, 208, 225, 0.5)" strokeWidth="1.5"/>
                              {/* Front Door */}
                              <rect x="130" y="195" width="40" height="75" rx="3" fill="rgba(77, 208, 225, 0.08)" stroke="rgba(77, 208, 225, 0.7)" strokeWidth="2"/>
                              <circle cx="160" cy="235" r="3" fill="rgba(77, 208, 225, 0.9)"/>
                              {/* Door frame top */}
                              <path d="M125 195 L150 180 L175 195" stroke="rgba(77, 208, 225, 0.5)" strokeWidth="1.5" fill="none"/>
                              {/* Left Window */}
                              <rect x="60" y="155" width="45" height="40" rx="2" fill="rgba(77, 208, 225, 0.05)" stroke="rgba(77, 208, 225, 0.7)" strokeWidth="1.5"/>
                              <line x1="82.5" y1="155" x2="82.5" y2="195" stroke="rgba(77, 208, 225, 0.4)" strokeWidth="1"/>
                              <line x1="60" y1="175" x2="105" y2="175" stroke="rgba(77, 208, 225, 0.4)" strokeWidth="1"/>
                              {/* Right Window */}
                              <rect x="195" y="155" width="45" height="40" rx="2" fill="rgba(77, 208, 225, 0.05)" stroke="rgba(77, 208, 225, 0.7)" strokeWidth="1.5"/>
                              <line x1="217.5" y1="155" x2="217.5" y2="195" stroke="rgba(77, 208, 225, 0.4)" strokeWidth="1"/>
                              <line x1="195" y1="175" x2="240" y2="175" stroke="rgba(77, 208, 225, 0.4)" strokeWidth="1"/>
                              {/* Garage Door */}
                              <rect x="60" y="225" width="50" height="45" rx="2" fill="rgba(77, 208, 225, 0.05)" stroke="rgba(77, 208, 225, 0.5)" strokeWidth="1.5"/>
                              <line x1="60" y1="238" x2="110" y2="238" stroke="rgba(77, 208, 225, 0.3)" strokeWidth="1"/>
                              <line x1="60" y1="252" x2="110" y2="252" stroke="rgba(77, 208, 225, 0.3)" strokeWidth="1"/>
                              {/* Ground line */}
                              <line x1="20" y1="290" x2="280" y2="290" stroke="rgba(77, 208, 225, 0.4)" strokeWidth="1"/>
                            </svg>
                            
                            {/* Scan line overlay */}
                            <div className="phone-scan-line-overlay">
                              <div className="phone-scan-line"></div>
                            </div>
                            
                            {/* Corner brackets */}
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
                            <div className="phone-result-value green">14.3%</div>
                            <div className="phone-result-label">ROI</div>
                          </div>
                          <div className="phone-result-item">
                            <div className="phone-result-value cyan">$187</div>
                            <div className="phone-result-label">Cash Flow</div>
                          </div>
                          <div className="phone-result-item">
                            <div className="phone-result-value blue">8.2%</div>
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
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="social-proof">
        <div className="container">
          <div className="social-proof-inner">
            <div className="social-proof-item">
              <div className="social-proof-live"></div>
              <span className="social-proof-number">23,847</span>
              <span className="social-proof-label">properties analyzed</span>
            </div>
            <div className="social-proof-divider"></div>
            <div className="social-proof-item">
              <span className="social-proof-number">4.9</span>
              <div className="social-proof-stars">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                ))}
              </div>
              <span className="social-proof-label">from 2,400+ investors</span>
            </div>
            <div className="social-proof-divider"></div>
            <div className="social-proof-item">
              <span className="social-proof-number">60 sec</span>
              <span className="social-proof-label">avg. analysis time</span>
            </div>
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
              No more spreadsheets. No more guesswork. Get professional-grade investment analysis in the time it takes to snap a photo.
            </p>
          </div>

          <div className="steps-grid">
            {howItWorksSteps.map((step) => {
              const StepIcon = step.number === 1 ? Camera : step.number === 2 ? BarChart3 : Lightbulb;
              return (
                <div key={step.number} className={`step-card step-${step.number}`}>
                  <div className="step-bg-number">{step.number}</div>
                  <div className="step-icon">
                    <StepIcon size={28} />
                  </div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-description">{step.description}</p>
                  <ul className="step-features">
                    {step.features.map((feature, idx) => (
                      <li key={idx}>
                        <Check className="icon" size={16} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="video-cta">
            <button className="video-btn">
              <div className="video-btn-icon">
                <Play size={20} fill="currentColor" />
              </div>
              <div className="video-btn-text">
                <div className="video-btn-title">Watch Demo</div>
                <div className="video-btn-subtitle">See Point & Scan in action (30 sec)</div>
              </div>
            </button>
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
              Instantly see how any property performs across all major real estate investment strategies.
            </p>
          </div>
          <div className="strategy-grid">
            {strategies.map((strategy) => (
              <StrategyCard key={strategy.id} strategy={strategy} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {stats.map((stat, idx) => (
              <div key={idx} className="stat-item">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
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
            <p className="section-subtitle">
              Professional-grade investment analysis tools designed for modern real estate investors.
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, idx) => (
              <FeatureCard key={idx} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Trusted by Investors</div>
            <h2 className="section-title">What Investors Are <span className="highlight">Saying</span></h2>
          </div>

          <div className="testimonials-grid">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-quote-icon">
                  <Quote size={16} />
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

          <div className="testimonials-stats">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">23,847+</div>
                <div className="stat-label">Properties Analyzed</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">6</div>
                <div className="stat-label">Investment Strategies</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">60 sec</div>
                <div className="stat-label">Average Analysis Time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about" id="about">
        <div className="container">
          <div className="about-grid">
            <div className="about-content">
              <div className="section-label">Built by Investors, For Investors</div>
              <h2 className="section-title">Why We Built <span className="highlight">InvestIQ</span></h2>
              
              <p className="about-text">
                I analyzed over 200 properties before my first purchase—each one taking 30+ minutes to run the numbers in spreadsheets. That&apos;s more than 100 hours of tedious calculations.
              </p>
              <p className="about-text">
                InvestIQ was born from that frustration. I knew there had to be a faster way to screen deals without sacrificing accuracy. A way to analyze properties on the go, in real-time, as I drove past them.
              </p>
              <p className="about-text">
                <strong>Now, thousands of investors use InvestIQ to screen properties in seconds, not hours. Because the best deals don&apos;t wait.</strong>
              </p>

              <div className="about-author">
                <div className="about-author-avatar">H</div>
                <div className="about-author-info">
                  <h4>Humble</h4>
                  <p>Founder, InvestIQ</p>
                </div>
              </div>
            </div>

            <div className="about-cards">
              {aboutCards.map((card, idx) => {
                const IconComponent = card.icon === 'database' ? Database : card.icon === 'calculator' ? Calculator : ShieldCheck;
                return (
                  <div key={idx} className="about-card">
                    <div className="about-card-icon">
                      <IconComponent size={24} />
                    </div>
                    <div className="about-card-content">
                      <h4>{card.title}</h4>
                      <p>{card.description}</p>
                    </div>
                  </div>
                );
              })}
              <a href="#methodology" className="about-link">
                Read our full methodology
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container cta-content">
          <div className="section-label">Get Started Today</div>
          <h2 className="cta-title">
            Let IQ Analyze Your First Property <span className="highlight">Free</span>
          </h2>
          <p className="cta-subtitle">
            Point your camera at any property and IQ will deliver genius-level analysis across 6 investment strategies. No credit card required.
          </p>
          <div className="cta-buttons">
            <button onClick={handleTryItNow} className="btn btn-primary btn-large">
              Try It Now
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
