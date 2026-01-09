'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AnimatedPhoneMockup } from './AnimatedPhoneMockup';
import { FloatingDataCards } from './FloatingDataCards';
import { StrategyCard } from './StrategyCard';
import { FeatureCard } from './FeatureCard';
import { Footer } from './Footer';
import { strategies, features, stats } from './types';
import { IQBrainIcon } from '@/components/icons';

interface ResponsiveLandingPageProps {
  onPointAndScan?: () => void;
}

export function ResponsiveLandingPage({ onPointAndScan }: ResponsiveLandingPageProps) {
  const { user, isAuthenticated, setShowAuthModal } = useAuth();

  const handleGetStarted = () => {
    if (onPointAndScan) {
      onPointAndScan();
    } else {
      setShowAuthModal('register');
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
            <a href="#strategies">Strategies</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
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
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-badge">
                <IQBrainIcon size={22} mode="dark" />
                Powered by IQ — Your Genius Advisor
              </div>
              <h1>
                Know the <span className="highlight">Real Return</span><br/>
                Before You Invest
              </h1>
              <p className="hero-subtitle">
                Find the profit. Point & Scan any property and IQ instantly analyzes it across 6 investment strategies in 60 seconds.
              </p>
              <div className="hero-cta">
                <button onClick={handleGetStarted} className="btn btn-primary">
                  Start Analyzing Free
                </button>
                <button className="btn btn-ghost">Watch Demo</button>
              </div>
              <div className="trust-signals">
                <span>✓ No credit card required</span>
                <span>✓ 10K+ properties analyzed</span>
              </div>
            </div>
            
            <div className="hero-visual">
              <FloatingDataCards />
              <AnimatedPhoneMockup />
            </div>
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
            <div className="section-label">Why InvestIQ</div>
            <h2 className="section-title">Everything You Need to Invest Smarter</h2>
            <p className="section-subtitle">
              Powerful features designed to give you an edge in real estate investing.
            </p>
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
          {/* IQ Avatar */}
          <div className="cta-iq-avatar">
            <img src="/images/IQ.png" alt="IQ" />
          </div>
          <div className="section-label">Get Started Today</div>
          <h2 className="cta-title">
            Let IQ Analyze Your First Property <span className="highlight">Free</span>
          </h2>
          <p className="cta-subtitle">
            Point your camera at any property and IQ will deliver genius-level analysis across 6 investment strategies. No credit card required.
          </p>
          <div className="cta-buttons">
            <button onClick={handleGetStarted} className="btn btn-primary btn-large">
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
    </div>
  );
}
