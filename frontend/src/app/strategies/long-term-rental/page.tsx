import React from 'react';
import { Home, DollarSign, TrendingUp, Shield } from 'lucide-react';
import {
  StrategyPageLayout,
  Callout,
  Prose,
  StepItem,
} from '@/components/strategies/StrategyPageLayout';

const ACCENT = '#34d399';

export default function LongTermRentalPage() {
  return (
    <StrategyPageLayout
      name="Long-Term Rental"
      tagline="Steady income & build equity over time"
      accentColor={ACCENT}
      icon={<Home size={28} />}
      headline="The Classic Buy-and-Hold Strategy"
      benefitsHeadline="Why Choose Long-Term Rental?"
      benefits={[
        {
          icon: <DollarSign size={22} />,
          title: 'Steady Income',
          description: 'Predictable monthly cash flow from annual leases',
        },
        {
          icon: <TrendingUp size={22} />,
          title: 'Wealth Building',
          description: 'Equity growth through appreciation and mortgage paydown',
        },
        {
          icon: <Shield size={22} />,
          title: 'Tax Benefits',
          description: 'Depreciation, deductions, and long-term capital gains treatment',
        },
      ]}
    >
      <Prose>
        <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>Long-term rental</strong> is the
        classic buy-and-hold strategy that has made countless millionaires. You purchase a property,
        rent it out to reliable tenants on an annual lease, and watch your wealth grow over time.
      </Prose>

      <Callout title="The magic happens in three ways:" accentColor={ACCENT}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <StepItem
            num={1}
            title="Monthly cash flow"
            description="Puts money in your pocket every single month"
            accentColor={ACCENT}
          />
          <StepItem
            num={2}
            title="Your tenants build equity for you"
            description="They pay down the loan while you own the asset"
            accentColor={ACCENT}
          />
          <StepItem
            num={3}
            title="Appreciation"
            description="Property value grows over time, compounding your returns"
            accentColor={ACCENT}
          />
        </div>
      </Callout>

      <Callout accentColor="#0EA5E9">
        <p style={{ fontStyle: 'italic', margin: 0 }}>
          It&apos;s the perfect{' '}
          <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>
            &quot;set it and forget it&quot;
          </strong>{' '}
          strategy — ideal for investors who want to build lasting, generational wealth.
        </p>
      </Callout>
    </StrategyPageLayout>
  );
}
