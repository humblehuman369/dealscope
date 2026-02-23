'use client';

import Link from 'next/link';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';
import { FounderSection } from './FounderSection';
import { DealGapExplainer } from './DealGapExplainer';
import { ThreeNumbers } from './ThreeNumbers';
import { MethodologySection } from './MethodologySection';
import { CalcWalkthrough } from './CalcWalkthrough';
import { StrategyPills } from './StrategyPills';
import { WorkflowSteps } from './WorkflowSteps';
import { BeforeAfterComparison } from './BeforeAfterComparison';
import './dealgapiq-homepage.css';

export function WhatIsDealGapIQ() {
  return (
    <div className="iq-landing">
      <LandingNav />

      {/* HERO */}
      <header className="hero" style={{ padding: '10rem 2rem 6rem' }}>
        <div className="hero-label anim">
          What is{' '}
          <strong>
            DealGap<span className="brand-iq">IQ</span>
          </strong>
          ?
        </div>
        <h1 className="anim d1">
          The only question that matters:
          <br />
          <em>&ldquo;Is this actually a deal?&rdquo;</em>
        </h1>
        <p className="hero-para anim d2">
          <strong>
            DealGap<span className="brand-iq">IQ</span>
          </strong>{' '}
          answers it with math, not opinions. Enter any address and see the
          exact price where the deal works — powered by real market data,
          transparent assumptions, and 35 years of institutional real estate
          intelligence.
        </p>
      </header>

      <div className="dw"><div className="div-c"></div></div>

      {/* DEAL GAP CONCEPT */}
      <DealGapExplainer />

      <div className="dw"><div className="div-e"></div></div>

      {/* THREE NUMBERS */}
      <ThreeNumbers />

      <div className="dw"><div className="div-b"></div></div>

      {/* METHODOLOGY */}
      <MethodologySection />

      <div className="dw"><div className="div-b"></div></div>

      {/* CALCULATION WALKTHROUGH */}
      <CalcWalkthrough />

      <div className="dw"><div className="div-e"></div></div>

      {/* SIX STRATEGIES */}
      <StrategyPills />

      <div className="dw"><div className="div-b"></div></div>

      {/* WORKFLOW */}
      <WorkflowSteps />

      <div className="dw"><div className="div-c"></div></div>

      {/* BEFORE/AFTER COMPARISON */}
      <BeforeAfterComparison />

      <div className="dw"><div className="div-b"></div></div>

      {/* FOUNDER */}
      <FounderSection
        title={
          <>
            Institutional-grade intelligence — now in every investor&apos;s
            hands.
          </>
        }
        titleStyle={{ marginBottom: 0 }}
      />

      <div className="dw"><div className="div-b"></div></div>

      {/* BOTTOM CTA */}
      <div className="cta-wrap">
        <h2>
          Every property has a Deal Gap.
          <br />
          Only{' '}
          <strong>
            DealGap<span className="brand-iq">IQ</span>
          </strong>{' '}
          measures it.
        </h2>
        <p>
          And once you see the math, you&apos;ll never analyze real estate the
          old way again.
        </p>
        <Link href="/register" className="cta-btn">
          Start Free — Analyze Your First Property
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
        <div className="cta-sub-simple">
          5 free analyses per month · No credit card required · Pro from $29/mo
        </div>
      </div>

      {/* FOOTER */}
      <LandingFooter />
    </div>
  );
}

export default WhatIsDealGapIQ;
