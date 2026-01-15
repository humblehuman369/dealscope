'use client'

interface KeyMetric {
  value: string
  label: string
  highlight?: boolean
}

interface KeyMetricsGridProps {
  metrics: KeyMetric[]
  accentClass?: string
}

export function KeyMetricsGrid({ metrics, accentClass = '' }: KeyMetricsGridProps) {
  return (
    <div className="mini-stats-grid">
      {metrics.map((metric, index) => (
        <div key={index} className={`mini-stat ${metric.highlight ? 'highlight' : ''}`}>
          <div className={`mini-stat-value ${accentClass}`}>{metric.value}</div>
          <div className="mini-stat-label">{metric.label}</div>
        </div>
      ))}
    </div>
  )
}
