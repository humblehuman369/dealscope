'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus, Minus, Trash2, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, ArrowLeft
} from 'lucide-react'
import {
  REHAB_CATEGORIES,
  REHAB_PRESETS,
  RehabCategory,
  RehabItem,
  RehabSelection,
  calculateRehabEstimate,
  RehabPreset
} from '@/lib/analytics'

// Type for quality tier
type QualityTier = 'low' | 'mid' | 'high'

// ============================================
// FORMATTING
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)
}

// ============================================
// PRESET CARD
// ============================================

function PresetCard({
  preset,
  onSelect,
  isActive
}: {
  preset: RehabPreset
  onSelect: () => void
  isActive: boolean
}) {
  return (
    <button
      onClick={onSelect}
      className={`bg-neutral-50 border-2 rounded-lg p-2 cursor-pointer transition-all text-left ${
        isActive
          ? 'border-brand-500 bg-gradient-to-br from-blue-50 to-sky-100'
          : 'border-gray-200 hover:border-brand-500 hover:bg-blue-50'
      }`}
    >
      <div className="text-xs font-semibold text-navy-900 mb-1">{preset.name}</div>
      <div className="text-[0.625rem] text-gray-500 mb-1 leading-tight">{preset.description}</div>
      <div className="text-sm font-bold text-brand-500">{formatCurrency(preset.estimatedCost.mid)}</div>
    </button>
  )
}

// ============================================
// QUALITY TAB SELECTOR
// ============================================

function QualityTabs({
  value,
  onChange
}: {
  value: QualityTier
  onChange: (tier: QualityTier) => void
}) {
  const tiers = [
    { id: 'low' as QualityTier, label: 'Budget' },
    { id: 'mid' as QualityTier, label: 'Standard' },
    { id: 'high' as QualityTier, label: 'Premium' },
  ]
  
  return (
    <div className="flex gap-1.5">
      {tiers.map((tier) => (
        <button
          key={tier.id}
          onClick={() => onChange(tier.id)}
          className={`px-2.5 py-1 rounded-md text-[0.6875rem] font-semibold cursor-pointer transition-all border ${
            value === tier.id
              ? 'bg-brand-500 text-white border-brand-500'
              : 'bg-white text-gray-500 border-gray-200 hover:border-brand-500'
          }`}
        >
          {tier.label}
        </button>
      ))}
    </div>
  )
}

// ============================================
// REHAB ITEM ROW - Compact Grid Layout
// ============================================

function RehabItemRow({
  item,
  selection,
  globalTier,
  onUpdate,
  onRemove
}: {
  item: RehabItem
  selection: RehabSelection
  globalTier: QualityTier
  onUpdate: (sel: RehabSelection) => void
  onRemove: () => void
}) {
  const unitCost = globalTier === 'low' ? item.lowCost :
                   globalTier === 'mid' ? item.midCost :
                   item.highCost
  const total = unitCost * selection.quantity
  
  return (
    <div className="grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_auto_auto_1fr_auto] gap-1.5 items-center py-1.5 px-2 border-b border-gray-100 hover:bg-gray-50 text-xs">
      {/* Item Name */}
      <div>
        <div className="font-medium text-navy-900">{item.name}</div>
        <div className="text-[0.625rem] text-gray-400">{formatCurrency(unitCost)}/{item.unit}</div>
      </div>
      
      {/* Quality Badges */}
      <div className={`py-0.5 px-1.5 rounded text-[0.625rem] font-semibold text-center ${
        globalTier === 'low' ? 'bg-sky-100 text-sky-700 border border-sky-300' : 'bg-sky-100 text-sky-700'
      }`}>Budget</div>
      <div className={`py-0.5 px-1.5 rounded text-[0.625rem] font-semibold text-center ${
        globalTier === 'mid' ? 'bg-sky-100 text-brand-500 border border-brand-500' : 'bg-sky-100 text-brand-500'
      }`}>Standard</div>
      <div className={`py-0.5 px-1.5 rounded text-[0.625rem] font-semibold text-center ${
        globalTier === 'high' ? 'bg-cyan-100 text-cyan-700 border border-cyan-300' : 'bg-cyan-100 text-cyan-700'
      }`}>Premium</div>
      
      {/* Quantity Input */}
      <input
        type="number"
        value={selection.quantity}
        onChange={(e) => onUpdate({ ...selection, quantity: Math.max(0, parseInt(e.target.value) || 0) })}
        className="w-14 px-1.5 py-1 border border-gray-200 rounded-md text-[0.6875rem] text-center focus:outline-none focus:border-brand-500"
      />
      
      {/* Minus Button */}
      <button
        onClick={() => onUpdate({ ...selection, quantity: Math.max(0, selection.quantity - 1) })}
        className="w-6 h-6 border border-gray-200 bg-white rounded flex items-center justify-center cursor-pointer text-gray-500 hover:border-brand-500 hover:text-brand-500 transition-all"
      >
        <Minus className="w-3 h-3" />
      </button>
      
      {/* Total */}
      <div className="font-bold text-navy-900 text-right">{formatCurrency(total)}</div>
      
      {/* Delete */}
      <button
        onClick={onRemove}
        className="text-crimson-500 cursor-pointer text-sm hover:text-crimson-600"
      >
        ×
      </button>
    </div>
  )
}

