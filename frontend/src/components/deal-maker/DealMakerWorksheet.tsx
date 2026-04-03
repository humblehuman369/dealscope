'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { exportDealMakerExcel } from './exportExcel'
import type {
  StrategyType,
  AnyStrategyState,
  AnyStrategyMetrics,
  LTRDealMakerState,
  LTRDealMakerMetrics,
  STRDealMakerState,
  STRMetrics,
  BRRRRDealMakerState,
  BRRRRMetrics,
  FlipDealMakerState,
  FlipMetrics,
  HouseHackDealMakerState,
  HouseHackMetrics,
  WholesaleDealMakerState,
  WholesaleMetrics,
} from './types'

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function fmt(v: number): string {
  return `$${Math.round(v).toLocaleString()}`
}

function pct(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`
}

function num(obj: Record<string, unknown>, key: string): number {
  const v = obj[key]
  return typeof v === 'number' && isFinite(v) ? v : 0
}

// ---------------------------------------------------------------------------
// Visual building blocks
// ---------------------------------------------------------------------------

const C = {
  blue: 'var(--accent-sky)',
  heading: 'var(--text-heading)',
  body: 'var(--text-body)',
  border: 'var(--border-subtle)',
} as const

function SectionHeader({ title, anchorId }: { title: string; anchorId?: string }) {
  return (
    <div id={anchorId} className="flex items-center mb-2 mt-1 scroll-mt-28">
      <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: C.blue }}>
        <span className="text-[1rem] font-bold uppercase tracking-wide" style={{ color: C.blue }}>{title}</span>
      </div>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between py-1.5 pl-4 pr-1" style={{ borderBottom: `1px solid ${C.border}` }}>
      <span className="text-sm" style={{ color: C.body }}>{label}</span>
      <span className="text-sm font-semibold tabular-nums text-right w-[119px] shrink-0 pr-1.5" style={{ color: color || C.heading }}>{value}</span>
    </div>
  )
}

function NegRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 pl-4 pr-1" style={{ borderBottom: `1px solid ${C.border}` }}>
      <span className="text-sm" style={{ color: C.body }}>{label}</span>
      <span className="text-sm font-semibold tabular-nums text-right w-[119px] shrink-0 pr-1.5" style={{ color: C.blue }}>({value})</span>
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between py-2 pl-4 pr-1 mt-1"
      style={{ borderTop: `2px solid ${C.blue}`, borderBottom: `2px solid ${C.blue}` }}
    >
      <span className="font-semibold tabular-nums text-[0.95rem]" style={{ color: C.heading }}>{label}</span>
      <span className="font-bold tabular-nums text-[0.95rem] text-right w-[119px] shrink-0 pr-1.5" style={{ color: C.heading }}>{value}</span>
    </div>
  )
}

function StatusRow({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex justify-between py-1.5 pl-4 pr-1" style={{ borderBottom: `1px solid ${C.border}` }}>
      <span className="text-sm" style={{ color: C.body }}>{label}</span>
      <span className="text-sm font-semibold text-right w-[119px] shrink-0 pr-1.5" style={{ color: pass ? '#10B981' : '#F43F5E' }}>{pass ? 'PASS' : 'FAIL'}</span>
    </div>
  )
}

function Divider() {
  return <hr className="my-2" style={{ borderColor: C.border }} />
}

// ---------------------------------------------------------------------------
// SliderRow — compact inline slider row
// ---------------------------------------------------------------------------

interface SliderRowProps {
  label: string
  value: number
  displayValue: string
  secondaryValue?: string
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  parseInput?: (raw: string) => number
}

function adaptRange(val: number, propMin: number, propMax: number): [number, number] {
  if (val >= propMin && val <= propMax) return [propMin, propMax]
  const lo = val * 0.5
  const hi = val * 1.5
  const newMin = Math.max(0, Math.min(lo, hi))
  const newMax = Math.max(lo, hi)
  if (isFinite(newMin) && isFinite(newMax) && newMax > newMin) return [newMin, newMax]
  return [propMin, propMax]
}

function SliderRow({ label, value, displayValue, secondaryValue, min, max, step, onChange, parseInput }: SliderRowProps) {
  const [rangeMin, setRangeMin] = useState(() => adaptRange(value, min, max)[0])
  const [rangeMax, setRangeMax] = useState(() => adaptRange(value, min, max)[1])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const draggingRef = useRef(false)

  useEffect(() => {
    const [lo, hi] = adaptRange(value, min, max)
    setRangeMin(lo)
    setRangeMax(hi)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max])

  const rangeRef = useRef({ min: rangeMin, max: rangeMax })
  rangeRef.current = { min: rangeMin, max: rangeMax }

  useEffect(() => {
    if (draggingRef.current) return
    const { min: rMin, max: rMax } = rangeRef.current
    if (value < rMin || value > rMax) {
      const [lo, hi] = adaptRange(value, rMin, rMax)
      setRangeMin(lo)
      setRangeMax(hi)
    }
  }, [value])

  const clamped = Math.min(rangeMax, Math.max(rangeMin, value))
  const fill = rangeMax > rangeMin ? ((clamped - rangeMin) / (rangeMax - rangeMin)) * 100 : 0

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setEditing(true)
    const raw = displayValue.replace(/[^0-9.\-]/g, '')
    setDraft(raw)
    setTimeout(() => e.target.select(), 0)
  }, [displayValue])

  const commit = useCallback(() => {
    setEditing(false)
    const parsed = parseInput ? parseInput(draft) : parseFloat(draft)
    if (!isNaN(parsed) && isFinite(parsed)) {
      if (parsed < rangeMin || parsed > rangeMax) {
        const [lo, hi] = adaptRange(parsed, rangeMin, rangeMax)
        setRangeMin(lo)
        setRangeMax(hi)
      }
      onChange(parsed)
    }
  }, [draft, rangeMin, rangeMax, onChange, parseInput])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
  }, [])

  const handlePointerDown = useCallback(() => { draggingRef.current = true }, [])
  const handlePointerUp = useCallback(() => {
    draggingRef.current = false
    const { min: rMin, max: rMax } = rangeRef.current
    if (value < rMin || value > rMax) {
      const [lo, hi] = adaptRange(value, rMin, rMax)
      setRangeMin(lo)
      setRangeMax(hi)
    }
  }, [value])

  return (
    <div
      className="grid grid-cols-[1fr_119px] sm:grid-cols-[0.7fr_1.5fr_50px_119px] items-center gap-2 py-1.5 pl-4 pr-1 transition-colors hover:bg-white/[0.03]"
      style={{ borderBottom: `1px solid ${C.border}` }}
    >
      <span className="text-sm" style={{ color: C.body }}>{label}</span>
      <div className="relative h-5 hidden sm:flex items-center justify-center min-w-[40px]">
        <div className="w-full h-[3px] rounded-full relative" style={{ background: 'var(--surface-elevated)' }}>
          <div className="absolute left-0 top-0 h-full rounded-full pointer-events-none" style={{ width: `${fill}%`, background: C.blue }} />
          <input
            type="range"
            min={rangeMin}
            max={rangeMax}
            step={step ?? (Number.isInteger(min) && Number.isInteger(max) ? 1 : 0.01)}
            value={clamped}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onLostPointerCapture={handlePointerUp}
            className="absolute inset-0 w-full cursor-pointer z-10"
            style={{ opacity: 0, height: '20px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <div
            className="absolute w-3 h-3 rounded-full -translate-y-1/2 top-1/2 pointer-events-none"
            style={{
              left: `calc(${Math.min(100, Math.max(0, fill))}% - 6px)`,
              background: 'var(--surface-card)',
              border: '2px solid var(--accent-sky)',
              boxShadow: '0 0 5px rgba(14,165,233,0.3)',
            }}
          />
        </div>
      </div>
      <span className="hidden sm:block text-xs tabular-nums text-right" style={{ color: 'var(--text-secondary)' }}>
        {secondaryValue ?? ''}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={editing ? draft : displayValue}
        onFocus={handleFocus}
        onBlur={commit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        className="text-sm font-semibold tabular-nums text-right outline-none w-[115px] rounded px-1.5 py-0.5 cursor-text transition-all focus:ring-1 focus:ring-[var(--accent-sky)] hover:text-[var(--accent-sky)]"
        style={{ color: C.heading, border: '1px solid var(--border-subtle)', background: 'var(--surface-elevated)' }}
        size={10}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toggle row for financing type / loan type selection
// ---------------------------------------------------------------------------

function ToggleRow({ label, options, value, onChange }: {
  label: string
  options: { id: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div
      className="grid grid-cols-[110px_1fr] sm:grid-cols-[140px_1fr] items-center gap-3 py-1.5 pl-4 pr-1 transition-colors hover:bg-white/[0.03]"
      style={{ borderBottom: `1px solid ${C.border}` }}
    >
      <span className="text-sm" style={{ color: C.body }}>{label}</span>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-colors ${
              value === opt.id
                ? 'text-white shadow-[0_0_8px_rgba(14,165,233,0.4)]'
                : 'text-white/60 hover:text-white'
            }`}
            style={{
              background: value === opt.id ? '#0EA5E9' : 'rgba(255,255,255,0.06)',
              border: value === opt.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LTR Worksheet
// ---------------------------------------------------------------------------

function LTRWorksheet({ state, metrics, listPrice, up }: {
  state: LTRDealMakerState; metrics: LTRDealMakerMetrics; listPrice: number
  up: (k: string, v: number | string) => void
}) {
  const m = metrics as unknown as Record<string, unknown>
  const downPayment = state.buyPrice * state.downPaymentPercent
  const closingCosts = state.buyPrice * state.closingCostsPercent
  const loanAmount = num(m, 'loanAmount') || (state.buyPrice - downPayment)
  const monthlyPayment = num(m, 'monthlyPayment')
  const grossMonthly = num(m, 'grossMonthlyIncome') || (state.monthlyRent + state.otherIncome)
  const totalMonthlyExp = num(m, 'totalMonthlyExpenses')
  const annualProfit = num(m, 'annualProfit')
  const capRate = num(m, 'capRate')
  const cocReturn = num(m, 'cocReturn')
  const cashFromMetrics = m['cashNeeded']
  const cashNeeded =
    typeof cashFromMetrics === 'number' && isFinite(cashFromMetrics)
      ? cashFromMetrics
      : downPayment + closingCosts + state.rehabBudget

  return (
    <>
      <SectionHeader title="What You'd Pay" anchorId="strategy-worksheet-purchase" />
      <Row label="Market Price" value={fmt(listPrice || state.buyPrice)} />
      <SliderRow label="Buy Price" value={state.buyPrice} displayValue={fmt(state.buyPrice)} min={50000} max={2000000} onChange={(v) => up('buyPrice', v)} />
      <SliderRow label="Down Payment" value={state.downPaymentPercent * 100} secondaryValue={`${(state.downPaymentPercent * 100).toFixed(1)}%`} displayValue={fmt(downPayment)} min={5} max={50} onChange={(v) => up('downPaymentPercent', v / 100)} parseInput={(s) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); return state.buyPrice > 0 ? (n / state.buyPrice) * 100 : 0 }} />
      <SliderRow label="Closing Costs" value={state.closingCostsPercent * 100} secondaryValue={`${(state.closingCostsPercent * 100).toFixed(1)}%`} displayValue={fmt(closingCosts)} min={2} max={5} onChange={(v) => up('closingCostsPercent', v / 100)} parseInput={(s) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); return state.buyPrice > 0 ? (n / state.buyPrice) * 100 : 0 }} />
      <div id="strategy-worksheet-rehab" className="scroll-mt-28 h-0 overflow-hidden" aria-hidden />
      <SliderRow label="Rehab Budget" value={state.rehabBudget} displayValue={fmt(state.rehabBudget)} min={0} max={100000} onChange={(v) => up('rehabBudget', v)} />
      <TotalRow label="Cash Needed" value={fmt(cashNeeded)} />

      <Divider />

      <SectionHeader title="Your Loan Payment" anchorId="strategy-worksheet-financing" />
      <Row label="Loan Amount" value={fmt(loanAmount)} />
      <SliderRow label="Interest Rate" value={state.interestRate * 100} displayValue={`${(state.interestRate * 100).toFixed(2)}%`} min={5} max={12} step={0.25} onChange={(v) => up('interestRate', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <SliderRow label="Loan Term" value={state.loanTermYears} displayValue={`${state.loanTermYears} years`} min={10} max={30} onChange={(v) => up('loanTermYears', Math.round(v))} parseInput={(s) => parseInt(s.replace(/[^0-9]/g, ''), 10)} />
      <Row label="Monthly Payment" value={fmt(monthlyPayment)} />
      <TotalRow label="Annual Payment" value={fmt(monthlyPayment * 12)} />

      <Divider />

      <SectionHeader title="What It Costs" anchorId="strategy-worksheet-costs" />
      <SliderRow label="Property Tax" value={state.annualPropertyTax} displayValue={`${fmt(state.annualPropertyTax)}/yr`} min={0} max={20000} onChange={(v) => up('annualPropertyTax', v)} />
      <SliderRow label="Insurance" value={state.annualInsurance} displayValue={`${fmt(state.annualInsurance)}/yr`} min={0} max={10000} onChange={(v) => up('annualInsurance', v)} />
      <SliderRow label="Management" value={(state.managementRate ?? 0) * 100} secondaryValue={`${((state.managementRate ?? 0) * 100).toFixed(0)}%`} displayValue={`${fmt(grossMonthly * (state.managementRate ?? 0) * 12)}/yr`} min={0} max={15} onChange={(v) => up('managementRate', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <SliderRow label="Maintenance" value={state.maintenanceRate * 100} secondaryValue={`${(state.maintenanceRate * 100).toFixed(0)}%`} displayValue={`${fmt(grossMonthly * state.maintenanceRate * 12)}/yr`} min={0} max={15} onChange={(v) => up('maintenanceRate', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <SliderRow label="Vacancy" value={state.vacancyRate * 100} secondaryValue={`${(state.vacancyRate * 100).toFixed(0)}%`} displayValue={`${fmt(grossMonthly * state.vacancyRate * 12)}/yr`} min={0} max={20} onChange={(v) => up('vacancyRate', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <TotalRow label="Total Expenses" value={`${fmt(totalMonthlyExp * 12)}/yr`} />

      <Divider />

      <SectionHeader title="What You'd Earn" anchorId="strategy-worksheet-income" />
      <SliderRow label="Monthly Rent" value={state.monthlyRent} displayValue={fmt(state.monthlyRent)} min={500} max={10000} onChange={(v) => up('monthlyRent', v)} />
      <Row label="Gross Monthly" value={fmt(grossMonthly)} />
      <Row label="Annual Cash Flow" value={fmt(annualProfit)} color={annualProfit >= 0 ? C.blue : '#F43F5E'} />
      <Row label="Cap Rate" value={`${capRate.toFixed(2)}%`} />
      <TotalRow label="Cash-on-Cash" value={`${cocReturn.toFixed(2)}%`} />
    </>
  )
}

// ---------------------------------------------------------------------------
// STR Worksheet
// ---------------------------------------------------------------------------

function STRWorksheet({ state, metrics, listPrice, up }: {
  state: STRDealMakerState; metrics: STRMetrics; listPrice: number
  up: (k: string, v: number | string) => void
}) {
  const m = metrics as unknown as Record<string, unknown>
  const downPayment = num(m, 'downPaymentAmount') || (state.buyPrice * state.downPaymentPercent)
  const closingCosts = num(m, 'closingCostsAmount') || (state.buyPrice * state.closingCostsPercent)
  const loanAmount = num(m, 'loanAmount') || (state.buyPrice - downPayment)
  const monthlyPayment = num(m, 'monthlyPayment')
  const cashFromMetrics = m['cashNeeded']
  const cashNeeded =
    typeof cashFromMetrics === 'number' && isFinite(cashFromMetrics)
      ? cashFromMetrics
      : downPayment + closingCosts + state.furnitureSetupCost + state.rehabBudget
  const nightsOccupied = num(m, 'nightsOccupied')
  const monthlyGross = num(m, 'monthlyGrossRevenue')
  const annualGross = num(m, 'annualGrossRevenue')
  const totalMonthlyExp = num(m, 'totalMonthlyExpenses')
  const annualCashFlow = num(m, 'annualCashFlow')
  const capRate = num(m, 'capRate')
  const cocReturn = num(m, 'cocReturn')

  return (
    <>
      <SectionHeader title="What You'd Pay" />
      <Row label="Market Price" value={fmt(listPrice || state.buyPrice)} />
      <SliderRow label="Buy Price" value={state.buyPrice} displayValue={fmt(state.buyPrice)} min={50000} max={2000000} onChange={(v) => up('buyPrice', v)} />
      <SliderRow label="Down Payment" value={state.downPaymentPercent * 100} secondaryValue={`${(state.downPaymentPercent * 100).toFixed(1)}%`} displayValue={fmt(downPayment)} min={5} max={50} onChange={(v) => up('downPaymentPercent', v / 100)} parseInput={(s) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); return state.buyPrice > 0 ? (n / state.buyPrice) * 100 : 0 }} />
      <SliderRow label="Closing Costs" value={state.closingCostsPercent * 100} secondaryValue={`${(state.closingCostsPercent * 100).toFixed(1)}%`} displayValue={fmt(closingCosts)} min={2} max={5} onChange={(v) => up('closingCostsPercent', v / 100)} parseInput={(s) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); return state.buyPrice > 0 ? (n / state.buyPrice) * 100 : 0 }} />
      <SliderRow label="Rehab Budget" value={state.rehabBudget} displayValue={fmt(state.rehabBudget)} min={0} max={100000} onChange={(v) => up('rehabBudget', v)} />
      <SliderRow label="Furniture & Setup" value={state.furnitureSetupCost} displayValue={fmt(state.furnitureSetupCost)} min={0} max={30000} onChange={(v) => up('furnitureSetupCost', v)} />
      <TotalRow label="Cash Needed" value={fmt(cashNeeded)} />

      <Divider />

      <SectionHeader title="Your Loan Payment" />
      <Row label="Loan Amount" value={fmt(loanAmount)} />
      <SliderRow label="Interest Rate" value={state.interestRate * 100} displayValue={`${(state.interestRate * 100).toFixed(2)}%`} min={5} max={12} step={0.25} onChange={(v) => up('interestRate', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <SliderRow label="Loan Term" value={state.loanTermYears} displayValue={`${state.loanTermYears} years`} min={10} max={30} onChange={(v) => up('loanTermYears', Math.round(v))} parseInput={(s) => parseInt(s.replace(/[^0-9]/g, ''), 10)} />
      <Row label="Monthly Payment" value={fmt(monthlyPayment)} />
      <TotalRow label="Annual Payment" value={fmt(monthlyPayment * 12)} />

      <Divider />

      <SectionHeader title="Revenue" />
      <SliderRow label="Avg Daily Rate" value={state.averageDailyRate} displayValue={fmt(state.averageDailyRate)} min={50} max={1000} onChange={(v) => up('averageDailyRate', v)} />
      <SliderRow label="Occupancy" value={state.occupancyRate * 100} displayValue={`${(state.occupancyRate * 100).toFixed(0)}%`} min={30} max={95} onChange={(v) => up('occupancyRate', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <SliderRow label="Cleaning Fee" value={state.cleaningFeeRevenue} displayValue={fmt(state.cleaningFeeRevenue)} min={0} max={300} onChange={(v) => up('cleaningFeeRevenue', v)} />
      <SliderRow label="Avg Stay" value={state.avgLengthOfStayDays} displayValue={`${state.avgLengthOfStayDays} days`} min={1} max={30} onChange={(v) => up('avgLengthOfStayDays', Math.round(v))} parseInput={(s) => parseInt(s.replace(/[^0-9]/g, ''), 10)} />
      <Row label="Nights Occupied" value={`${Math.round(nightsOccupied)}/yr`} />
      <Row label="Monthly Gross" value={fmt(monthlyGross)} />
      <TotalRow label="Annual Gross Revenue" value={fmt(annualGross)} />

      <Divider />

      <SectionHeader title="Expenses" />
      <SliderRow label="Platform Fees" value={state.platformFeeRate * 100} displayValue={`${(state.platformFeeRate * 100).toFixed(0)}%`} min={10} max={20} onChange={(v) => up('platformFeeRate', v / 100)} />
      <SliderRow label="STR Management" value={state.strManagementRate * 100} displayValue={`${(state.strManagementRate * 100).toFixed(0)}%`} min={0} max={25} onChange={(v) => up('strManagementRate', v / 100)} />
      <SliderRow label="Cleaning/Turn" value={state.cleaningCostPerTurnover} displayValue={fmt(state.cleaningCostPerTurnover)} min={50} max={400} onChange={(v) => up('cleaningCostPerTurnover', v)} />
      <SliderRow label="Supplies" value={state.suppliesMonthly} displayValue={`${fmt(state.suppliesMonthly)}/mo`} min={0} max={500} onChange={(v) => up('suppliesMonthly', v)} />
      <SliderRow label="Utilities" value={state.additionalUtilitiesMonthly} displayValue={`${fmt(state.additionalUtilitiesMonthly)}/mo`} min={0} max={500} onChange={(v) => up('additionalUtilitiesMonthly', v)} />
      <SliderRow label="Property Tax" value={state.annualPropertyTax} displayValue={`${fmt(state.annualPropertyTax)}/yr`} min={0} max={20000} onChange={(v) => up('annualPropertyTax', v)} />
      <SliderRow label="Insurance" value={state.annualInsurance} displayValue={`${fmt(state.annualInsurance)}/yr`} min={0} max={10000} onChange={(v) => up('annualInsurance', v)} />
      <TotalRow label="Total Monthly" value={`${fmt(totalMonthlyExp)}/mo`} />

      <Divider />

      <SectionHeader title="Performance" />
      <Row label="Annual Cash Flow" value={fmt(annualCashFlow)} color={annualCashFlow >= 0 ? C.blue : '#F43F5E'} />
      <Row label="Cap Rate" value={`${capRate.toFixed(2)}%`} />
      <TotalRow label="Cash-on-Cash" value={`${cocReturn.toFixed(2)}%`} />
    </>
  )
}

// ---------------------------------------------------------------------------
// BRRRR Worksheet
// ---------------------------------------------------------------------------

function BRRRRWorksheet({ state, metrics, up }: {
  state: BRRRRDealMakerState; metrics: BRRRRMetrics
  up: (k: string, v: number | string) => void
}) {
  const m = metrics as unknown as Record<string, unknown>
  const initialDown = num(m, 'initialDownPayment')
  const initialClosing = num(m, 'initialClosingCosts')
  const cashPhase1 = num(m, 'cashRequiredPhase1')
  const holdingCosts = num(m, 'holdingCosts')
  const allIn = num(m, 'allInCost')
  const refiLoan = num(m, 'refinanceLoanAmount')
  const newPayment = num(m, 'newMonthlyPayment')
  const cashOut = num(m, 'cashOutAtRefinance')
  const totalInvested = num(m, 'totalCashInvested')
  const cashLeft = num(m, 'cashLeftInDeal')
  const capitalRecycled = num(m, 'capitalRecycledPct')
  const monthlyCF = num(m, 'postRefiMonthlyCashFlow')
  const annualCF = num(m, 'postRefiAnnualCashFlow')
  const coc = num(m, 'postRefiCashOnCash')

  return (
    <>
      <SectionHeader title="Phase 1 — Buy" />
      <SliderRow label="Purchase Price" value={state.purchasePrice} displayValue={fmt(state.purchasePrice)} min={50000} max={2000000} onChange={(v) => up('purchasePrice', v)} />
      <SliderRow label="Discount" value={state.buyDiscountPct * 100} displayValue={`${(state.buyDiscountPct * 100).toFixed(0)}%`} min={0} max={30} onChange={(v) => up('buyDiscountPct', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <SliderRow label="Down Payment" value={state.downPaymentPercent * 100} secondaryValue={`${(state.downPaymentPercent * 100).toFixed(0)}%`} displayValue={fmt(initialDown)} min={10} max={30} onChange={(v) => up('downPaymentPercent', v / 100)} parseInput={(s) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); return state.purchasePrice > 0 ? (n / state.purchasePrice) * 100 : 0 }} />
      <SliderRow label="Hard Money Rate" value={state.hardMoneyRate * 100} displayValue={`${(state.hardMoneyRate * 100).toFixed(1)}%`} min={8} max={15} step={0.5} onChange={(v) => up('hardMoneyRate', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <Row label="Closing Costs" value={fmt(initialClosing)} />
      <TotalRow label="Cash Required" value={fmt(cashPhase1)} />

      <Divider />

      <SectionHeader title="Phase 2 — Rehab" />
      <SliderRow label="Rehab Budget" value={state.rehabBudget} displayValue={fmt(state.rehabBudget)} min={0} max={200000} onChange={(v) => up('rehabBudget', v)} />
      <SliderRow label="Contingency" value={state.contingencyPct * 100} secondaryValue={`${(state.contingencyPct * 100).toFixed(0)}%`} displayValue={fmt(state.rehabBudget * state.contingencyPct)} min={0} max={25} onChange={(v) => up('contingencyPct', v / 100)} parseInput={(s) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); return state.rehabBudget > 0 ? (n / state.rehabBudget) * 100 : 0 }} />
      <SliderRow label="Holding Period" value={state.holdingPeriodMonths} displayValue={`${state.holdingPeriodMonths} months`} min={2} max={12} onChange={(v) => up('holdingPeriodMonths', Math.round(v))} parseInput={(s) => parseInt(s.replace(/[^0-9]/g, ''), 10)} />
      <SliderRow label="Holding Costs" value={state.holdingCostsMonthly} displayValue={`${fmt(state.holdingCostsMonthly)}/mo`} min={0} max={3000} onChange={(v) => up('holdingCostsMonthly', v)} />
      <SliderRow label="ARV" value={state.arv} displayValue={fmt(state.arv)} min={state.purchasePrice} max={state.purchasePrice * 2} onChange={(v) => up('arv', v)} />
      <Row label="Total Holding" value={fmt(holdingCosts)} />
      <TotalRow label="All-In Cost" value={fmt(allIn)} />

      <Divider />

      <SectionHeader title="Refinance" />
      <SliderRow label="Refi LTV" value={state.refinanceLtv * 100} displayValue={`${(state.refinanceLtv * 100).toFixed(0)}%`} min={65} max={80} onChange={(v) => up('refinanceLtv', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <SliderRow label="Refi Rate" value={state.refinanceInterestRate * 100} displayValue={`${(state.refinanceInterestRate * 100).toFixed(2)}%`} min={4} max={10} step={0.25} onChange={(v) => up('refinanceInterestRate', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <Row label="Refi Loan" value={fmt(refiLoan)} />
      <Row label="New Payment" value={fmt(newPayment)} />
      <TotalRow label="Cash Out at Refi" value={fmt(cashOut)} />

      <Divider />

      <SectionHeader title="Expenses & Returns" />
      <SliderRow label="Vacancy" value={state.vacancyRate * 100} displayValue={`${(state.vacancyRate * 100).toFixed(0)}%`} min={0} max={15} onChange={(v) => up('vacancyRate', v / 100)} />
      <SliderRow label="Management" value={state.managementRate * 100} displayValue={`${(state.managementRate * 100).toFixed(0)}%`} min={0} max={12} onChange={(v) => up('managementRate', v / 100)} />
      <SliderRow label="Maintenance" value={state.maintenanceRate * 100} displayValue={`${(state.maintenanceRate * 100).toFixed(0)}%`} min={3} max={10} onChange={(v) => up('maintenanceRate', v / 100)} />
      <SliderRow label="Property Tax" value={state.annualPropertyTax} displayValue={`${fmt(state.annualPropertyTax)}/yr`} min={0} max={20000} onChange={(v) => up('annualPropertyTax', v)} />
      <SliderRow label="Insurance" value={state.annualInsurance} displayValue={`${fmt(state.annualInsurance)}/yr`} min={0} max={5000} onChange={(v) => up('annualInsurance', v)} />
      <SliderRow label="HOA" value={state.monthlyHoa} displayValue={`${fmt(state.monthlyHoa)}/mo`} min={0} max={500} onChange={(v) => up('monthlyHoa', v)} />
      <Row label="Total Invested" value={fmt(totalInvested)} />
      <Row label="Cash Left in Deal" value={fmt(cashLeft)} color={cashLeft <= 0 ? '#10B981' : C.heading} />
      <Row label="Capital Recycled" value={`${capitalRecycled.toFixed(1)}%`} color={capitalRecycled >= 100 ? '#10B981' : C.heading} />
      <Row label="Monthly Cash Flow" value={fmt(monthlyCF)} color={monthlyCF >= 0 ? C.blue : '#F43F5E'} />
      <Row label="Annual Cash Flow" value={fmt(annualCF)} color={annualCF >= 0 ? C.blue : '#F43F5E'} />
      <TotalRow label="Cash-on-Cash" value={coc > 999 ? '∞' : `${coc.toFixed(2)}%`} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Flip Worksheet
// ---------------------------------------------------------------------------

function FlipWorksheet({ state, metrics, up }: {
  state: FlipDealMakerState; metrics: FlipMetrics
  up: (k: string, v: number | string) => void
}) {
  const m = metrics as unknown as Record<string, unknown>
  const loanAmount = num(m, 'loanAmount')
  const downPayment = num(m, 'downPayment')
  const closingCosts = num(m, 'closingCosts')
  const points = num(m, 'loanPointsCost')
  const cashAtPurchase = num(m, 'cashAtPurchase')
  const totalRehab = num(m, 'totalRehabCost')
  const holdingMonths = num(m, 'holdingPeriodMonths')
  const totalHolding = num(m, 'totalHoldingCosts')
  const interestCosts = num(m, 'interestCosts')
  const grossProceeds = num(m, 'grossSaleProceeds')
  const sellingCosts = num(m, 'sellingCosts')
  const netProceeds = num(m, 'netSaleProceeds')
  const totalProject = num(m, 'totalProjectCost')
  const grossProfit = num(m, 'grossProfit')
  const capGains = num(m, 'capitalGainsTax')
  const netProfit = num(m, 'netProfit')
  const roi = num(m, 'roi')
  const annualizedRoi = num(m, 'annualizedRoi')

  return (
    <>
      <SectionHeader title="Acquisition" />
      <SliderRow label="Purchase Price" value={state.purchasePrice} displayValue={fmt(state.purchasePrice)} min={50000} max={2000000} onChange={(v) => up('purchasePrice', v)} />
      <SliderRow label="Discount from ARV" value={state.purchaseDiscountPct * 100} displayValue={`${(state.purchaseDiscountPct * 100).toFixed(0)}%`} min={0} max={40} onChange={(v) => up('purchaseDiscountPct', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <SliderRow label="Closing Costs" value={state.closingCostsPercent * 100} secondaryValue={`${(state.closingCostsPercent * 100).toFixed(1)}%`} displayValue={fmt(closingCosts)} min={2} max={5} step={0.5} onChange={(v) => up('closingCostsPercent', v / 100)} parseInput={(s) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); return state.purchasePrice > 0 ? (n / state.purchasePrice) * 100 : 0 }} />
      <ToggleRow label="Financing" options={[{ id: 'cash', label: 'Cash' }, { id: 'hardMoney', label: 'Hard Money' }]} value={state.financingType} onChange={(v) => up('financingType', v)} />
      {state.financingType !== 'cash' && (
        <>
          <SliderRow label="LTV" value={state.hardMoneyLtv * 100} displayValue={`${(state.hardMoneyLtv * 100).toFixed(0)}%`} min={70} max={100} onChange={(v) => up('hardMoneyLtv', v / 100)} />
          <SliderRow label="Interest Rate" value={state.hardMoneyRate * 100} displayValue={`${(state.hardMoneyRate * 100).toFixed(1)}%`} min={8} max={18} step={0.5} onChange={(v) => up('hardMoneyRate', v / 100)} />
          <SliderRow label="Points" value={state.loanPoints} displayValue={`${state.loanPoints.toFixed(1)} pts`} min={0} max={5} onChange={(v) => up('loanPoints', v)} />
          <Row label="Loan Amount" value={fmt(loanAmount)} />
        </>
      )}
      <TotalRow label="Cash at Purchase" value={fmt(cashAtPurchase)} />

      <Divider />

      <SectionHeader title="Rehab & Holding" />
      <SliderRow label="Rehab Budget" value={state.rehabBudget} displayValue={fmt(state.rehabBudget)} min={0} max={200000} onChange={(v) => up('rehabBudget', v)} />
      <SliderRow label="Contingency" value={state.contingencyPct * 100} secondaryValue={`${(state.contingencyPct * 100).toFixed(0)}%`} displayValue={fmt(state.rehabBudget * state.contingencyPct)} min={0} max={25} onChange={(v) => up('contingencyPct', v / 100)} parseInput={(s) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); return state.rehabBudget > 0 ? (n / state.rehabBudget) * 100 : 0 }} />
      <SliderRow label="Rehab Time" value={state.rehabTimeMonths} displayValue={`${state.rehabTimeMonths} months`} min={1} max={12} onChange={(v) => up('rehabTimeMonths', Math.round(v))} parseInput={(s) => parseInt(s.replace(/[^0-9]/g, ''), 10)} />
      <SliderRow label="ARV" value={state.arv} displayValue={fmt(state.arv)} min={state.purchasePrice} max={state.purchasePrice * 2} onChange={(v) => up('arv', v)} />
      <SliderRow label="Holding Costs" value={state.holdingCostsMonthly} displayValue={`${fmt(state.holdingCostsMonthly)}/mo`} min={0} max={5000} onChange={(v) => up('holdingCostsMonthly', v)} />
      <SliderRow label="Days on Market" value={state.daysOnMarket} displayValue={`${state.daysOnMarket} days`} min={15} max={180} onChange={(v) => up('daysOnMarket', Math.round(v))} />
      <Row label="Total Rehab" value={fmt(totalRehab)} />
      <Row label={`Holding Period`} value={`${holdingMonths.toFixed(1)} months`} />
      {state.financingType !== 'cash' && <Row label="Interest Costs" value={fmt(interestCosts)} />}
      <TotalRow label="Total Project Cost" value={fmt(totalProject)} />

      <Divider />

      <SectionHeader title="Sale" />
      <Row label="ARV / Sale Price" value={fmt(grossProceeds || state.arv)} />
      <SliderRow label="Selling Costs" value={state.sellingCostsPct * 100} secondaryValue={`${(state.sellingCostsPct * 100).toFixed(0)}%`} displayValue={fmt(sellingCosts)} min={4} max={10} onChange={(v) => up('sellingCostsPct', v / 100)} parseInput={(s) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); const arv = grossProceeds || state.arv; return arv > 0 ? (n / arv) * 100 : 0 }} />
      <TotalRow label="Net Proceeds" value={fmt(netProceeds)} />

      <Divider />

      <SectionHeader title="Profit Analysis" />
      <Row label="Gross Profit" value={fmt(grossProfit)} color={grossProfit >= 0 ? C.blue : '#F43F5E'} />
      <SliderRow label="Cap Gains Tax" value={state.capitalGainsRate * 100} secondaryValue={`${(state.capitalGainsRate * 100).toFixed(0)}%`} displayValue={fmt(capGains)} min={0} max={40} onChange={(v) => up('capitalGainsRate', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <TotalRow label="Net Profit" value={fmt(netProfit)} />
      <div className="mt-2" />
      <Row label="ROI" value={`${roi.toFixed(1)}%`} color={roi >= 0 ? C.blue : '#F43F5E'} />
      <Row label="Annualized ROI" value={`${annualizedRoi.toFixed(1)}%`} color={annualizedRoi >= 0 ? C.blue : '#F43F5E'} />
    </>
  )
}

// ---------------------------------------------------------------------------
// House Hack Worksheet
// ---------------------------------------------------------------------------

function HouseHackWorksheet({ state, metrics, up }: {
  state: HouseHackDealMakerState; metrics: HouseHackMetrics
  up: (k: string, v: number | string) => void
}) {
  const m = metrics as unknown as Record<string, unknown>
  const downPayment = num(m, 'downPayment')
  const closingCosts = num(m, 'closingCosts')
  const cashToClose = num(m, 'cashToClose')
  const pi = num(m, 'monthlyPrincipalInterest')
  const pmi = num(m, 'monthlyPmi')
  const taxes = num(m, 'monthlyTaxes')
  const ins = num(m, 'monthlyInsurance')
  const piti = num(m, 'monthlyPITI')
  const rentedUnits = num(m, 'rentedUnits')
  const grossRental = num(m, 'grossRentalIncome')
  const effectiveRental = num(m, 'effectiveRentalIncome')
  const opex = num(m, 'monthlyOperatingExpenses')
  const netRental = num(m, 'netRentalIncome')
  const effectiveCost = num(m, 'effectiveHousingCost')
  const savings = num(m, 'housingCostSavings')
  const offset = num(m, 'housingOffsetPercent')

  return (
    <>
      <SectionHeader title="What You'd Pay" />
      <SliderRow label="Purchase Price" value={state.purchasePrice} displayValue={fmt(state.purchasePrice)} min={100000} max={2000000} onChange={(v) => up('purchasePrice', v)} />
      <SliderRow label="Total Units" value={state.totalUnits} displayValue={`${state.totalUnits} units`} min={2} max={8} onChange={(v) => up('totalUnits', Math.round(v))} />
      <SliderRow label="Owner Units" value={state.ownerOccupiedUnits} displayValue={`${state.ownerOccupiedUnits}`} min={1} max={2} onChange={(v) => up('ownerOccupiedUnits', Math.round(v))} />
      <ToggleRow label="Loan Type" options={[{ id: 'fha', label: 'FHA' }, { id: 'conventional', label: 'Conv' }, { id: 'va', label: 'VA' }]} value={state.loanType} onChange={(v) => up('loanType', v)} />
      <SliderRow label="Down Payment" value={state.downPaymentPercent * 100} secondaryValue={`${(state.downPaymentPercent * 100).toFixed(1)}%`} displayValue={fmt(downPayment)} min={state.loanType === 'va' ? 0 : state.loanType === 'fha' ? 3.5 : 5} max={25} onChange={(v) => up('downPaymentPercent', v / 100)} parseInput={(s) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); return state.purchasePrice > 0 ? (n / state.purchasePrice) * 100 : 0 }} />
      <SliderRow label="Interest Rate" value={state.interestRate * 100} displayValue={`${(state.interestRate * 100).toFixed(2)}%`} min={4} max={10} step={0.25} onChange={(v) => up('interestRate', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <SliderRow label="PMI/MIP Rate" value={state.pmiRate * 100} displayValue={`${(state.pmiRate * 100).toFixed(2)}%`} min={0} max={1.5} onChange={(v) => up('pmiRate', v / 100)} parseInput={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))} />
      <SliderRow label="Closing Costs" value={state.closingCostsPercent * 100} secondaryValue={`${(state.closingCostsPercent * 100).toFixed(1)}%`} displayValue={fmt(closingCosts)} min={2} max={5} onChange={(v) => up('closingCostsPercent', v / 100)} parseInput={(s) => { const n = parseFloat(s.replace(/[^0-9.]/g, '')); return state.purchasePrice > 0 ? (n / state.purchasePrice) * 100 : 0 }} />
      <TotalRow label="Cash to Close" value={fmt(cashToClose)} />

      <Divider />

      <SectionHeader title="Monthly Payment" />
      <Row label="Principal & Interest" value={`${fmt(pi)}/mo`} />
      {pmi > 0 && <Row label="PMI/MIP" value={`${fmt(pmi)}/mo`} />}
      <Row label="Property Tax" value={`${fmt(taxes)}/mo`} />
      <Row label="Insurance" value={`${fmt(ins)}/mo`} />
      {state.monthlyHoa > 0 && <Row label="HOA" value={`${fmt(state.monthlyHoa)}/mo`} />}
      <TotalRow label="Total PITI" value={`${fmt(piti)}/mo`} />

      <Divider />

      <SectionHeader title="Rental Income" />
      <SliderRow label="Rent / Unit" value={state.avgRentPerUnit} displayValue={`${fmt(state.avgRentPerUnit)}/mo`} min={500} max={5000} onChange={(v) => up('avgRentPerUnit', v)} />
      <SliderRow label="Vacancy" value={state.vacancyRate * 100} displayValue={`${(state.vacancyRate * 100).toFixed(0)}%`} min={0} max={15} onChange={(v) => up('vacancyRate', v / 100)} />
      <SliderRow label="Current Housing" value={state.currentHousingPayment} displayValue={`${fmt(state.currentHousingPayment)}/mo`} min={0} max={5000} onChange={(v) => up('currentHousingPayment', v)} />
      <Row label="Rented Units" value={`${Math.round(rentedUnits)}`} />
      <Row label="Gross Rental" value={`${fmt(grossRental)}/mo`} />
      <NegRow label={`Vacancy (${Math.round(state.vacancyRate * 100)}%)`} value={`${fmt(grossRental - effectiveRental)}/mo`} />
      {opex > 0 && <NegRow label="Operating Expenses" value={`${fmt(opex)}/mo`} />}
      <TotalRow label="Net Rental Income" value={`${fmt(netRental)}/mo`} />

      <Divider />

      <SectionHeader title="Expenses & Housing" />
      <SliderRow label="Property Tax" value={state.annualPropertyTax} displayValue={`${fmt(state.annualPropertyTax)}/yr`} min={0} max={30000} onChange={(v) => up('annualPropertyTax', v)} />
      <SliderRow label="Insurance" value={state.annualInsurance} displayValue={`${fmt(state.annualInsurance)}/yr`} min={0} max={10000} onChange={(v) => up('annualInsurance', v)} />
      <SliderRow label="HOA" value={state.monthlyHoa} displayValue={`${fmt(state.monthlyHoa)}/mo`} min={0} max={1000} onChange={(v) => up('monthlyHoa', v)} />
      <SliderRow label="Utilities" value={state.utilitiesMonthly} displayValue={`${fmt(state.utilitiesMonthly)}/mo`} min={0} max={1000} onChange={(v) => up('utilitiesMonthly', v)} />
      <SliderRow label="Maintenance" value={state.maintenanceRate * 100} displayValue={`${(state.maintenanceRate * 100).toFixed(0)}%`} min={0} max={15} onChange={(v) => up('maintenanceRate', v / 100)} />
      <SliderRow label="CapEx Reserve" value={state.capexRate * 100} displayValue={`${(state.capexRate * 100).toFixed(0)}%`} min={0} max={10} onChange={(v) => up('capexRate', v / 100)} />
      <TotalRow label="Effective Housing" value={effectiveCost <= 0 ? `+${fmt(Math.abs(effectiveCost))}/mo` : `${fmt(effectiveCost)}/mo`} />
      <div className="mt-2" />
      <Row label="vs Current Housing" value={savings > 0 ? `+${fmt(savings)}/mo savings` : `${fmt(savings)}/mo`} color={savings >= 0 ? '#10B981' : '#F43F5E'} />
      <Row label="Housing Offset" value={`${offset.toFixed(0)}%`} color={offset >= 100 ? '#10B981' : C.heading} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Wholesale Worksheet
// ---------------------------------------------------------------------------

function WholesaleWorksheet({ state, metrics, up }: {
  state: WholesaleDealMakerState; metrics: WholesaleMetrics
  up: (k: string, v: number | string) => void
}) {
  const m = metrics as unknown as Record<string, unknown>
  const mao = num(m, 'maxAllowableOffer')
  const meets70 = (m.meets70PercentRule as boolean) ?? false
  const endBuyerPrice = num(m, 'endBuyerPrice')
  const endBuyerAllIn = num(m, 'endBuyerAllIn')
  const endBuyerProfit = num(m, 'endBuyerProfit')
  const endBuyerROI = num(m, 'endBuyerROI')
  const cashAtRisk = num(m, 'totalCashAtRisk')
  const netProfit = num(m, 'netProfit')
  const roi = num(m, 'roi')
  const annualizedROI = num(m, 'annualizedROI')

  return (
    <>
      <SectionHeader title="Deal Analysis" />
      <SliderRow label="ARV" value={state.arv} displayValue={fmt(state.arv)} min={50000} max={2000000} onChange={(v) => up('arv', v)} />
      <SliderRow label="Est. Repairs" value={state.estimatedRepairs} displayValue={fmt(state.estimatedRepairs)} min={0} max={200000} onChange={(v) => up('estimatedRepairs', v)} />
      <SliderRow label="Contract Price" value={state.contractPrice} displayValue={fmt(state.contractPrice)} min={25000} max={1500000} onChange={(v) => up('contractPrice', v)} />
      <TotalRow label="MAO (70% Rule)" value={fmt(mao)} />
      <div className="mt-1" />
      <StatusRow label="70% Rule" pass={meets70} />

      <Divider />

      <SectionHeader title="Contract Terms" />
      <SliderRow label="Earnest Money" value={state.earnestMoney} displayValue={fmt(state.earnestMoney)} min={100} max={10000} onChange={(v) => up('earnestMoney', v)} />
      <SliderRow label="Inspection" value={state.inspectionPeriodDays} displayValue={`${state.inspectionPeriodDays} days`} min={7} max={30} onChange={(v) => up('inspectionPeriodDays', Math.round(v))} />
      <SliderRow label="Days to Close" value={state.daysToClose} displayValue={`${state.daysToClose} days`} min={21} max={90} onChange={(v) => up('daysToClose', Math.round(v))} />
      <TotalRow label="Cash at Risk" value={fmt(cashAtRisk)} />

      <Divider />

      <SectionHeader title="Assignment & Costs" />
      <SliderRow label="Assignment Fee" value={state.assignmentFee} displayValue={fmt(state.assignmentFee)} min={5000} max={50000} onChange={(v) => up('assignmentFee', v)} />
      <SliderRow label="Marketing" value={state.marketingCosts} displayValue={fmt(state.marketingCosts)} min={0} max={5000} onChange={(v) => up('marketingCosts', v)} />
      <SliderRow label="Closing Costs" value={state.closingCosts} displayValue={fmt(state.closingCosts)} min={0} max={2000} onChange={(v) => up('closingCosts', v)} />
      <NegRow label="Marketing & Closing" value={fmt(state.marketingCosts + state.closingCosts)} />
      <TotalRow label="Net Profit" value={fmt(netProfit)} />
      <div className="mt-2" />
      <Row label="ROI" value={`${roi.toFixed(1)}%`} color={roi >= 0 ? C.blue : '#F43F5E'} />
      <Row label="Annualized ROI" value={`${annualizedROI.toFixed(1)}%`} color={annualizedROI >= 0 ? C.blue : '#F43F5E'} />

      <Divider />

      <SectionHeader title="End Buyer" />
      <Row label="Buyer's Price" value={fmt(endBuyerPrice)} />
      <Row label="+ Repairs" value={fmt(state.estimatedRepairs)} />
      <Row label="All-In Cost" value={fmt(endBuyerAllIn)} />
      <Row label="Buyer Profit" value={fmt(endBuyerProfit)} color={endBuyerProfit >= 0 ? '#10B981' : '#F43F5E'} />
      <TotalRow label="Buyer ROI" value={`${endBuyerROI.toFixed(1)}%`} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Summary Cards — bottom-of-worksheet KPI panel
// ---------------------------------------------------------------------------

function fmtParen(v: number): string {
  if (v < 0) return `($${Math.abs(Math.round(v)).toLocaleString()})`
  return `$${Math.round(v).toLocaleString()}`
}

function BigCard({ title, subtitle, annual, monthly, suffix = '/yr' }: {
  title: string; subtitle: string; annual: number; monthly?: number; suffix?: string
}) {
  const positive = annual >= 0
  const clr = positive ? '#10B981' : '#F43F5E'
  const borderClr = positive ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)'
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: `1.5px solid ${borderClr}` }}>
      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: clr }}>{title}</div>
      <div className="text-[11px] mt-0.5" style={{ color: C.body }}>{subtitle}</div>
      <div className="text-[1.65rem] font-bold mt-3 tabular-nums leading-tight" style={{ color: clr }}>
        {fmtParen(annual)}<span className="text-sm font-normal opacity-70">{suffix}</span>
      </div>
      {monthly !== undefined && (
        <>
          <div className="my-2.5" style={{ borderTop: `1px solid ${borderClr}` }} />
          <div className="text-sm font-medium tabular-nums" style={{ color: clr }}>
            {fmtParen(monthly)}<span className="text-xs opacity-70">/mo</span>
          </div>
        </>
      )}
    </div>
  )
}

function ValueCard({ title, subtitle, value, color }: {
  title: string; subtitle: string; value: string; color: string
}) {
  const borderClr = color === '#10B981' ? 'rgba(16,185,129,0.35)' : color === '#F43F5E' ? 'rgba(244,63,94,0.35)' : 'var(--border-default)'
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: `1.5px solid ${borderClr}` }}>
      <div className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{title}</div>
      <div className="text-[11px] mt-0.5" style={{ color: C.body }}>{subtitle}</div>
      <div className="text-[1.65rem] font-bold mt-3 tabular-nums leading-tight" style={{ color }}>{value}</div>
    </div>
  )
}

function BadgeCard({ title, value, target, isGood }: {
  title: string; value: string; target: string; isGood: boolean
}) {
  const clr = isGood ? '#10B981' : '#F43F5E'
  return (
    <div className="rounded-xl px-4 py-3.5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}>
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.heading }}>{title}</span>
        <span className="text-xl font-bold tabular-nums" style={{ color: C.heading }}>{value}</span>
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs" style={{ color: C.body }}>Target: {target}</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: clr }} />
          <span className="text-xs font-semibold" style={{ color: clr }}>{isGood ? 'GOOD' : 'POOR'}</span>
        </span>
      </div>
    </div>
  )
}

function StatusBadgeCard({ title, value, pass }: {
  title: string; value: string; pass: boolean
}) {
  const clr = pass ? '#10B981' : '#F43F5E'
  return (
    <div className="rounded-xl px-4 py-3.5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}>
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.heading }}>{title}</span>
        <span className="text-xl font-bold tabular-nums" style={{ color: clr }}>{value}</span>
      </div>
      <div className="flex justify-end items-center mt-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: clr }} />
          <span className="text-xs font-semibold" style={{ color: clr }}>{pass ? 'PASS' : 'FAIL'}</span>
        </span>
      </div>
    </div>
  )
}

