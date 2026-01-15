'use client'

interface DealCriteriaItem {
  label: string
  passed: boolean
}

interface DealCriteriaListProps {
  items: DealCriteriaItem[]
}

export function DealCriteriaList({ items }: DealCriteriaListProps) {
  return (
    <div className="deal-criteria-list">
      {items.map((item, index) => (
        <div key={index} className={`deal-criteria-item ${item.passed ? 'passed' : 'failed'}`}>
          <span className="deal-criteria-icon">{item.passed ? '✓' : '✕'}</span>
          <span className="deal-criteria-text">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
