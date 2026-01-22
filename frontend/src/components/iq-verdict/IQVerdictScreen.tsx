'use client'

/**
 * IQVerdictScreen - The key innovation screen for web/desktop
 * Two-column layout showing ranked strategy recommendations with Deal Score
 */

import React from 'react'
import {
  IQ_COLORS,
  IQProperty,
  IQAnalysisResult,
  IQStrategy,
  getBadgeColors,
  getRankColor,
  getDealScoreColor,
  formatPrice,
  STRATEGY_ROUTE_MAP,
} from './types'

interface IQVerdictScreenProps {
  property: IQProperty
  analysis: IQAnalysisResult
  onViewStrategy: (strategy: IQStrategy) => void
  onCompareAll: () => void
}

export function IQVerdictScreen({
  property,
  analysis,
  onViewStrategy,
  onCompareAll,
}: IQVerdictScreenProps) {
  const topStrategy = analysis.strategies[0]
  
  // Build full address with city, state, zip
  const fullAddress = [
    property.address,
    [property.city, property.state, property.zip].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      {/* Main Content - Two Column Layout */}
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column - IQ Verdict */}
          <div className="space-y-6">
            {/* Property Summary Card */}
            <div className="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-gray-200 dark:border-navy-700 p-6">
              <div className="flex items-center gap-4">
                {/* Property Photo or Placeholder */}
                <div 
                  className="w-16 h-16 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-navy-700 overflow-hidden flex-shrink-0"
                >
                  {property.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={property.imageUrl} 
                      alt={property.address}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // On error, hide image and show placeholder
                        (e.target as HTMLImageElement).style.display = 'none'
                        const parent = (e.target as HTMLImageElement).parentElement
                        if (parent) {
                          parent.innerHTML = '<svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>'
                        }
                      }}
                    />
                  ) : (
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 dark:text-white truncate">{fullAddress}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {property.beds} bd · {property.baths} ba · {property.sqft?.toLocaleString() || '—'} sqft
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div 
                    className="text-xl font-bold"
                    style={{ color: IQ_COLORS.pacificTeal }}
                  >
                    {formatPrice(analysis.purchasePrice || property.price)}
                  </div>
                  {analysis.purchasePrice && analysis.listPrice && analysis.purchasePrice < analysis.listPrice && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      List: {formatPrice(analysis.listPrice)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* IQ Verdict Hero */}
            <div 
              className="rounded-xl p-8 text-center"
              style={{ 
                background: `linear-gradient(180deg, ${IQ_COLORS.pacificTeal}15 0%, ${IQ_COLORS.pacificTeal}08 100%)`,
              }}
            >
              <p 
                className="text-lg font-semibold tracking-widest mb-4"
                style={{ color: IQ_COLORS.pacificTeal }}
              >
                IQ VERDICT
              </p>
              
              {/* Clickable Deal Score - navigates to top strategy */}
              <button
                onClick={() => onViewStrategy(topStrategy)}
                className="inline-flex items-center gap-4 bg-white dark:bg-navy-800 rounded-full px-8 py-4 shadow-lg mb-6 transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer"
              >
                <span 
                  className="text-5xl font-extrabold"
                  style={{ color: getDealScoreColor(analysis.dealScore) }}
                >
                  {analysis.dealScore}
                </span>
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-white text-lg">
                    {analysis.dealVerdict}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Deal Score</p>
                </div>
              </button>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                {analysis.verdictDescription}
              </p>
            </div>

            {/* Primary CTA */}
            <button
              onClick={() => onViewStrategy(topStrategy)}
              className="w-full py-4 rounded-full font-bold text-gray-900 dark:text-white transition-all hover:scale-[1.02]"
              style={{ 
                backgroundColor: `${IQ_COLORS.pacificTeal}20`,
                border: `1px solid ${IQ_COLORS.pacificTeal}40`,
              }}
            >
              View {topStrategy.name} Analysis →
            </button>
            
            <button
              onClick={onCompareAll}
              className="w-full py-3 text-center font-semibold transition-colors"
              style={{ color: IQ_COLORS.pacificTeal }}
            >
              Compare All Strategies
            </button>
          </div>

          {/* Right Column - Strategy Rankings */}
          <div className="pt-4 lg:pt-6">
            <p 
              className="text-lg font-semibold tracking-widest mb-4"
              style={{ color: IQ_COLORS.pacificTeal }}
            >
              IQ RANKED STRATEGIES
            </p>

            <div className="space-y-3">
              {analysis.strategies.map((strategy, index) => {
                const isTop = index === 0
                const badgeColors = strategy.badge ? getBadgeColors(strategy.rank) : null

                return (
                  <button
                    key={strategy.id}
                    onClick={() => onViewStrategy(strategy)}
                    className={`
                      w-full flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-navy-800 
                      border transition-all hover:shadow-md
                      ${isTop 
                        ? 'border-2 shadow-lg' 
                        : 'border-gray-200 dark:border-navy-700'
                      }
                    `}
                    style={isTop ? { 
                      borderColor: IQ_COLORS.success,
                      boxShadow: `0 4px 14px ${IQ_COLORS.success}30`,
                    } : undefined}
                  >
                    {/* Rank Indicator */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: getRankColor(strategy.rank),
                        color: strategy.rank <= 3 ? '#fff' : IQ_COLORS.slate,
                      }}
                    >
                      {strategy.rank}
                    </div>

                    {/* Strategy Info */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {strategy.name}
                        </span>
                        {strategy.badge && badgeColors && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{
                              backgroundColor: badgeColors.bg,
                              color: badgeColors.text,
                            }}
                          >
                            {strategy.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {strategy.metricLabel}
                      </p>
                    </div>

                    {/* Metric Value */}
                    <div className="text-right">
                      <p
                        className="text-xl font-bold"
                        style={{
                          color: strategy.rank <= 3 ? IQ_COLORS.deepNavy : IQ_COLORS.slate,
                        }}
                      >
                        {strategy.metric}
                      </p>
                      <p className="text-xs text-gray-400">Score: {strategy.score}</p>
                    </div>

                    {/* Chevron */}
                    <svg 
                      className="w-5 h-5 text-gray-400" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )
              })}
            </div>

            {/* Export Button */}
            <button className="mt-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export PDF Report
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default IQVerdictScreen
