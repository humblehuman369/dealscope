'use client'

import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { ProfitFinder } from '../charts/ProfitFinder'
import { BrrrrScoreGauge } from '../charts/BrrrrScoreGauge'
import { CashRecovery } from '../charts/CashRecovery'
import { KeyMetricsGrid } from '../charts/KeyMetricsGrid'
import { CostBreakdownDonut } from '../charts/CostBreakdownDonut'
import { PricingLadder } from '../charts/PricingLadder'
import { LoanComparison } from '../charts/LoanComparison'
import { useBrrrrWorksheetCalculator } from '@/hooks/useBrrrrWorksheetCalculator'
import { SavedProperty } from '@/hooks/useWorksheetProperty'
import { DollarSign, Home, Wrench, Percent, Landmark } from 'lucide-react'

interface BrrrrWorksheetProps {
  property: SavedProperty
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${Math.round(value / 1000)}K`
  return `$${value}`
}

export function BrrrrWorksheet({ property }: BrrrrWorksheetProps) {
  const { inputs, updateInput, result, isCalculating, error } = useBrrrrWorksheetCalculator(property)

  const renderPercentValue = (value: number) => {
    const display = Number.isFinite(value) ? `${value.toFixed(1)}%` : '∞%'
    return <span className="data-value text-[var(--ws-text-primary)]">{display}</span>
  }

  const cashOnCashDisplay = () => {
    if (!result) return '0%'
    if (!isFinite(result.cash_on_cash_return)) return '∞%'
    return `${result.cash_on_cash_return.toFixed(1)}%`
  }

  const dealScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent Deal'
    if (score >= 70) return 'Good Deal'
    if (score >= 55) return 'Fair Deal'
    return 'Risky Deal'
  }

  const handleLoanToCostChange = (value: number) => {
    updateInput('loan_to_cost_pct', value)
    updateInput('down_payment_pct', Math.max(0, 1 - value / 100))
  }

  // Calculate derived values for charts
  const allInCost = result?.all_in_cost ?? 0
  const arv = result?.arv ?? inputs.arv
  const cashOut = result?.cash_out ?? 0
  const totalCashInvested = result?.total_cash_invested ?? 0
  const recoveryPercent = totalCashInvested > 0 ? (cashOut / totalCashInvested) * 100 : 0
  const allInPctArv = result?.all_in_pct_arv ?? 0
  const equityCreated = result?.equity_created ?? 0
  const capRate = result?.cap_rate_arv ?? 0
  const rentToValue = arv > 0 ? ((inputs.monthly_rent * 12) / arv) * 100 : 0

  return (
    <div className="brrrr-strategy">
      {/* Summary Cards - 6 boxes on one row */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-label">All-In Cost</div>
          <div className="summary-card-value">
            {formatCurrency(allInCost)}
          </div>
          <div className="summary-card-subtitle">Purchase + Rehab</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">After Repair Value</div>
          <div className="summary-card-value positive">
            {formatCurrency(arv)}
          </div>
        </div>
        <div className="summary-card highlight">
          <div className="summary-card-label">Cash Out at Refi</div>
          <div className="summary-card-value highlight">
            {formatCurrency(cashOut)}
          </div>
          <div className="summary-card-subtitle">Money back in pocket</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Cash Flow</div>
          <div className="summary-card-value positive">
            {formatCurrency(result?.monthly_cash_flow ?? 0)}/mo
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">CoC Return</div>
          <div className="summary-card-value positive">
            {cashOnCashDisplay()}
          </div>
          <div className="summary-card-subtitle">
            {(result?.cash_left_in_deal ?? 0) <= 0 ? 'Infinite if $0 left in' : 'After refinance'}
          </div>
        </div>
        <div className="summary-card highlight">
          <div className="summary-card-label">Deal Score</div>
          <div className="summary-card-value">
            {result?.deal_score ?? 0}
          </div>
          <div className="summary-card-subtitle">
            {dealScoreLabel(result?.deal_score ?? 0)}
          </div>
        </div>
      </div>

      {(isCalculating || error) && (
        <div className={`text-sm mb-4 ${error ? 'text-[var(--ws-negative)]' : 'text-[var(--ws-text-secondary)]'}`}>
          {error ? `Calculation error: ${error}` : 'Recalculating worksheet metrics...'}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="worksheet-layout-2col">
        {/* Left Column - Main Sections */}
        <div className="worksheet-main-content">
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
            <DataRow label="Purchase Costs" icon={<DollarSign className="w-4 h-4" />}>
              <EditableField
                value={inputs.purchase_costs}
                onChange={(val) => updateInput('purchase_costs', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Total All-In Cost" isTotal>
              <DisplayField value={allInCost} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Financing (Purchase)" badge="Hard Money">
            <DataRow label="Loan to Cost">
              <EditableField
                value={inputs.loan_to_cost_pct}
                onChange={handleLoanToCostChange}
                format="number"
                suffix="%"
              />
            </DataRow>
            <DataRow label="Loan Amount" icon={<Landmark className="w-4 h-4" />}>
              <DisplayField value={result?.loan_amount ?? 0} format="currency" />
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
            <DataRow label="Cash to Close" isTotal>
              <DisplayField value={result?.cash_to_close ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Valuation" isHighlighted>
            <DataRow label="After Repair Value" icon={<Home className="w-4 h-4" />}>
              <EditableField
                value={inputs.arv}
                onChange={(val) => updateInput('arv', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="ARV Per Sq Ft">
              <DisplayField value={result?.arv_psf ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Purchase Per Sq Ft">
              <DisplayField value={result?.price_psf ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Rehab Per Sq Ft">
              <DisplayField value={result?.rehab_psf ?? 0} format="currency" />
            </DataRow>
            <DataRow label="All-In % of ARV">
              <DisplayField value={allInPctArv} format="number" suffix="%" />
            </DataRow>
            <DataRow label="Equity Created" isHighlight>
              <DisplayField
                value={equityCreated}
                format="currency"
                isPositive={equityCreated > 0}
                isNegative={equityCreated < 0}
              />
            </DataRow>
          </SectionCard>

          <SectionCard title="Holding Costs" badge="Rehab Period">
            <DataRow label="Holding Period">
              <EditableField
                value={inputs.holding_months}
                onChange={(val) => updateInput('holding_months', val)}
                format="number"
                suffix=" months"
              />
            </DataRow>
            <DataRow label="Loan Interest">
              <DisplayField value={result?.holding_interest ?? 0} format="currency" isNegative />
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
            <DataRow label="Total Holding Costs" isTotal>
              <DisplayField value={result?.holding_costs ?? 0} format="currency" isNegative />
            </DataRow>
          </SectionCard>

          <SectionCard title="Refinance" isHighlighted badge="Cash-Out Refi">
            <DataRow label="Loan to Value">
              <EditableField
                value={inputs.refi_ltv}
                onChange={(val) => updateInput('refi_ltv', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="New Loan Amount">
              <DisplayField value={result?.refinance_loan_amount ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Refinance Costs">
              <EditableField
                value={inputs.refi_closing_costs}
                onChange={(val) => updateInput('refi_closing_costs', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Payoff Old Loan">
              <DisplayField value={-(result?.payoff_old_loan ?? 0)} format="currency" isNegative />
            </DataRow>
            <DataRow label="Net Cash Out" isHighlight>
              <DisplayField value={cashOut} format="currency" isPositive={cashOut > 0} />
            </DataRow>
            <DataRow label="Total Cash Invested">
              <DisplayField value={totalCashInvested} format="currency" />
            </DataRow>
            <DataRow label="Cash Returned at Refi">
              <DisplayField value={cashOut} format="currency" isPositive={cashOut > 0} />
            </DataRow>
            <DataRow label="Cash Left in Deal" isTotal>
              <DisplayField value={result?.cash_left_in_deal ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Financing (After Refinance)">
            <DataRow label="Loan Amount">
              <DisplayField value={result?.refinance_loan_amount ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Interest Rate">
              <EditableField
                value={inputs.refi_interest_rate}
                onChange={(val) => updateInput('refi_interest_rate', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Loan Term">
              <EditableField
                value={inputs.refi_loan_term}
                onChange={(val) => updateInput('refi_loan_term', val)}
                format="number"
                suffix=" years"
              />
            </DataRow>
            <DataRow label="Monthly Payment" isTotal>
              <DisplayField value={(result?.annual_debt_service ?? 0) / 12} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Cash Flow (After Refinance)">
            <DataRow label="Monthly Rent" icon={<Home className="w-4 h-4" />}>
              <EditableField
                value={inputs.monthly_rent}
                onChange={(val) => updateInput('monthly_rent', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Vacancy">
              <EditableField
                value={inputs.vacancy_rate}
                onChange={(val) => updateInput('vacancy_rate', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Effective Income" isTotal>
              <DisplayField value={result?.effective_income ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Property Taxes">
              <DisplayField value={result?.property_taxes ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Insurance">
              <DisplayField value={result?.insurance ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Property Mgmt">
              <DisplayField value={result?.property_management ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Maintenance">
              <DisplayField value={result?.maintenance ?? 0} format="currency" />
            </DataRow>
            <DataRow label="CapEx">
              <DisplayField value={result?.capex ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Total Expenses" isTotal>
              <DisplayField value={result?.total_expenses ?? 0} format="currency" isNegative />
            </DataRow>
            <DataRow label="Net Operating Income">
              <DisplayField value={result?.noi ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Debt Service">
              <DisplayField value={-(result?.annual_debt_service ?? 0)} format="currency" isNegative />
            </DataRow>
            <DataRow label="Annual Cash Flow" isTotal>
              <DisplayField value={result?.annual_cash_flow ?? 0} format="currency" isPositive />
            </DataRow>
          </SectionCard>

          <SectionCard title="Investment Returns (After Refi)" isHighlighted>
            <DataRow label="Cap Rate (ARV)">
              <DisplayField value={capRate} format="number" suffix="%" />
            </DataRow>
            <DataRow label="Cash on Cash Return">
              {renderPercentValue(result?.cash_on_cash_return ?? 0)}
            </DataRow>
            <DataRow label="Return on Equity">
              <DisplayField value={result?.return_on_equity ?? 0} format="number" suffix="%" />
            </DataRow>
            <DataRow label="Total ROI (Year 1)">
              <DisplayField value={result?.total_roi_year1 ?? 0} format="number" suffix="%" />
            </DataRow>
          </SectionCard>
        </div>

        {/* Right Column - Charts Sidebar */}
        <aside className="worksheet-charts-sidebar">
          {/* Profit Finder */}
          <div className="chart-card">
            <div className="chart-card-title">Profit Finder</div>
            <ProfitFinder
              purchasePrice={inputs.purchase_price}
              listPrice={arv}
              breakevenPrice={allInCost}
              monthlyCashFlow={result?.monthly_cash_flow ?? 0}
              buyLabel="Buy"
              listLabel="ARV"
              evenLabel="All-In"
            />
          </div>

          {/* Pricing Ladder */}
          <div className="chart-card">
            <div className="chart-card-title">Pricing Ladder</div>
            <PricingLadder
              items={[
                { label: 'ARV', value: arv, type: 'arv' },
                { label: 'Refi Loan', value: result?.refinance_loan_amount ?? 0, hint: '75% LTV', type: 'refi' },
                { label: 'All-In Cost', value: allInCost, type: 'current', highlight: true },
                { label: 'Breakeven', value: result?.refinance_loan_amount ?? 0, hint: '100% out', type: 'target' },
                { label: 'MAO', value: arv * 0.7, hint: '70% ARV', type: 'mao' },
              ]}
              recoveryPercent={recoveryPercent}
            />
          </div>

          {/* BRRRR Score */}
          <div className="chart-card brrrr-highlight">
            <div className="chart-card-title brrrr">BRRRR Score</div>
            <BrrrrScoreGauge score={result?.deal_score ?? 0} />
          </div>

          {/* Cash Recovery */}
          <div className="chart-card brrrr-highlight">
            <div className="chart-card-title brrrr">Cash Recovery</div>
            <CashRecovery
              cashOut={cashOut}
              cashInvested={totalCashInvested}
              recoveryPercent={recoveryPercent}
            />
          </div>

          {/* Key Metrics */}
          <div className="chart-card">
            <div className="chart-card-title">Key Metrics</div>
            <KeyMetricsGrid
              metrics={[
                { value: `${allInPctArv.toFixed(0)}%`, label: 'All-In/ARV', highlight: true },
                { value: formatCompact(equityCreated), label: 'Equity Created' },
                { value: `${capRate.toFixed(1)}%`, label: 'Cap Rate' },
                { value: `${rentToValue.toFixed(2)}%`, label: 'Rent/Value' },
              ]}
              accentClass="brrrr"
            />
          </div>

          {/* All-In Cost Breakdown */}
          <div className="chart-card">
            <div className="chart-card-title">All-In Cost Breakdown</div>
            <CostBreakdownDonut
              items={[
                { label: 'Purchase', value: inputs.purchase_price, color: 'var(--iq-teal)' },
                { label: 'Rehab', value: inputs.rehab_costs, color: '#7c3aed' },
                { label: 'Costs', value: inputs.purchase_costs, color: '#64748b' },
              ]}
              total={allInCost}
              totalLabel="All-In"
            />
          </div>

          {/* Loan Comparison */}
          <div className="chart-card">
            <div className="chart-card-title">Loan Comparison</div>
            <LoanComparison
              purchaseLoan={result?.loan_amount ?? 0}
              purchaseRate={inputs.interest_rate}
              purchaseType="HML"
              refinanceLoan={result?.refinance_loan_amount ?? 0}
              refinanceRate={inputs.refi_interest_rate}
              refinanceType="Conv"
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
