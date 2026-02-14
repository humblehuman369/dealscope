import React from 'react';
import { Users, Home, BookOpen, CreditCard } from 'lucide-react';
import {
  StrategyPageLayout,
  Callout,
  Prose,
} from '@/components/strategies/StrategyPageLayout';

const ACCENT = '#2dd4bf';

export default function HouseHackPage() {
  return (
    <StrategyPageLayout
      name="House Hack"
      tagline="Cut your housing costs up to 100%"
      accentColor={ACCENT}
      icon={<Users size={28} />}
      headline="The Ultimate Beginner Strategy"
      benefitsHeadline="Why Choose House Hacking?"
      benefits={[
        {
          icon: <Home size={22} />,
          title: 'Zero Housing Cost',
          description: 'Live for free or nearly free while building wealth',
        },
        {
          icon: <BookOpen size={22} />,
          title: 'Learn by Doing',
          description: 'Beginner-friendly landlord experience with training wheels',
        },
        {
          icon: <CreditCard size={22} />,
          title: 'Low Down Payment',
          description: 'FHA loans with as little as 3.5% down',
        },
      ]}
    >
      <Prose>
        <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>House hacking</strong> is the
        ultimate beginner strategy — your biggest expense (housing) becomes your biggest asset.
        Buy a multi-unit property, live in one unit, and rent out the others to cover your mortgage.
      </Prose>

      <Callout title="Live for free" accentColor={ACCENT}>
        <p style={{ margin: 0 }}>
          You&apos;re essentially{' '}
          <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>living for free</strong> while
          building equity and learning the landlord business with minimal risk. It&apos;s the
          single best way to start your investing journey.
        </p>
      </Callout>

      <Prose>
        Because you&apos;re living in the property, you qualify for owner-occupied financing — lower
        down payments, better interest rates, and more favorable terms than traditional investment
        loans. It&apos;s the lowest barrier to entry in real estate investing.
      </Prose>
    </StrategyPageLayout>
  );
}
