'use client'

import { useWorksheetStore } from '@/stores/worksheetStore'

export function EquityChart() {
  const { projections } = useWorksheetStore()

  if (projections.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Equity Over Time</h3>
        <div className="h-64 flex items-center justify-center text-[var(--ws-text-muted)]">
          No projection data available
        </div>
      </div>
    )
  }

  const years = projections.slice(0, 10)
  const maxValue = Math.max(...years.map(y => y.propertyValue))

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toFixed(0)}`
  }

  // SVG dimensions
  const width = 100
  const height = 100
  const padding = 5

  // Create path points
  const getX = (index: number) => padding + (index / (years.length - 1)) * (width - 2 * padding)
  const getY = (value: number) => height - padding - (value / maxValue) * (height - 2 * padding)

  // Property value line (top)
  const valuePath = years.map((y, i) => {
    const x = getX(i)
    const yVal = getY(y.propertyValue)
    return i === 0 ? `M ${x} ${yVal}` : `L ${x} ${yVal}`
  }).join(' ')

  // Loan balance line
  const loanPath = years.map((y, i) => {
    const x = getX(i)
    const yVal = getY(y.loanBalance)
    return i === 0 ? `M ${x} ${yVal}` : `L ${x} ${yVal}`
  }).join(' ')

  // Equity area (filled)
  const equityAreaPath = 
    // Start from bottom-left
    `M ${getX(0)} ${height - padding} ` +
    // Go to first equity point
    `L ${getX(0)} ${getY(years[0].totalEquity)} ` +
    // Draw top line
    years.slice(1).map((y, i) => `L ${getX(i + 1)} ${getY(y.totalEquity)}`).join(' ') +
    // Go to bottom-right
    ` L ${getX(years.length - 1)} ${height - padding} ` +
    // Close path
    'Z'

  return (
    <div className="chart-container">
      <h3 className="chart-title">Equity Over Time</h3>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[#0284c7]" />
          <span className="text-[var(--ws-text-secondary)]">Property Value</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
          <span className="text-[var(--ws-text-secondary)]">Loan Balance</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[#22c55e]/30" />
          <span className="text-[var(--ws-text-secondary)]">Total Equity</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-[var(--ws-text-muted)]">
          <span>{formatCurrency(maxValue)}</span>
          <span>{formatCurrency(maxValue / 2)}</span>
          <span>$0</span>
        </div>

        {/* SVG Chart */}
        <div className="ml-16 h-full">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Equity area fill */}
            <path
              d={equityAreaPath}
              fill="rgba(34, 197, 94, 0.2)"
              stroke="none"
            />

            {/* Property value line */}
            <path
              d={valuePath}
              fill="none"
              stroke="#0284c7"
              strokeWidth="0.5"
            />

            {/* Loan balance line */}
            <path
              d={loanPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="0.5"
            />

            {/* Equity line */}
            <path
              d={years.map((y, i) => {
                const x = getX(i)
                const yVal = getY(y.totalEquity)
                return i === 0 ? `M ${x} ${yVal}` : `L ${x} ${yVal}`
              }).join(' ')}
              fill="none"
              stroke="#22c55e"
              strokeWidth="0.5"
            />

            {/* Data points */}
            {years.map((y, i) => (
              <g key={i}>
                <circle cx={getX(i)} cy={getY(y.propertyValue)} r="1" fill="#0284c7" />
                <circle cx={getX(i)} cy={getY(y.loanBalance)} r="1" fill="#ef4444" />
                <circle cx={getX(i)} cy={getY(y.totalEquity)} r="1" fill="#22c55e" />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="ml-16 flex justify-between text-xs text-[var(--ws-text-muted)] mt-2">
        {years.map((_, i) => (
          <span key={i}>Y{i + 1}</span>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-[var(--ws-border)] grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-[var(--ws-text-muted)]">Year 1 Equity</div>
          <div className="font-semibold text-[var(--ws-text-primary)]">
            {formatCurrency(years[0]?.totalEquity || 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--ws-text-muted)]">Year 10 Equity</div>
          <div className="font-semibold text-[var(--ws-positive)]">
            {formatCurrency(years[years.length - 1]?.totalEquity || 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--ws-text-muted)]">Equity Growth</div>
          <div className="font-semibold text-[var(--ws-positive)]">
            {years[0]?.totalEquity > 0 
              ? `+${(((years[years.length - 1]?.totalEquity || 0) / years[0].totalEquity - 1) * 100).toFixed(0)}%`
              : 'N/A'
            }
          </div>
        </div>
      </div>
    </div>
  )
}

