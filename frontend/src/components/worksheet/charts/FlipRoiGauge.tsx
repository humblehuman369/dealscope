'use client'

interface FlipRoiGaugeProps {
  totalRoi: number
  annualizedRoi: number
  holdingMonths: number
}

export function FlipRoiGauge({ totalRoi, annualizedRoi, holdingMonths }: FlipRoiGaugeProps) {
  const total = Number.isFinite(totalRoi) ? totalRoi : 0
  const annualized = Number.isFinite(annualizedRoi) ? annualizedRoi : 0
  const months = holdingMonths > 0 ? holdingMonths : 1

  return (
    <div className="flip-roi-gauge">
      <div className="roi-value">{total.toFixed(0)}%</div>
      <div className="roi-label">Total ROI</div>
      <div className="roi-annualized">
        <div className="roi-annualized-value">{annualized.toFixed(1)}%</div>
        <div className="roi-annualized-label">Annualized ({months} months)</div>
      </div>
    </div>
  )
}
