'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { DollarSign, Home, Wrench, FileText } from 'lucide-react'

export function PurchaseRehabSection() {
  const { assumptions, updateAssumption } = useWorksheetStore()
  const derived = useWorksheetDerived()

  // Calculate dynamic ranges based on purchase price
  const purchasePriceMin = Math.max(50000, assumptions.purchasePrice * 0.5)
  const purchasePriceMax = assumptions.purchasePrice * 2

  return (
    <SectionCard title="Purchase & Rehab">
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
      
      <DataRow label="Amount Financed">
        <DisplayField value={derived.loanAmount} format="currency" />
      </DataRow>
      
      <DataRow label="Down Payment" icon={<DollarSign className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.downPaymentPct}
          onChange={(val) => updateAssumption('downPaymentPct', val)}
          format="percent"
          min={0.05}
          max={1}
          step={0.01}
          showSlider={true}
          secondaryValue={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(derived.downPayment)}
        />
      </DataRow>
      
      <DataRow label="Purchase Costs" icon={<FileText className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.closingCosts}
          onChange={(val) => updateAssumption('closingCosts', val)}
          format="currency"
          min={0}
          max={100000}
          step={500}
          showSlider={true}
        />
      </DataRow>
      
      <DataRow label="Rehab Costs" icon={<Wrench className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.rehabCosts}
          onChange={(val) => updateAssumption('rehabCosts', val)}
          format="currency"
          min={0}
          max={200000}
          step={1000}
          showSlider={true}
        />
      </DataRow>
      
      <DataRow label="Total Cash Needed" isTotal>
        <DisplayField 
          value={derived.totalCashNeeded} 
          format="currency" 
        />
      </DataRow>
    </SectionCard>
  )
}
