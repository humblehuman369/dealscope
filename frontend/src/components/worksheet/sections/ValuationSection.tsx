'use client'

import { useWorksheetStore } from '@/stores/worksheetStore'
import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { Home, Ruler, Wrench } from 'lucide-react'

export function ValuationSection() {
  const { assumptions, updateAssumption, worksheetMetrics, propertyData } = useWorksheetStore()
  const arvPerSqft = worksheetMetrics?.arv_psf ?? 0
  const pricePerSqft = worksheetMetrics?.price_psf ?? 0
  const rehabPerSqft = worksheetMetrics?.rehab_psf ?? 0
  const equityAfterRehab = worksheetMetrics?.equity_after_rehab ?? 0

  // Use ORIGINAL list price from property data for stable slider ranges
  // CRITICAL: Only use snapshot values if valid - never fall back to assumptions (creates feedback loop)
  const snapshotPrice = propertyData?.property_data_snapshot?.listPrice
  const snapshotArv = propertyData?.property_data_snapshot?.arv
  
  const originalPrice = (snapshotPrice && snapshotPrice > 0) ? snapshotPrice : 500000
  const originalArv = (snapshotArv && snapshotArv > 0) ? snapshotArv : originalPrice

  // Fixed ARV range based on original values
  const arvMin = Math.round(originalArv * 0.7)
  const arvMax = Math.round(originalArv * 1.5)

  return (
    <SectionCard title="Valuation">
      <DataRow label="After Repair Value" icon={<Home className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.arv}
          onChange={(val) => updateAssumption('arv', val)}
          format="currency"
          min={arvMin}
          max={arvMax}
          step={1000}
          showSlider={true}
        />
      </DataRow>
      
      <DataRow label="ARV Per Square Foot" icon={<Ruler className="w-4 h-4" />}>
        <DisplayField value={arvPerSqft} format="currency" />
      </DataRow>
      
      <DataRow label="Price Per Square Foot">
        <DisplayField value={pricePerSqft} format="currency" />
      </DataRow>
      
      <DataRow label="Rehab Per Square Foot" icon={<Wrench className="w-4 h-4" />}>
        <DisplayField value={rehabPerSqft} format="currency" />
      </DataRow>
      
      <DataRow label="Equity at Purchase" isHighlight>
        <DisplayField 
          value={equityAfterRehab}
          format="currency"
          isPositive={equityAfterRehab > 0}
          isNegative={equityAfterRehab < 0}
        />
      </DataRow>
    </SectionCard>
  )
}
