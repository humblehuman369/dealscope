'use client'

import { useState, useMemo } from 'react'
import {
  Hammer, Plus, Minus, Trash2, ChevronDown, ChevronUp,
  Calculator, DollarSign, AlertTriangle, CheckCircle, Sparkles
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
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        isActive
          ? 'border-orange-500 bg-orange-50 shadow-lg'
          : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow'
      }`}
    >
      <div className="font-bold text-gray-900">{preset.name}</div>
      <div className="text-sm text-gray-500 mb-2">{preset.description}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{formatCurrency(preset.estimatedCost.low)}</span>
        <span className="text-xs text-gray-400">-</span>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{formatCurrency(preset.estimatedCost.high)}</span>
      </div>
    </button>
  )
}

// ============================================
// TIER SELECTOR
// ============================================

function TierSelector({
  value,
  onChange,
  lowCost,
  midCost,
  highCost
}: {
  value: 'low' | 'mid' | 'high'
  onChange: (tier: 'low' | 'mid' | 'high') => void
  lowCost: number
  midCost: number
  highCost: number
}) {
  const tiers = [
    { id: 'low', label: 'Budget', cost: lowCost, color: 'blue' },
    { id: 'mid', label: 'Standard', cost: midCost, color: 'purple' },
    { id: 'high', label: 'Premium', cost: highCost, color: 'orange' },
  ]
  
  return (
    <div className="flex gap-1">
      {tiers.map((tier) => (
        <button
          key={tier.id}
          onClick={() => onChange(tier.id as any)}
          className={`px-2 py-1 text-xs rounded-lg transition-all ${
            value === tier.id
              ? `bg-${tier.color}-500 text-white`
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={{
            backgroundColor: value === tier.id 
              ? tier.color === 'blue' ? '#3b82f6' 
              : tier.color === 'purple' ? '#8b5cf6' 
              : '#f97316'
              : undefined
          }}
        >
          {tier.label}
        </button>
      ))}
    </div>
  )
}

// ============================================
// REHAB ITEM ROW
// ============================================

