import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { ProfitFinder } from '../charts/ProfitFinder'
import { PricingLadder } from '../charts/PricingLadder'
import { DealFlow } from '../charts/DealFlow'
import { ProfitComparison } from '../charts/ProfitComparison'
import { ClosingCostsBreakdown } from '../charts/ClosingCostsBreakdown'
import { DealCriteriaList } from '../charts/DealCriteriaList'
import { useWholesaleWorksheetCalculator } from '@/hooks/useWholesaleWorksheetCalculator'
import { SavedProperty } from '@/hooks/useWorksheetProperty'
import { DollarSign, Home, Wrench } from 'lucide-react'

interface WholesaleWorksheetProps {
  property: SavedProperty
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function WholesaleWorksheet({ property }: WholesaleWorksheetProps) {
  const { inputs, updateInput, result, isCalculating, error } = useWholesaleWorksheetCalculator(property)

  const dealScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent Deal'
    if (score >= 75) return 'Great Deal'
    if (score >= 60) return 'Good Deal'
    if (score >= 40) return 'Fair Deal'
    return 'Poor Deal'
  }

  const assignmentFee = result?.assignment_fee ?? 0
  const assignmentFeePct = inputs.investor_price > 0 ? (assignmentFee / inputs.investor_price) * 100 : 0
  const closingCosts = result?.closing_costs ?? 0
  const titleEscrow = Math.max(0, inputs.marketing_costs)
  const transferTax = Math.max(0, inputs.earnest_money)
  const otherClosing = Math.max(0, closingCosts - titleEscrow - transferTax)

  return (
    <div className="wholesale-strategy space-y-4">
      <div className="summary-cards">
        <div className="summary-card highlight">
          <div className="summary-card-label">Assignment Fee</div>
          <div className="summary-card-value highlight">
            {formatCurrency(result?.assignment_fee ?? 0)}
          </div>
          <div className="summary-card-subtitle">Your profit</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Your Contract</div>
          <div className="summary-card-value">
            {formatCurrency(inputs.contract_price)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Investor Pays</div>
          <div className="summary-card-value">
            {formatCurrency(inputs.investor_price)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Cash Needed</div>
          <div className="summary-card-value">
            {formatCurrency(inputs.earnest_money)}
          </div>
          <div className="summary-card-subtitle">Earnest money</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Investor ROI</div>
          <div className="summary-card-value positive">
            {(result?.investor_roi ?? 0).toFixed(1)}%
          </div>
        </div>
        <div className="summary-card highlight">
          <div className="summary-card-label">Deal Score</div>
          <div className="summary-card-value highlight">
            {result?.deal_score ?? 0}
          </div>
          <div className="summary-card-subtitle">
            {dealScoreLabel(result?.deal_score ?? 0)}
          </div>
        </div>
      </div>

      {(isCalculating || error) && (
        <div className={`text-sm ${error ? 'text-[var(--ws-negative)]' : 'text-[var(--ws-text-secondary)]'}`}>
          {error ? `Calculation error: ${error}` : 'Recalculating worksheet metrics...'}
        </div>
      )}

      <div className="worksheet-layout-2col">
        <div className="worksheet-main-content">
          <SectionCard title="Wholesale Analysis">
            <DataRow label="Investor Purchase Price" icon={<Home className="w-4 h-4" />}>
              <EditableField
                value={inputs.investor_price}
                onChange={(val) => updateInput('investor_price', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Your Contract Price">
              <EditableField
                value={inputs.contract_price}
                onChange={(val) => updateInput('contract_price', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Closing Costs">
              <EditableField
                value={inputs.marketing_costs}
                onChange={(val) => updateInput('marketing_costs', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Your Assignment Fee" isHighlight>
              <DisplayField value={result?.assignment_fee ?? 0} format="currency" isPositive />
            </DataRow>
            <DataRow label="Post-Tax Profit">
              <DisplayField value={result?.post_tax_profit ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Purchase & Rehab (Investor)">
            <DataRow label="Purchase Price">
              <DisplayField value={inputs.investor_price} format="currency" />
            </DataRow>
            <DataRow label="Rehab Costs" icon={<Wrench className="w-4 h-4" />}>
              <EditableField
                value={inputs.rehab_costs}
                onChange={(val) => updateInput('rehab_costs', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Amount Financed">
              <DisplayField value={result?.amount_financed ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Down Payment">
              <DisplayField value={result?.down_payment ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Purchase Costs">
              <DisplayField value={result?.investor_purchase_costs ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Total Cash Needed" isTotal>
              <DisplayField value={result?.total_cash_needed ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Sale & Profit (Investor)">
            <DataRow label="After Repair Value">
              <EditableField
                value={inputs.arv}
                onChange={(val) => updateInput('arv', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Selling Costs">
              <DisplayField value={result?.selling_costs ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Sale Proceeds">
              <DisplayField value={result?.sale_proceeds ?? 0} format="currency" isPositive />
            </DataRow>
            <DataRow label="Total Investment">
              <DisplayField value={-(result?.investor_all_in ?? 0)} format="currency" isNegative />
            </DataRow>
            <DataRow label="Investor Profit" isTotal>
              <DisplayField value={result?.investor_profit ?? 0} format="currency" isPositive />
            </DataRow>
            <DataRow label="Investor ROI">
              <DisplayField value={result?.investor_roi ?? 0} format="number" suffix="%" />
            </DataRow>
          </SectionCard>
        </div>

        <aside className="worksheet-charts-sidebar">
          <div className="chart-card">
            <div className="chart-card-title">Profit Finder</div>
            <ProfitFinder
              purchasePrice={inputs.contract_price}
              listPrice={inputs.arv}
              breakevenPrice={result?.mao ?? inputs.arv * 0.7}
              monthlyCashFlow={assignmentFee}
              buyLabel="Contract"
              listLabel="ARV"
              evenLabel="MAO"
              cashFlowLabel="Assignment Fee:"
            />
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Pricing Ladder</div>
            <PricingLadder
              items={[
                { label: 'ARV', value: inputs.arv, type: 'arv' },
                { label: 'Investor All-In', value: result?.investor_all_in ?? 0, type: 'current', highlight: true },
                { label: 'Investor Pays', value: inputs.investor_price, type: 'target' },
                { label: 'Your Contract', value: inputs.contract_price, type: 'coc' },
                { label: 'MAO', value: result?.mao ?? 0, hint: '70% Rule', type: 'mao' },
              ]}
              recoveryPercent={assignmentFeePct}
              indicatorLabel="assignment fee"
              indicatorClass="assignment"
              indicatorValue={formatCurrency(assignmentFee)}
            />
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Deal Flow</div>
            <DealFlow
              contractPrice={inputs.contract_price}
              investorPrice={inputs.investor_price}
              assignmentFee={assignmentFee}
            />
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Profit Comparison</div>
            <ProfitComparison
              yourProfit={assignmentFee}
              investorProfit={result?.investor_profit ?? 0}
            />
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Closing Costs</div>
            <ClosingCostsBreakdown
              titleEscrow={titleEscrow}
              transferTax={transferTax}
              other={otherClosing}
            />
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Deal Criteria</div>
            <DealCriteriaList
              items={[
                { label: 'Assignment Fee > $5,000', passed: assignmentFee > 5000 },
                { label: 'Investor ROI > 25%', passed: (result?.investor_roi ?? 0) > 25 },
                { label: 'Investor at ≤ 70% ARV', passed: inputs.investor_price <= inputs.arv * 0.7 },
              ]}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
