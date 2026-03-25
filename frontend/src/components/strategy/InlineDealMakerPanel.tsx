'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { DealMakerSlider } from '@/components/deal-maker/DealMakerSlider'
import type { SliderConfig } from '@/components/deal-maker/types'

export interface InlineDealMakerValues {
  buyPrice: number
  downPayment: number
  closingCosts: number
  interestRate: number
  loanTerm: number
  rehabBudget: number
  marketValue: number
  arv: number
  monthlyRent: number
  vacancyRate: number
  propertyTaxes: number
  insurance: number
  managementRate: number
}

export type DealMakerSection = SliderGroup['id']

interface InlineDealMakerPanelProps {
  values: InlineDealMakerValues
  onChange: (field: keyof InlineDealMakerValues, value: number) => void
  listPrice: number
  initialSection?: DealMakerSection
}

const TOUR_STORAGE_KEY = 'dealmaker_tour_completed'

interface TourStep {
  sliderId: string
  groupId: DealMakerSection
  title: string
  message: string
}

const TOUR_STEPS: TourStep[] = [
  {
    sliderId: 'buyPrice',
    groupId: 'purchase',
    title: 'Start with your offer price',
    message: 'This is the price you\u2019ll offer the seller. It\u2019s the foundation of every return metric \u2014 lower prices improve cash flow and returns.',
  },
  {
    sliderId: 'monthlyRent',
    groupId: 'income',
    title: 'Set your rental income',
    message: 'Your rental income drives cash flow. This is pre-filled from market data \u2014 adjust it if you have better local knowledge.',
  },
  {
    sliderId: 'managementRate',
    groupId: 'income',
    title: 'Dial in your expenses',
    message: 'Expenses eat into returns. Set this to 0% if you\u2019ll self-manage, or 6\u201310% for a professional property manager.',
  },
]

const PURCHASE_SLIDERS: SliderConfig[] = [
  { id: 'buyPrice' as any, label: 'Buy Price', min: 50000, max: 2000000, step: 5000, format: 'currency',
    helpText: 'The price you offer the seller. Lower buy prices improve your cash flow and return metrics.' },
  { id: 'downPaymentPercent' as any, label: 'Down Payment', min: 0, max: 0.50, step: 0.05, format: 'percentage',
    helpText: 'Percentage of buy price paid upfront in cash. Higher down payments reduce your mortgage but require more cash at closing.' },
  { id: 'closingCostsPercent' as any, label: 'Closing Costs', min: 0.02, max: 0.05, step: 0.005, format: 'percentage',
    helpText: 'Fees paid at closing \u2014 title insurance, appraisal, attorney, etc. Typically 2\u20135% of the purchase price.' },
]

const FINANCING_SLIDERS: SliderConfig[] = [
  { id: 'interestRate' as any, label: 'Interest Rate', min: 0.04, max: 0.12, step: 0.00125, format: 'percentage',
    helpText: 'Annual rate on your mortgage loan. Even small changes significantly impact your monthly payment and long-term cost.' },
  { id: 'loanTermYears' as any, label: 'Loan Term', min: 10, max: 30, step: 5, format: 'years',
    helpText: '30-year terms have lower monthly payments but pay more total interest. 15-year terms build equity faster.' },
]

const REHAB_SLIDERS: SliderConfig[] = [
  { id: 'rehabBudget' as any, label: 'Rehab Budget', min: 0, max: 100000, step: 1000, format: 'currency',
    helpText: 'Estimated cost of repairs and improvements needed. Get contractor bids for accuracy.' },
  { id: 'marketValue' as any, label: 'Market Value', min: 50000, max: 2000000, step: 5000, format: 'currency',
    helpText: 'Current estimated market value based on comparable sales. Adjust using Comps to dial in your number.' },
  { id: 'arv' as any, label: 'ARV', min: 50000, max: 2000000, step: 5000, format: 'currency',
    helpText: 'After Repair Value \u2014 what the property will be worth after improvements, based on upgraded comps.' },
]

const INCOME_SLIDERS: SliderConfig[] = [
  { id: 'monthlyRent' as any, label: 'Monthly Rent', min: 500, max: 10000, step: 50, format: 'currencyPerMonth',
    helpText: 'Expected monthly rental income based on comparable rentals in the area. Adjust if you have better local data.' },
  { id: 'vacancyRate' as any, label: 'Vacancy Rate', min: 0, max: 0.20, step: 0.01, format: 'percentage',
    helpText: 'Percentage of time the property sits empty between tenants. 5% is roughly 18 days per year vacant.' },
]

