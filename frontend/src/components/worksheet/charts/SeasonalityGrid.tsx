'use client'

interface SeasonalityGridProps {
  summer: number
  fall: number
  winter: number
  spring: number
}

const formatPercent = (value: number) => `${Math.round(value)}%`

export function SeasonalityGrid({ summer, fall, winter, spring }: SeasonalityGridProps) {
  return (
    <div className="seasonality-grid">
      <div className="season-card peak">
        <div className="season-label">Summer</div>
        <div className="season-value">{formatPercent(summer)}</div>
      </div>
      <div className="season-card">
        <div className="season-label">Fall</div>
        <div className="season-value">{formatPercent(fall)}</div>
      </div>
      <div className="season-card">
        <div className="season-label">Winter</div>
        <div className="season-value">{formatPercent(winter)}</div>
      </div>
      <div className="season-card peak">
        <div className="season-label">Spring</div>
        <div className="season-value">{formatPercent(spring)}</div>
      </div>
    </div>
  )
}
