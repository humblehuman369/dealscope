'use client'

import { formatCompactCurrency } from '@/utils/formatters'

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
          <span className="mini-donut-value">{formatCompactCurrency(total)}</span>
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
            <span className="cost-breakdown-value">{formatCompactCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