const EXPENSE_SLIDERS: SliderConfig[] = [
  { id: 'annualPropertyTax' as any, label: 'Property Taxes', min: 0, max: 20000, step: 100, format: 'currencyPerYear',
    helpText: 'Annual property tax bill from the county. Verify with the county assessor for accuracy.' },
  { id: 'annualInsurance' as any, label: 'Insurance', min: 0, max: 10000, step: 100, format: 'currencyPerYear',
    helpText: 'Annual homeowner\u2019s insurance premium. Get quotes from your insurer for the most accurate number.' },
  { id: 'managementRate' as any, label: 'Management Rate', min: 0, max: 0.15, step: 0.01, format: 'percentage',
    helpText: 'Percentage of rent paid to a property manager. 0% if self-managing; 6\u201310% is typical for professional management.' },
]

type SliderGroup = {
  id: 'purchase' | 'rehab' | 'income'
  label: string
  sliders: SliderConfig[]
  accent: string
  border: string
}

const SLIDER_GROUPS: SliderGroup[] = [
  {
    id: 'purchase',
    label: 'PURCHASE TERMS',
    sliders: [...PURCHASE_SLIDERS, ...FINANCING_SLIDERS],
    accent: '#0EA5E9',
    border: 'rgba(14, 165, 233, 0.7)',
  },
  {
    id: 'income',
    label: 'INCOME & EXPENSE TERMS',
    sliders: [...INCOME_SLIDERS, ...EXPENSE_SLIDERS],
    accent: '#FACC15',
    border: 'rgba(250, 204, 21, 0.7)',
  },
  {
    id: 'rehab',
    label: 'REHAB & VALUATION TERMS',
    sliders: REHAB_SLIDERS,
    accent: '#FB7185',
    border: 'rgba(251, 113, 133, 0.7)',
  },
]

const SLIDER_ID_TO_FIELD: Record<string, keyof InlineDealMakerValues> = {
  buyPrice: 'buyPrice',
  downPaymentPercent: 'downPayment',
  closingCostsPercent: 'closingCosts',
  interestRate: 'interestRate',
  loanTermYears: 'loanTerm',
  rehabBudget: 'rehabBudget',
  marketValue: 'marketValue',
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
  if (sliderId === 'marketValue') return { max: Math.max(2000000, listPrice * 2) }
  if (sliderId === 'arv') return { max: Math.max(2000000, listPrice * 2) }
  return {}
}

