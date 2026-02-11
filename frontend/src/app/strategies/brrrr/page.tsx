'use client';

import React from 'react';
import { RefreshCw, TrendingUp, Zap } from 'lucide-react';
import {
  StrategyPageLayout,
  Callout,
  Prose,
  StepItem,
} from '@/components/strategies/StrategyPageLayout';

const ACCENT = '#fbbf24';

export default function BRRRRPage() {
  return (
    <StrategyPageLayout
      name="BRRRR"
      tagline="Buy, Rehab, Rent, Refinance, Repeat"
      accentColor={ACCENT}
      icon={<RefreshCw size={28} />}
      headline="The Wealth-Building Flywheel"
      benefitsHeadline="Why BRRRR Works"
      benefits={[
        {
          icon: <RefreshCw size={22} />,
          title: 'Recycle Capital',
          description: 'Reuse the same money to acquire multiple properties',
        },
        {
          icon: <TrendingUp size={22} />,
          title: 'Build Equity Fast',
          description: 'Force appreciation through strategic renovation',
        },
        {
          icon: <Zap size={22} />,
          title: 'Scale Quickly',
          description: 'Build a portfolio in months, not decades',
        },
      ]}
    >
      <Prose>
        <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>BRRRR</strong> stands for Buy, Rehab,
        Rent, Refinance, Repeat — and it&apos;s the strategy serious investors use to scale fast.
        Instead of tying up capital in one deal, you recycle it across multiple properties.
      </Prose>

      <Callout title="The goal: infinite return" accentColor={ACCENT}>
        <p style={{ margin: 0 }}>
          When you&apos;ve pulled out 100% of your investment but still own a cash-flowing property
          that pays you every month — that&apos;s infinite return on invested capital.
        </p>
      </Callout>

      <h3
        style={{
          fontWeight: 700,
          fontSize: '1.25rem',
          color: '#F1F5F9',
          margin: '2rem 0 1rem',
        }}
      >
        The 5-Step Process
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <StepItem
          num={1}
          title="Buy"
          description="Purchase a distressed property below market value"
          accentColor={ACCENT}
        />
        <StepItem
          num={2}
          title="Rehab"
          description="Renovate strategically to maximize the after-repair value"
          accentColor={ACCENT}
        />
        <StepItem
          num={3}
          title="Rent"
          description="Place quality tenants for steady monthly cash flow"
          accentColor={ACCENT}
        />
        <StepItem
          num={4}
          title="Refinance"
          description="Pull your capital back out at the new, higher appraised value"
          accentColor={ACCENT}
        />
        <StepItem
          num={5}
          title="Repeat"
          description="Use that recovered capital to do it all over again"
          accentColor={ACCENT}
        />
      </div>
    </StrategyPageLayout>
  );
}
