import React from 'react'
import type { Metadata } from 'next'
import { Users, Home, BookOpen, CreditCard } from 'lucide-react'
import { StrategyPageLayout, Callout, Prose } from '@/components/strategies/StrategyPageLayout'
import { StrategySchema } from '@/components/seo/StrategySchema'
import { STRATEGY_SCHEMA_BY_SLUG } from '@/lib/seo/strategy-schema-data'

export const metadata: Metadata = {
  title: 'House Hack Strategy — Live for Free with Multi-Unit & FHA | DealGapIQ',
  description:
    'How house hacking works: FHA / VA financing on 2-4 units, owner-occupant rules, rent offsets that cover (or beat) the mortgage, and why this is the highest-ROI first deal in real estate.',
  alternates: { canonical: '/strategies/house-hack' },
  openGraph: {
    title: 'House Hack Strategy — Live for Free with Multi-Unit & FHA',
    description:
      'FHA/VA financing on 2-4 units, owner-occupant rules, and the math on rent offsets.',
    url: '/strategies/house-hack',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'House Hack Strategy — Live for Free with Multi-Unit & FHA',
    description: 'FHA/VA on 2-4 units, owner-occupant rules, and rent-offset math.',
  },
}

const ACCENT = 'var(--accent-sky)'

const schema = STRATEGY_SCHEMA_BY_SLUG['house-hack']

export default function HouseHackPage() {
  return (
    <>
      <StrategySchema slug="house-hack" {...schema} />
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
        <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>House hacking</strong> is the ultimate
        beginner strategy — your biggest expense (housing) becomes your biggest asset. Buy a
        multi-unit property, live in one unit, and rent out the others to cover your mortgage.
      </Prose>

      <Callout title="Live for free" accentColor={ACCENT}>
        <p style={{ margin: 0 }}>
          You&apos;re essentially{' '}
          <strong style={{ fontWeight: 600, color: '#F1F5F9' }}>living for free</strong> while
          building equity and learning the landlord business with minimal risk. It&apos;s the single
          best way to start your investing journey.
        </p>
      </Callout>

      <Prose>
        Because you&apos;re living in the property, you qualify for owner-occupied financing — lower
        down payments, better interest rates, and more favorable terms than traditional investment
        loans. It&apos;s the lowest barrier to entry in real estate investing.
      </Prose>
    </StrategyPageLayout>
    </>
  )
}
