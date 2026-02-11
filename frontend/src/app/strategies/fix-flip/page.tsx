'use client';

import React from 'react';
import { Hammer, Zap, DollarSign } from 'lucide-react';
import {
  StrategyPageLayout,
  Callout,
  Prose,
} from '@/components/strategies/StrategyPageLayout';

const ACCENT = '#f87171';

export default function FixFlipPage() {
  return (
    <StrategyPageLayout
      name="Fix & Flip"
      tagline="Buy low, renovate smart, sell high"
      accentColor={ACCENT}
      icon={<Hammer size={28} />}
      headline="The Fast-Cash Strategy"
      benefitsHeadline="Why Choose Fix & Flip?"
      benefits={[
        {
          icon: <Zap size={22} />,
          title: 'Quick Returns',
          description: 'See profits in 3-6 months, not years',
        },
        {
          icon: <DollarSign size={22} />,
          title: 'High Profit',
          description: '$30K-$100K+ per deal for well-executed flips',
        },
        {
          icon: <Hammer size={22} />,
          title: 'Value Creation',
          description: 'Transform distressed properties into desirable homes',
        },
      ]}
    >
      <Prose>
        <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>Fix & Flip</strong> is the fast-cash
        strategy where you buy a distressed property at a discount, transform it into something
        desirable, and sell it for profit — sometimes in just 3-6 months.
      </Prose>

      <Callout title="Profit potential" accentColor={ACCENT}>
        <p style={{ margin: 0 }}>
          A successful flip can net you{' '}
          <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>$30,000 - $100,000+ in profit</strong>.
          The key is buying right, controlling rehab costs, and understanding your after-repair value
          before you commit.
        </p>
      </Callout>

      <Prose>
        The risk profile is higher than buy-and-hold strategies — you&apos;re exposed to holding
        costs, market timing, and renovation surprises. That&apos;s why underwriting accuracy
        matters more here than in any other strategy. Know your numbers before you write the offer.
      </Prose>
    </StrategyPageLayout>
  );
}
