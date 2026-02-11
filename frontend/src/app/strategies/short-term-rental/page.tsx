'use client';

import React from 'react';
import { TrendingUp, DollarSign, Calendar, MapPin } from 'lucide-react';
import {
  StrategyPageLayout,
  Callout,
  Prose,
} from '@/components/strategies/StrategyPageLayout';

const ACCENT = '#38bdf8';

export default function ShortTermRentalPage() {
  return (
    <StrategyPageLayout
      name="Short-Term Rental"
      tagline="Vacation & business rental income"
      accentColor={ACCENT}
      icon={<TrendingUp size={28} />}
      headline="The High-Revenue Hospitality Model"
      benefitsHeadline="Why Choose Short-Term Rental?"
      benefits={[
        {
          icon: <DollarSign size={22} />,
          title: 'Higher Revenue',
          description: '2-3x more income than traditional long-term rentals',
        },
        {
          icon: <Calendar size={22} />,
          title: 'Flexibility',
          description: 'Block dates for personal use and vacations anytime',
        },
        {
          icon: <MapPin size={22} />,
          title: 'Tourism Markets',
          description: 'Capitalize on high-demand vacation destinations',
        },
      ]}
    >
      <Prose>
        <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>Short-term rental</strong> is where
        you turn your property into a high-revenue hospitality business using platforms like Airbnb
        or VRBO. Properties in hot tourist areas can generate{' '}
        <strong style={{ fontWeight: 600, color: '#38bdf8' }}>2-3x more revenue</strong> than
        traditional rentals.
      </Prose>

      <Callout title="The best part?" accentColor={ACCENT}>
        <p style={{ margin: 0 }}>
          You can block off dates to use the property yourself for vacation. It&apos;s a real estate
          investment that doubles as a lifestyle asset.
        </p>
      </Callout>

      <Prose>
        The trade-off is active management — guest communications, turnover cleaning, seasonal
        pricing adjustments, and platform optimization. Many investors hire property managers to
        handle operations while they focus on acquisition.
      </Prose>
    </StrategyPageLayout>
  );
}
