'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { DollarSign, Home, Wrench, FileText } from 'lucide-react'

export function PurchaseRehabSection() {
  const { assumptions, updateAssumption } = useWorksheetStore()
  const derived = useWorksheetDerived()

  return (
    <SectionCard title="Purchase & Rehab">
      <DataRow label="Purchase Price" icon={<Home className="w-4 h-4" />}>
        <EditableField
          value={assumptions.purchasePrice}
          onChange={(val) => updateAssumption('purchasePrice', val)}
          format="currency"
        />
      </DataRow>
      
      <DataRow label="Amount Financed">
        <DisplayField value={derived.loanAmount} format="currency" />
      </DataRow>
      
      <DataRow label="Down Payment" icon={<DollarSign className="w-4 h-4" />}>
        <div className="value-group inline">
          <span className="value-secondary">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(derived.downPayment)}
          </span>
          <span className="value-primary">
            <EditableField
              value={assumptions.downPaymentPct}
              onChange={(val) => updateAssumption('downPaymentPct', val)}
              format="percent"
            />
          </span>
        </div>
      </DataRow>
      
      <DataRow label="Purchase Costs" icon={<FileText className="w-4 h-4" />}>
        <EditableField
          value={assumptions.closingCosts}
          onChange={(val) => updateAssumption('closingCosts', val)}
          format="currency"
        />
      </DataRow>
      
      <DataRow label="Rehab Costs" icon={<Wrench className="w-4 h-4" />}>
        <EditableField
          value={assumptions.rehabCosts}
          onChange={(val) => updateAssumption('rehabCosts', val)}
          format="currency"
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

