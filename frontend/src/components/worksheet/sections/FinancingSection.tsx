'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { Landmark, Percent, Calendar } from 'lucide-react'

export function FinancingSection() {
  const { assumptions, updateAssumption } = useWorksheetStore()
  const derived = useWorksheetDerived()

  return (
    <SectionCard title="Financing (Purchase)">
      <DataRow label="Loan Amount" icon={<Landmark className="w-4 h-4" />}>
        <DisplayField value={derived.loanAmount} format="currency" />
      </DataRow>
      
      <DataRow label="Loan to Cost">
        <DisplayField value={100 - (assumptions.downPaymentPct * 100)} format="number" suffix="%" />
      </DataRow>
      
      <DataRow label="Loan to Value">
        <DisplayField value={derived.ltv} format="number" suffix="%" />
      </DataRow>
      
      <DataRow label="Financing Of">
        <span className="text-[var(--ws-text-primary)] font-medium">
          Price ({((1 - assumptions.downPaymentPct) * 100).toFixed(0)}%)
        </span>
      </DataRow>
      
      <DataRow label="Loan Type" icon={<Calendar className="w-4 h-4" />}>
        <span className="text-[var(--ws-text-primary)] font-medium">
          Amortizing, {assumptions.loanTermYears} Year
        </span>
      </DataRow>
      
      <DataRow label="Interest Rate" icon={<Percent className="w-4 h-4" />} hasSlider>
        <EditableField
          value={assumptions.interestRate}
          onChange={(val) => updateAssumption('interestRate', val)}
          format="percent"
          min={0.03}
          max={0.15}
          step={0.00125}
          showSlider={true}
        />
      </DataRow>
      
      <DataRow label="Loan Term" hasSlider>
        <EditableField
          value={assumptions.loanTermYears}
          onChange={(val) => updateAssumption('loanTermYears', Math.round(val))}
          format="years"
          min={10}
          max={30}
          step={5}
          showSlider={true}
        />
      </DataRow>
      
      <DataRow label="Monthly Payment" isHighlight>
        <DisplayField value={derived.monthlyPayment} format="currency" />
      </DataRow>
    </SectionCard>
  )
}
