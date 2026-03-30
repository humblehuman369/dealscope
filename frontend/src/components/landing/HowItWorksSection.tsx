'use client';

import React from 'react';

export function HowItWorksSection() {
  return (
    <section className="how">
      <div className="how-inner">
        <div className="section-label">How It Works</div>
        <h2>Two Steps. Zero Wasted Time.</h2>
        <p className="how-sub">
          Most investors waste hours on properties that never pencil out.
          DealGapIQ separates the filter from the toolkit — so you only go deep on deals worth pursuing.
        </p>

        <div className="steps-layout">
          {/* STEP 1 — The Smell Test */}
          <div className="step-card">
            <div className="step-header">
              <div className="step-number step-number-sky">1</div>
              <span className="step-tier step-tier-sky">FREE</span>
            </div>
            <h3>The Smell Test</h3>
            <p className="step-card-desc">
              Paste any address. In seconds, know if the deal is worth your time.
            </p>

            <div className="smell-visual">
              <div className="smell-gaps">
                <div className="smell-gap">
                  <span className="smell-gap-label text-sky">DEAL GAP</span>
                  <span className="smell-gap-value text-sky">-16.3%</span>
                </div>
                <div className="smell-gap">
                  <span className="smell-gap-label text-yellow">PRICE GAP</span>
                  <span className="smell-gap-value text-yellow">-16.5%</span>
                </div>
              </div>
              <div className="smell-bar">
                <div className="smell-bar-track">
                  <div className="smell-bar-fill" />
                </div>
                <div className="smell-dot smell-dot-green" style={{ left: '18%' }}>
                  <span className="smell-dot-pip" />
                </div>
                <div className="smell-dot smell-dot-yellow" style={{ left: '42%' }}>
                  <span className="smell-dot-pip" />
                </div>
                <div className="smell-dot smell-dot-red" style={{ left: '82%' }}>
                  <span className="smell-dot-pip" />
                </div>
              </div>
            </div>

            <div className="price-boxes">
              <div className="price-box price-box-green">
                <div className="price-box-label">TARGET BUY</div>
                <div className="price-box-value">$285k</div>
                <div className="price-box-sub">Investor entry</div>
              </div>
              <div className="price-box price-box-yellow">
                <div className="price-box-label">INCOME VALUE</div>
                <div className="price-box-value">$312k</div>
                <div className="price-box-sub">Cash flow basis</div>
              </div>
              <div className="price-box price-box-red">
                <div className="price-box-label">MARKET PRICE</div>
                <div className="price-box-value">$340k</div>
                <div className="price-box-sub">Current ask</div>
              </div>
            </div>
          </div>

          {/* CONNECTOR */}
          <div className="step-connector">
            <div className="connector-line" />
            <div className="connector-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 5l7 7-7 7"
                  stroke="var(--status-positive)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="connector-line" />
          </div>

          {/* STEP 2 — The Deep Dive */}
          <div className="step-card">
            <div className="step-header">
              <div className="step-number step-number-green">2</div>
              <span className="step-tier step-tier-green">PRO</span>
            </div>
            <h3>The Deep Dive</h3>
            <p className="step-card-desc">
              Pro-grade tools built for the strategy you actually plan to run.
            </p>

            <div className="tool-tiles">
              <div className="tool-tile">
                <div className="tool-tile-name">STRATEGY</div>
                <div className="tool-tile-desc">Run your numbers across 6 investment strategies</div>
              </div>
              <div className="tool-tile">
                <div className="tool-tile-name">APPRAISER</div>
                <div className="tool-tile-desc">Comp-based appraisal with local market data</div>
              </div>
              <div className="tool-tile">
                <div className="tool-tile-name">DEALMAKER</div>
                <div className="tool-tile-desc">Negotiate, adjust assumptions, close the deal</div>
              </div>
              <div className="tool-tile">
                <div className="tool-tile-name">ESTIMATOR</div>
                <div className="tool-tile-desc">Accurate rehab costs with local market pricing</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
