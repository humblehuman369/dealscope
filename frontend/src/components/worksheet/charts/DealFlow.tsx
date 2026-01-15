'use client'

interface DealFlowProps {
  contractPrice: number
  investorPrice: number
  assignmentFee: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function DealFlow({ contractPrice, investorPrice, assignmentFee }: DealFlowProps) {
  return (
    <div className="deal-flow">
      <div className="deal-flow-step">
        <div className="deal-flow-icon buy">B</div>
        <div className="deal-flow-content">
          <div className="deal-flow-title">You Contract</div>
          <div className="deal-flow-value primary">{formatCurrency(contractPrice)}</div>
        </div>
      </div>
      <div className="deal-flow-step">
        <div className="deal-flow-icon assign">A</div>
        <div className="deal-flow-content">
          <div className="deal-flow-title">Assign to Investor</div>
          <div className="deal-flow-value positive">{formatCurrency(investorPrice)}</div>
        </div>
      </div>
      <div className="deal-flow-step">
        <div className="deal-flow-icon profit">$</div>
        <div className="deal-flow-content">
          <div className="deal-flow-title">Your Profit</div>
          <div className="deal-flow-value accent">{formatCurrency(assignmentFee)}</div>
        </div>
      </div>
    </div>
  )
}
