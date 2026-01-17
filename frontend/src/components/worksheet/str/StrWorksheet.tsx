'use client'

import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { ProfitFinder } from '../charts/ProfitFinder'
import { PricingLadder } from '../charts/PricingLadder'
import { StrRevenueBreakdown } from '../charts/StrRevenueBreakdown'
import { SeasonalityGrid } from '../charts/SeasonalityGrid'
import { StrVsLtrComparison } from '../charts/StrVsLtrComparison'
import { KeyMetricsGrid } from '../charts/KeyMetricsGrid'
import { useStrWorksheetCalculator } from '@/hooks/useStrWorksheetCalculator'
import { SavedProperty } from '@/hooks/useWorksheetProperty'
import { Building2, CreditCard, Calendar, Home, Percent, Wrench } from 'lucide-react'

interface StrWorksheetProps {
  property: SavedProperty
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface SummaryCardData {
  label: string
  value: string
  subtitle?: string
  highlight?: boolean
  positive?: boolean
  negative?: boolean
}

function SummaryCards({ cards }: { cards: SummaryCardData[] }) {
  return (
    <div className="summary-cards-grid">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`summary-card ${card.highlight ? 'highlight' : ''}`}
        >
          <div className="summary-card-label">{card.label}</div>
          <div 
            className={`summary-card-value ${card.positive ? 'positive' : ''} ${card.negative ? 'negative' : ''}`}
          >
            {card.value}
          </div>
          {card.subtitle && (
            <div className="summary-card-subtitle">{card.subtitle}</div>
          )}
        </div>
      ))}
    </div>
  )
}

