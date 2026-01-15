import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { ProfitFinder } from '../charts/ProfitFinder'
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

  return (
    <div className="space-y-4">
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

      <div className="section-two-column">
        <div className="space-y-4">
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

        <aside className="space-y-4">
          {/* Profit Finder Visual */}
          <div className="section-card">
            <div className="section-header">
              <h3 className="section-title">Profit Finder</h3>
            </div>
            <ProfitFinder
              purchasePrice={inputs.contract_price}
              listPrice={inputs.arv}
              breakevenPrice={result?.mao ?? inputs.arv * 0.7}
              monthlyCashFlow={result?.assignment_fee ?? 0}
              buyLabel="Contract"
              listLabel="ARV"
              evenLabel="MAO"
              cashFlowLabel="Assignment Fee:"
            />
          </div>

          <SectionCard title="Pricing Ladder">
            <DataRow label="ARV">
              <DisplayField value={inputs.arv} format="currency" />
            </DataRow>
            <DataRow label="Investor All-In">
              <DisplayField value={result?.investor_all_in ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Investor Pays">
              <DisplayField value={inputs.investor_price} format="currency" />
            </DataRow>
            <DataRow label="Your Contract">
              <DisplayField value={inputs.contract_price} format="currency" />
            </DataRow>
            <DataRow label="MAO (70% Rule)">
              <DisplayField value={result?.mao ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Deal Flow">
            <DataRow label="You Contract">
              <DisplayField value={inputs.contract_price} format="currency" />
            </DataRow>
            <DataRow label="Assign to Investor">
              <DisplayField value={inputs.investor_price} format="currency" />
            </DataRow>
            <DataRow label="Your Profit">
              <DisplayField value={result?.assignment_fee ?? 0} format="currency" isPositive />
            </DataRow>
          </SectionCard>

          <SectionCard title="Profit Comparison">
            <DataRow label="Your Profit">
              <DisplayField value={result?.assignment_fee ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Investor Profit">
              <DisplayField value={result?.investor_profit ?? 0} format="currency" />
            </DataRow>
          </SectionCard>
        </aside>
      </div>
    </div>
  )
}
