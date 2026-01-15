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

export function StrWorksheet({ property }: StrWorksheetProps) {
  const { inputs, updateInput, result, derived, isCalculating, error } = useStrWorksheetCalculator(property)

  const dealScoreLabel = (score: number) => {
    if (score >= 85) return 'Great STR'
    if (score >= 70) return 'Good STR'
    if (score >= 55) return 'Fair STR'
    return 'Risky STR'
  }

  const summaryCards = [
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
      value: `${formatCurrency(result?.monthly_cash_flow ?? 0)}/mo`,
      positive: (result?.monthly_cash_flow ?? 0) > 0,
    },
    {
      label: 'Cap Rate',
      value: `${(result?.cap_rate ?? 0).toFixed(1)}%`,
    },
    {
      label: 'CoC Return',
      value: `${(result?.cash_on_cash_return ?? 0).toFixed(1)}%`,
      positive: (result?.cash_on_cash_return ?? 0) > 0,
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
    <div className="str-strategy space-y-4">
      <div className="summary-cards">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`summary-card ${card.highlight ? 'highlight' : ''}`}
          >
            <div className="summary-card-label">{card.label}</div>
            <div className={`summary-card-value ${card.positive ? 'positive' : ''}`}>
              {card.value}
            </div>
            {card.subtitle && (
              <div className="summary-card-subtitle">{card.subtitle}</div>
            )}
          </div>
        ))}
      </div>

      {(isCalculating || error) && (
        <div className={`text-sm ${error ? 'text-[var(--ws-negative)]' : 'text-[var(--ws-text-secondary)]'}`}>
          {error ? `Calculation error: ${error}` : 'Recalculating worksheet metrics...'}
        </div>
      )}

      <div className="worksheet-layout-2col">
        <div className="worksheet-main-content">
          <SectionCard title="Purchase & Setup">
            <DataRow label="Purchase Price" icon={<Home className="w-4 h-4" />}>
              <EditableField
                value={inputs.purchase_price}
                onChange={(val) => updateInput('purchase_price', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Purchase Costs" icon={<CreditCard className="w-4 h-4" />}>
              <EditableField
                value={inputs.purchase_costs}
                onChange={(val) => updateInput('purchase_costs', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Furnishing Budget">
              <EditableField
                value={inputs.furnishing_budget}
                onChange={(val) => updateInput('furnishing_budget', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Total Cash Needed" isTotal>
              <DisplayField value={result?.total_cash_needed ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Financing">
            <DataRow label="Loan Amount" icon={<Building2 className="w-4 h-4" />}>
              <DisplayField value={result?.loan_amount ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Loan Type">
              <span className="text-[var(--ws-text-primary)] font-medium">
                Amortizing, {inputs.loan_term_years} Year
              </span>
            </DataRow>
            <DataRow label="Interest Rate" icon={<Percent className="w-4 h-4" />}>
              <EditableField
                value={inputs.interest_rate}
                onChange={(val) => updateInput('interest_rate', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Loan Term" icon={<Calendar className="w-4 h-4" />}>
              <EditableField
                value={inputs.loan_term_years}
                onChange={(val) => updateInput('loan_term_years', val)}
                format="number"
                suffix=" years"
              />
            </DataRow>
            <DataRow label="Monthly Payment" isHighlight>
              <DisplayField value={result?.monthly_payment ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Revenue">
            <DataRow label="Average Daily Rate">
              <EditableField
                value={inputs.average_daily_rate}
                onChange={(val) => updateInput('average_daily_rate', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Occupancy Rate">
              <EditableField
                value={inputs.occupancy_rate}
                onChange={(val) => updateInput('occupancy_rate', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Cleaning Fee">
              <EditableField
                value={inputs.cleaning_fee_revenue}
                onChange={(val) => updateInput('cleaning_fee_revenue', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Avg Booking Length">
              <EditableField
                value={inputs.avg_booking_length}
                onChange={(val) => updateInput('avg_booking_length', val)}
                format="number"
                suffix=" nights"
              />
            </DataRow>
            <DataRow label="Est. Bookings/Year">
              <DisplayField value={result?.num_bookings ?? 0} format="number" />
            </DataRow>
            <DataRow label="Gross Revenue" isTotal>
              <DisplayField value={result?.gross_revenue ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Operating Expenses">
            <DataRow label="Platform Fees">
              <div className="value-group">
                <span className="value-primary">
                  <EditableField
                    value={inputs.platform_fees_pct}
                    onChange={(val) => updateInput('platform_fees_pct', val)}
                    format="percent"
                  />
                </span>
                <span className="value-secondary">
                  {formatCurrency(result?.platform_fees ?? 0)}
                </span>
              </div>
            </DataRow>
            <DataRow label="Property Management">
              <div className="value-group">
                <span className="value-primary">
                  <EditableField
                    value={inputs.property_management_pct}
                    onChange={(val) => updateInput('property_management_pct', val)}
                    format="percent"
                  />
                </span>
                <span className="value-secondary">
                  {formatCurrency(result?.str_management ?? 0)}
                </span>
              </div>
            </DataRow>
            <DataRow label="Cleaning Cost/Turn">
              <EditableField
                value={inputs.cleaning_cost_per_turn}
                onChange={(val) => updateInput('cleaning_cost_per_turn', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Supplies & Amenities">
              <EditableField
                value={inputs.supplies_monthly}
                onChange={(val) => updateInput('supplies_monthly', val)}
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
            <DataRow label="Insurance (STR)">
              <EditableField
                value={inputs.insurance_annual}
                onChange={(val) => updateInput('insurance_annual', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Property Taxes">
              <EditableField
                value={inputs.property_taxes_annual}
                onChange={(val) => updateInput('property_taxes_annual', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Maintenance">
              <EditableField
                value={inputs.maintenance_pct}
                onChange={(val) => updateInput('maintenance_pct', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="CapEx Reserve" icon={<Wrench className="w-4 h-4" />}>
              <EditableField
                value={inputs.capex_pct}
                onChange={(val) => updateInput('capex_pct', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Total Operating Expenses" isTotal>
              <DisplayField value={result?.gross_expenses ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

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
              <DisplayField value={result?.annual_cash_flow ?? 0} format="currency" isPositive />
            </DataRow>
            <DataRow label="Monthly Cash Flow">
              <DisplayField value={result?.monthly_cash_flow ?? 0} format="currency" isPositive />
            </DataRow>
          </SectionCard>
        </div>

        <aside className="worksheet-charts-sidebar">
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

          <div className="chart-card">
            <div className="chart-card-title">Revenue Breakdown</div>
            <StrRevenueBreakdown
              grossRevenue={grossRevenue}
              nightlyRevenue={result?.rental_revenue ?? 0}
              cleaningFees={result?.cleaning_fee_revenue ?? 0}
              revpar={result?.revpar ?? 0}
            />
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Occupancy by Season</div>
            <SeasonalityGrid
              summer={result?.seasonality?.summer ?? 0}
              fall={result?.seasonality?.fall ?? 0}
              winter={result?.seasonality?.winter ?? 0}
              spring={result?.seasonality?.spring ?? 0}
            />
          </div>

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

          <div className="chart-card">
            <div className="chart-card-title">STR vs LTR Comparison</div>
            <StrVsLtrComparison
              strCashFlow={result?.monthly_cash_flow ?? 0}
              ltrCashFlow={estLTRCashFlow}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
