import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
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

  const dealScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent'
    if (score >= 70) return 'Great'
    if (score >= 55) return 'Good'
    return 'Fair'
  }

  const housingCostColor =
    (result?.your_housing_cost ?? 0) <= inputs.owner_market_rent ? 'text-[var(--hh-primary)]' : 'text-[var(--ws-negative)]'

  return (
    <div className="space-y-4">
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

      <div className="section-two-column">
        <div className="space-y-4">
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
            <DataRow label="Purchase Price" icon={<Home className="w-4 h-4" />}>
              <EditableField
                value={inputs.purchase_price}
                onChange={(val) => updateInput('purchase_price', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="$ Down Payment">
              <EditableField
                value={inputs.down_payment_pct}
                onChange={(val) => updateInput('down_payment_pct', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Closing Costs">
              <EditableField
                value={inputs.closing_costs}
                onChange={(val) => updateInput('closing_costs', val)}
                format="currency"
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
            <DataRow label="Interest Rate" icon={<Percent className="w-4 h-4" />}>
              <EditableField
                value={inputs.interest_rate}
                onChange={(val) => updateInput('interest_rate', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Loan Term">
              <EditableField
                value={inputs.loan_term_years}
                onChange={(val) => updateInput('loan_term_years', val)}
                format="number"
                suffix=" years"
              />
            </DataRow>
            <DataRow label="PMI Rate">
              <EditableField
                value={inputs.pmi_rate}
                onChange={(val) => updateInput('pmi_rate', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Total Monthly Payment" isTotal>
              <DisplayField value={result?.monthly_piti ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Rental Income">
            <DataRow label="Your Unit (Owner)">
              <span className="data-value text-[var(--hh-primary)]">You Live Here</span>
            </DataRow>
            <DataRow label="Unit 2 Rent">
              <EditableField
                value={inputs.unit2_rent}
                onChange={(val) => updateInput('unit2_rent', val)}
                format="currency"
              />
            </DataRow>
            {unitsCount >= 3 && (
              <DataRow label="Unit 3 Rent">
                <EditableField
                  value={inputs.unit3_rent}
                  onChange={(val) => updateInput('unit3_rent', val)}
                  format="currency"
                />
              </DataRow>
            )}
            {unitsCount >= 4 && (
              <DataRow label="Unit 4 Rent">
                <EditableField
                  value={inputs.unit4_rent}
                  onChange={(val) => updateInput('unit4_rent', val)}
                  format="currency"
                />
              </DataRow>
            )}
            <DataRow label="Vacancy Rate">
              <EditableField
                value={inputs.vacancy_rate}
                onChange={(val) => updateInput('vacancy_rate', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Effective Rental Income" isTotal>
              <DisplayField value={result?.rental_income ?? 0} format="currency" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Operating Expenses">
            <DataRow label="Property Taxes">
              <EditableField
                value={inputs.property_taxes_monthly}
                onChange={(val) => updateInput('property_taxes_monthly', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Insurance">
              <EditableField
                value={inputs.insurance_monthly}
                onChange={(val) => updateInput('insurance_monthly', val)}
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
            <DataRow label="CapEx Reserve">
              <EditableField
                value={inputs.capex_pct}
                onChange={(val) => updateInput('capex_pct', val)}
                format="percent"
              />
            </DataRow>
            <DataRow label="Utilities (Your Share)">
              <EditableField
                value={inputs.utilities_monthly}
                onChange={(val) => updateInput('utilities_monthly', val)}
                format="currency"
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
              <span className={`data-value ${housingCostColor}`}>
                {formatCurrency(result?.your_housing_cost ?? 0)}
              </span>
            </DataRow>
            <DataRow label="Market Rent Equivalent">
              <EditableField
                value={inputs.owner_market_rent}
                onChange={(val) => updateInput('owner_market_rent', val)}
                format="currency"
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

        <aside className="space-y-4">
          <SectionCard title="Pricing Ladder">
            <DataRow label="List Price">
              <EditableField
                value={inputs.list_price}
                onChange={(val) => updateInput('list_price', val)}
                format="currency"
              />
            </DataRow>
            <DataRow label="Your Offer">
              <DisplayField value={inputs.purchase_price} format="currency" />
            </DataRow>
            <DataRow label="Breakeven">
              <DisplayField value={result?.breakeven_price ?? 0} format="currency" />
            </DataRow>
            <DataRow label="10% CoC">
              <DisplayField value={result?.target_coc_price ?? 0} format="currency" />
            </DataRow>
            <DataRow label="FHA Max">
              <EditableField
                value={inputs.fha_max_price}
                onChange={(val) => updateInput('fha_max_price', val)}
                format="currency"
              />
            </DataRow>
          </SectionCard>

          <SectionCard title="Move-Out Scenario">
            <DataRow label="Full Rental Income">
              <DisplayField value={result?.full_rental_income ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Cash Flow (Monthly)">
              <DisplayField
                value={result?.full_rental_cash_flow ?? 0}
                format="currency"
                isPositive={(result?.full_rental_cash_flow ?? 0) >= 0}
                isNegative={(result?.full_rental_cash_flow ?? 0) < 0}
              />
            </DataRow>
            <DataRow label="Cap Rate">
              <DisplayField value={result?.moveout_cap_rate ?? 0} format="number" suffix="%" />
            </DataRow>
            <DataRow label="CoC Return">
              <DisplayField value={result?.coc_return ?? 0} format="number" suffix="%" />
            </DataRow>
          </SectionCard>

          <SectionCard title="Unit Breakdown">
            <DataRow label="Unit 1 (You)">
              <span className="data-value text-[var(--hh-primary)]">Owner-Occupied</span>
            </DataRow>
            <DataRow label="Unit 2">
              <DisplayField value={inputs.unit2_rent} format="currency" />
            </DataRow>
            {unitsCount >= 3 && (
              <DataRow label="Unit 3">
                <DisplayField value={inputs.unit3_rent} format="currency" />
              </DataRow>
            )}
            {unitsCount >= 4 && (
              <DataRow label="Unit 4">
                <DisplayField value={inputs.unit4_rent} format="currency" />
              </DataRow>
            )}
          </SectionCard>

          <SectionCard title="Quick Stats">
            <DataRow label="Total Rent">
              <DisplayField value={result?.total_rent ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Total Cash Needed">
              <DisplayField value={result?.total_cash_needed ?? 0} format="currency" />
            </DataRow>
            <DataRow label="Housing Offset">
              <DisplayField value={result?.housing_offset ?? 0} format="number" suffix="%" />
            </DataRow>
          </SectionCard>
        </aside>
      </div>
    </div>
  )
}