function WorksheetSummary({ strategyType, metrics }: { strategyType: StrategyType; metrics: AnyStrategyMetrics }) {
  const m = metrics as unknown as Record<string, unknown>

  if (strategyType === 'ltr') {
    const annualProfit = num(m, 'annualProfit')
    const monthlyPayment = num(m, 'monthlyPayment')
    const noi = annualProfit + monthlyPayment * 12
    const capRate = num(m, 'capRate')
    const cocReturn = num(m, 'cocReturn')
    return (
      <div className="grid grid-cols-2 gap-3 mt-5">
        <BigCard title="NOI" subtitle="Before Mortgage" annual={noi} monthly={noi / 12} />
        <BigCard title="NET CASH FLOW" subtitle="After Mortgage" annual={annualProfit} monthly={annualProfit / 12} />
        <BadgeCard title="CAP RATE" value={`${capRate.toFixed(1)}%`} target="6.0%" isGood={capRate >= 6} />
        <BadgeCard title="CASH-ON-CASH" value={`${cocReturn.toFixed(1)}%`} target="8.0%" isGood={cocReturn >= 8} />
      </div>
    )
  }

  if (strategyType === 'str') {
    const annualCF = num(m, 'annualCashFlow')
    const monthlyPmt = num(m, 'monthlyPayment')
    const noi = num(m, 'noi') || (annualCF + monthlyPmt * 12)
    const capRate = num(m, 'capRate')
    const cocReturn = num(m, 'cocReturn')
    return (
      <div className="grid grid-cols-2 gap-3 mt-5">
        <BigCard title="NOI" subtitle="Before Mortgage" annual={noi} monthly={noi / 12} />
        <BigCard title="NET CASH FLOW" subtitle="After Mortgage" annual={annualCF} monthly={annualCF / 12} />
        <BadgeCard title="CAP RATE" value={`${capRate.toFixed(1)}%`} target="6.0%" isGood={capRate >= 6} />
        <BadgeCard title="CASH-ON-CASH" value={`${cocReturn.toFixed(1)}%`} target="8.0%" isGood={cocReturn >= 8} />
      </div>
    )
  }

  if (strategyType === 'brrrr') {
    const annualCF = num(m, 'postRefiAnnualCashFlow')
    const newPmt = num(m, 'newMonthlyPayment')
    const estimatedNoi = num(m, 'estimatedNoi')
    const noi = estimatedNoi || (annualCF + newPmt * 12)
    const capRate = num(m, 'estimatedCapRate')
    const coc = num(m, 'postRefiCashOnCash')
    return (
      <div className="grid grid-cols-2 gap-3 mt-5">
        <BigCard title="NOI" subtitle="Before Mortgage" annual={noi} monthly={noi / 12} />
        <BigCard title="NET CASH FLOW" subtitle="Post-Refinance" annual={annualCF} monthly={annualCF / 12} />
        <BadgeCard title="CAP RATE" value={`${capRate.toFixed(1)}%`} target="6.0%" isGood={capRate >= 6} />
        <BadgeCard title="CASH-ON-CASH" value={coc > 999 ? '∞' : `${coc.toFixed(1)}%`} target="8.0%" isGood={coc >= 8} />
      </div>
    )
  }

  if (strategyType === 'flip') {
    const netProfit = num(m, 'netProfit')
    const roi = num(m, 'roi')
    const annualizedRoi = num(m, 'annualizedRoi')
    const meets70 = !!(m.meets70PercentRule)
    return (
      <div className="grid grid-cols-2 gap-3 mt-5">
        <BigCard title="NET PROFIT" subtitle="After All Costs" annual={netProfit} suffix="" />
        <ValueCard title="TOTAL ROI" subtitle="Return on Cash Invested" value={`${roi.toFixed(1)}%`} color={roi >= 0 ? '#10B981' : '#F43F5E'} />
        <BadgeCard title="ANN. ROI" value={`${annualizedRoi.toFixed(1)}%`} target="30%" isGood={annualizedRoi >= 30} />
        <StatusBadgeCard title="70% RULE" value={meets70 ? 'PASS' : 'FAIL'} pass={meets70} />
      </div>
    )
  }

  if (strategyType === 'house_hack') {
    const effectiveCost = num(m, 'effectiveHousingCost')
    const netRental = num(m, 'netRentalIncome')
    const offset = num(m, 'housingOffsetPercent')
    const coc = num(m, 'cashOnCashReturn')
    const housingPositive = effectiveCost <= 0
    const housingClr = housingPositive ? '#10B981' : '#F43F5E'
    const rentalClr = netRental >= 0 ? '#10B981' : '#F43F5E'
    return (
      <div className="grid grid-cols-2 gap-3 mt-5">
        <ValueCard
          title="EFFECTIVE HOUSING"
          subtitle="Your Monthly Cost"
          value={`${housingPositive ? '+' : ''}${fmt(Math.abs(effectiveCost))}/mo`}
          color={housingClr}
        />
        <ValueCard
          title="NET RENTAL INCOME"
          subtitle="After Vacancy & Expenses"
          value={`${fmt(netRental)}/mo`}
          color={rentalClr}
        />
        <BadgeCard title="HOUSING OFFSET" value={`${offset.toFixed(0)}%`} target="100%" isGood={offset >= 100} />
        <BadgeCard title="COC RETURN" value={`${coc.toFixed(1)}%`} target="8.0%" isGood={coc >= 8} />
      </div>
    )
  }

  if (strategyType === 'wholesale') {
    const netProfit = num(m, 'netProfit')
    const roi = num(m, 'roi')
    const annROI = num(m, 'annualizedROI')
    const buyerROI = num(m, 'endBuyerROI')
    return (
      <div className="grid grid-cols-2 gap-3 mt-5">
        <ValueCard title="NET PROFIT" subtitle="Your Assignment Profit" value={fmt(netProfit)} color={netProfit >= 0 ? '#10B981' : '#F43F5E'} />
        <ValueCard title="ROI" subtitle="Return on Cash at Risk" value={`${roi.toFixed(1)}%`} color={roi >= 0 ? '#10B981' : '#F43F5E'} />
        <BadgeCard title="ANN. ROI" value={`${annROI.toFixed(0)}%`} target="500%" isGood={annROI >= 500} />
        <BadgeCard title="BUYER ROI" value={`${buyerROI.toFixed(1)}%`} target="20%" isGood={buyerROI >= 20} />
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export interface DealMakerWorksheetProps {
  strategyType: StrategyType
  state: AnyStrategyState
  metrics: AnyStrategyMetrics
  listPrice: number
  updateState: (key: string, value: number | string) => void
  isCalculating: boolean
  propertyAddress?: string
  flushWithinParent?: boolean
}

export function DealMakerWorksheet({
  strategyType,
  state,
  metrics,
  listPrice,
  updateState,
  isCalculating,
  propertyAddress,
  flushWithinParent = false,
}: DealMakerWorksheetProps) {
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)

  const handleExportExcel = useCallback(async () => {
    setExporting(true)
    try {
      await exportDealMakerExcel(strategyType, state, metrics, propertyAddress || 'Property', listPrice)
      setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    } catch (e) {
      console.error('Excel export failed:', e)
    } finally {
      setExporting(false)
    }
  }, [strategyType, state, metrics, propertyAddress, listPrice])

  return (
    <section className={`${flushWithinParent ? '' : 'mx-4 sm:mx-6'} pb-24 sm:pb-28`}>
      <div
        className="rounded-xl p-4 sm:p-5 relative"
        style={{
          background: 'var(--surface-base)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          className="absolute top-1.5 right-3 flex items-center gap-1.5 transition-opacity duration-200"
          style={{ opacity: isCalculating ? 1 : 0, pointerEvents: 'none' }}
        >
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.blue }} />
          <span className="text-[10px]" style={{ color: C.blue }}>Recalculating...</span>
        </div>

        {strategyType === 'ltr' && <LTRWorksheet state={state as LTRDealMakerState} metrics={metrics as LTRDealMakerMetrics} listPrice={listPrice} up={updateState} />}
        {strategyType === 'str' && <STRWorksheet state={state as STRDealMakerState} metrics={metrics as STRMetrics} listPrice={listPrice} up={updateState} />}
        {strategyType === 'brrrr' && <BRRRRWorksheet state={state as BRRRRDealMakerState} metrics={metrics as BRRRRMetrics} up={updateState} />}
        {strategyType === 'flip' && <FlipWorksheet state={state as FlipDealMakerState} metrics={metrics as FlipMetrics} up={updateState} />}
        {strategyType === 'house_hack' && <HouseHackWorksheet state={state as HouseHackDealMakerState} metrics={metrics as HouseHackMetrics} up={updateState} />}
        {strategyType === 'wholesale' && <WholesaleWorksheet state={state as WholesaleDealMakerState} metrics={metrics as WholesaleMetrics} up={updateState} />}

        <WorksheetSummary strategyType={strategyType} metrics={metrics} />

        {/* Download Excel */}
        <div className="mt-5 flex justify-center">
          <button
            onClick={handleExportExcel}
            disabled={exporting || isCalculating}
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: exportDone ? '#10B981' : 'var(--accent-sky)',
              color: '#fff',
              boxShadow: exportDone ? '0 0 12px rgba(16,185,129,0.4)' : '0 0 12px rgba(14,165,233,0.3)',
            }}
          >
            {exporting ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" /></svg>
                Generating...
              </>
            ) : exportDone ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Downloaded
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" /></svg>
                Download Excel
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
