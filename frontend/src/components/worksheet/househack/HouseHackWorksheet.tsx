import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { ProfitFinder } from '../charts/ProfitFinder'
import { PricingLadder } from '../charts/PricingLadder'
import { HousingCostGauge } from '../charts/HousingCostGauge'
import { UnitBreakdown } from '../charts/UnitBreakdown'
import { MoveOutSummary } from '../charts/MoveOutSummary'
import { useHouseHackWorksheetCalculator } from '@/hooks/useHouseHackWorksheetCalculator'
import { SavedProperty } from '@/hooks/useWorksheetProperty'
import { Home, Percent, DollarSign } from 'lucide-react'

interface HouseHackWorksheetProps {
  property: SavedProperty
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function HouseHackWorksheet({ property }: HouseHackWorksheetProps) {
  const { inputs, updateInput, result, isCalculating, error } = useHouseHackWorksheetCalculator(property)
  const unitsCount = inputs.property_type === 'rooms' ? 2 : Number.parseInt(inputs.property_type, 10)

  // Use ORIGINAL values from property for stable slider ranges
  const originalPrice = property.property_data_snapshot?.listPrice || inputs.purchase_price || 500000
  const originalRent = property.property_data_snapshot?.monthlyRent || inputs.unit2_rent || 1500

  const dealScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent'
    if (score >= 70) return 'Great'
    if (score >= 55) return 'Good'
    return 'Fair'
  }

  const housingCostColor =
    (result?.your_housing_cost ?? 0) <= inputs.owner_market_rent ? 'text-[var(--hh-primary)]' : 'text-[var(--ws-negative)]'

