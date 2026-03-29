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
          {/* STEP 1 — The IQ Verdict */}
          <div className="step-card">
            <div className="step-badges">
              <span className="badge-solid badge-sky">STEP 1</span>
              <span className="badge-outline badge-outline-sky">FREE</span>
            </div>
            <h3>The IQ Verdict</h3>
            <p className="step-card-desc">
              Paste any address. In seconds, get a Verdict Score that tells you whether
              the deal is worth pursuing — before you waste a single hour.
            </p>
            <div className="step-pills">
              <div className="step-pill">
                <span className="pill-dot pill-sky" />
                Verdict Score (0–100)
              </div>
              <div className="step-pill">
                <span className="pill-dot pill-sky" />
                Three Price Thresholds
              </div>
              <div className="step-pill">
                <span className="pill-dot pill-sky" />
                Deal Gap &amp; Price Gap
              </div>
              <div className="step-pill">
                <span className="pill-dot pill-sky" />
                Cash Flow Snapshot
              </div>
            </div>

            {/* Mini Verdict Result */}
            <div className="verdict-card">
              <div className="vc-header">
                <span className="vc-label">IQ VERDICT</span>
              </div>
              <div className="vc-score">78</div>
              <div className="vc-badge">Strong Upside — Worth Pursuing</div>
              <div className="vc-prices">
                <div className="vc-price">
                  <div className="vc-price-label text-green">TARGET BUY</div>
                  <div className="vc-price-value">$285k</div>
                  <div className="vc-price-sub">Investor entry</div>
                </div>
                <div className="vc-price">
                  <div className="vc-price-label text-yellow">INCOME VALUE</div>
                  <div className="vc-price-value">$312k</div>
                  <div className="vc-price-sub">Cash flow basis</div>
                </div>
                <div className="vc-price">
                  <div className="vc-price-label text-red">MARKET PRICE</div>
                  <div className="vc-price-value">$340k</div>
                  <div className="vc-price-sub">Current ask</div>
                </div>
              </div>
            </div>
          </div>

          {/* FUNNEL DIVIDER */}
          <div className="funnel">
            <span className="funnel-text funnel-text-top">FILTER</span>
            <div className="funnel-line" />
            <div className="funnel-shape">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 4h18l-7 8v5l-4 2V12L3 4z"
                  stroke="var(--accent-sky)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="funnel-line" />
            <span className="funnel-text funnel-text-bottom">GO DEEP</span>
          </div>

          {/* STEP 2 — The Strategy Engine */}
          <div className="step-card">
            <div className="step-badges">
              <span className="badge-solid badge-green">STEP 2</span>
              <span className="badge-outline badge-outline-green">PRO</span>
            </div>
            <h3>The Strategy Engine</h3>
            <p className="step-card-desc">
              Only when a deal passes the Verdict do you unlock professional-grade
              tools — built for the strategy you actually plan to run.
            </p>
            <div className="step-pills">
              <div className="step-pill">
                <span className="pill-dot pill-green" />
                6 Investment Strategies
              </div>
              <div className="step-pill">
                <span className="pill-dot pill-green" />
                Deal Maker with Editable Assumptions
              </div>
              <div className="step-pill">
                <span className="pill-dot pill-green" />
                Comp-Based Appraisal
              </div>
              <div className="step-pill">
                <span className="pill-dot pill-green" />
                Rehab Cost Estimator
              </div>
            </div>

            {/* Mini Strategy Engine Card */}
            <div className="se-card">
              <div className="se-header">
                <span className="se-header-label">STRATEGY ENGINE</span>
                <span className="se-header-pro">Pro Tools</span>
              </div>
              <div className="se-bars">
                <div className="se-bar" style={{ background: 'var(--status-positive)' }} />
                <div className="se-bar" style={{ background: 'var(--accent-sky)' }} />
                <div className="se-bar" style={{ background: 'var(--status-income-value, #FACC15)' }} />
                <div className="se-bar" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="se-bar" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="se-bar" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>
              <div className="se-tools">
                <div className="se-tool">
                  <span className="se-dot" style={{ background: 'var(--status-positive)' }} />
                  <div>
                    <div className="se-tool-name">Long-Term Rental</div>
                    <div className="se-tool-desc">Cash flow &amp; DSCR analysis</div>
                  </div>
                </div>
                <div className="se-tool">
                  <span className="se-dot" style={{ background: 'var(--accent-sky)' }} />
                  <div>
                    <div className="se-tool-name">Fix &amp; Flip</div>
                    <div className="se-tool-desc">ARV, rehab costs, ROI</div>
                  </div>
                </div>
                <div className="se-tool">
                  <span className="se-dot" style={{ background: 'var(--status-income-value, #FACC15)' }} />
                  <div>
                    <div className="se-tool-name">BRRRR</div>
                    <div className="se-tool-desc">Refi, equity, repeat</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
