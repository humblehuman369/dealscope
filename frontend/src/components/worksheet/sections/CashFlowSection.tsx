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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="section-two-column">
      <div>
        <SectionCard title={`Cash Flow (Year 1) - ${viewMode === 'monthly' ? 'Monthly' : 'Yearly'}`}>
          {/* Income Section */}
          <div className="bg-[var(--ws-accent-bg)] px-4 py-2 text-xs font-semibold uppercase text-[var(--ws-accent)]">
            Income
          </div>
          
          <DataRow label="Gross Rent" icon={<Home className="w-4 h-4" />} hasSlider>
            <EditableField
              value={assumptions.monthlyRent}
              onChange={(val) => updateAssumption('monthlyRent', val)}
              format="currency"
              min={500}
              max={20000}
              step={50}
              showSlider={true}
              secondaryValue={formatValue(derived.annualGrossRent) + label}
            />
          </DataRow>
          
          <DataRow label="Vacancy" hasSlider>
            <EditableField
              value={assumptions.vacancyRate}
              onChange={(val) => updateAssumption('vacancyRate', val)}
              format="percent"
              min={0}
              max={0.25}
              step={0.01}
              showSlider={true}
              secondaryValue={formatCurrency(-derived.vacancy * multiplier)}
              secondaryNegative={true}
            />
          </DataRow>
          
          <DataRow label="Operating Income" isTotal>
            <DisplayField value={derived.effectiveGrossIncome * multiplier} format="currency" />
          </DataRow>
          
          {/* Expenses Section */}
          <div className="bg-[var(--ws-negative-light)] px-4 py-2 text-xs font-semibold uppercase text-[var(--ws-negative)] mt-2">
            Operating Expenses
          </div>
          
          <DataRow label="Property Taxes" icon={<Building2 className="w-4 h-4" />} hasSlider>
            <EditableField
              value={assumptions.propertyTaxes}
              onChange={(val) => updateAssumption('propertyTaxes', val)}
              format="currency"
              min={0}
              max={30000}
              step={100}
              showSlider={true}
            />
          </DataRow>
          
          <DataRow label="Insurance" icon={<Shield className="w-4 h-4" />} hasSlider>
            <EditableField
              value={assumptions.insurance}
              onChange={(val) => updateAssumption('insurance', val)}
              format="currency"
              min={0}
              max={15000}
              step={100}
              showSlider={true}
            />
          </DataRow>
          
          <DataRow label="Property Management" icon={<Users className="w-4 h-4" />} hasSlider>
            <EditableField
              value={assumptions.managementPct}
              onChange={(val) => updateAssumption('managementPct', val)}
              format="percent"
              min={0}
              max={0.15}
              step={0.01}
              showSlider={true}
              secondaryValue={formatValue(derived.propertyManagement)}
            />
          </DataRow>
          
          <DataRow label="Maintenance" icon={<Wrench className="w-4 h-4" />} hasSlider>
            <EditableField
              value={assumptions.maintenancePct}
              onChange={(val) => updateAssumption('maintenancePct', val)}
              format="percent"
              min={0}
              max={0.15}
              step={0.01}
              showSlider={true}
              secondaryValue={formatValue(derived.maintenance)}
            />
          </DataRow>
          
          <DataRow label="Capital Expenditures" icon={<PiggyBank className="w-4 h-4" />} hasSlider>
            <EditableField
              value={assumptions.capexReservePct}
              onChange={(val) => updateAssumption('capexReservePct', val)}
              format="percent"
              min={0}
              max={0.15}
              step={0.01}
              showSlider={true}
              secondaryValue={formatValue(derived.capex)}
            />
          </DataRow>
          
          <DataRow label="HOA Fees" hasSlider>
            <EditableField
              value={assumptions.hoaFees}
              onChange={(val) => updateAssumption('hoaFees', val)}
              format="currency"
              min={0}
              max={1000}
              step={25}
              showSlider={true}
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
