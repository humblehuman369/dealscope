'use client';

import Link from 'next/link';

const strategies = [
  { name: 'Long-Term Rental', tag: 'Steady income & equity building', desc: 'Buy and hold for consistent monthly rental income. Build long-term wealth through appreciation and mortgage paydown.', href: '/strategies/long-term-rental', hasBrandIQ: false },
  { name: 'Short-Term Rental', tag: 'Vacation & business rental income', desc: 'Maximize income through Airbnb or VRBO. Higher returns with more active management and seasonal demand.', href: '/strategies/short-term-rental', hasBrandIQ: false },
  { name: 'BRRRR', tag: 'Buy-Rehab-Rent-Refi-Repeat', desc: 'Buy distressed, renovate, rent, refinance to pull out capital, then repeat. Scale a portfolio with the same initial investment.', href: '/strategies/brrrr', hasBrandIQ: false },
  { name: 'Fix & Flip', tag: 'Buy low, renovate, sell at market', desc: 'Purchase undervalued properties, renovate strategically, and sell. DealGapIQ calculates ARV, rehab costs, and projected profit.', href: '/strategies/fix-flip', hasBrandIQ: true },
  { name: 'House Hack', tag: 'Live in one unit, rent the rest', desc: 'Reduce or eliminate your housing payment while building equity. Model the income offset against your mortgage and expenses.', href: '/strategies/house-hack', hasBrandIQ: false },
  { name: 'Wholesale', tag: 'Find deals, assign contracts', desc: 'Identify properties below market value and assign to other investors. DealGapIQ shows the assignment fee opportunity at each price point.', href: '/strategies/wholesale', hasBrandIQ: true },
];

export function StrategyGrid() {
  return (
    <section className="sec" id="strategies">
      <div className="label">6 Investment Strategies</div>
      <div className="sec-title">One Property, Six Models &mdash; Analyzed Simultaneously</div>
      <div className="sec-sub">Every address is instantly evaluated across all major real estate investment strategies. See which approach delivers the best returns for that specific property.</div>
      <div className="strat-grid">
        {strategies.map((strat) => (
          <Link key={strat.href} href={strat.href} className="card-md strat-card">
            <div className="strat-name">{strat.name}</div>
            <div className="strat-tag">{strat.tag}</div>
            <div className="strat-desc">
              {strat.hasBrandIQ ? (
                <>
                  {strat.desc.split('DealGapIQ')[0]}
                  DealGap<span className="brand-iq">IQ</span>
                  {strat.desc.split('DealGapIQ')[1]}
                </>
              ) : (
                strat.desc
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
