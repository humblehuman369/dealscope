import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { ProfitFinder } from '../charts/ProfitFinder'
import { useFlipWorksheetCalculator } from '@/hooks/useFlipWorksheetCalculator'
import { SavedProperty } from '@/hooks/useWorksheetProperty'
import { DollarSign, Home, Wrench, Percent, Calendar } from 'lucide-react'

interface FlipWorksheetProps {
  property: SavedProperty
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function FlipWorksheet({ property }: FlipWorksheetProps) {
  const { inputs, updateInput, result, isCalculating, error } = useFlipWorksheetCalculator(property)

  const dealScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Great'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Poor'
  }

  const annualizedRoiDisplay = () => {
    const value = result?.annualized_roi ?? 0
    if (value > 999) return `${(value / 1000).toFixed(1)}k%`
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="space-y-4">
      <div className="summary-cards">
        <div className="summary-card highlight">
          <div className="summary-card-label">Total Profit</div>
          <div className="summary-card-value highlight">
            {formatCurrency(result?.net_profit_before_tax ?? 0)}
          </div>
          <div className="summary-card-subtitle">After all costs</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Cash Needed</div>
          <div className="summary-card-value">
            {formatCurrency(result?.total_cash_required ?? 0)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">ROI</div>
          <div className="summary-card-value positive">
            {(result?.roi ?? 0).toFixed(1)}%
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Annualized ROI</div>
          <div className="summary-card-value positive">
            {annualizedRoiDisplay()}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Holding Period</div>
          <div className="summary-card-value">
            {(inputs.holding_months ?? 0).toFixed(1)} mo
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
          <SectionCard title="Purchase & Rehab">
            <DataRow label="Purchase Price" icon={<Home className="w-4 h-4" />}>
              <EditableField
                value={inputs.purchase_price}
                onChange={(val) => updateInput('purchase_price', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Rehab Costs" icon={<Wrench className="w-4 h-4" />}>
              <EditableField
                value={inputs.rehab_costs}
                onChange={(val) => updateInput('rehab_costs', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Amount Financed">
              <DisplayField value={result?.loan_amount ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Down Payment">
              <EditableField
                value={inputs.down_payment_pct}
                onChange={(val) => updateInput('down_payment_pct', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Purchase Costs" icon={<DollarSign className="w-4 h-4" />}>
              <EditableField
                value={inputs.purchase_costs}
                onChange={(val) => updateInput('purchase_costs', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Total Cash Needed" isTotal>
              <DisplayField value={result?.total_cash_required ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Financing (Hard Money)">
            <DataRow label="Loan Amount">
              <DisplayField value={result?.loan_amount ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Loan to Cost">
              <DisplayField value={result?.loan_to_cost_pct ?? 0} format="number" suffix="%" />
            </DataRow>
            <DataRow label="Interest Rate" icon={<Percent className="w-4 h-4" />}>
              <EditableField
                value={inputs.interest_rate}
                onChange={(val) => updateInput('interest_rate', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Points">
              <EditableField
                value={inputs.points}
                onChange={(val) => updateInput('points', val)}
                format="number"
                suffix=" pts"
              />
            </DataRow>
            <DataRow label="Monthly Payment" isTotal>
              <DisplayField value={result?.monthly_payment ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Holding Costs">
            <DataRow label="Holding Period" icon={<Calendar className="w-4 h-4" />}>
              <EditableField
                value={inputs.holding_months}
                onChange={(val) => updateInput('holding_months', val)}
                format="number"
                suffix=" mo"
              />
            </DataRow>
            <DataRow label="Property Taxes">
              <EditableField
                value={inputs.property_taxes_annual}
                onChange={(val) => updateInput('property_taxes_annual', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Insurance">
              <EditableField
                value={inputs.insurance_annual}
                onChange={(val) => updateInput('insurance_annual', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Utilities">
              <EditableField
                value={inputs.utilities_monthly}
                onChange={(val) => updateInput('utilities_monthly', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Dumpster Rental">
              <EditableField
                value={inputs.dumpster_monthly}
                onChange={(val) => updateInput('dumpster_monthly', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Total Holding Costs" isTotal>
              <DisplayField value={result?.total_holding_costs ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Sale & Profit">
            <DataRow label="After Repair Value">
              <EditableField
                value={inputs.arv}
                onChange={(val) => updateInput('arv', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Selling Costs">
              <EditableField
                value={inputs.selling_costs_pct}
                onChange={(val) => updateInput('selling_costs_pct', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Sale Proceeds">
              <DisplayField value={result?.net_sale_proceeds ?? 0} format="currency" isPositive />
            </DataRow>
            <DataRow label="Loan Repayment">
              <DisplayField value={-(result?.loan_repayment ?? 0)} format="currency" isNegative />
            </DataRow>
            <DataRow label="Holding Costs">
              <DisplayField value={-(result?.total_holding_costs ?? 0)} format="currency" isNegative />
            </DataRow>
            <DataRow label="Invested Cash">
              <DisplayField value={-(result?.total_cash_required ?? 0)} format="currency" isNegative />
            </DataRow>
            <DataRow label="Total Profit" isTotal>
              <DisplayField value={result?.net_profit_before_tax ?? 0} format="currency" isPositive />
            </DataRow>
            <DataRow label="Post-Tax Profit">
              <DisplayField value={result?.net_profit_after_tax ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Investment Returns">
            <DataRow label="Return on Investment">
              <DisplayField value={result?.roi ?? 0} format="number" suffix="%" />
            </DataRow>
            <DataRow label="Annualized ROI">
              <DisplayField value={result?.annualized_roi ?? 0} format="number" suffix="%" />
            </DataRow>
            <DataRow label="Profit Margin">
              <DisplayField value={result?.profit_margin ?? 0} format="number" suffix="%" />
            </DataRow>
            <DataRow label="Meets 70% Rule">
              <span className="data-value">{result?.meets_70_rule ? 'Yes' : 'No'}</span>
            </DataRow>
            <DataRow label="MAO">
              <DisplayField value={result?.mao ?? 0} format="currency" />
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
              purchasePrice={inputs.purchase_price}
              listPrice={inputs.arv}
              breakevenPrice={result?.breakeven_price ?? inputs.purchase_price * 1.15}
              monthlyCashFlow={result?.net_profit ?? 0}
              buyLabel="Buy"
              listLabel="ARV"
              evenLabel="Break"
              cashFlowLabel="Net Profit:"
            />
          </div>

          <SectionCard title="Pricing Ladder">
            <DataRow label="ARV">
              <DisplayField value={result?.arv ?? inputs.arv} format="currency" />
            </DataRow>
            <DataRow label="All-In Cost">
              <DisplayField value={result?.purchase_rehab_cost ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Breakeven">
              <DisplayField value={result?.breakeven_price ?? 0} format="currency" />
            </DataRow>
            <DataRow label="15% Target (Max All-In)">
              <DisplayField value={result?.target_fifteen_all_in ?? 0} format="currency" />
            </DataRow>
            <DataRow label="MAO (70% Rule)">
              <DisplayField value={result?.mao ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Deal Snapshot">
            <DataRow label="Deal Score">
              <DisplayField value={result?.deal_score ?? 0} format="number" />
            </DataRow>
            <DataRow label="Total Profit">
              <DisplayField value={result?.net_profit_before_tax ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Cash Needed">
              <DisplayField value={result?.total_cash_required ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Profit Margin">
              <DisplayField value={result?.profit_margin ?? 0} format="number" suffix="%" />
            </DataRow>
          </SectionCard>
        </aside>
      </div>
    </div>
  )
}
