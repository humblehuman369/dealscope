'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { WorksheetTabNav } from '../WorksheetTabNav'
import { useWorksheetStore } from '@/stores/worksheetStore'

// Section components for tab navigation
import { SalesCompsSection } from '../sections/SalesCompsSection'
import { RentalCompsSection } from '../sections/RentalCompsSection'
import { MarketDataSection } from '../sections/MarketDataSection'
import { MultiYearProjections } from '../sections/MultiYearProjections'
import { CashFlowChart } from '../charts/CashFlowChart'
import { EquityChart } from '../charts/EquityChart'

// ============================================
// ICONS
// ============================================
const Icons = {
  home: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>),
  tool: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg>),
  contract: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>),
  buyer: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>),
  profit: (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>),
}

const SECTIONS = [
  { id: 'property', title: 'Property Analysis', icon: 'home' },
  { id: 'rehab', title: 'Rehab Estimate', icon: 'tool' },
  { id: 'contract', title: 'Contract Terms', icon: 'contract' },
  { id: 'buyer', title: 'Buyer Analysis', icon: 'buyer' },
  { id: 'profit', title: 'Your Profit', icon: 'profit' },
] as const

const fmt = {
  currency: (v: number) => `$${Math.round(v).toLocaleString()}`,
  currencyCompact: (v: number) => {
    const abs = Math.abs(v); const sign = v < 0 ? '-' : ''
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(abs >= 10000000 ? 1 : 2)}M`
    if (abs >= 100000) return `${sign}$${(abs / 1000).toFixed(0)}K`
    if (abs >= 10000) return `${sign}$${(abs / 1000).toFixed(1)}K`
    return `${sign}$${Math.round(abs).toLocaleString()}`
  },
  percent: (v: number) => `${v.toFixed(1)}%`,
}

interface WholesaleWorksheetProps { property: SavedProperty; propertyId: string; onExportPDF?: () => void }

export function WholesaleWorksheet({ property, propertyId, onExportPDF }: WholesaleWorksheetProps) {
  // Get active section from store for tab navigation
  const { activeSection } = useWorksheetStore()
  
  const propertyData = property.property_data_snapshot || {}
  const beds = propertyData.bedrooms || 0
  const baths = propertyData.bathrooms || 0
  const sqft = propertyData.sqft || 1
  const address = getDisplayAddress(property)
  const city = property.address_city || ''
  const state = property.address_state || ''
  const zip = property.address_zip || ''

  // STATE
  const [contractPrice, setContractPrice] = useState(propertyData.listPrice || 200000)
  const [arv, setArv] = useState(propertyData.arv || (propertyData.listPrice || 200000) * 1.4)
  const [rehabCosts, setRehabCosts] = useState(40000)
  const [assignmentFee, setAssignmentFee] = useState(10000)
  const [earnestMoney, setEarnestMoney] = useState(1000)
  const [marketingCosts, setMarketingCosts] = useState(500)
  const [closingCostsPct, setClosingCostsPct] = useState(2)
  const [buyerTargetProfit, setBuyerTargetProfit] = useState(25)
  
  const [viewMode, setViewMode] = useState<'guided' | 'showall'>('guided')
  const [currentSection, setCurrentSection] = useState<number | null>(0)
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set([0]))

  const calc = useMemo(() => {
    // 70% Rule MAO
    const mao = (arv * 0.7) - rehabCosts
    const meets70Rule = contractPrice <= mao
    
    // Assignment sale price
    const assignmentSalePrice = contractPrice + assignmentFee
    
    // Buyer's numbers
    const buyerAllInCost = assignmentSalePrice + rehabCosts + (assignmentSalePrice * (closingCostsPct / 100))
    const buyerProfit = arv - buyerAllInCost - (arv * 0.08) // 8% selling costs
    const buyerRoi = buyerAllInCost > 0 ? (buyerProfit / buyerAllInCost) * 100 : 0
    const buyerHasGoodDeal = buyerRoi >= buyerTargetProfit
    
    // Your profit
    const yourCosts = earnestMoney + marketingCosts
    const yourNetProfit = assignmentFee - marketingCosts
    const yourRoi = yourCosts > 0 ? (yourNetProfit / yourCosts) * 100 : 0
    
    // Price per sqft
    const pricePerSqft = sqft > 0 ? contractPrice / sqft : 0
    const arvPerSqft = sqft > 0 ? arv / sqft : 0
    const allInPctArv = arv > 0 ? (assignmentSalePrice / arv) * 100 : 0
    
    // Deal Score
    const feeScore = Math.min(30, Math.max(0, (assignmentFee / 15000) * 30))
    const ruleScore = meets70Rule ? 25 : Math.max(0, 25 - ((contractPrice - mao) / 5000) * 5)
    const buyerScore = buyerHasGoodDeal ? 25 : Math.max(0, 25 - ((buyerTargetProfit - buyerRoi) / 5) * 5)
    const roiScore = Math.min(20, Math.max(0, (yourRoi / 500) * 20))
    const dealScore = Math.round(Math.min(100, Math.max(0, feeScore + ruleScore + buyerScore + roiScore)))
    
    return {
      mao, meets70Rule, assignmentSalePrice, buyerAllInCost, buyerProfit, buyerRoi, buyerHasGoodDeal,
      yourCosts, yourNetProfit, yourRoi, pricePerSqft, arvPerSqft, allInPctArv, dealScore,
    }
  }, [contractPrice, arv, rehabCosts, assignmentFee, earnestMoney, marketingCosts, closingCostsPct, buyerTargetProfit, sqft])

  const toggleSection = useCallback((index: number) => {
    if (viewMode === 'showall') return
    if (currentSection === index) setCurrentSection(null)
    else { setCurrentSection(index); setCompletedSections(prev => new Set([...Array.from(prev), index])) }
  }, [viewMode, currentSection])

  const InputRow = ({ label, value, onChange, min, max, step, format, subValue }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; format: 'currency' | 'percent' | 'number'; subValue?: string }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState('')
    const displayValue = format === 'currency' ? fmt.currency(value) : format === 'percent' ? fmt.percent(value) : value.toString()
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    const handleStartEdit = () => { setEditValue(format === 'currency' ? Math.round(value).toString() : format === 'percent' ? value.toFixed(1) : value.toString()); setIsEditing(true) }
    const handleEndEdit = () => { setIsEditing(false); let parsed = parseFloat(editValue.replace(/[$,%\s]/g, '')); if (isNaN(parsed)) return; parsed = Math.min(max, Math.max(min, parsed)); onChange(parsed) }
    const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleEndEdit(); else if (e.key === 'Escape') setIsEditing(false) }
    return (
      <div className="py-3">
        <div className="flex items-center justify-between mb-2"><label className="text-sm text-slate-500">{label}</label><div className="text-right">{isEditing ? (<input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleEndEdit} onKeyDown={handleKeyDown} autoFocus className="w-24 px-2 py-0.5 text-sm font-semibold text-slate-800 tabular-nums text-right border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"/>) : (<span onClick={handleStartEdit} className="text-sm font-semibold text-slate-800 tabular-nums cursor-pointer hover:text-blue-600 hover:underline">{displayValue}</span>)}{subValue && <span className="text-xs text-slate-400 ml-1.5 tabular-nums">{subValue}</span>}</div></div>
        <div className="relative"><div className="h-1.5 bg-slate-200 rounded-full"><div className="h-full bg-blue-500 rounded-full transition-all duration-100" style={{ width: `${percentage}%` }} /></div><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="absolute inset-0 w-full h-6 -top-2 opacity-0 cursor-pointer"/></div>
      </div>
    )
  }

  const DisplayRow = ({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'success' | 'danger' | 'muted' | 'blue' }) => {
    const colors = { default: 'text-slate-800', success: 'text-emerald-600', danger: 'text-red-500', muted: 'text-slate-400', blue: 'text-blue-600' }
    return <div className="flex items-center justify-between py-2.5"><span className="text-sm text-slate-500">{label}</span><span className={`text-sm font-semibold tabular-nums ${colors[variant]}`}>{value}</span></div>
  }

  const SummaryBox = ({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'success' | 'danger' | 'blue' }) => {
    const styles = { default: 'bg-slate-50 border-slate-200', success: 'bg-emerald-50 border-emerald-200', danger: 'bg-red-50 border-red-200', blue: 'bg-blue-50 border-blue-200' }
    const textColor = { default: 'text-slate-800', success: 'text-emerald-600', danger: 'text-red-500', blue: 'text-blue-600' }
    return <div className={`flex items-center justify-between p-3 rounded-lg border ${styles[variant]}`}><span className="text-sm font-medium text-slate-600">{label}</span><span className={`text-base font-bold tabular-nums ${textColor[variant]}`}>{value}</span></div>
  }

  const Section = ({ index, title, iconKey, children }: { index: number; title: string; iconKey: keyof typeof Icons; children: React.ReactNode }) => {
    const isOpen = viewMode === 'showall' || currentSection === index
    const isComplete = completedSections.has(index) && currentSection !== index
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <button onClick={() => toggleSection(index)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isComplete ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{Icons[iconKey]}</div><span className="font-semibold text-slate-800">{title}</span></div>
          <div className="flex items-center gap-2">{isComplete && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg></div>}<svg className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg></div>
        </button>
        {isOpen && <div className="px-4 pb-4 border-t border-slate-100">{children}</div>}
      </div>
    )
  }

  const isProfit = calc.yourNetProfit > 0
  let verdict: string, verdictSub: string
  if (calc.dealScore >= 85) { verdict = "Excellent Wholesale"; verdictSub = "Strong fee with good buyer margins" }
  else if (calc.dealScore >= 70) { verdict = "Good Wholesale"; verdictSub = "Solid assignment opportunity" }
  else if (calc.dealScore >= 55) { verdict = "Fair Wholesale"; verdictSub = "May need to reduce fee" }
  else if (isProfit) { verdict = "Marginal Wholesale"; verdictSub = "Tight margins - verify buyer interest" }
  else { verdict = "Weak Wholesale"; verdictSub = "Numbers don't work" }

  const targets = [
    { label: 'Assignment Fee', actual: assignmentFee, target: 10000, unit: '$', met: assignmentFee >= 10000 },
    { label: 'Meets 70% Rule', actual: calc.allInPctArv, target: 70, unit: '%', met: calc.meets70Rule },
    { label: 'Buyer ROI', actual: calc.buyerRoi, target: buyerTargetProfit, unit: '%', met: calc.buyerHasGoodDeal },
    { label: 'Your ROI', actual: calc.yourRoi, target: 500, unit: '%', met: calc.yourRoi >= 500 },
  ]

  // Build full address
  const fullAddress = property.full_address || `${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${zip ? ` ${zip}` : ''}`

  return (
    <div className="w-full min-h-screen bg-slate-50 pt-12">
      {/* PROPERTY ADDRESS BAR */}
      <div className="w-full bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="text-blue-500 hover:text-blue-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-800">{fullAddress}</h1>
          </div>
        </div>
      </div>
      
      <div className="w-full sticky top-12 z-40 bg-white border-b border-slate-200"><div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8"><WorksheetTabNav propertyId={propertyId} strategy="wholesale" zpid={property.zpid || propertyData.zpid} /></div></div>
      
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-slate-800/5"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Contract</div><div className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 tabular-nums truncate">{fmt.currencyCompact(contractPrice)}</div></div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-blue-500/10"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">ARV</div><div className="text-xs sm:text-sm lg:text-base font-bold text-blue-600 tabular-nums truncate">{fmt.currencyCompact(arv)}</div></div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${isProfit ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Your Fee</div><div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums truncate ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>{fmt.currencyCompact(assignmentFee)}</div></div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${calc.buyerHasGoodDeal ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Buyer ROI</div><div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums truncate ${calc.buyerHasGoodDeal ? 'text-emerald-600' : 'text-amber-500'}`}>{fmt.percent(calc.buyerRoi)}</div></div>
            <div className="rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 bg-blue-500/10"><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Your ROI</div><div className="text-xs sm:text-sm lg:text-base font-bold text-blue-600 tabular-nums truncate">{fmt.percent(calc.yourRoi)}</div></div>
            <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 text-center min-w-0 ${calc.dealScore >= 70 ? 'bg-blue-500/15' : calc.dealScore >= 40 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}><div className="text-[8px] sm:text-[9px] lg:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Deal Score</div><div className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums ${calc.dealScore >= 70 ? 'text-blue-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{calc.dealScore}</div></div>
          </div>
        </div>
      </div>
      
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Render different content based on active tab */}
        {activeSection === 'sales-comps' ? (
          <SalesCompsSection />
        ) : activeSection === 'rental-comps' ? (
          <RentalCompsSection />
        ) : activeSection === 'market-data' ? (
          <MarketDataSection />
        ) : activeSection === 'projections' ? (
          <>
            <MultiYearProjections />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <CashFlowChart />
              <EquityChart />
            </div>
          </>
        ) : (
        <>
          {/* View Toggle */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button onClick={() => setViewMode('guided')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'guided' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}>Guided</button>
              <button onClick={() => setViewMode('showall')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${viewMode === 'showall' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}>Expand All</button>
            </div>
          </div>
          
          <div className="grid grid-cols-[1.4fr,1.2fr] md:grid-cols-[1.5fr,1.2fr] lg:grid-cols-[1.2fr,1fr] gap-4 sm:gap-6 items-start">
          <div className="space-y-3">
            <Section index={0} title="Property Analysis" iconKey="home">
              <InputRow label="Contract Price" value={contractPrice} onChange={setContractPrice} min={50000} max={500000} step={5000} format="currency" />
              <InputRow label="After Repair Value" value={arv} onChange={setArv} min={Math.round(contractPrice * 0.8)} max={Math.round(contractPrice * 2)} step={5000} format="currency" />
              <DisplayRow label="Price / Sq.Ft." value={`$${Math.round(calc.pricePerSqft)}`} />
              <DisplayRow label="ARV / Sq.Ft." value={`$${Math.round(calc.arvPerSqft)}`} />
              <div className="mt-3 pt-3"><SummaryBox label="70% Rule MAO" value={fmt.currency(calc.mao)} variant={calc.meets70Rule ? 'success' : 'danger'} /></div>
            </Section>
            
            <Section index={1} title="Rehab Estimate" iconKey="tool">
              <InputRow label="Estimated Rehab" value={rehabCosts} onChange={setRehabCosts} min={0} max={150000} step={1000} format="currency" />
              <DisplayRow label="$/Sq.Ft. Rehab" value={`$${Math.round(rehabCosts / sqft)}`} />
              <div className="mt-3 pt-3"><SummaryBox label="Total Rehab Budget" value={fmt.currency(rehabCosts)} /></div>
            </Section>
            
            <Section index={2} title="Contract Terms" iconKey="contract">
              <InputRow label="Earnest Money" value={earnestMoney} onChange={setEarnestMoney} min={100} max={10000} step={100} format="currency" />
              <InputRow label="Assignment Fee" value={assignmentFee} onChange={setAssignmentFee} min={1000} max={50000} step={500} format="currency" />
              <DisplayRow label="Assignment Sale Price" value={fmt.currency(calc.assignmentSalePrice)} variant="blue" />
              <DisplayRow label="All-In % of ARV" value={fmt.percent(calc.allInPctArv)} variant={calc.meets70Rule ? 'success' : 'danger'} />
            </Section>
            
            <Section index={3} title="Buyer Analysis" iconKey="buyer">
              <DisplayRow label="Buyer Pays You" value={fmt.currency(calc.assignmentSalePrice)} />
              <DisplayRow label="+ Rehab Costs" value={fmt.currency(rehabCosts)} />
              <InputRow label="+ Closing Costs" value={closingCostsPct} onChange={setClosingCostsPct} min={0} max={5} step={0.5} format="percent" subValue={fmt.currency(calc.assignmentSalePrice * (closingCostsPct / 100))} />
              <DisplayRow label="Buyer All-In Cost" value={fmt.currency(calc.buyerAllInCost)} />
              <DisplayRow label="Buyer's ARV" value={fmt.currency(arv)} variant="blue" />
              <DisplayRow label="Buyer's Profit" value={fmt.currency(calc.buyerProfit)} variant={calc.buyerProfit > 0 ? 'success' : 'danger'} />
              <InputRow label="Buyer Target ROI" value={buyerTargetProfit} onChange={setBuyerTargetProfit} min={10} max={50} step={5} format="percent" />
              <div className="mt-3 pt-3"><SummaryBox label="Buyer ROI" value={fmt.percent(calc.buyerRoi)} variant={calc.buyerHasGoodDeal ? 'success' : 'danger'} /></div>
            </Section>
            
            <Section index={4} title="Your Profit" iconKey="profit">
              <DisplayRow label="Assignment Fee" value={fmt.currency(assignmentFee)} variant="success" />
              <InputRow label="Marketing Costs" value={marketingCosts} onChange={setMarketingCosts} min={0} max={5000} step={100} format="currency" />
              <DisplayRow label="Earnest Money (Refundable)" value={fmt.currency(earnestMoney)} variant="muted" />
              <div className="mt-3 pt-3 space-y-2">
                <SummaryBox label="Your Net Profit" value={fmt.currency(calc.yourNetProfit)} variant={isProfit ? 'success' : 'danger'} />
                <SummaryBox label="Your ROI" value={fmt.percent(calc.yourRoi)} variant="blue" />
              </div>
            </Section>
          </div>
          
          <div className="space-y-4 sm:sticky sm:top-28">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">IQ VERDICT: WHOLESALE</div>
              <div className="flex items-center gap-4 mb-5">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="6"/><circle cx="40" cy="40" r="34" fill="none" stroke={calc.dealScore >= 70 ? '#3b82f6' : calc.dealScore >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(calc.dealScore / 100) * 213.6} 213.6`}/></svg>
                  <div className="absolute inset-0 flex items-center justify-center"><span className={`text-2xl font-bold ${calc.dealScore >= 70 ? 'text-blue-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{calc.dealScore}</span></div>
                </div>
                <div><div className={`text-lg font-bold ${calc.dealScore >= 70 ? 'text-blue-600' : calc.dealScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{verdict}</div><div className="text-sm text-slate-500">{verdictSub}</div></div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">WHOLESALE TARGETS</div>
                {targets.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{t.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold tabular-nums ${t.met ? 'text-blue-600' : 'text-slate-800'}`}>{t.unit === '$' ? fmt.currencyCompact(t.actual) : fmt.percent(t.actual)}</span>
                      <span className="text-[10px] text-slate-400">/ {t.unit === '$' ? fmt.currencyCompact(t.target) : `${t.target}%`}</span>
                      {t.met ? <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> : <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">DEAL FLOW</div>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">1</div><div className="flex-1"><div className="text-sm font-medium text-slate-800">You Contract at</div><div className="text-lg font-bold text-slate-800">{fmt.currencyCompact(contractPrice)}</div></div></div>
                <div className="w-0.5 h-4 bg-slate-200 ml-4"></div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">2</div><div className="flex-1"><div className="text-sm font-medium text-slate-800">You Assign at</div><div className="text-lg font-bold text-blue-600">{fmt.currencyCompact(calc.assignmentSalePrice)}</div></div></div>
                <div className="w-0.5 h-4 bg-slate-200 ml-4"></div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">3</div><div className="flex-1"><div className="text-sm font-medium text-slate-800">You Profit</div><div className="text-lg font-bold text-emerald-600">{fmt.currencyCompact(calc.yourNetProfit)}</div></div></div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">KEY METRICS</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="py-3 px-4 rounded-lg bg-blue-50 border border-blue-200"><div className="text-xs text-slate-500 mb-1">Your Fee</div><div className="text-lg font-bold text-blue-600">{fmt.currencyCompact(assignmentFee)}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">Your Costs</div><div className="text-lg font-bold text-slate-800">{fmt.currencyCompact(calc.yourCosts)}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">Buyer Profit</div><div className={`text-lg font-bold ${calc.buyerProfit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt.currencyCompact(calc.buyerProfit)}</div></div>
                <div className="py-3 px-4 rounded-lg bg-slate-50"><div className="text-xs text-slate-500 mb-1">Buyer ROI</div><div className={`text-lg font-bold ${calc.buyerHasGoodDeal ? 'text-emerald-600' : 'text-amber-500'}`}>{fmt.percent(calc.buyerRoi)}</div></div>
              </div>
            </div>
            
            <button onClick={onExportPDF} className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              Export PDF Report
            </button>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  )
}
