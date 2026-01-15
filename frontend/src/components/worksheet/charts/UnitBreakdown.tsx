'use client'

interface UnitBreakdownProps {
  unit2Rent: number
  unit3Rent: number
  unit4Rent: number
  unitCount: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function UnitBreakdown({ unit2Rent, unit3Rent, unit4Rent, unitCount }: UnitBreakdownProps) {
  return (
    <div className="unit-breakdown">
      <div className="unit-item owner">
        <span className="unit-item-label">Unit 1 (You)</span>
        <span className="unit-item-value accent">Owner-Occupied</span>
      </div>
      <div className="unit-item">
        <span className="unit-item-label">Unit 2</span>
        <span className="unit-item-value">{formatCurrency(unit2Rent)}/mo</span>
      </div>
      {unitCount >= 3 && (
        <div className="unit-item">
          <span className="unit-item-label">Unit 3</span>
          <span className="unit-item-value">{formatCurrency(unit3Rent)}/mo</span>
        </div>
      )}
      {unitCount >= 4 && (
        <div className="unit-item">
          <span className="unit-item-label">Unit 4</span>
          <span className="unit-item-value">{formatCurrency(unit4Rent)}/mo</span>
        </div>
      )}
    </div>
  )
}