export function InlineDealMakerPanel({ values, onChange, listPrice, initialSection }: InlineDealMakerPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<SliderGroup['id'], boolean>>(() => {
    if (initialSection) return { purchase: initialSection === 'purchase', rehab: initialSection === 'rehab', income: initialSection === 'income' }
    return { purchase: true, rehab: true, income: true }
  })

  const [highlightedSection, setHighlightedSection] = useState<DealMakerSection | null>(initialSection ?? null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const sliderRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const setSectionRef = useCallback((id: string) => (el: HTMLDivElement | null) => { sectionRefs.current[id] = el }, [])
  const setSliderRef = useCallback((id: string) => (el: HTMLDivElement | null) => { sliderRefs.current[id] = el }, [])

  // --- Tour state ---
  const [tourStep, setTourStep] = useState<number | null>(null)
  const tourInitialized = useRef(false)

  useEffect(() => {
    if (tourInitialized.current || initialSection) return
    tourInitialized.current = true
    try {
      if (typeof window !== 'undefined' && !localStorage.getItem(TOUR_STORAGE_KEY)) {
        const timer = setTimeout(() => setTourStep(0), 800)
        return () => clearTimeout(timer)
      }
    } catch { /* localStorage unavailable */ }
  }, [initialSection])

  const currentTourStep = tourStep != null ? TOUR_STEPS[tourStep] : null

  useEffect(() => {
    if (!currentTourStep) return
    setExpandedSections((prev) => {
      if (prev[currentTourStep.groupId]) return prev
      return { ...prev, [currentTourStep.groupId]: true }
    })
    const timer = setTimeout(() => {
      const el = sliderRefs.current[currentTourStep.sliderId]
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
    return () => clearTimeout(timer)
  }, [currentTourStep])

  const advanceTour = useCallback(() => {
    if (tourStep == null) return
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(tourStep + 1)
    } else {
      setTourStep(null)
      try { localStorage.setItem(TOUR_STORAGE_KEY, '1') } catch { /* ignore */ }
    }
  }, [tourStep])

  const dismissTour = useCallback(() => {
    setTourStep(null)
    try { localStorage.setItem(TOUR_STORAGE_KEY, '1') } catch { /* ignore */ }
  }, [])

  // --- Section deep-link highlight ---
  useEffect(() => {
    if (!initialSection) return
    const el = sectionRefs.current[initialSection]
    if (el) {
      const timer = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
      return () => clearTimeout(timer)
    }
  }, [initialSection])

  useEffect(() => {
    if (!highlightedSection) return
    const timer = setTimeout(() => setHighlightedSection(null), 2000)
    return () => clearTimeout(timer)
  }, [highlightedSection])

  const toggleSection = (sectionId: SliderGroup['id']) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const isTourActive = tourStep != null

  return (
    <>
    <style>{`
      @keyframes dealmaker-slide-in {
        from { opacity: 0; transform: translateX(16px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes dealmaker-section-pulse {
        0%, 100% { box-shadow: inset 0 0 0 1px var(--pulse-color, rgba(255,255,255,0.25)); }
        50% { box-shadow: inset 0 0 0 2px var(--pulse-color, rgba(255,255,255,0.25)), 0 0 16px 2px var(--pulse-color, rgba(255,255,255,0.15)); }
      }
      @keyframes tour-spotlight-pulse {
        0%, 100% { box-shadow: 0 0 0 2px var(--accent-sky), 0 0 12px 2px rgba(14, 165, 233, 0.25); }
        50% { box-shadow: 0 0 0 3px var(--accent-sky), 0 0 20px 4px rgba(14, 165, 233, 0.35); }
      }
      @keyframes tour-card-enter {
        from { opacity: 0; transform: translateY(-6px); }
        to { opacity: 1; transform: translateY(0); }
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
        {SLIDER_GROUPS.map((group) => {
          const isHighlighted = highlightedSection === group.id
          return (
            <div
              key={group.id}
              ref={setSectionRef(group.id)}
              className="mt-4 first:mt-2 rounded-xl px-3 pb-3 transition-shadow duration-500"
              style={{
                border: `1px solid ${group.border}`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                ['--dealmaker-accent' as string]: group.accent,
                ['--pulse-color' as string]: group.border,
                ...(isHighlighted
                  ? { animation: 'dealmaker-section-pulse 0.8s ease-in-out 3' }
                  : { boxShadow: `inset 0 0 0 1px ${group.border.replace('0.7', '0.25')}` }),
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection(group.id)}
                className="w-full flex items-center justify-between pt-2 mb-2"
                aria-expanded={expandedSections[group.id]}
              >
                <span
                  className="text-[18px] font-semibold uppercase tracking-widest text-left"
                  style={{ color: group.accent, fontFamily: "'Source Sans 3', sans-serif" }}
                >
                  {group.label}
                </span>
                <svg
                  className={`w-5 h-5 transition-transform ${expandedSections[group.id] ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={group.accent}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {expandedSections[group.id] && group.sliders.map((slider) => {
                const overrides = dynamicMax(slider.id as string, listPrice)
                const config = { ...slider, ...overrides }
                const sliderId = slider.id as string
                const isSpotlit = currentTourStep?.sliderId === sliderId
                const isDimmed = isTourActive && !isSpotlit

                return (
                  <div
                    key={slider.id}
                    ref={setSliderRef(sliderId)}
                    className="relative rounded-lg transition-opacity duration-300"
                    style={{
                      opacity: isDimmed ? 0.35 : 1,
                      ...(isSpotlit ? {
                        animation: 'tour-spotlight-pulse 1.5s ease-in-out infinite',
                        borderRadius: '10px',
                        padding: '4px 6px',
                        margin: '-4px -6px',
                      } : {}),
                    }}
                  >
                    <DealMakerSlider
                      config={config}
                      value={getSliderValue(sliderId, values)}
                      onChange={(val) => {
                        const field = SLIDER_ID_TO_FIELD[sliderId]
                        if (field) onChange(field, val)
                      }}
                    />
                    {isSpotlit && tourStep != null && (
                      <div
                        className="mt-2 rounded-lg border px-3 py-2.5"
                        style={{
                          animation: 'tour-card-enter 0.3s ease-out',
                          background: 'var(--chart-tooltip)',
                          borderColor: 'var(--accent-sky)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-sky)' }}>
                            {currentTourStep.title}
                          </span>
                          <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                            {tourStep + 1} of {TOUR_STEPS.length}
                          </span>
                        </div>
                        <p className="text-[12px] leading-relaxed mb-2.5" style={{ color: 'var(--chart-tooltip-text)', margin: 0, marginBottom: '10px' }}>
                          {currentTourStep.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={dismissTour}
                            className="text-[11px] font-medium transition-opacity hover:opacity-100 cursor-pointer"
                            style={{ color: 'var(--text-secondary)', opacity: 0.7, background: 'none', border: 'none', padding: 0 }}
                          >
                            Skip tour
                          </button>
                          <button
                            type="button"
                            onClick={advanceTour}
                            className="px-3.5 py-1 rounded-full text-[11px] font-bold transition-all hover:brightness-110 cursor-pointer"
                            style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)', border: 'none' }}
                          >
                            {tourStep < TOUR_STEPS.length - 1 ? 'Next' : 'Got it'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
    </>
  )
}