  return (
    <div className="househack-strategy space-y-4">
      <div className="summary-cards">
        <div className="summary-card highlight">
          <div className="summary-card-label">Your Housing Cost</div>
          <div className="summary-card-value highlight">
            {formatCurrency(result?.your_housing_cost ?? 0)}
          </div>
          <div className="summary-card-subtitle">Per month</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Rental Income</div>
          <div className="summary-card-value positive">
            {formatCurrency(result?.rental_income ?? 0)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Cash Needed</div>
          <div className="summary-card-value">
            {formatCurrency(result?.total_cash_needed ?? 0)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">If You Move Out</div>
          <div className="summary-card-value positive">
            {formatCurrency(result?.full_rental_cash_flow ?? 0)}/mo
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">CoC Return</div>
          <div className="summary-card-value positive">
            {(result?.coc_return ?? 0).toFixed(1)}%
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
          <SectionCard title="Property & Purchase">
            <DataRow label="Property Type">
              <select
                className="select-input"
                value={inputs.property_type}
                aria-label="Property type"
                onChange={(event) => updateInput('property_type', event.target.value as typeof inputs.property_type)}
              >
                <option value="2">Duplex (2 Units)</option>
                <option value="3">Triplex (3 Units)</option>
                <option value="4">Fourplex (4 Units)</option>
                <option value="1">SFH with ADU</option>
                <option value="rooms">Room Rental</option>
              </select>
            </DataRow>
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
            <DataRow label="Down Payment" hasSlider>
              <EditableField
                value={inputs.down_payment_pct}
                onChange={(val) => updateInput('down_payment_pct', val)}
                format="percent"
                min={0.035}
                max={0.25}
                step={0.005}
                showSlider={true}
              />
            </DataRow>
            <DataRow label="Closing Costs" hasSlider>
              <EditableField
                value={inputs.closing_costs}
                onChange={(val) => updateInput('closing_costs', val)}
                format="currency"
                min={0}
                max={Math.round(originalPrice * 0.05)}
                step={500}
                showSlider={true}
              />
            </DataRow>
            <DataRow label="Total Cash Needed" isTotal>
              <DisplayField value={result?.total_cash_needed ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Financing">
            <DataRow label="Loan Amount">
              <DisplayField value={result?.loan_amount ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Loan Type">
              <select
                className="select-input"
                value={inputs.loan_type}
                aria-label="Loan type"
                onChange={(event) => updateInput('loan_type', event.target.value as typeof inputs.loan_type)}
              >
                <option value="fha">FHA (3.5% min)</option>
                <option value="conventional">Conventional (5% min)</option>
                <option value="va">VA (0% down)</option>
              </select>
            </DataRow>
            <DataRow label="Interest Rate" icon={<Percent className="w-4 h-4" />} hasSlider>
              <EditableField
                value={inputs.interest_rate}
                onChange={(val) => updateInput('interest_rate', val)}
                format="percent"
                min={0.04}
                max={0.10}
                step={0.00125}
                showSlider={true}
              />
            </DataRow>
            <DataRow label="Loan Term" hasSlider>
              <EditableField
                value={inputs.loan_term_years}
                onChange={(val) => updateInput('loan_term_years', Math.round(val))}
                format="years"
                min={15}
                max={30}
                step={5}
                showSlider={true}
              />
            </DataRow>
            <DataRow label="PMI Rate" hasSlider>
              <EditableField
                value={inputs.pmi_rate}
                onChange={(val) => updateInput('pmi_rate', val)}
                format="percent"
                min={0}
                max={0.02}
                step={0.001}
                showSlider={true}
              />
            </DataRow>
            <DataRow label="Total Monthly Payment" isTotal>
              <DisplayField value={result?.monthly_piti ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Rental Income">
            <DataRow label="Your Unit (Owner)">
              <span className="text-right min-w-[100px] flex-shrink-0 font-semibold text-[var(--hh-primary)]">You Live Here</span>
            </DataRow>
            <DataRow label="Unit 2 Rent" hasSlider>
              <EditableField
                value={inputs.unit2_rent}
                onChange={(val) => updateInput('unit2_rent', val)}
                format="currency"
                min={Math.round(originalRent * 0.5)}
                max={Math.round(originalRent * 2)}
                step={50}
                showSlider={true}
              />
            </DataRow>
            {unitsCount >= 3 && (
              <DataRow label="Unit 3 Rent" hasSlider>
                <EditableField
                  value={inputs.unit3_rent}
                  onChange={(val) => updateInput('unit3_rent', val)}
                  format="currency"
                  min={Math.round(originalRent * 0.5)}
                  max={Math.round(originalRent * 2)}
                  step={50}
                  showSlider={true}
                />
              </DataRow>
            )}
            {unitsCount >= 4 && (
              <DataRow label="Unit 4 Rent" hasSlider>
                <EditableField
                  value={inputs.unit4_rent}
                  onChange={(val) => updateInput('unit4_rent', val)}
                  format="currency"
                  min={Math.round(originalRent * 0.5)}
                  max={Math.round(originalRent * 2)}
                  step={50}
                  showSlider={true}
                />
              </DataRow>
            )}
            <DataRow label="Vacancy Rate" hasSlider>
              <EditableField
                value={inputs.vacancy_rate}
                onChange={(val) => updateInput('vacancy_rate', val)}
                format="percent"
                min={0}
                max={0.15}
                step={0.01}
                showSlider={true}
              />
            </DataRow>
            <DataRow label="Effective Rental Income" isTotal>
              <DisplayField value={result?.rental_income ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Operating Expenses">
            <DataRow label="Property Taxes" hasSlider>
              <EditableField
                value={inputs.property_taxes_monthly}
                onChange={(val) => updateInput('property_taxes_monthly', val)}
                format="currency"
                min={100}
                max={1500}
                step={25}
                showSlider={true}
              />
            </DataRow>
            <DataRow label="Insurance" hasSlider>
              <EditableField
                value={inputs.insurance_monthly}
                onChange={(val) => updateInput('insurance_monthly', val)}
                format="currency"
                min={50}
                max={500}
                step={25}
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
            <DataRow label="CapEx Reserve" hasSlider>
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
            <DataRow label="Utilities (Your Share)" hasSlider>
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
            <DataRow label="Total Monthly Expenses" isTotal>
              <DisplayField value={result?.total_monthly_expenses ?? 0} format="currency" isNegative />
            </DataRow>
          </SectionCard>

          <SectionCard title="Your Housing Cost">
            <DataRow label="Mortgage + PMI">
              <DisplayField value={result?.monthly_piti ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Operating Expenses">
              <DisplayField value={result?.total_monthly_expenses ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Rental Income Offset">
              <DisplayField value={-(result?.rental_income ?? 0)} format="currency" isPositive />
            </DataRow>
            <DataRow label="Your Net Housing Cost" isTotal>
              <span className={`text-right min-w-[100px] flex-shrink-0 font-semibold ${housingCostColor}`}>
                {formatCurrency(result?.your_housing_cost ?? 0)}
              </span>
            </DataRow>
            <DataRow label="Market Rent Equivalent" hasSlider>
              <EditableField
                value={inputs.owner_market_rent}
                onChange={(val) => updateInput('owner_market_rent', val)}
                format="currency"
                min={500}
                max={5000}
                step={50}
                showSlider={true}
              />
            </DataRow>
            <DataRow label="Monthly Savings vs Renting" isHighlight>
              <DisplayField
                value={result?.savings_vs_renting ?? 0}
                format="currency"
                isPositive={(result?.savings_vs_renting ?? 0) >= 0}
                isNegative={(result?.savings_vs_renting ?? 0) < 0}
              />
            </DataRow>
          </SectionCard>
        </div>

        <aside className="worksheet-charts-sidebar">
          <div className="chart-card">
            <div className="chart-card-title">Profit Finder</div>
            <ProfitFinder
              purchasePrice={inputs.purchase_price}
              listPrice={inputs.list_price}
              breakevenPrice={result?.breakeven_price ?? inputs.purchase_price}
              monthlyCashFlow={result?.your_housing_cost ?? 0}
              buyLabel="Buy"
              listLabel="List"
              evenLabel="Even"
              cashFlowLabel="Net Housing Cost:"
            />
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Pricing Ladder</div>
            <PricingLadder
              items={[
                { label: 'List Price', value: inputs.list_price, type: 'list' },
                { label: 'Your Offer', value: inputs.purchase_price, type: 'current', highlight: true },
                { label: 'Breakeven', value: result?.breakeven_price ?? 0, hint: '$0 housing cost', type: 'target' },
                { label: '10% CoC', value: result?.target_coc_price ?? 0, hint: 'After move-out', type: 'coc' },
                { label: 'FHA Max', value: inputs.fha_max_price, hint: 'Your area', type: 'mao' },
              ]}
            />
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Your Housing Cost</div>
            <HousingCostGauge
              housingCost={result?.your_housing_cost ?? 0}
              rentingEquivalent={inputs.owner_market_rent}
              savings={result?.savings_vs_renting ?? 0}
            />
          </div>

          <div className="chart-card">
            <div className="chart-card-title">Unit Breakdown</div>
            <UnitBreakdown
              unit2Rent={inputs.unit2_rent}
              unit3Rent={inputs.unit3_rent}
              unit4Rent={inputs.unit4_rent}
              unitCount={unitsCount}
            />
          </div>

          <div className="chart-card">
            <div className="chart-card-title">If You Move Out</div>
            <MoveOutSummary
              monthlyCashFlow={result?.full_rental_cash_flow ?? 0}
              capRate={result?.moveout_cap_rate ?? 0}
              cocReturn={result?.coc_return ?? 0}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