export function StrWorksheet({ property }: StrWorksheetProps) {
  const { inputs, updateInput, result, derived, isCalculating, error } = useStrWorksheetCalculator(property)

  // Use ORIGINAL values from property for stable slider ranges
  const originalPrice = property.property_data_snapshot?.listPrice || inputs.purchase_price || 500000
  const originalAdr = property.property_data_snapshot?.averageDailyRate || inputs.average_daily_rate || 200

  const dealScoreLabel = (score: number) => {
    if (score >= 85) return 'Great STR'
    if (score >= 70) return 'Good STR'
    if (score >= 55) return 'Fair STR'
    return 'Risky STR'
  }

  const monthlyCashFlow = result?.monthly_cash_flow ?? 0

  const summaryCards: SummaryCardData[] = [
    {
      label: 'Gross Revenue',
      value: formatCurrency(result?.gross_revenue ?? 0),
      subtitle: 'Annual',
      highlight: true,
    },
    {
      label: 'Cash Needed',
      value: formatCurrency(result?.total_cash_needed ?? 0),
    },
    {
      label: 'Cash Flow',
      value: `${formatCurrency(monthlyCashFlow)}/mo`,
      positive: monthlyCashFlow > 0,
      negative: monthlyCashFlow < 0,
    },
    {
      label: 'Cap Rate',
      value: `${(result?.cap_rate ?? 0).toFixed(1)}%`,
    },
    {
      label: 'CoC Return',
      value: `${(result?.cash_on_cash_return ?? 0).toFixed(1)}%`,
      positive: (result?.cash_on_cash_return ?? 0) > 0,
      negative: (result?.cash_on_cash_return ?? 0) < 0,
    },
    {
      label: 'Deal Score',
      value: `${result?.deal_score ?? 0}`,
      subtitle: dealScoreLabel(result?.deal_score ?? 0),
      highlight: true,
    },
  ]

  const grossRevenue = result?.gross_revenue ?? 0
  const monthlyPayment = result?.monthly_payment ?? 0
  const estLTRMonthlyRent = (grossRevenue / 12) * 0.35
  const insuranceMonthly = inputs.insurance_annual / 12
  const taxesMonthly = inputs.property_taxes_annual / 12
  const estLTRCashFlow =
    estLTRMonthlyRent - monthlyPayment - (inputs.supplies_monthly * 0.2) - insuranceMonthly * 0.6 - taxesMonthly
  const grm = grossRevenue > 0 ? inputs.purchase_price / grossRevenue : 0

  return (
    <div className="str-worksheet-container">
      {/* Summary Metrics - Responsive Grid: 2 cols mobile, 3 cols tablet, 6 cols desktop */}
      <SummaryCards cards={summaryCards} />

      {/* Loading/Error State */}
      {(isCalculating || error) && (
        <div className={`worksheet-status-message ${error ? 'error' : 'loading'}`}>
          {error ? `Calculation error: ${error}` : 'Recalculating worksheet metrics...'}
        </div>
      )}

      {/* Two-Column Layout: 50-50 on desktop, single column on mobile/tablet */}
      <div className="worksheet-two-column-layout">
        {/* LEFT COLUMN: Input Sections (scrollable on desktop) */}
        <div className="worksheet-left-column">
          <div className="worksheet-sections-stack">
            {/* Purchase & Setup Section */}
            <SectionCard title="Purchase & Setup">
              <DataRow label="Purchase Price" icon={<Home className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.purchase_price}
                  onChange={(val) => updateInput('purchase_price', val)}
                  format="currency"
                  min={Math.round(originalPrice * 0.5)}
                  max={Math.round(originalPrice * 1.5)}
                  step={1000}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Purchase Costs" icon={<CreditCard className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.purchase_costs}
                  onChange={(val) => updateInput('purchase_costs', val)}
                  format="currency"
                  min={0}
                  max={Math.round(originalPrice * 0.1)}
                  step={500}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Furnishing Budget" hasSlider>
                <EditableField
                  value={inputs.furnishing_budget}
                  onChange={(val) => updateInput('furnishing_budget', val)}
                  format="currency"
                  min={0}
                  max={50000}
                  step={500}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Total Cash Needed" isTotal>
                <DisplayField value={result?.total_cash_needed ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Financing Section */}
            <SectionCard title="Financing">
              <DataRow label="Loan Amount" icon={<Building2 className="w-4 h-4" />}>
                <DisplayField value={result?.loan_amount ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Loan Type">
                <span className="text-[var(--ws-text-primary)] font-medium">
                  Amortizing, {inputs.loan_term_years} Year
                </span>
              </DataRow>
              <DataRow label="Interest Rate" icon={<Percent className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.interest_rate}
                  onChange={(val) => updateInput('interest_rate', val)}
                  format="percent"
                  min={0.04}
                  max={0.12}
                  step={0.00125}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Loan Term" icon={<Calendar className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.loan_term_years}
                  onChange={(val) => updateInput('loan_term_years', Math.round(val))}
                  format="years"
                  min={10}
                  max={30}
                  step={5}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Monthly Payment" isHighlight>
                <DisplayField value={result?.monthly_payment ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Revenue Section */}
            <SectionCard title="Revenue">
              <DataRow label="Average Daily Rate" hasSlider>
                <EditableField
                  value={inputs.average_daily_rate}
                  onChange={(val) => updateInput('average_daily_rate', val)}
                  format="currency"
                  min={Math.round(originalAdr * 0.5)}
                  max={Math.round(originalAdr * 2)}
                  step={5}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Occupancy Rate" hasSlider>
                <EditableField
                  value={inputs.occupancy_rate}
                  onChange={(val) => updateInput('occupancy_rate', val)}
                  format="percent"
                  min={0.3}
                  max={0.95}
                  step={0.01}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Cleaning Fee" hasSlider>
                <EditableField
                  value={inputs.cleaning_fee_revenue}
                  onChange={(val) => updateInput('cleaning_fee_revenue', val)}
                  format="currency"
                  min={50}
                  max={500}
                  step={10}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Avg Booking Length" hasSlider>
                <EditableField
                  value={inputs.avg_booking_length}
                  onChange={(val) => updateInput('avg_booking_length', val)}
                  format="number"
                  suffix=" nights"
                  min={1}
                  max={14}
                  step={0.5}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Est. Bookings/Year">
                <DisplayField value={result?.num_bookings ?? 0} format="number" />
              </DataRow>
              <DataRow label="Gross Revenue" isTotal>
                <DisplayField value={result?.gross_revenue ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Operating Expenses Section */}
            <SectionCard title="Operating Expenses">
              {/* Platform Fees % - Editable with slider */}
              <DataRow label="% Platform Fees" icon={<Percent className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.platform_fees_pct}
                  onChange={(val) => updateInput('platform_fees_pct', val)}
                  format="percent"
                  min={0.03}
                  max={0.20}
                  step={0.01}
                  showSlider={true}
                />
              </DataRow>
              {/* Platform Fees $ - Calculated amount */}
              <DataRow label="$ Platform Fees" icon={<CreditCard className="w-4 h-4" />}>
                <DisplayField value={result?.platform_fees ?? 0} format="currency" />
              </DataRow>
              
              {/* Property Management % - Editable with slider */}
              <DataRow label="% Property Mgmt" icon={<Percent className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.property_management_pct}
                  onChange={(val) => updateInput('property_management_pct', val)}
                  format="percent"
                  min={0}
                  max={0.30}
                  step={0.01}
                  showSlider={true}
                />
              </DataRow>
              {/* Property Management $ - Calculated amount */}
              <DataRow label="$ Property Mgmt" icon={<CreditCard className="w-4 h-4" />}>
                <DisplayField value={result?.str_management ?? 0} format="currency" />
              </DataRow>
              
              <DataRow label="Cleaning Cost/Turn" hasSlider>
                <EditableField
                  value={inputs.cleaning_cost_per_turn}
                  onChange={(val) => updateInput('cleaning_cost_per_turn', val)}
                  format="currency"
                  min={50}
                  max={300}
                  step={10}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Supplies & Amenities" hasSlider>
                <EditableField
                  value={inputs.supplies_monthly}
                  onChange={(val) => updateInput('supplies_monthly', val)}
                  format="currency"
                  min={0}
                  max={500}
                  step={25}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Utilities" hasSlider>
                <EditableField
                  value={inputs.utilities_monthly}
                  onChange={(val) => updateInput('utilities_monthly', val)}
                  format="currency"
                  min={0}
                  max={500}
                  step={25}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Insurance (STR)" hasSlider>
                <EditableField
                  value={inputs.insurance_annual}
                  onChange={(val) => updateInput('insurance_annual', val)}
                  format="currency"
                  min={1000}
                  max={10000}
                  step={100}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Property Taxes" hasSlider>
                <EditableField
                  value={inputs.property_taxes_annual}
                  onChange={(val) => updateInput('property_taxes_annual', val)}
                  format="currency"
                  min={1000}
                  max={30000}
                  step={100}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Maintenance" hasSlider>
                <EditableField
                  value={inputs.maintenance_pct}
                  onChange={(val) => updateInput('maintenance_pct', val)}
                  format="percent"
                  min={0}
                  max={0.10}
                  step={0.01}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="CapEx Reserve" icon={<Wrench className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.capex_pct}
                  onChange={(val) => updateInput('capex_pct', val)}
                  format="percent"
                  min={0}
                  max={0.10}
                  step={0.01}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Total Operating Expenses" isTotal>
                <DisplayField value={result?.gross_expenses ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Cash Flow Summary Section */}
            <SectionCard title="Cash Flow Summary">
              <DataRow label="Gross Revenue">
                <DisplayField value={result?.gross_revenue ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Operating Expenses">
                <DisplayField value={-(result?.gross_expenses ?? 0)} format="currency" isNegative />
              </DataRow>
              <DataRow label="Net Operating Income">
                <DisplayField value={result?.noi ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Annual Debt Service">
                <DisplayField value={-(derived.annualDebtService ?? 0)} format="currency" isNegative />
              </DataRow>
              <DataRow label="Annual Cash Flow" isTotal>
                <DisplayField 
                  value={result?.annual_cash_flow ?? 0} 
                  format="currency" 
                  isPositive={(result?.annual_cash_flow ?? 0) > 0}
                  isNegative={(result?.annual_cash_flow ?? 0) < 0}
                />
              </DataRow>
              <DataRow label="Monthly Cash Flow">
                <DisplayField 
                  value={result?.monthly_cash_flow ?? 0} 
                  format="currency" 
                  isPositive={(result?.monthly_cash_flow ?? 0) > 0}
                  isNegative={(result?.monthly_cash_flow ?? 0) < 0}
                />
              </DataRow>
            </SectionCard>
          </div>
        </div>

        {/* RIGHT COLUMN: Charts & Visualizations (sticky on desktop) */}
        <aside className="worksheet-right-column">
          <div className="worksheet-charts-stack">
            {/* Profit Finder */}
            <div className="chart-card">
              <div className="chart-card-title">Profit Finder</div>
              <ProfitFinder
                purchasePrice={inputs.purchase_price}
                listPrice={result?.list_price ?? inputs.list_price ?? inputs.purchase_price}
                breakevenPrice={result?.breakeven_price ?? inputs.purchase_price}
                monthlyCashFlow={result?.monthly_cash_flow ?? 0}
                buyLabel="Buy"
                listLabel="List"
                evenLabel="Even"
              />
            </div>

            {/* Pricing Ladder */}
            <div className="chart-card">
              <div className="chart-card-title">Pricing Ladder</div>
              <PricingLadder
                items={[
                  { label: 'List Price', value: result?.list_price ?? inputs.list_price ?? inputs.purchase_price, type: 'list' },
                  { label: 'Your Offer', value: inputs.purchase_price, type: 'current', highlight: true },
                  { label: 'Breakeven', value: result?.breakeven_price ?? 0, hint: '0% CoC', type: 'target' },
                  { label: '10% CoC', value: result?.target_coc_price ?? 0, hint: 'Target', type: 'coc' },
                  { label: 'MAO', value: result?.mao_price ?? 0, hint: '70% GRM', type: 'mao' },
                ]}
                recoveryPercent={result?.discount_percent ?? 0}
                indicatorLabel="below list"
                indicatorClass="str"
              />
            </div>

            {/* Revenue Breakdown */}
            <div className="chart-card">
              <div className="chart-card-title">Revenue Breakdown</div>
              <StrRevenueBreakdown
                grossRevenue={grossRevenue}
                nightlyRevenue={result?.rental_revenue ?? 0}
                cleaningFees={result?.cleaning_fee_revenue ?? 0}
                revpar={result?.revpar ?? 0}
              />
            </div>

            {/* Occupancy by Season */}
            <div className="chart-card">
              <div className="chart-card-title">Occupancy by Season</div>
              <SeasonalityGrid
                summer={result?.seasonality?.summer ?? 0}
                fall={result?.seasonality?.fall ?? 0}
                winter={result?.seasonality?.winter ?? 0}
                spring={result?.seasonality?.spring ?? 0}
              />
            </div>

            {/* Key Metrics */}
            <div className="chart-card">
              <div className="chart-card-title">Key Metrics</div>
              <KeyMetricsGrid
                metrics={[
                  { value: `${(result?.cap_rate ?? 0).toFixed(1)}%`, label: 'Cap Rate', highlight: true },
                  { value: `${(result?.cash_on_cash_return ?? 0).toFixed(1)}%`, label: 'CoC Return' },
                  { value: `${(result?.dscr ?? 0).toFixed(2)}x`, label: 'DSCR' },
                  { value: `${grm.toFixed(1)}`, label: 'GRM' },
                ]}
                accentClass="str"
              />
            </div>

            {/* STR vs LTR Comparison */}
            <div className="chart-card">
              <div className="chart-card-title">STR vs LTR Comparison</div>
              <StrVsLtrComparison
                strCashFlow={result?.monthly_cash_flow ?? 0}
                ltrCashFlow={estLTRCashFlow}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
