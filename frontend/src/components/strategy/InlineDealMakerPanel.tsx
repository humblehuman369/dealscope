'use client'

import React from 'react'
import { DealMakerSlider } from '@/components/deal-maker/DealMakerSlider'
import type { SliderConfig } from '@/components/deal-maker/types'

export interface InlineDealMakerValues {
  buyPrice: number
  downPayment: number
  closingCosts: number
  interestRate: number
  loanTerm: number
  rehabBudget: number
  arv: number
  monthlyRent: number
  vacancyRate: number
  propertyTaxes: number
  insurance: number
  managementRate: number
}

interface InlineDealMakerPanelProps {
  values: InlineDealMakerValues
  onChange: (field: keyof InlineDealMakerValues, value: number) => void
  listPrice: number
}

const PURCHASE_SLIDERS: SliderConfig[] = [
  { id: 'buyPrice' as any, label: 'Buy Price', min: 50000, max: 2000000, step: 5000, format: 'currency' },
  { id: 'downPaymentPercent' as any, label: 'Down Payment', min: 0.05, max: 0.50, step: 0.05, format: 'percentage' },
  { id: 'closingCostsPercent' as any, label: 'Closing Costs', min: 0.02, max: 0.05, step: 0.005, format: 'percentage' },
]

const FINANCING_SLIDERS: SliderConfig[] = [
  { id: 'interestRate' as any, label: 'Interest Rate', min: 0.04, max: 0.12, step: 0.00125, format: 'percentage' },
  { id: 'loanTermYears' as any, label: 'Loan Term', min: 10, max: 30, step: 5, format: 'years' },
]

const REHAB_SLIDERS: SliderConfig[] = [
  { id: 'rehabBudget' as any, label: 'Rehab Budget', min: 0, max: 100000, step: 1000, format: 'currency' },
  { id: 'arv' as any, label: 'ARV', min: 50000, max: 2000000, step: 5000, format: 'currency' },
]

const INCOME_SLIDERS: SliderConfig[] = [
  { id: 'monthlyRent' as any, label: 'Monthly Rent', min: 500, max: 10000, step: 50, format: 'currencyPerMonth' },
  { id: 'vacancyRate' as any, label: 'Vacancy Rate', min: 0, max: 0.20, step: 0.01, format: 'percentage' },
]

const EXPENSE_SLIDERS: SliderConfig[] = [
  { id: 'annualPropertyTax' as any, label: 'Property Taxes', min: 0, max: 20000, step: 100, format: 'currencyPerYear' },
  { id: 'annualInsurance' as any, label: 'Insurance', min: 0, max: 10000, step: 100, format: 'currencyPerYear' },
  { id: 'managementRate' as any, label: 'Management Rate', min: 0, max: 0.15, step: 0.01, format: 'percentage' },
]

type SliderGroup = {
  label: string
  sliders: SliderConfig[]
  accent: string
  border: string
}

const SLIDER_GROUPS: SliderGroup[] = [
  {
    label: 'PURCHASE TERMS',
    sliders: [...PURCHASE_SLIDERS, ...FINANCING_SLIDERS],
    accent: '#0EA5E9',
    border: 'rgba(14, 165, 233, 0.7)',
  },
  {
    label: 'REHAB & VALUATION TERMS',
    sliders: REHAB_SLIDERS,
    accent: '#FB7185',
    border: 'rgba(251, 113, 133, 0.7)',
  },
  {
    label: 'INCOME & EXPENSE TERMS',
    sliders: [...INCOME_SLIDERS, ...EXPENSE_SLIDERS],
    accent: '#FACC15',
    border: 'rgba(250, 204, 21, 0.7)',
  },
]

const SLIDER_ID_TO_FIELD: Record<string, keyof InlineDealMakerValues> = {
  buyPrice: 'buyPrice',
  downPaymentPercent: 'downPayment',
  closingCostsPercent: 'closingCosts',
  interestRate: 'interestRate',
  loanTermYears: 'loanTerm',
  rehabBudget: 'rehabBudget',
  arv: 'arv',
  monthlyRent: 'monthlyRent',
  vacancyRate: 'vacancyRate',
  annualPropertyTax: 'propertyTaxes',
  annualInsurance: 'insurance',
  managementRate: 'managementRate',
}

function getSliderValue(sliderId: string, values: InlineDealMakerValues): number {
  const field = SLIDER_ID_TO_FIELD[sliderId]
  if (!field) return 0
  return values[field]
}

function dynamicMax(sliderId: string, listPrice: number): Partial<SliderConfig> {
  if (sliderId === 'buyPrice') return { max: Math.max(2000000, listPrice * 2) }
  if (sliderId === 'arv') return { max: Math.max(2000000, listPrice * 2) }
  return {}
}

export function InlineDealMakerPanel({ values, onChange, listPrice }: InlineDealMakerPanelProps) {
  return (
    <>
    <style>{`
      @keyframes dealmaker-slide-in {
        from { opacity: 0; transform: translateX(16px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `}</style>
    <div
      className="rounded-xl overflow-hidden flex flex-col h-full"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        animation: 'dealmaker-slide-in 0.3s ease-out',
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-5 py-3 flex items-center gap-2"
        style={{
          background: 'var(--surface-card)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--accent-sky)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
        <span className="text-[1.125rem] font-bold tracking-wide" style={{ color: 'var(--accent-sky)' }}>
          DealMaker
        </span>
      </div>

      {/* Slider groups */}
      <div className="px-5 pb-5">
        {SLIDER_GROUPS.map((group) => (
          <div
            key={group.label}
            className="mt-4 first:mt-2 rounded-xl px-3 pb-3"
            style={{
              border: `1px solid ${group.border}`,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
              boxShadow: `inset 0 0 0 1px ${group.border.replace('0.7', '0.25')}`,
              ['--dealmaker-accent' as string]: group.accent,
            }}
          >
            <p
              className="text-[13px] font-bold uppercase tracking-widest mb-2 pt-2 text-center"
              style={{ color: group.accent }}
            >
              {group.label}
            </p>
            {group.sliders.map((slider) => {
              const overrides = dynamicMax(slider.id as string, listPrice)
              const config = { ...slider, ...overrides }
              return (
                <DealMakerSlider
                  key={slider.id}
                  config={config}
                  value={getSliderValue(slider.id as string, values)}
                  onChange={(val) => {
                    const field = SLIDER_ID_TO_FIELD[slider.id as string]
                    if (field) onChange(field, val)
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
    </>
  )
}
