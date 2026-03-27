'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus, Minus, Trash2, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, ArrowLeft, Zap, Wrench
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
import QuickRehabEstimate from './QuickRehabEstimate'

type QualityTier = 'low' | 'mid' | 'high'
type EstimatorMode = 'quick' | 'detailed'

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
      className="rounded-lg p-2 cursor-pointer transition-all text-left"
      style={{
        backgroundColor: isActive ? 'var(--surface-elevated)' : 'var(--surface-card)',
        border: isActive ? '2px solid var(--accent-sky)' : '2px solid var(--border-default)',
      }}
    >
      <div className="text-base font-semibold mb-1" style={{ color: 'var(--accent-sky)' }}>{preset.name}</div>
      <div className="text-sm mb-1 leading-tight" style={{ color: 'var(--text-heading)' }}>{preset.description}</div>
      <div className="text-lg font-bold" style={{ color: 'var(--accent-sky)' }}>{formatCurrency(preset.estimatedCost.mid)}</div>
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
          className="px-2.5 py-1 rounded-md text-[15px] font-semibold cursor-pointer transition-all"
          style={{
            backgroundColor: value === tier.id ? 'var(--accent-sky)' : 'var(--surface-card)',
            color: value === tier.id ? '#FFFFFF' : 'var(--text-secondary)',
            border: value === tier.id ? '1px solid var(--accent-sky)' : '1px solid var(--border-default)',
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
    <div
      className="grid grid-cols-[2fr_auto_auto_1fr_auto] sm:grid-cols-[2fr_0.8fr_0.8fr_0.8fr_auto_auto_1fr_auto] gap-1.5 items-center py-1.5 px-2 text-sm transition-colors"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      {/* Item Name */}
      <div>
        <div className="font-medium" style={{ color: 'var(--text-heading)' }}>{item.name}</div>
        <div className="text-xs" style={{ color: 'var(--text-heading)' }}>{formatCurrency(unitCost)}/{item.unit}</div>
      </div>
      
      {/* Quality Badges */}
      {(['low', 'mid', 'high'] as const).map((tier) => (
        <div
          key={tier}
          className="hidden sm:block py-0.5 px-1.5 rounded text-xs font-semibold text-center"
          style={{
            backgroundColor: globalTier === tier ? 'var(--surface-elevated)' : 'transparent',
            color: 'var(--accent-sky)',
            border: globalTier === tier ? '1px solid var(--accent-sky)' : '1px solid transparent',
          }}
        >
          {tier === 'low' ? 'Budget' : tier === 'mid' ? 'Standard' : 'Premium'}
        </div>
      ))}
      
      {/* Quantity Input */}
      <input
        type="number"
        value={selection.quantity}
        onChange={(e) => onUpdate({ ...selection, quantity: Math.max(0, parseInt(e.target.value) || 0) })}
        className="w-14 px-1.5 py-1 rounded-md text-[13px] text-center focus:outline-none"
        style={{
          backgroundColor: 'var(--surface-input)',
          color: 'var(--text-heading)',
          border: '1px solid var(--border-default)',
        }}
      />
      
      {/* Minus Button */}
      <button
        onClick={() => onUpdate({ ...selection, quantity: Math.max(0, selection.quantity - 1) })}
        className="w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)',
        }}
      >
        <Minus className="w-3 h-3" />
      </button>
      
      {/* Total */}
      <div className="font-bold text-right" style={{ color: 'var(--text-heading)' }}>{formatCurrency(total)}</div>
      
      {/* Delete */}
      <button
        onClick={onRemove}
        className="cursor-pointer text-sm text-crimson-500 hover:text-crimson-600"
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
        className="w-full flex justify-between items-center p-2 rounded-lg mb-1.5 cursor-pointer transition-colors"
        style={{ background: 'radial-gradient(ellipse at 30% 0%, var(--color-teal-dim) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, var(--color-teal-dim) 0%, transparent 50%), var(--surface-base)' }}
      >
        <div className="text-left pl-2">
          <h3 className="text-base font-semibold" style={{ color: 'var(--accent-sky)' }}>{category.name}</h3>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedItems.length} items selected</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold" style={{ color: 'var(--accent-sky)' }}>{formatCurrency(categoryTotal)}</div>
          {expanded
            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-heading)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-heading)' }} />
          }
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
                className="w-full py-1.5 border border-dashed rounded-md text-[15px] font-medium cursor-pointer mt-1.5 transition-all"
                style={{
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent',
                }}
              >
                + Add Item
              </button>
              
              {showAddMenu && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-10 max-h-48 overflow-auto"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  {availableItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onAddItem(item.id)
                        setShowAddMenu(false)
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 last:border-0 text-left transition-colors"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <span className="text-base font-medium" style={{ color: 'var(--text-heading)' }}>{item.name}</span>
                      <span className="text-sm" style={{ color: 'var(--text-heading)' }}>{formatCurrency(item.midCost)}/{item.unit}</span>
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
// MODE TOGGLE
// ============================================

function ModeToggle({
  mode,
  onModeChange
}: {
  mode: EstimatorMode
  onModeChange: (mode: EstimatorMode) => void
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
      <button
        onClick={() => onModeChange('quick')}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all"
        style={{
          backgroundColor: mode === 'quick' ? 'var(--surface-card)' : 'transparent',
          color: mode === 'quick' ? 'var(--accent-sky)' : 'var(--text-secondary)',
          boxShadow: mode === 'quick' ? 'var(--shadow-card)' : 'none',
        }}
      >
        <Zap className="w-3.5 h-3.5" />
        Quick Estimate
      </button>
      <button
        onClick={() => onModeChange('detailed')}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all"
        style={{
          backgroundColor: mode === 'detailed' ? 'var(--surface-card)' : 'transparent',
          color: mode === 'detailed' ? 'var(--accent-sky)' : 'var(--text-secondary)',
          boxShadow: mode === 'detailed' ? 'var(--shadow-card)' : 'none',
        }}
      >
        <Wrench className="w-3.5 h-3.5" />
        Detailed Builder
      </button>
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
  propertyData?: {
    square_footage?: number
    year_built?: number
    arv?: number
    current_value_avm?: number
    zip_code?: string
    bedrooms?: number
    bathrooms?: number
    has_pool?: boolean
    roof_type?: string
    stories?: number
    garage_spaces?: number
    lot_size?: number
    hoa_monthly?: number
  }
  initialMode?: EstimatorMode
}

export default function RehabEstimator({ 
  onEstimateChange, 
  initialBudget = 40000, 
  propertyAddress,
  propertyData,
  initialMode = 'quick'
}: RehabEstimatorProps) {
  const [mode, setMode] = useState<EstimatorMode>(propertyData ? initialMode : 'detailed')
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
  
  if (mode === 'quick' && propertyData) {
    return (
      <div className="space-y-4">
        <ModeToggle mode={mode} onModeChange={setMode} />
        
        <QuickRehabEstimate
          propertyData={propertyData}
          onEstimateChange={onEstimateChange}
          onSwitchToDetailed={() => setMode('detailed')}
        />
        
        {propertyAddress && (
          <a
            href={`/property?address=${encodeURIComponent(propertyAddress)}`}
            className="block w-full py-2.5 rounded-lg text-[13px] font-semibold text-center cursor-pointer transition-all"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-secondary)',
              border: '2px solid var(--border-default)',
            }}
          >
            ← Back to Property Analytics
          </a>
        )}
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      {propertyData && (
        <ModeToggle mode={mode} onModeChange={setMode} />
      )}
      
      {/* Quick Start Presets */}
      <div>
        <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>Quick Start Presets</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
      <div className="rounded-lg p-2" style={{ background: 'radial-gradient(ellipse at 30% 0%, var(--color-teal-dim) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, var(--color-teal-dim) 0%, transparent 50%), var(--surface-base)' }}>
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold" style={{ color: 'var(--accent-sky)' }}>Quality Level</div>
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
      <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-lg px-3 py-2 flex justify-between items-center">
        <div>
          <h4 className="text-base font-semibold text-amber-800 dark:text-amber-400">Contingency Reserve</h4>
          <p className="text-sm text-amber-700 dark:text-amber-500">Buffer for unexpected costs</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={contingencyPct}
            onChange={(e) => setContingencyPct(parseFloat(e.target.value))}
            className="px-2 py-1 rounded-md text-sm"
            style={{
              backgroundColor: 'var(--surface-input)',
              color: 'var(--text-heading)',
              border: '1px solid var(--border-default)',
            }}
          >
            <option value={0.05}>5%</option>
            <option value={0.10}>10%</option>
            <option value={0.15}>15%</option>
            <option value={0.20}>20%</option>
          </select>
          <span className="text-lg font-bold text-amber-800 dark:text-amber-400">{formatCurrency(estimate.contingency)}</span>
        </div>
      </div>

      {/* Total Estimate */}
      <div className="rounded-xl px-4 py-3 flex justify-between items-center" style={{ background: 'radial-gradient(ellipse at 30% 0%, var(--color-teal-dim) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, var(--color-teal-dim) 0%, transparent 50%), var(--surface-base)' }}>
        <div>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--accent-sky)' }}>Total Estimate</h2>
          <div className="flex gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div>Base: <span className="font-semibold">{formatCurrency(estimate.totalCost)}</span></div>
            <div>Contingency: <span className="font-semibold">{formatCurrency(estimate.contingency)}</span></div>
          </div>
          {initialBudget > 0 && (
            <div className="mt-1.5 px-3 py-1.5 rounded-md flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border-default)' }}>
              {isOverBudget ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              {budgetPct}% {isOverBudget ? 'Over' : 'Under'} Budget ({formatCurrency(Math.abs(budgetDiff))})
            </div>
          )}
        </div>
        <div className="text-3xl font-bold" style={{ color: 'var(--accent-sky)' }}>{formatCurrency(estimate.grandTotal)}</div>
      </div>

      {/* Back Button */}
      {propertyAddress && (
        <a
          href={`/property?address=${encodeURIComponent(propertyAddress)}`}
          className="block w-full py-2.5 rounded-lg text-[13px] font-semibold text-center cursor-pointer transition-all"
          style={{
            backgroundColor: 'var(--surface-card)',
            color: 'var(--text-secondary)',
            border: '2px solid var(--border-default)',
          }}
        >
          ← Back to Property Analytics
        </a>
      )}

      {/* Clear All Button */}
      {selections.length > 0 && (
        <button
          onClick={handleClearAll}
          className="w-full py-2 text-sm text-crimson-500 hover:text-crimson-600 font-medium"
        >
          Clear All Items
        </button>
      )}
    </div>
  )
}
