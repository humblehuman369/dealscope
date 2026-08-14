import Link from 'next/link'
import { analyzePropertyHref } from '@/lib/investor-intelligence'
import { AnalyzePropertyLink } from './AnalyzePropertyLink'

export function MethodologyView() {
  return (
    <article className="ii-article">
      <p className="ii-eyebrow">Methodology</p>
      <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', marginTop: 12 }}>
        Data First. Property Math Second. Hype Never.
      </h1>
      <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginTop: 16 }}>
        Real estate investors are surrounded by predictions, headlines, conflicting statistics, and
        market narratives. DealGapIQ Investor Intelligence takes a different approach.
      </p>

      <div className="ii-approach" style={{ marginTop: 48 }}>
        <div>
          <h3>Start With the Data</h3>
          <p>We seek out authoritative and transparent sources.</p>
        </div>
        <div>
          <h3>Understand the Methodology</h3>
          <p>
            Different datasets can reach different conclusions because they measure different
            things. We explain those differences.
          </p>
        </div>
        <div>
          <h3>Determine the Investor Impact</h3>
          <p>Statistics matter only when they affect an investment decision.</p>
        </div>
        <div>
          <h3>Bring It Back to the Property</h3>
          <p>Whenever possible, we translate market changes into property-level economics.</p>
        </div>
      </div>

      <div className="ii-prose" style={{ marginTop: 48 }}>
        <h2>Source standards</h2>
        <p>
          Whenever a primary source exists, we cite the primary source rather than relying
          exclusively on commentary.
        </p>
        <p>
          <strong>Tier 1 — Primary.</strong> Federal legislation, Federal Register, White House,
          FHFA, Census, HUD, Federal Reserve, Freddie Mac, Fannie Mae, NAR, SEC filings, company
          earnings.
        </p>
        <p>
          <strong>Tier 2 — Industry data.</strong> ATTOM, CoStar, Yardi Matrix, Redfin, Realtor.com,
          Zillow, CoreLogic/Cotality, BatchData.
        </p>
        <p>
          <strong>Tier 3 — Industry commentary.</strong> BiggerPockets, HousingWire, GlobeSt, Bisnow,
          CNBC, Bloomberg, WSJ — used to locate the primary source, not as a substitute for it.
        </p>
        <h2>What we will not do</h2>
        <p>
          We do not publish unverified statistics. If a figure is still being sourced, the hub
          shows Updating, Coming Soon, or In Development — not a fabricated number.
        </p>
        <p>
          Proprietary indexes (Market Score, Deal Availability, Investor Affordability, Rental
          Opportunity, Deal Gap Index) will not launch until the methodology is robust and
          explainable.
        </p>
        <p className="ii-pullquote">
          Market intelligence tells you where to look. Property intelligence tells you whether to
          buy.
        </p>
      </div>

      <p style={{ marginTop: 36 }}>
        <Link className="ii-arrowlink" href="/methodology">
          How DealGapIQ calculates Income Value, Target Buy, and Deal Gap
        </Link>
      </p>

      <p style={{ marginTop: 28 }}>
        <AnalyzePropertyLink
          className="ii-btn ii-btn--primary"
          href={analyzePropertyHref('methodology')}
          placement="methodology"
        >
          Analyze a Property
        </AnalyzePropertyLink>
      </p>
    </article>
  )
}
