'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { Home, Shield, Users, Wrench, PiggyBank, Building2, Percent, DollarSign, Calendar } from 'lucide-react'

export function CashFlowSection() {
  const { assumptions, updateAssumption, viewMode, propertyData } = useWorksheetStore()
  const derived = useWorksheetDerived()

  // Use ORIGINAL values from property data for stable slider ranges
  // CRITICAL: Only use snapshot values if valid - never fall back to assumptions (creates feedback loop)
  const snapshotRent = propertyData?.property_data_snapshot?.monthlyRent
  const snapshotTaxes = propertyData?.property_data_snapshot?.propertyTaxes
  const snapshotInsurance = propertyData?.property_data_snapshot?.insurance
  
  const originalRent = (snapshotRent && snapshotRent > 0) ? snapshotRent : 3000
  const originalTaxes = (snapshotTaxes && snapshotTaxes > 0) ? snapshotTaxes : 5000
  const originalInsurance = (snapshotInsurance && snapshotInsurance > 0) ? snapshotInsurance : 2000

  const multiplier = viewMode === 'monthly' ? 1/12 : 1

  return (
    <SectionCard title={`Cash Flow (Year 1) - ${viewMode === 'monthly' ? 'Monthly' : 'Yearly'}`}>
      {/* Income Section */}
      <div className="bg-[var(--ws-accent-bg)] px-4 py-2 text-xs font-semibold uppercase text-[var(--ws-accent)]">
        Income
      </div>
      
      {/* Monthly Gross Rent - Editable with slider (monthly base) */}
      <DataRow label="Monthly Gross Rent" icon={<Home className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.monthlyRent}
          onChange={(val) => updateAssumption('monthlyRent', val)}
          format="currency"
          min={Math.round(originalRent * 0.5)}
          max={Math.round(originalRent * 2)}
          step={50}
          showSlider={true}
        />
      </DataRow>
      {/* Annual Gross Rent - Calculated */}
      <DataRow label="Annual Gross Rent" icon={<Calendar className="w-4 h-4" />}>
        <DisplayField value={derived.annualGrossRent} format="currency" />
      </DataRow>
      
      {/* Vacancy % - Editable with slider */}
      <DataRow label="% Vacancy" icon={<Percent className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.vacancyRate}
          onChange={(val) => updateAssumption('vacancyRate', val)}
          format="percent"
          min={0}
          max={0.20}
          step={0.01}
          showSlider={true}
        />
      </DataRow>
      {/* Vacancy $ - Calculated loss amount */}
      <DataRow label="$ Vacancy" icon={<DollarSign className="w-4 h-4" />}>
        <DisplayField value={-derived.vacancy * multiplier} format="currency" isNegative />
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
          min={Math.round(originalTaxes * 0.5)}
          max={Math.round(originalTaxes * 2)}
          step={100}
          showSlider={true}
        />
      </DataRow>
      
      <DataRow label="Insurance" icon={<Shield className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.insurance}
          onChange={(val) => updateAssumption('insurance', val)}
          format="currency"
          min={Math.round(originalInsurance * 0.5)}
          max={Math.round(originalInsurance * 2)}
          step={100}
          showSlider={true}
        />
      </DataRow>
      
      {/* Property Management % - Editable with slider */}
      <DataRow label="% Property Mgmt" icon={<Percent className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.managementPct}
          onChange={(val) => updateAssumption('managementPct', val)}
          format="percent"
          min={0}
          max={0.12}
          step={0.01}
          showSlider={true}
        />
      </DataRow>
      {/* Property Management $ - Calculated amount */}
      <DataRow label="$ Property Mgmt" icon={<DollarSign className="w-4 h-4" />}>
        <DisplayField value={derived.propertyManagement * multiplier} format="currency" />
      </DataRow>
      
      {/* Maintenance % - Editable with slider */}
      <DataRow label="% Maintenance" icon={<Percent className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.maintenancePct}
          onChange={(val) => updateAssumption('maintenancePct', val)}
          format="percent"
          min={0}
          max={0.10}
          step={0.01}
          showSlider={true}
        />
      </DataRow>
      {/* Maintenance $ - Calculated amount */}
      <DataRow label="$ Maintenance" icon={<DollarSign className="w-4 h-4" />}>
        <DisplayField value={derived.maintenance * multiplier} format="currency" />
      </DataRow>
      
      {/* CapEx Reserve % - Editable with slider */}
      <DataRow label="% Capital Maintenance" icon={<Percent className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.capexReservePct}
          onChange={(val) => updateAssumption('capexReservePct', val)}
          format="percent"
          min={0}
          max={0.10}
          step={0.01}
          showSlider={true}
        />
      </DataRow>
      {/* CapEx Reserve $ - Calculated amount */}
      <DataRow label="$ Capital Maintenance" icon={<DollarSign className="w-4 h-4" />}>
        <DisplayField value={derived.capex * multiplier} format="currency" />
      </DataRow>
      
      <DataRow label="HOA Fees" hasSlider>
        <EditableField
          value={assumptions.hoaFees}
          onChange={(val) => updateAssumption('hoaFees', val)}
          format="currency"
          min={0}
          max={500}
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
  )
}
