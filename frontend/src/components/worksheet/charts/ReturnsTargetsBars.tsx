'use client'

interface ReturnsTargetsBarsProps {
  capRate: number
  cashOnCash: number
  dscr: number
  onePercentRule: number
}

export function ReturnsTargetsBars({
  capRate,
  cashOnCash,
  dscr,
  onePercentRule,
}: ReturnsTargetsBarsProps) {
  const rows = [
    { label: 'Cap Rate', value: capRate, target: 8, suffix: '%', format: (v: number) => v.toFixed(1) },
    { label: 'Cash on Cash', value: cashOnCash, target: 10, suffix: '%', format: (v: number) => v.toFixed(1) },
    { label: 'DSCR', value: dscr, target: 1.2, suffix: 'x', format: (v: number) => v.toFixed(2) },
    { label: '1% Rule', value: onePercentRule, target: 1, suffix: '%', format: (v: number) => v.toFixed(2) },
  ]

  return (
    <div className="returns-targets">
      {rows.map((row) => {
        const width = row.target > 0 ? (row.value / row.target) * 100 : 0
        return (
          <div key={row.label} className="h-bar-item">
            <div className="h-bar-header">
              <span className="h-bar-label">{row.label}</span>
              <span className="h-bar-value">
                {row.format(row.value)}
                {row.suffix} / {row.target}
                {row.suffix}
              </span>
            </div>
            <div className="h-bar-track">
              <div className="h-bar-fill ltr" style={{ width: `${Math.min(130, width)}%` }}></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
