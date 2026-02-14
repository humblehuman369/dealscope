import React from 'react';
import { Repeat, DollarSign, Clock, FileText } from 'lucide-react';
import {
  StrategyPageLayout,
  Callout,
  Prose,
} from '@/components/strategies/StrategyPageLayout';

const ACCENT = '#fbbf24';

export default function WholesalePage() {
  return (
    <StrategyPageLayout
      name="Wholesale"
      tagline="Find deals, assign contracts, profit"
      accentColor={ACCENT}
      icon={<Repeat size={28} />}
      headline="Make Money with No Money"
      benefitsHeadline="Why Choose Wholesale?"
      benefits={[
        {
          icon: <DollarSign size={22} />,
          title: 'No Money Needed',
          description: 'Start with zero capital — just hustle and knowledge',
        },
        {
          icon: <Clock size={22} />,
          title: 'Quick Deals',
          description: 'Close in days or weeks, not months',
        },
        {
          icon: <FileText size={22} />,
          title: 'Assignment Fees',
          description: '$5K-$15K+ per deal with no renovation risk',
        },
      ]}
    >
      <Prose>
        <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>Wholesaling</strong> is how you make
        money in real estate with little to no money of your own. Your job is to be the matchmaker —
        connecting motivated sellers with cash buyers for a fee.
      </Prose>

      <Callout title="Pure deal-finding hustle" accentColor={ACCENT}>
        <p style={{ margin: 0 }}>
          Find properties under market value, get them under contract, then assign that contract to
          another investor for an{' '}
          <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>assignment fee of $5K-$15K+</strong>.
          You never own the property and you never touch a paintbrush.
        </p>
      </Callout>

      <Prose>
        The key to wholesale success is knowing your numbers. You need to accurately estimate the
        after-repair value and calculate a price that leaves room for your fee and the buyer&apos;s
        profit. That&apos;s where precision underwriting becomes your competitive advantage.
      </Prose>
    </StrategyPageLayout>
  );
}