// ============================================
// CATEGORY SECTION
// ============================================

function CategorySection({
  category,
  selections,
  globalTier,
  onAddItem,
  onUpdateItem,
  onRemoveItem
}: {
  category: RehabCategory
  selections: RehabSelection[]
  globalTier: QualityTier
  onAddItem: (itemId: string) => void
  onUpdateItem: (itemId: string, selection: RehabSelection) => void
  onRemoveItem: (itemId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [showAddMenu, setShowAddMenu] = useState(false)
  
  const selectedItems = selections.filter(s => 
    category.items.some(i => i.id === s.itemId)
  )
  
  const availableItems = category.items.filter(i => 
    !selections.some(s => s.itemId === i.id)
  )
  
  const categoryTotal = selectedItems.reduce((sum, sel) => {
    const item = category.items.find(i => i.id === sel.itemId)
    if (!item) return sum
    const unitCost = globalTier === 'low' ? item.lowCost :
                     globalTier === 'mid' ? item.midCost :
                     item.highCost
    return sum + unitCost * sel.quantity
  }, 0)
  
  return (
    <div className="mb-3">
      {/* Category Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex justify-between items-center p-2 bg-neutral-50 rounded-lg mb-1.5 cursor-pointer hover:bg-gray-100"
      >
        <div>
          <h3 className="text-sm font-semibold text-navy-900">{category.name}</h3>
          <p className="text-[0.625rem] text-gray-500">{selectedItems.length} items selected</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-base font-bold text-brand-500">{formatCurrency(categoryTotal)}</div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      
      {expanded && (
        <div>
          {selectedItems.map((sel) => {
            const item = category.items.find(i => i.id === sel.itemId)
            if (!item) return null
            return (
              <RehabItemRow
                key={sel.itemId}
                item={item}
                selection={sel}
                globalTier={globalTier}
                onUpdate={(newSel) => onUpdateItem(sel.itemId, newSel)}
                onRemove={() => onRemoveItem(sel.itemId)}
              />
            )
          })}
          
          {availableItems.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="w-full py-1.5 border border-dashed border-gray-300 bg-transparent rounded-md text-gray-500 text-[0.6875rem] font-medium cursor-pointer mt-1.5 hover:border-brand-500 hover:text-brand-500 hover:bg-blue-50 transition-all"
              >
                + Add Item
              </button>
              
              {showAddMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-10 max-h-48 overflow-auto">
                  {availableItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onAddItem(item.id)
                        setShowAddMenu(false)
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left"
                    >
                      <span className="text-xs font-medium text-navy-900">{item.name}</span>
                      <span className="text-[0.625rem] text-gray-500">{formatCurrency(item.midCost)}/{item.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

interface RehabEstimatorProps {
  onEstimateChange?: (total: number) => void
  initialBudget?: number
  propertyAddress?: string
}

export default function RehabEstimator({ onEstimateChange, initialBudget = 40000, propertyAddress }: RehabEstimatorProps) {
  const [selections, setSelections] = useState<RehabSelection[]>([])
  const [contingencyPct, setContingencyPct] = useState(0.10)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [globalTier, setGlobalTier] = useState<QualityTier>('mid')
  
  const syncedSelections = useMemo(() => {
    return selections.map(s => ({ ...s, tier: globalTier }))
  }, [selections, globalTier])
  
  const estimate = useMemo(
    () => calculateRehabEstimate(syncedSelections, contingencyPct),
    [syncedSelections, contingencyPct]
  )
  
  useMemo(() => {
    onEstimateChange?.(estimate.grandTotal)
  }, [estimate.grandTotal, onEstimateChange])
  
  const handleGlobalTierChange = useCallback((tier: QualityTier) => {
    setGlobalTier(tier)
    setActivePreset(null)
  }, [])
  
  const handleAddItem = (itemId: string) => {
    let defaultQty = 1
    for (const cat of REHAB_CATEGORIES) {
      const item = cat.items.find(i => i.id === itemId)
      if (item) {
        defaultQty = item.defaultQuantity
        break
      }
    }
    setSelections([...selections, { itemId, quantity: defaultQty, tier: globalTier }])
    setActivePreset(null)
  }
  
  const handleUpdateItem = (itemId: string, selection: RehabSelection) => {
    setSelections(selections.map(s => s.itemId === itemId ? selection : s))
    setActivePreset(null)
  }
  
  const handleRemoveItem = (itemId: string) => {
    setSelections(selections.filter(s => s.itemId !== itemId))
    setActivePreset(null)
  }
  
  const handlePresetSelect = (preset: RehabPreset) => {
    setSelections(preset.selections)
    setActivePreset(preset.id)
    setGlobalTier('mid')
  }
  
  const handleClearAll = () => {
    setSelections([])
    setActivePreset(null)
    setGlobalTier('mid')
  }
  
  const budgetDiff = estimate.grandTotal - initialBudget
  const isOverBudget = budgetDiff > 0
  const budgetPct = initialBudget > 0 ? Math.abs(budgetDiff / initialBudget * 100).toFixed(0) : 0
  
  return (
    <div className="space-y-3">
      {/* Quick Start Presets */}
      <div>
        <div className="text-sm font-semibold text-navy-900 mb-2">Quick Start Presets</div>
        <div className="grid grid-cols-4 gap-2">
          {REHAB_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              onSelect={() => handlePresetSelect(preset)}
              isActive={activePreset === preset.id}
            />
          ))}
        </div>
      </div>

      {/* Quality Level */}
      <div className="bg-neutral-50 rounded-lg p-2">
        <div className="flex justify-between items-center">
          <div className="text-xs font-semibold text-gray-500">Quality Level</div>
          <QualityTabs value={globalTier} onChange={handleGlobalTierChange} />
        </div>
      </div>

      {/* Categories */}
      <div>
        {REHAB_CATEGORIES.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            selections={syncedSelections}
            globalTier={globalTier}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
          />
        ))}
      </div>

      {/* Contingency Reserve */}
      <div className="bg-amber-50 border-2 border-amber-400 rounded-lg px-3 py-2 flex justify-between items-center">
        <div>
          <h4 className="text-xs font-semibold text-amber-800">Contingency Reserve</h4>
          <p className="text-[0.625rem] text-amber-700">Buffer for unexpected costs</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={contingencyPct}
            onChange={(e) => setContingencyPct(parseFloat(e.target.value))}
            className="px-2 py-1 border border-amber-300 rounded-md bg-white text-xs"
          >
            <option value={0.05}>5%</option>
            <option value={0.10}>10%</option>
            <option value={0.15}>15%</option>
            <option value={0.20}>20%</option>
          </select>
          <span className="text-base font-bold text-amber-800">{formatCurrency(estimate.contingency)}</span>
        </div>
      </div>

      {/* Total Estimate */}
      <div className="bg-gradient-to-r from-brand-500 to-sky-600 rounded-xl px-4 py-3 flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-white mb-1">Total Estimate</h2>
          <div className="flex gap-4 text-[0.625rem] text-white/90">
            <div>Base: <span className="font-semibold">{formatCurrency(estimate.totalCost)}</span></div>
            <div>Contingency: <span className="font-semibold">{formatCurrency(estimate.contingency)}</span></div>
          </div>
          {initialBudget > 0 && (
            <div className={`mt-1.5 px-3 py-1.5 rounded-md flex items-center gap-2 text-[0.6875rem] text-white ${
              isOverBudget ? 'bg-white/20' : 'bg-white/20'
            }`}>
              {isOverBudget ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              {budgetPct}% {isOverBudget ? 'Over' : 'Under'} Budget ({formatCurrency(Math.abs(budgetDiff))})
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-white">{formatCurrency(estimate.grandTotal)}</div>
      </div>

      {/* Back Button */}
      {propertyAddress && (
        <a
          href={`/property?address=${encodeURIComponent(propertyAddress)}`}
          className="block w-full py-2.5 bg-white border-2 border-gray-200 rounded-lg text-gray-500 text-xs font-semibold text-center cursor-pointer hover:border-brand-500 hover:text-brand-500 transition-all"
        >
          ← Back to Property Analytics
        </a>
      )}

      {/* Clear All Button */}
      {selections.length > 0 && (
        <button
          onClick={handleClearAll}
          className="w-full py-2 text-xs text-crimson-500 hover:text-crimson-600 font-medium"
        >
          Clear All Items
        </button>
      )}
    </div>
  )
}
