'use client'

import { useState } from 'react'
import { Check, Waves } from 'lucide-react'
import { PropertyData } from './types'

interface PropertyFeaturesProps {
  interiorFeatures: string[]
  exteriorFeatures: string[]
  appliances: string[]
  construction: string[]
  roof?: string
  foundation?: string
  isWaterfront?: boolean
  waterfrontFeatures?: string[]
}

type TabId = 'interior' | 'exterior' | 'appliances'

/**
 * PropertyFeatures Component
 * 
 * Tabbed display of interior/exterior features, appliances,
 * construction details, and waterfront information.
 */
export function PropertyFeatures({
  interiorFeatures,
  exteriorFeatures,
  appliances,
  construction,
  roof,
  foundation,
  isWaterfront,
  waterfrontFeatures,
}: PropertyFeaturesProps) {
  const [activeTab, setActiveTab] = useState<TabId>('interior')

  const tabs: { id: TabId; label: string; features: string[] }[] = [
    { id: 'interior', label: 'Interior', features: interiorFeatures },
    { id: 'exterior', label: 'Exterior', features: exteriorFeatures },
    { id: 'appliances', label: 'Appliances', features: appliances },
  ]

  const currentFeatures = tabs.find(t => t.id === activeTab)?.features || []

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-4">
        Features & Amenities
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-teal-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {currentFeatures.map((feature, i) => (
          <div key={i} className="flex items-center gap-2 py-2">
            <Check size={14} className="text-teal-500 flex-shrink-0" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
          </div>
        ))}
      </div>

      {currentFeatures.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
          No {activeTab} features listed
        </p>
      )}

      {/* Waterfront Badge */}
      {isWaterfront && waterfrontFeatures && waterfrontFeatures.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Waves size={16} className="text-teal-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Waterfront Property
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {waterfrontFeatures.map((feature, i) => (
              <span 
                key={i} 
                className="px-3 py-1 rounded-full bg-teal-500/10 dark:bg-teal-400/10 text-xs font-medium text-teal-700 dark:text-teal-300"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Construction */}
      {(construction?.length > 0 || roof || foundation) && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {construction?.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Construction
              </div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {construction.join(', ')}
              </div>
            </div>
          )}
          {roof && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Roof
              </div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {roof}
              </div>
            </div>
          )}
          {foundation && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Foundation
              </div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {foundation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * PropertyFeaturesSkeleton
 * Loading state for the property features
 */
export function PropertyFeaturesSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}
