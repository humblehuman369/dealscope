'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { IncomeExpensesPie } from '../charts/IncomeExpensesPie'
import { DollarSign, Home, Shield, Users, Wrench, PiggyBank, Building2 } from 'lucide-react'

export function CashFlowSection() {
  const { assumptions, updateAssumption, viewMode } = useWorksheetStore()
  const derived = useWorksheetDerived()

  const multiplier = viewMode === 'monthly' ? 1/12 : 1
  const label = viewMode === 'monthly' ? '/mo' : '/yr'

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value * multiplier)
  }

  return (
    <div className="section-two-column">
      <div>
        <SectionCard title={`Cash Flow (Year 1) - ${viewMode === 'monthly' ? 'Monthly' : 'Yearly'}`}>
          {/* Income Section */}
          <div className="bg-[var(--ws-accent-bg)] px-4 py-2 text-xs font-semibold uppercase text-[var(--ws-accent)]">
            Income
          </div>
          
          <DataRow label="Gross Rent" icon={<Home className="w-4 h-4" />}>
            <div className="value-group">
              <span className="value-primary">
                <EditableField
                  value={assumptions.monthlyRent}
                  onChange={(val) => updateAssumption('monthlyRent', val)}
                  format="currency"
                />
              </span>
              <span className="value-secondary">
                {formatValue(derived.annualGrossRent)}{label}
              </span>
            </div>
          </DataRow>
          
          <DataRow label="Vacancy">
            <div className="value-group">
              <span className="value-primary">
                <EditableField
                  value={assumptions.vacancyRate}
                  onChange={(val) => updateAssumption('vacancyRate', val)}
                  format="percent"
                />
              </span>
              <span className="value-secondary">
                <DisplayField 
                  value={-derived.vacancy * multiplier} 
                  format="currency"
                  isNegative
                />
              </span>
            </div>
          </DataRow>
          
          <DataRow label="Operating Income" isTotal>
            <DisplayField value={derived.effectiveGrossIncome * multiplier} format="currency" />
          </DataRow>
          
          {/* Expenses Section */}
          <div className="bg-[var(--ws-negative-light)] px-4 py-2 text-xs font-semibold uppercase text-[var(--ws-negative)] mt-2">
            Operating Expenses
          </div>
          
          <DataRow label="Property Taxes" icon={<Building2 className="w-4 h-4" />}>
            <EditableField
              value={assumptions.propertyTaxes}
              onChange={(val) => updateAssumption('propertyTaxes', val)}
              format="currency"
            />
          </DataRow>
          
          <DataRow label="Insurance" icon={<Shield className="w-4 h-4" />}>
            <EditableField
              value={assumptions.insurance}
              onChange={(val) => updateAssumption('insurance', val)}
              format="currency"
            />
          </DataRow>
          
          <DataRow label="Property Management" icon={<Users className="w-4 h-4" />}>
            <div className="value-group">
              <span className="value-primary">
                <EditableField
                  value={assumptions.managementPct}
                  onChange={(val) => updateAssumption('managementPct', val)}
                  format="percent"
                />
              </span>
              <span className="value-secondary">
                {formatValue(derived.propertyManagement)}
              </span>
            </div>
          </DataRow>
          
          <DataRow label="Maintenance" icon={<Wrench className="w-4 h-4" />}>
            <div className="value-group">
              <span className="value-primary">
                <EditableField
                  value={assumptions.maintenancePct}
                  onChange={(val) => updateAssumption('maintenancePct', val)}
                  format="percent"
                />
              </span>
              <span className="value-secondary">
                {formatValue(derived.maintenance)}
              </span>
            </div>
          </DataRow>
          
          <DataRow label="Capital Expenditures" icon={<PiggyBank className="w-4 h-4" />}>
            <div className="value-group">
              <span className="value-primary">
                <EditableField
                  value={assumptions.capexReservePct}
                  onChange={(val) => updateAssumption('capexReservePct', val)}
                  format="percent"
                />
              </span>
              <span className="value-secondary">
                {formatValue(derived.capex)}
              </span>
            </div>
          </DataRow>
          
          <DataRow label="HOA Fees">
            <EditableField
              value={assumptions.hoaFees}
              onChange={(val) => updateAssumption('hoaFees', val)}
              format="currency"
            />
          </DataRow>
          
          <DataRow label="Operating Expenses" isTotal>
            <DisplayField 
              value={derived.totalOperatingExpenses * multiplier} 
              format="currency"
              isNegative
            />
          </DataRow>
          
          {/* Net Operating Income */}
          <div className="bg-[var(--ws-bg-alt)] px-4 py-2 text-xs font-semibold uppercase text-[var(--ws-text-primary)] mt-2">
            Net Operating Income
          </div>
          
          <DataRow label="Net Operating Income" isHighlight>
            <DisplayField 
              value={derived.noi * multiplier} 
              format="currency"
              isPositive={derived.noi > 0}
              isNegative={derived.noi < 0}
            />
          </DataRow>
          
          <DataRow label="Loan Payments">
            <DisplayField 
              value={-derived.annualDebtService * multiplier} 
              format="currency"
              isNegative
            />
          </DataRow>
          
          <DataRow label="Cash Flow" isTotal>
            <DisplayField 
              value={derived.annualCashFlow * multiplier} 
              format="currency"
              isPositive={derived.annualCashFlow > 0}
              isNegative={derived.annualCashFlow < 0}
            />
          </DataRow>
        </SectionCard>
      </div>
      
      {/* Pie Chart */}
      <div>
        <IncomeExpensesPie />
      </div>
    </div>
  )
}

