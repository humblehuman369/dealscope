'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { DollarSign, Home, Wrench, FileText, Percent } from 'lucide-react'

export function PurchaseRehabSection() {
  const { assumptions, updateAssumption, propertyData } = useWorksheetStore()
  const derived = useWorksheetDerived()

  // Use ORIGINAL list price from property data for stable slider ranges
  // CRITICAL: Only use property_data_snapshot.listPrice if it's a valid positive number
  // Never fall back to assumptions.purchasePrice as that creates a feedback loop
  const snapshotPrice = propertyData?.property_data_snapshot?.listPrice
  const originalPrice = (snapshotPrice && snapshotPrice > 0) ? snapshotPrice : 500000
  
  // Fixed ranges based on original price - won't change as slider moves
  const purchasePriceMin = Math.max(50000, Math.round(originalPrice * 0.5))
  const purchasePriceMax = Math.round(originalPrice * 1.5)

  return (
    <SectionCard title="Purchase & Rehab">
      {/* Purchase Price - Editable with slider */}
      <DataRow label="Purchase Price" icon={<Home className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.purchasePrice}
          onChange={(val) => updateAssumption('purchasePrice', val)}
          format="currency"
          min={purchasePriceMin}
          max={purchasePriceMax}
          step={1000}
          showSlider={true}
        />
      </DataRow>
      
      {/* Amount Financed - Read-only calculated */}
      <DataRow label="Amount Financed">
        <DisplayField value={derived.loanAmount} format="currency" />
      </DataRow>
      
      {/* Down Payment % - Editable percentage with slider */}
      <DataRow label="Down Payment" icon={<Percent className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.downPaymentPct}
          onChange={(val) => updateAssumption('downPaymentPct', val)}
          format="percent"
          min={0.05}
          max={0.5}
          step={0.005}
          showSlider={true}
        />
      </DataRow>
      
      {/* Down Payment $ - Read-only calculated dollar amount */}
      <DataRow label="" isCalculated className="calculated-row">
        <DisplayField value={derived.downPayment} format="currency" />
      </DataRow>
      
      {/* Purchase Costs - Editable with slider */}
      <DataRow label="Purchase Costs" icon={<FileText className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.closingCosts}
          onChange={(val) => updateAssumption('closingCosts', val)}
          format="currency"
          min={0}
          max={Math.round(originalPrice * 0.1)}
          step={500}
          showSlider={true}
        />
      </DataRow>
      
      {/* Rehab Costs - Editable with slider */}
      <DataRow label="Rehab Costs" icon={<Wrench className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.rehabCosts}
          onChange={(val) => updateAssumption('rehabCosts', val)}
          format="currency"
          min={0}
          max={Math.round(originalPrice * 0.3)}
          step={1000}
          showSlider={true}
        />
      </DataRow>
      
      {/* Total Cash Needed - Summary total */}
      <DataRow label="Total Cash Needed" isTotal>
        <DisplayField 
          value={derived.totalCashNeeded} 
          format="currency" 
        />
      </DataRow>
    </SectionCard>
  )
}
