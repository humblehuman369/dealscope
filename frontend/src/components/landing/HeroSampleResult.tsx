import type { CSSProperties } from 'react'
import Image from 'next/image'

import './hero-v5.css'

/**
 * Homepage hero product stage — Gap-led Discovery moment + Four Paths climax.
 * Static demo numbers (not live data). Mirrors Discovery Investment Overview
 * language so the first impression matches what "Run Free Discovery" delivers.
 */

interface OfferPath {
  num: string
  label: string
  detail: string
  featured?: boolean
}

export type SampleStrategy = 'ltr' | 'str' | 'brrrr' | 'flip' | 'househack' | 'wholesale'

interface StrategySample {
  title: string
  rows: [string, string][]
}

const STRATEGY_SAMPLES: Record<SampleStrategy, StrategySample> = {
  ltr: { title: 'Long-term rental', rows: [['Income Value', '$268,400'], ['Target Buy', '$241,700']] },
  str: { title: 'Short-term rental', rows: [['Nightly rate', '$189'], ['Occupancy', '62%']] },
  brrrr: { title: 'BRRRR', rows: [['After-repair value', '$312,000'], ['Cash left in', '$41,200']] },
  flip: { title: 'Fix and flip', rows: [['After-repair value', '$312,000'], ['Rehab', '$38,000']] },
  househack: { title: 'House Hack', rows: [['Other unit covers', '$1,140/mo'], ['You pay', '$380/mo']] },
  wholesale: { title: 'Wholesale', rows: [['MAO', '$198,400'], ['Spread', '$16,200']] },
}

export const CREATIVE_FINANCE_SAMPLE_PATHS: OfferPath[] = [
  { num: '01', label: 'Price Cut', detail: 'Negotiate to $241,700' },
  { num: '02', label: 'Seller carry', detail: '$18,200 second at 0%', featured: true },
  { num: '03', label: 'Subject-To', detail: 'Take over the existing loan' },
  { num: '04', label: 'Blended Plan', detail: '2% cut + carry + verified rent' },
]

interface HeroSampleResultProps {
  addressLine?: string
  cityLine?: string
  askingPrice?: string
  incomeValue?: string
  targetBuy?: string
  dealGap?: string
  dealGapPct?: string
  paths?: OfferPath[]
  strategy?: SampleStrategy
}

/* Path names follow Discovery deal-structure families. */
const DEFAULT_PATHS: OfferPath[] = [
  { num: '01', label: 'Price Cut', detail: 'Negotiate to $241,700' },
  { num: '02', label: 'More Equity', detail: '~31% down closes the gap' },
  { num: '03', label: 'Creative Finance', detail: 'Seller carry / Sub2 structures' },
  {
    num: '04',
    label: 'Blended Plan',
    detail: 'The structure most investors miss',
    featured: true,
  },
]