function RehabItemRow({
  item,
  selection,
  onUpdate,
  onRemove
}: {
  item: RehabItem
  selection: RehabSelection
  onUpdate: (sel: RehabSelection) => void
  onRemove: () => void
}) {
  const unitCost = selection.tier === 'low' ? item.lowCost :
                   selection.tier === 'mid' ? item.midCost :
                   item.highCost
  const total = unitCost * selection.quantity
  
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <div className="font-medium text-gray-900 text-sm">{item.name}</div>
        <div className="text-xs text-gray-500">{formatCurrency(unitCost)}/{item.unit}</div>
      </div>
      
      <TierSelector
        value={selection.tier}
        onChange={(tier) => onUpdate({ ...selection, tier })}
        lowCost={item.lowCost}
        midCost={item.midCost}
        highCost={item.highCost}
      />
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdate({ ...selection, quantity: Math.max(0, selection.quantity - 1) })}
          className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
        >
          <Minus className="w-3 h-3" />
        </button>
        <input
          type="number"
          value={selection.quantity}
          onChange={(e) => onUpdate({ ...selection, quantity: Math.max(0, parseInt(e.target.value) || 0) })}
          className="w-16 text-center text-sm font-medium border border-gray-200 rounded-lg py-1"
        />
        <button
          onClick={() => onUpdate({ ...selection, quantity: selection.quantity + 1 })}
          className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      
      <div className="w-24 text-right">
        <div className="font-bold text-gray-900">{formatCurrency(total)}</div>
      </div>
      
      <button
        onClick={onRemove}
        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
      >
        <Trash2 className="w-4 h-4" />
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
  onAddItem,
  onUpdateItem,
  onRemoveItem
}: {
  category: RehabCategory
  selections: RehabSelection[]
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
    const unitCost = sel.tier === 'low' ? item.lowCost :
                     sel.tier === 'mid' ? item.midCost :
                     item.highCost
    return sum + unitCost * sel.quantity
  }, 0)
  
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category.icon}</span>
          <div className="text-left">
            <div className="font-bold text-gray-900">{category.name}</div>
            <div className="text-sm text-gray-500">{selectedItems.length} items selected</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-bold text-gray-900">{formatCurrency(categoryTotal)}</div>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>
      
      {expanded && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-2">
          {selectedItems.map((sel) => {
            const item = category.items.find(i => i.id === sel.itemId)
            if (!item) return null
            return (
              <RehabItemRow
                key={sel.itemId}
                item={item}
                selection={sel}
                onUpdate={(newSel) => onUpdateItem(sel.itemId, newSel)}
                onRemove={() => onRemoveItem(sel.itemId)}
              />
            )
          })}
          
          {availableItems.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
              
              {showAddMenu && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-10 max-h-48 overflow-auto">
                  {availableItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onAddItem(item.id)
                        setShowAddMenu(false)
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      <span className="text-xs text-gray-500">{formatCurrency(item.midCost)}/{item.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {selectedItems.length === 0 && availableItems.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              No items in this category
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
}

export default function RehabEstimator({ onEstimateChange, initialBudget = 40000 }: RehabEstimatorProps) {
  const [selections, setSelections] = useState<RehabSelection[]>([])
  const [contingencyPct, setContingencyPct] = useState(0.10)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  
  const estimate = useMemo(
    () => calculateRehabEstimate(selections, contingencyPct),
    [selections, contingencyPct]
  )
  
  // Notify parent of changes
  useMemo(() => {
    onEstimateChange?.(estimate.grandTotal)
  }, [estimate.grandTotal, onEstimateChange])
  
  const handleAddItem = (itemId: string) => {
    // Find the item to get default quantity
    let defaultQty = 1
    for (const cat of REHAB_CATEGORIES) {
      const item = cat.items.find(i => i.id === itemId)
      if (item) {
        defaultQty = item.defaultQuantity
        break
      }
    }
    
    setSelections([...selections, { itemId, quantity: defaultQty, tier: 'mid' }])
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
  }
  
  const handleClearAll = () => {
    setSelections([])
    setActivePreset(null)
  }
  
  const budgetDiff = initialBudget - estimate.grandTotal
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
            <Hammer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Rehab Estimator</h2>
            <p className="text-sm text-gray-500">Build your renovation budget item by item</p>
          </div>
        </div>
        
        {selections.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Presets */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Quick Start Presets</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {/* Categories */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Detailed Breakdown</h3>
        {REHAB_CATEGORIES.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            selections={selections}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
          />
        ))}
      </div>

      {/* Contingency */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <div className="font-semibold text-gray-900">Contingency Reserve</div>
              <div className="text-sm text-gray-500">Buffer for unexpected costs</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={contingencyPct}
              onChange={(e) => setContingencyPct(parseFloat(e.target.value))}
              className="px-3 py-2 border border-amber-300 rounded-lg bg-white text-sm"
            >
              <option value={0.05}>5%</option>
              <option value={0.10}>10%</option>
              <option value={0.15}>15%</option>
              <option value={0.20}>20%</option>
            </select>
            <div className="text-xl font-bold text-amber-700">
              {formatCurrency(estimate.contingency)}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            <h3 className="text-lg font-bold">Total Estimate</h3>
          </div>
          <div className="text-4xl font-black">{formatCurrency(estimate.grandTotal)}</div>
        </div>
        
        {/* Breakdown */}
        {estimate.breakdown.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {estimate.breakdown.slice(0, 4).map((b) => (
              <div key={b.category} className="bg-white/20 rounded-lg p-3">
                <div className="text-sm text-orange-100">{b.category}</div>
                <div className="font-bold">{formatCurrency(b.cost)}</div>
              </div>
            ))}
          </div>
        )}
        
        {/* Budget Comparison */}
        <div className={`p-4 rounded-xl ${budgetDiff >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {budgetDiff >= 0 ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span>vs. Budget ({formatCurrency(initialBudget)})</span>
            </div>
            <div className="text-xl font-bold">
              {budgetDiff >= 0 ? '+' : ''}{formatCurrency(budgetDiff)}
              <span className="text-sm font-normal ml-2">
                {budgetDiff >= 0 ? 'under' : 'over'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {selections.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <Hammer className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No items selected</p>
          <p className="text-sm text-gray-400">Choose a preset above or add items manually</p>
        </div>
      )}
    </div>
  )
}
