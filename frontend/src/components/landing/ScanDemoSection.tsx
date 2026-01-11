'use client';

import React from 'react';
import Link from 'next/link';

interface ScanDemoSectionProps {
  onScanProperty?: () => void;
}

export function ScanDemoSection({ onScanProperty }: ScanDemoSectionProps) {
  return (
    <section className="demo-section demo-section-compact" id="demo">
      <div className="container">
        <div className="section-header section-header-tight">
          <div className="section-label">Real Estate Investors Instant Onsite Intelligent</div>
        </div>
        
        {/* Scan Scene */}
        <div className="scan-scene">
          {/* Phone with App Screen */}
          <div className="scan-phone">
            <div className="scan-phone-screen">
              <div className="scan-phone-notch"></div>
              <div className="app-screen">
                <div className="app-header">
                  <div className="app-back">←</div>
                  <div className="app-title">Property Analytics</div>
                  <div className="app-theme">☀️</div>
                </div>
                
                {/* IQ Target Card */}
                <div className="app-target-card">
                  <div className="app-target-badge">🎯 IQ TARGET PRICE</div>
                  <div className="app-target-label">Your Profitable Entry Point</div>
                  <div className="app-target-price">$280,000</div>
                  <div className="app-target-savings">$70K below list (20%)</div>
                </div>
                
                {/* Price Ladder */}
                <div className="app-ladder">
                  <div className="app-ladder-title">Price Position Ladder</div>
                  <div className="app-ladder-row">
                    <div className="app-ladder-left">
                      <div className="app-ladder-dot red"></div>
                      <div className="app-ladder-name">List Price</div>
                    </div>
                    <div className="app-ladder-value">$350,000</div>
                  </div>
                  <div className="app-ladder-row">
                    <div className="app-ladder-left">
                      <div className="app-ladder-dot orange"></div>
                      <div className="app-ladder-name">90% of List</div>
                    </div>
                    <div className="app-ladder-value">$315,000</div>
                  </div>
                  <div className="app-ladder-row">
                    <div className="app-ladder-left">
                      <div className="app-ladder-dot yellow"></div>
                      <div className="app-ladder-name">Breakeven</div>
                    </div>
                    <div className="app-ladder-value">$308,000</div>
                  </div>
                  <div className="app-ladder-row highlight">
                    <div className="app-ladder-left">
                      <div className="app-ladder-dot green"></div>
                      <div className="app-ladder-name green">IQ Target</div>
                    </div>
                    <div className="app-ladder-value green">$280,000</div>
                  </div>
                  <div className="app-ladder-row">
                    <div className="app-ladder-left">
                      <div className="app-ladder-dot cyan"></div>
                      <div className="app-ladder-name">Opening Offer</div>
                    </div>
                    <div className="app-ladder-value">$245,000</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scan Rays */}
          <div className="scan-rays">
            <div className="scan-ray"></div>
            <div className="scan-ray"></div>
            <div className="scan-ray"></div>
            <div className="scan-ray"></div>
            <div className="scan-ray"></div>
          </div>

          {/* Detailed House Being Scanned */}
          <div className="scan-house">
            <div className="house-container">
              <svg viewBox="0 0 300 350" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* House body fill */}
                <path d="M150 30 L270 120 L270 310 L30 310 L30 120 Z" fill="rgba(77, 208, 225, 0.03)" stroke="rgba(77, 208, 225, 0.4)" strokeWidth="1.5"/>
                
                {/* Roof */}
                <path d="M150 10 L10 110 L30 110 L30 120 L150 30 L270 120 L270 110 L290 110 Z" fill="rgba(77, 208, 225, 0.05)" stroke="rgba(77, 208, 225, 0.6)" strokeWidth="2"/>
                
                {/* Chimney */}
                <rect x="200" y="50" width="30" height="55" fill="rgba(77, 208, 225, 0.03)" stroke="rgba(77, 208, 225, 0.5)" strokeWidth="1.5"/>
                
                {/* Front Door */}
                <rect x="125" y="200" width="50" height="90" rx="3" fill="rgba(77, 208, 225, 0.08)" stroke="rgba(77, 208, 225, 0.6)" strokeWidth="2"/>
                <circle cx="165" cy="250" r="4" fill="rgba(77, 208, 225, 0.8)"/>
                
                {/* Door frame top */}
                <path d="M120 200 L150 180 L180 200" stroke="rgba(77, 208, 225, 0.5)" strokeWidth="1.5" fill="none"/>
                
                {/* Left Window */}
                <rect x="50" y="150" width="55" height="50" rx="2" fill="rgba(77, 208, 225, 0.05)" stroke="rgba(77, 208, 225, 0.6)" strokeWidth="1.5"/>
                <line x1="77.5" y1="150" x2="77.5" y2="200" stroke="rgba(77, 208, 225, 0.4)" strokeWidth="1"/>
                <line x1="50" y1="175" x2="105" y2="175" stroke="rgba(77, 208, 225, 0.4)" strokeWidth="1"/>
                
                {/* Right Window */}
                <rect x="195" y="150" width="55" height="50" rx="2" fill="rgba(77, 208, 225, 0.05)" stroke="rgba(77, 208, 225, 0.6)" strokeWidth="1.5"/>
                <line x1="222.5" y1="150" x2="222.5" y2="200" stroke="rgba(77, 208, 225, 0.4)" strokeWidth="1"/>
                <line x1="195" y1="175" x2="250" y2="175" stroke="rgba(77, 208, 225, 0.4)" strokeWidth="1"/>
                
                {/* Garage Door */}
                <rect x="50" y="240" width="60" height="50" rx="2" fill="rgba(77, 208, 225, 0.05)" stroke="rgba(77, 208, 225, 0.5)" strokeWidth="1.5"/>
                <line x1="50" y1="255" x2="110" y2="255" stroke="rgba(77, 208, 225, 0.3)" strokeWidth="1"/>
                <line x1="50" y1="270" x2="110" y2="270" stroke="rgba(77, 208, 225, 0.3)" strokeWidth="1"/>
                
                {/* Driveway */}
                <path d="M50 310 L50 290 L110 290 L110 310" stroke="rgba(77, 208, 225, 0.3)" strokeWidth="1" fill="none"/>
                
                {/* Walkway */}
                <path d="M140 310 L140 290 L160 290 L160 310" stroke="rgba(77, 208, 225, 0.3)" strokeWidth="1" fill="none"/>
                
                {/* Ground line */}
                <line x1="10" y1="310" x2="290" y2="310" stroke="rgba(77, 208, 225, 0.4)" strokeWidth="1"/>
                
                {/* Bushes/landscaping */}
                <ellipse cx="35" cy="300" rx="20" ry="12" fill="rgba(77, 208, 225, 0.05)" stroke="rgba(77, 208, 225, 0.3)" strokeWidth="1"/>
                <ellipse cx="265" cy="300" rx="20" ry="12" fill="rgba(77, 208, 225, 0.05)" stroke="rgba(77, 208, 225, 0.3)" strokeWidth="1"/>
              </svg>
              
              {/* Scan line overlay */}
              <div className="scan-line-overlay">
                <div className="scan-line"></div>
              </div>
              
              {/* Corner brackets */}
              <div className="scan-brackets">
                <div className="scan-bracket tl"></div>
                <div className="scan-bracket tr"></div>
                <div className="scan-bracket bl"></div>
                <div className="scan-bracket br"></div>
              </div>
            </div>
          </div>

          {/* Data Cards Appearing */}
          <div className="scan-data-cards">
            <div className="scan-data-card">
              <div className="scan-data-icon">💰</div>
              <div className="scan-data-info">
                <div className="scan-data-value">$847/mo</div>
                <div className="scan-data-label">Cash Flow</div>
              </div>
            </div>
            <div className="scan-data-card">
              <div className="scan-data-icon">📈</div>
              <div className="scan-data-info">
                <div className="scan-data-value">12.4%</div>
                <div className="scan-data-label">Cash-on-Cash</div>
              </div>
            </div>
            <div className="scan-data-card">
              <div className="scan-data-icon">🏠</div>
              <div className="scan-data-info">
                <div className="scan-data-value">$485K</div>
                <div className="scan-data-label">Market Value</div>
              </div>
            </div>
            <div className="scan-data-card">
              <div className="scan-data-icon">⭐</div>
              <div className="scan-data-info">
                <div className="scan-data-value">A+</div>
                <div className="scan-data-label">Deal Grade</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Brand Line - Moved below scan scene */}
        <div className="brand-line demo-brand-line">
          Most investors guess. <span className="highlight">IQ Investors Know.</span>
        </div>
        
        {/* Demo CTA */}
        <div className="demo-cta">
          <button onClick={onScanProperty} className="btn btn-primary">Scan a Property</button>
          <span className="demo-cta-divider">or</span>
          <Link href="/search" className="btn btn-secondary">Enter an Address</Link>
        </div>
      </div>
    </section>
  );
}