function delayStyle(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` }
}

export function HeroSampleResult({
  addressLine = '4172 Maplewood Dr',
  cityLine = 'Birmingham, AL 35216',
  askingPrice = '$284,900',
  incomeValue = '$268,400',
  targetBuy = '$241,700',
  dealGap = '\u2212$43,200',
  dealGapPct = '\u221215.2%',
  paths,
  strategy = 'ltr',
}: HeroSampleResultProps) {
  const resolvedPaths = paths ?? DEFAULT_PATHS
  const sample = STRATEGY_SAMPLES[strategy]
  return (
    <div className="hero-v5__card-wrap">
      <div
        className="hero-sample-result"
        role="img"
        aria-label={`Sample Discovery result for ${addressLine}: Deal Gap ${dealGap} (${dealGapPct}) with four offer paths to close it`}
      >
        <div className="hero-sample-result__property hero-sample-result__anim" style={delayStyle(0)}>
          <div className="hero-sample-result__photo" aria-hidden="true">
            <Image
              src="/images/hero-sample-house.jpg"
              alt=""
              width={112}
              height={112}
              className="hero-sample-result__photo-img"
              priority
            />
          </div>
          <div className="hero-sample-result__property-copy">
            <div className="hero-sample-result__mono-label">Discovery</div>
            <div className="hero-sample-result__addr">{addressLine}</div>
            <div className="hero-sample-result__addr-sub">
              {cityLine}
              <span className="hero-sample-result__asking">Asking {askingPrice}</span>
            </div>
          </div>
        </div>

        <div className="hero-sample-result__gap hero-sample-result__anim" style={delayStyle(120)}>
          <div className="hero-sample-result__gap-label">Deal Gap</div>
          <div className="hero-sample-result__gap-row">
            <span className="hero-sample-result__gap-amount">{dealGap}</span>
            <span className="hero-sample-result__gap-pct">{dealGapPct}</span>
          </div>
          <div className="hero-sample-result__gap-note">Asking vs. Target Buy — what works for your return</div>
        </div>

        <div className="hero-sample-result__prices hero-sample-result__anim" style={delayStyle(220)}>
          <div className="hero-sample-result__price">
            <span className="hero-sample-result__price-name">Target Buy</span>
            <span className="hero-sample-result__price-val hero-sample-result__price-val--target">{targetBuy}</span>
            <span className="hero-sample-result__price-sub">Profit Zone</span>
          </div>
          <div className="hero-sample-result__price">
            <span className="hero-sample-result__price-name">Income Value</span>
            <span className="hero-sample-result__price-val hero-sample-result__price-val--income">{incomeValue}</span>
            <span className="hero-sample-result__price-sub">Break-Even</span>
          </div>
          <div className="hero-sample-result__price">
            <span className="hero-sample-result__price-name">Asking</span>
            <span className="hero-sample-result__price-val hero-sample-result__price-val--market">{askingPrice}</span>
            <span className="hero-sample-result__price-sub">Market Reality</span>
          </div>
        </div>

        <div
          className="hero-sample-result__scale hero-sample-result__anim"
          style={delayStyle(300)}
          aria-hidden="true"
        >
          <div className="hero-sample-result__scale-track">
            <span
              className="hero-sample-result__scale-marker hero-sample-result__scale-marker--target"
              style={{ left: '18%' }}
            >
              <span className="hero-sample-result__scale-dot" />
              Target
            </span>
            <span
              className="hero-sample-result__scale-marker hero-sample-result__scale-marker--income"
              style={{ left: '48%' }}
            >
              <span className="hero-sample-result__scale-dot" />
              Income
            </span>
            <span
              className="hero-sample-result__scale-marker hero-sample-result__scale-marker--market"
              style={{ left: '92%' }}
            >
              <span className="hero-sample-result__scale-dot" />
              Asking
            </span>
            <div className="hero-sample-result__scale-fill" />
          </div>
        </div>

        <div className="hero-sample-result__paths-head hero-sample-result__anim" style={delayStyle(380)}>
          <span className="hero-sample-result__mono-label">4 Offer Paths to Close It</span>
          <span className="hero-sample-result__paths-kicker">Most tools stop here. We keep going.</span>
        </div>

        <div className="hero-sample-result__strategy hero-sample-result__anim" style={delayStyle(340)}>
          <span className="hero-sample-result__mono-label">Sample {sample.title}</span>
          <div className="hero-sample-result__prices" style={{ marginTop: 8 }}>
            {sample.rows.map(([name, value]) => (
              <div key={name} className="hero-sample-result__price">
                <span className="hero-sample-result__price-name">{name}</span>
                <span className="hero-sample-result__price-val hero-sample-result__price-val--target">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-sample-result__paths">
          {resolvedPaths.map((path, index) => (
            <div
              key={path.num}
              className={`hero-sample-result__path hero-sample-result__anim${path.featured ? ' hero-sample-result__path--featured' : ''}`}
              style={delayStyle(460 + index * 90)}
            >
              <span className="hero-sample-result__path-num">{path.num}</span>
              <div className="hero-sample-result__path-body">
                <span className="hero-sample-result__path-label">{path.label}</span>
                <span className="hero-sample-result__path-detail">{path.detail}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="hero-sample-result__foot hero-sample-result__anim" style={delayStyle(820)}>
          <span>5 sources · under 60s · math shown</span>
        </div>
      </div>
    </div>
  )
}
