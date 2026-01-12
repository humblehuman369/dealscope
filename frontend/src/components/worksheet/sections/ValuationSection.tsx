'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { Home, Ruler } from 'lucide-react'

export function ValuationSection() {
  const { assumptions, updateAssumption, propertyData } = useWorksheetStore()
  const derived = useWorksheetDerived()
  
  const sqft = propertyData?.property_data_snapshot?.sqft || 1

  const arvPerSqft = assumptions.arv / sqft
  const pricePerSqft = assumptions.purchasePrice / sqft
  const rehabPerSqft = assumptions.rehabCosts / sqft

  return (
    <SectionCard title="Valuation">
      <DataRow label="After Repair Value" icon={<Home className="w-4 h-4" />}>
        <EditableField
          value={assumptions.arv}
          onChange={(val) => updateAssumption('arv', val)}
          format="currency"
        />
      </DataRow>
      
      <DataRow label="ARV Per Square Foot" icon={<Ruler className="w-4 h-4" />}>
        <DisplayField value={arvPerSqft} format="currency" />
      </DataRow>
      
      <DataRow label="Price Per Square Foot">
        <DisplayField value={pricePerSqft} format="currency" />
      </DataRow>
      
      <DataRow label="Rehab Per Square Foot">
        <DisplayField value={rehabPerSqft} format="currency" />
      </DataRow>
      
      <DataRow label="Equity at Purchase" isHighlight>
        <DisplayField 
          value={assumptions.arv - assumptions.purchasePrice - assumptions.rehabCosts} 
          format="currency"
          isPositive={assumptions.arv - assumptions.purchasePrice - assumptions.rehabCosts > 0}
          isNegative={assumptions.arv - assumptions.purchasePrice - assumptions.rehabCosts < 0}
        />
      </DataRow>
    </SectionCard>
  )
}

