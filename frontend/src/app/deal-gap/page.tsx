'use client'

import React, { useState, useMemo } from 'react'
import { DealGapChart } from '@/components/analytics/DealGapChart'
import { useDealScore } from '@/hooks/useDealScore'
import { ArrowLeft, Home, TrendingDown, DollarSign, Target } from 'lucide-react'
import Link from 'next/link'

/**
 * Deal Gap Page
 * 
 * Standalone page for Deal Gap analysis. Shows the price ladder visualization
 * with interactive buy price adjustment.
 * 
 * Features:
 * - Interactive Deal Gap Chart with slider
 * - Real-time deal score calculation via backend API
 * - What-if analysis for different buy prices
 * - Property input fields for custom analysis
 */

// Format currency
const formatUSD = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// Parse currency input
const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

export default function DealGapPage() {
  // Default values for demo
  const [listPrice, setListPrice] = useState(520000)
  const [monthlyRent, setMonthlyRent] = useState(3500)
  const [propertyTaxes, setPropertyTaxes] = useState(6000)
  const [insurance, setInsurance] = useState(2400)
  const [buyPrice, setBuyPrice] = useState(450000)

  // Input handlers with currency formatting
  const [listPriceInput, setListPriceInput] = useState(formatUSD(listPrice))
  const [rentInput, setRentInput] = useState(formatUSD(monthlyRent))
  const [taxInput, setTaxInput] = useState(formatUSD(propertyTaxes))
  const [insuranceInput, setInsuranceInput] = useState(formatUSD(insurance))

  // Fetch deal score from backend (calculates breakeven)
  const { result, isLoading } = useDealScore({
    listPrice,
    purchasePrice: buyPrice,
    monthlyRent,
    propertyTaxes,
    insurance,
  })

  // Breakeven price from backend or estimate
  const breakevenPrice = useMemo(() => {
    if (result?.breakevenPrice) return result.breakevenPrice
    // Fallback estimate: rough LTR breakeven calculation
    // This is just for UI display while loading - actual calc is on backend
    const annualRent = monthlyRent * 12 * 0.95 // 5% vacancy
    const annualExpenses = propertyTaxes + insurance + (annualRent * 0.10) // 10% maintenance + mgmt
    const noi = annualRent - annualExpenses
    const capRate = 0.06 // Assume 6% cap rate
    return noi > 0 ? Math.round(noi / capRate) : listPrice * 0.85
  }, [result?.breakevenPrice, monthlyRent, propertyTaxes, insurance, listPrice])

  // Handle input blur - parse and update actual value
  const handleListPriceBlur = () => {
    const value = parseCurrency(listPriceInput)
    if (value > 0) {
      setListPrice(value)
      setListPriceInput(formatUSD(value))
    }
  }

  const handleRentBlur = () => {
    const value = parseCurrency(rentInput)
    if (value > 0) {
      setMonthlyRent(value)
      setRentInput(formatUSD(value))
    }
  }

  const handleTaxBlur = () => {
    const value = parseCurrency(taxInput)
    if (value > 0) {
      setPropertyTaxes(value)
      setTaxInput(formatUSD(value))
    }
  }

  const handleInsuranceBlur = () => {
    const value = parseCurrency(insuranceInput)
    if (value > 0) {
      setInsurance(value)
      setInsuranceInput(formatUSD(value))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-white/60" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white">Deal Gap Analysis</h1>
              <p className="text-xs text-slate-500 dark:text-white/50">Buy Price vs Breakeven Visualization</p>
            </div>
          </div>
          <Link 
            href="/"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <Home className="w-5 h-5 text-slate-600 dark:text-white/60" />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Input Section */}
        <section className="mb-6 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-lg">
          <h2 className="text-sm font-black tracking-wider uppercase text-slate-700 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Property Inputs
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* List Price */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                List Price
              </label>
              <input
                type="text"
                value={listPriceInput}
                onChange={(e) => setListPriceInput(e.target.value)}
                onBlur={handleListPriceBlur}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Monthly Rent */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                Monthly Rent
              </label>
              <input
                type="text"
                value={rentInput}
                onChange={(e) => setRentInput(e.target.value)}
                onBlur={handleRentBlur}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Property Taxes */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                Annual Taxes
              </label>
              <input
                type="text"
                value={taxInput}
                onChange={(e) => setTaxInput(e.target.value)}
                onBlur={handleTaxBlur}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Insurance */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                Annual Insurance
              </label>
              <input
                type="text"
                value={insuranceInput}
                onChange={(e) => setInsuranceInput(e.target.value)}
                onBlur={handleInsuranceBlur}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Calculated Breakeven Display */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-slate-600 dark:text-white/70">
                Calculated Breakeven:
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-teal-500 rounded-full animate-spin" />
              ) : (
                <span className="text-lg font-black text-orange-500">
                  {formatUSD(breakevenPrice)}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Deal Gap Chart */}
        <section className="mb-6">
          <DealGapChart
            breakeven={breakevenPrice}
            listPrice={listPrice}
            initialBuyPrice={buyPrice}
            thresholdPct={10}
          />
        </section>

        {/* Deal Score Summary */}
        {result && (
          <section className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-lg">
            <h2 className="text-sm font-black tracking-wider uppercase text-slate-700 dark:text-white mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Deal Score Summary
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Deal Score */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Deal Score
                </div>
                <div className="text-2xl font-black" style={{ color: result.color || '#22c55e' }}>
                  {result.dealScore}
                </div>
                <div className="text-xs font-semibold text-slate-600 dark:text-white/60">
                  {result.grade || 'N/A'}
                </div>
              </div>

              {/* Verdict */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Verdict
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {result.dealVerdict}
                </div>
              </div>

              {/* Discount Needed */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Discount from List
                </div>
                <div className="text-2xl font-black text-teal-500">
                  {result.discountPercent.toFixed(1)}%
                </div>
              </div>

              {/* Buy Price */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                  Buy Price
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {formatUSD(buyPrice)}
                </div>
                <div className="text-xs text-slate-500 dark:text-white/50">
                  vs {formatUSD(listPrice)} list
                </div>
              </div>
            </div>

            {/* Factors breakdown */}
            {result.factors && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50 mb-2">
                  Score Factors
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-lg font-black text-slate-700 dark:text-white">
                      {result.factors.dealGapScore}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-white/50">Deal Gap (50%)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-slate-700 dark:text-white">
                      {result.factors.availabilityScore}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-white/50">Availability (30%)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-slate-700 dark:text-white">
                      {result.factors.domScore}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-white/50">Days on Market (20%)</div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* How It Works */}
        <section className="mt-6 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-br from-teal-50 to-sky-50 dark:from-teal-950/30 dark:to-sky-950/30">
          <h3 className="text-sm font-black tracking-wider uppercase text-teal-700 dark:text-teal-400 mb-3">
            How Deal Gap Works
          </h3>
          <div className="space-y-2 text-sm text-slate-600 dark:text-white/70">
            <p>
              <strong className="text-slate-800 dark:text-white">Breakeven Price</strong> is where your monthly cash flow = $0. 
              It&apos;s calculated from rent minus all expenses including mortgage payment.
            </p>
            <p>
              <strong className="text-slate-800 dark:text-white">Deal Gap</strong> shows how much below list price you need to buy 
              to achieve your target returns. A larger gap means more negotiation needed.
            </p>
            <p>
              <strong className="text-slate-800 dark:text-white">The Ladder</strong> visualizes your position: 
              <span className="text-red-500 font-semibold"> Red = Loss</span>, 
              <span className="text-yellow-500 font-semibold"> Yellow = Breakeven</span>, 
              <span className="text-green-500 font-semibold"> Green = Profit</span>, 
              <span className="text-sky-500 font-semibold"> Blue = Deep Value</span>.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
