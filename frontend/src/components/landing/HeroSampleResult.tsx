import './hero-v5.css'

/**
 * Static sample Discovery result card for the homepage hero.
 * Not live data — structured so props can later feed a real Discovery response.
 */

type StrategyStatus = 'positive' | 'warning' | 'negative'

interface StrategyChip {
  label: string
  /** CSS variable for the strategy identity dot, e.g. 'var(--strategy-ltr)' */
  dotToken: string
  status: StrategyStatus
}

interface OfferPath {
  num: string
  label: string
}

interface HeroSampleResultProps {
  addressLine?: string
  subLine?: string
  dealScore?: string
  incomeValue?: string
  targetBuy?: string
  dealGap?: string
  paths?: OfferPath[]
  strategies?: StrategyChip[]
}

const STATUS_GLYPH: Record<StrategyStatus, string> = {
  positive: '\u2713',
  warning: '~',
  negative: '\u2717',
}

/* Path names follow the real Discovery deal-structure families
   (Price Cut, More Equity, Creative Finance, Blended Plan). */
const DEFAULT_PATHS: OfferPath[] = [
  { num: '01', label: 'Price Cut' },
  { num: '02', label: 'More Equity' },
  { num: '03', label: 'Creative Finance' },
  { num: '04', label: 'Blended Plan' },
]

const DEFAULT_STRATEGIES: StrategyChip[] = [
  { label: 'LTR', dotToken: 'var(--strategy-ltr)', status: 'positive' },
  { label: 'STR', dotToken: 'var(--strategy-str)', status: 'positive' },
  { label: 'BRRRR', dotToken: 'var(--strategy-brrrr)', status: 'warning' },
  { label: 'Flip', dotToken: 'var(--strategy-flip)', status: 'negative' },
  { label: 'House Hack', dotToken: 'var(--strategy-house-hack)', status: 'positive' },
  { label: 'Wholesale', dotToken: 'var(--strategy-wholesale)', status: 'warning' },
]

export function HeroSampleResult({
  addressLine = '4172 Maplewood Dr',
  subLine = 'Birmingham, AL 35216 \u00a0\u00b7\u00a0 Asking $284,900',
  dealScore = '82',
  incomeValue = '$268,400',
  targetBuy = '$241,700',
  dealGap = '\u2212$43,200',
  paths = DEFAULT_PATHS,
  strategies = DEFAULT_STRATEGIES,
}: HeroSampleResultProps) {
  return (
    <div className="hero-v5__card-wrap">
      <div
        className="hero-sample-result"
        role="img"
        aria-label="Sample Discovery result showing the deal gap and four offer paths for a property"
      >
        <div className="hero-sample-result__top">
          <div>
            <div className="hero-sample-result__mono-label">Discovery Result</div>
            <div className="hero-sample-result__addr">{addressLine}</div>
            <div className="hero-sample-result__addr-sub">{subLine}</div>
          </div>
          <div className="hero-sample-result__verdict">
            <div className="hero-sample-result__score">{dealScore}</div>
            <div className="hero-sample-result__score-label">Deal Score</div>
          </div>
        </div>

        <div className="hero-sample-result__metrics">
          <div className="hero-sample-result__metric">
            <span className="hero-sample-result__metric-name">Income Value</span>
            <div>
              <div className="hero-sample-result__metric-val hero-sample-result__metric-val--income">
                {incomeValue}
              </div>
              <div className="hero-sample-result__metric-note">
                max price, cash flow stays positive
              </div>
            </div>
          </div>
          <div className="hero-sample-result__metric">
            <span className="hero-sample-result__metric-name">Target Buy</span>
            <div>
              <div className="hero-sample-result__metric-val hero-sample-result__metric-val--target">
                {targetBuy}
              </div>
              <div className="hero-sample-result__metric-note">hits your return threshold</div>
            </div>
          </div>
          <div className="hero-sample-result__metric">
            <span className="hero-sample-result__metric-name">Deal Gap</span>
            <div>
              <div className="hero-sample-result__metric-val hero-sample-result__metric-val--gap">
                {dealGap}
              </div>
              <div className="hero-sample-result__metric-note">asking vs. what works</div>
            </div>
          </div>
        </div>

        <div className="hero-sample-result__gap-bar" aria-hidden="true">
          <div className="hero-sample-result__gap-fill-ok" />
          <div className="hero-sample-result__gap-fill-neg" />
        </div>

        <div className="hero-sample-result__mono-label">4 Offer Paths to Close It</div>
        <div className="hero-sample-result__paths">
          {paths.map((path) => (
            <div key={path.num} className="hero-sample-result__path">
              <span className="hero-sample-result__path-num">{path.num}</span>
              {path.label}
            </div>
          ))}
        </div>

        <div className="hero-sample-result__mono-label">6 Strategies Scanned</div>
        <div className="hero-sample-result__chips">
          {strategies.map((chip) => (
            <span key={chip.label} className="hero-sample-result__chip">
              <span
                className="hero-sample-result__chip-dot"
                style={{ background: chip.dotToken }}
              />
              {chip.label}{' '}
              <span
                className={`hero-sample-result__chip-glyph hero-sample-result__chip-glyph--${chip.status}`}
              >
                {STATUS_GLYPH[chip.status]}
              </span>
            </span>
          ))}
        </div>

        <div className="hero-sample-result__foot">
          <span>Assumptions editable · Math shown</span>
          <span className="hero-sample-result__foot-mono">SCAN 0:47s</span>
        </div>
      </div>
    </div>
  )
}
