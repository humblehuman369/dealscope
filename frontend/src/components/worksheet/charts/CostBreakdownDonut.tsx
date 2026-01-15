'use client'

interface CostItem {
  label: string
  value: number
  color: string
}

interface CostBreakdownDonutProps {
  items: CostItem[]
  total: number
  totalLabel: string
}

const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${Math.round(value / 1000)}K`
  return `$${value}`
}

export function CostBreakdownDonut({ items, total, totalLabel }: CostBreakdownDonutProps) {
  // Calculate conic gradient angles
  let currentAngle = 0
  const gradientStops = items.map(item => {
    const percentage = (item.value / total) * 100
    const start = currentAngle
    currentAngle += percentage
    return `${item.color} ${start}% ${currentAngle}%`
  }).join(', ')

  return (
    <div className="cost-breakdown-layout">
      <div 
        className="mini-donut cost-breakdown"
        style={{ background: `conic-gradient(${gradientStops})` }}
      >
        <div className="mini-donut-center">
          <span className="mini-donut-value">{formatCompact(total)}</span>
          <span className="mini-donut-label">{totalLabel}</span>
        </div>
      </div>
      <div className="cost-breakdown-details">
        {items.map((item, index) => (
          <div key={index} className="cost-breakdown-row">
            <span 
              className="cost-breakdown-swatch" 
              style={{ backgroundColor: item.color }}
            ></span>
            <span className="cost-breakdown-label">{item.label}</span>
            <span className="cost-breakdown-value">{formatCompact(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
