'use client';

import React, { useState } from 'react';

export interface DealGapIQHeroSectionProps {
  onAnalyzeAddress: (address: string) => void;
  onOpenGateway?: () => void;
  onScanProperty?: () => void;
}

export function DealGapIQHeroSection({ onAnalyzeAddress, onOpenGateway, onScanProperty }: DealGapIQHeroSectionProps) {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (trimmed) {
      onAnalyzeAddress(trimmed);
    } else if (onOpenGateway) {
      onOpenGateway();
    }
  };

  return (
    <section className="hero-prominent">
      <div className="hero-prominent-inner">
        <div className="hero-tag">Real Analytics for Real Estate Investors</div>
        <h1>
          Is That Property a Good Deal?
          <br />
          <span className="accent">Find Out in 60 Seconds.</span>
        </h1>
        <p className="hero-sub">
          Enter any address. DealGapIQ instantly calculates the{' '}
          <strong>Income Value</strong> &mdash; the maximum price where cash flow stays
          positive &mdash; your <strong>Target Buy</strong>, and the{' '}
          <strong>Deal Gap</strong> between the asking price and the price that actually
          works. Six strategies. One scan. Your answer.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-area">
            <div className="address-bar">
              <svg className="search-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter any property address..."
              />
              {onScanProperty && (
                <button type="button" className="camera-btn" title="Scan a For Sale sign" onClick={onScanProperty}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </button>
              )}
              <button type="submit" className="analyze-btn">
                Analyze
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {onScanProperty && (
              <>
                <div className="or-divider">
                  <div className="line" />
                  <span>or</span>
                  <div className="line" />
                </div>

                <button type="button" className="scan-btn" onClick={onScanProperty}>
                  <svg className="scan-icon" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  Scan Property
                  <span className="scan-hint">&mdash; snap a photo of any For Sale sign</span>
                </button>
              </>
            )}

            <div className="trust-line">
              60-second analysis
              <span className="dot" />
              6 strategies
              <span className="dot" />
              No credit card required
            </div>
          </div>
        </form>
      </div>

      <div className="stats-bar">
        <div className="stat-card">
          <svg className="stat-icon" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <div className="stat-number">60s</div>
          <div className="stat-label">Income Value + Deal Gap</div>
          <div className="stat-detail">for any address</div>
        </div>
        <div className="stat-card">
          <svg className="stat-icon" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="8" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
          </svg>
          <div className="stat-number">3</div>
          <div className="stat-label">Price Signals</div>
          <div className="stat-detail">Income Value &middot; Target Buy &middot; Deal Gap</div>
        </div>
        <div className="stat-card">
          <svg className="stat-icon" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <div className="stat-number">6</div>
          <div className="stat-label">Strategy Models</div>
          <div className="stat-detail">Rental &middot; STR &middot; BRRRR &middot; Flip &middot; Hack &middot; Wholesale</div>
        </div>
      </div>
    </section>
  );
}

export default DealGapIQHeroSection;
