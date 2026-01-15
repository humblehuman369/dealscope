'use client'

interface ProfitTimelineProps {
  baseProfit: number
  monthlyHoldingCost: number
  maxMonths?: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function ProfitTimeline({ baseProfit, monthlyHoldingCost, maxMonths = 6 }: ProfitTimelineProps) {
  const rows = Array.from({ length: maxMonths }, (_, idx) => {
    const month = idx + 1
    const profit = baseProfit - monthlyHoldingCost * (month - 1)
    return { month, profit }
  })

  const maxProfit = rows.reduce((max, row) => Math.max(max, row.profit), 0)

  return (
    <div className="profit-timeline">
      {rows.map((row) => {
        const width = maxProfit > 0 ? Math.max(10, (row.profit / maxProfit) * 100) : 0
        return (
          <div key={row.month} className="timeline-row">
            <span className="timeline-label">{row.month} mo</span>
            <div className="timeline-bar-container">
              <div className="timeline-bar profit" style={{ width: `${width}%` }}></div>
              <span className="timeline-value">{formatCurrency(row.profit)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
