'use client'

import { useState, useMemo } from 'react'
import {
  Zap, AlertTriangle, AlertCircle, CheckCircle, 
  ChevronDown, ChevronUp, Clock, DollarSign, 
  Home, Wrench, TrendingUp, MapPin, Flame,
  Info, Building2
} from 'lucide-react'
import {
  RehabIntelligence,
  RehabEstimate,
  PropertyInput,
  PropertyCondition,
  CapExWarning,
  getLocationFactor,
} from '@/lib/rehabIntelligence'

// ============================================
// TYPES
// ============================================

interface QuickRehabEstimateProps {
  propertyData: {
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
  onEstimateChange?: (total: number) => void
  onSwitchToDetailed?: () => void
  initialCondition?: PropertyCondition
}

// ============================================
// FORMATTING
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value)
}

// ============================================
// CONDITION SELECTOR
// ============================================

function ConditionSelector({
  value,
  onChange
}: {
  value: PropertyCondition
  onChange: (condition: PropertyCondition) => void
}) {
  const conditions: { id: PropertyCondition; label: string; description: string; color: string }[] = [
    { 
      id: 'distressed', 
      label: 'Distressed', 
      description: 'Major issues, full gut needed',
      color: 'bg-red-100 text-red-700 border-red-300'
    },
    { 
      id: 'fair', 
      label: 'Fair', 
      description: 'Functional but dated',
      color: 'bg-amber-100 text-amber-700 border-amber-300'
    },
    { 
      id: 'good', 
      label: 'Good', 
      description: 'Minor updates needed',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-300'
    },
    { 
      id: 'excellent', 
      label: 'Excellent', 
      description: 'Move-in ready',
      color: 'bg-sky-100 text-sky-700 border-sky-300'
    },
  ]
  
  return (
    <div className="grid grid-cols-4 gap-2">
      {conditions.map((cond) => (
        <button
          key={cond.id}
          onClick={() => onChange(cond.id)}
          className={`p-2 rounded-lg border-2 text-left transition-all ${
            value === cond.id
              ? `${cond.color} border-current dark:bg-opacity-20`
              : 'bg-white dark:bg-navy-700 text-gray-600 dark:text-gray-300 border-[#0465f2] hover:border-brand-400'
          }`}
        >
          <div className="text-[13px] font-semibold">{cond.label}</div>
          <div className="text-[11px] opacity-75 leading-tight">{cond.description}</div>
        </button>
      ))}
    </div>
  )
}

// ============================================
// PROPERTY CONTEXT CARD
// ============================================

function PropertyContextCard({
  estimate,
  propertyData
}: {
  estimate: RehabEstimate
  propertyData: QuickRehabEstimateProps['propertyData']
}) {
  const assetClassLabels = {
    standard: 'Standard',
    luxury: 'Luxury',
    ultra_luxury: 'Ultra-Luxury'
  }
  
  const assetClassColors = {
    standard: 'bg-gray-100 text-gray-700',
    luxury: 'bg-purple-100 text-purple-700',
    ultra_luxury: 'bg-amber-100 text-amber-700'
  }
  
  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-navy-700 dark:to-navy-600 rounded-xl p-4 space-y-3 border border-[#0465f2]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-semibold text-navy-900 dark:text-white">Property Analysis</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-semibold ${assetClassColors[estimate.asset_class]}`}>
          {assetClassLabels[estimate.asset_class]} Class
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {/* Square Footage */}
        <div className="bg-white dark:bg-navy-800 rounded-lg p-2.5 shadow-sm">
          <div className="text-[0.625rem] text-gray-500 dark:text-gray-400 mb-0.5">Square Feet</div>
          <div className="text-sm font-bold text-navy-900 dark:text-white">
            {formatNumber(propertyData.square_footage || 0)}
          </div>
        </div>
        
        {/* Year Built */}
        <div className="bg-white dark:bg-navy-800 rounded-lg p-2.5 shadow-sm">
          <div className="text-[0.625rem] text-gray-500 dark:text-gray-400 mb-0.5">Year Built</div>
          <div className="text-sm font-bold text-navy-900 dark:text-white">
            {propertyData.year_built || 'N/A'}
          </div>
        </div>
        
        {/* Property Age */}
        <div className="bg-white dark:bg-navy-800 rounded-lg p-2.5 shadow-sm">
          <div className="text-[0.625rem] text-gray-500 dark:text-gray-400 mb-0.5">Property Age</div>
          <div className="text-sm font-bold text-navy-900 dark:text-white">
            {propertyData.year_built 
              ? `${new Date().getFullYear() - propertyData.year_built} years`
              : 'N/A'
            }
          </div>
        </div>
      </div>
      
      {/* Location Factor */}
      <div className="bg-white dark:bg-navy-800 rounded-lg p-2.5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-xs text-gray-600 dark:text-gray-300">{estimate.location_market}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[0.625rem] text-gray-400">Labor Factor</span>
          <span className={`px-1.5 py-0.5 rounded text-[0.625rem] font-semibold ${
            estimate.location_factor > 1.3 
              ? 'bg-red-100 text-red-700' 
              : estimate.location_factor > 1.15 
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
          }`}>
            {estimate.location_factor > 1 ? '+' : ''}{((estimate.location_factor - 1) * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// CAPEX WARNINGS
// ============================================

function CapExWarningsCard({ warnings }: { warnings: CapExWarning[] }) {
  const [expanded, setExpanded] = useState(true)
  
  if (warnings.length === 0) return null
  
  const criticalCount = warnings.filter(w => w.priority === 'critical').length
  const highCount = warnings.filter(w => w.priority === 'high').length
  const totalCost = warnings.reduce((sum, w) => sum + w.estimated_cost, 0)
  
  const priorityColors = {
    critical: 'bg-red-50 border-red-200 text-red-700',
    high: 'bg-amber-50 border-amber-200 text-amber-700',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    low: 'bg-blue-50 border-blue-200 text-blue-700',
  }
  
  const priorityIcons = {
    critical: <AlertCircle className="w-3.5 h-3.5" />,
    high: <AlertTriangle className="w-3.5 h-3.5" />,
    medium: <Info className="w-3.5 h-3.5" />,
    low: <CheckCircle className="w-3.5 h-3.5" />,
  }
  
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-[#0465f2] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-red-800 dark:text-red-400">
            CapEx Warnings ({warnings.length})
          </span>
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[0.625rem] font-bold rounded">
              {criticalCount} Critical
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-red-700 dark:text-red-400">{formatCurrency(totalCost)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-red-400" /> : <ChevronDown className="w-4 h-4 text-red-400" />}
        </div>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {warnings.map((warning, idx) => (
            <div 
              key={idx} 
              className={`p-2.5 rounded-lg border border-[#0465f2] ${priorityColors[warning.priority]} dark:bg-navy-700`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {priorityIcons[warning.priority]}
                  <span className="text-xs font-semibold dark:text-white">{warning.item}</span>
                </div>
                <span className="text-xs font-bold dark:text-white">{formatCurrency(warning.estimated_cost)}</span>
              </div>
              <p className="text-[0.625rem] mt-1 leading-relaxed opacity-90 dark:text-gray-300">{warning.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// COST BREAKDOWN
// ============================================

function CostBreakdownCard({ estimate }: { estimate: RehabEstimate }) {
  const [expanded, setExpanded] = useState(false)
  
  const breakdown = estimate.breakdown
  
  const categories = [
    { label: 'Kitchen', value: breakdown.kitchen, icon: '🍳' },
    { label: 'Bathrooms', value: breakdown.bathrooms, icon: '🚿' },
    { label: 'Flooring', value: breakdown.flooring, icon: '🏠' },
    { label: 'Paint & Walls', value: breakdown.paint_walls, icon: '🎨' },
    { label: 'Exterior', value: breakdown.exterior, icon: '🏡' },
    { label: 'Roof', value: breakdown.roof, icon: '🔨' },
    { label: 'HVAC', value: breakdown.hvac, icon: '❄️' },
    { label: 'Electrical', value: breakdown.electrical, icon: '⚡' },
    { label: 'Plumbing', value: breakdown.plumbing, icon: '🔧' },
    { label: 'Windows & Doors', value: breakdown.windows_doors, icon: '🪟' },
    { label: 'Other', value: breakdown.other, icon: '📦' },
    { label: 'Permits', value: breakdown.permits, icon: '📋' },
  ].filter(c => c.value > 0).sort((a, b) => b.value - a.value)
  
  // Top 4 for collapsed view
  const topCategories = categories.slice(0, 4)
  const remainingCategories = categories.slice(4)
  
  return (
    <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-semibold text-navy-900 dark:text-white">Cost Breakdown</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-brand-500">{formatCurrency(breakdown.construction_total)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      
      <div className="px-3 pb-3">
        {/* Always show top categories */}
        <div className="grid grid-cols-2 gap-2">
          {topCategories.map((cat, idx) => (
            <div key={idx} className="bg-gray-50 dark:bg-navy-700 rounded-lg p-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{cat.icon}</span>
                <span className="text-[0.6875rem] text-gray-600 dark:text-gray-300">{cat.label}</span>
              </div>
              <span className="text-[0.6875rem] font-semibold text-navy-900 dark:text-white">{formatCurrency(cat.value)}</span>
            </div>
          ))}
        </div>
        
        {/* Expanded view */}
        {expanded && remainingCategories.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {remainingCategories.map((cat, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-navy-700 rounded-lg p-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{cat.icon}</span>
                  <span className="text-[0.6875rem] text-gray-600 dark:text-gray-300">{cat.label}</span>
                </div>
                <span className="text-[0.6875rem] font-semibold text-navy-900 dark:text-white">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        )}
        
        {remainingCategories.length > 0 && !expanded && (
          <div className="text-center mt-2">
            <span className="text-[0.625rem] text-gray-400">
              +{remainingCategories.length} more categories
            </span>
          </div>
        )}
        
        {/* Contingency */}
        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[0.6875rem] text-amber-700 dark:text-amber-400">Contingency (10%)</span>
          </div>
          <span className="text-[0.6875rem] font-semibold text-amber-700 dark:text-amber-400">{formatCurrency(breakdown.contingency)}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// HOLDING COSTS
// ============================================

function HoldingCostsCard({ estimate }: { estimate: RehabEstimate }) {
  const holding = estimate.holding_costs
  if (!holding) return null
  
  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-[#0465f2] rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">Holding Costs</span>
          <span className="text-[0.625rem] text-violet-500 dark:text-violet-400 font-medium">
            &quot;The Silent Killer&quot;
          </span>
        </div>
        <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{formatCurrency(holding.total_holding)}</span>
      </div>
      
      <div className="bg-white/70 dark:bg-navy-700/70 rounded-lg p-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[0.6875rem] text-violet-600 dark:text-violet-400">Estimated Timeline</span>
          <span className="text-sm font-bold text-violet-800 dark:text-violet-300">{holding.duration_months} months</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-[0.625rem]">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Interest</span>
            <span className="font-medium text-gray-700 dark:text-white">{formatCurrency(holding.monthly_interest)}/mo</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Taxes</span>
            <span className="font-medium text-gray-700 dark:text-white">{formatCurrency(holding.monthly_taxes)}/mo</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Insurance</span>
            <span className="font-medium text-gray-700 dark:text-white">{formatCurrency(holding.monthly_insurance)}/mo</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Utilities</span>
            <span className="font-medium text-gray-700 dark:text-white">{formatCurrency(holding.monthly_utilities)}/mo</span>
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-violet-200 dark:border-violet-700 flex justify-between">
          <span className="text-[0.6875rem] font-medium text-violet-600 dark:text-violet-400">Monthly Burn Rate</span>
          <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{formatCurrency(holding.monthly_total)}/mo</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function QuickRehabEstimate({
  propertyData,
  onEstimateChange,
  onSwitchToDetailed,
  initialCondition = 'fair'
}: QuickRehabEstimateProps) {
  const [condition, setCondition] = useState<PropertyCondition>(initialCondition)
  const [contingencyPct, setContingencyPct] = useState(0.10)
  const [includeHolding, setIncludeHolding] = useState(true)
  
  // Generate estimate
  const estimate = useMemo(() => {
    const ri = new RehabIntelligence({
      sq_ft: propertyData.square_footage || 1500,
      year_built: propertyData.year_built || 2000,
      arv: propertyData.arv || propertyData.current_value_avm || 400000,
      zip_code: propertyData.zip_code || '33401',
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      condition,
      has_pool: propertyData.has_pool,
      roof_type: propertyData.roof_type as PropertyInput['roof_type'],
      stories: propertyData.stories,
      garage_spaces: propertyData.garage_spaces,
      lot_sqft: propertyData.lot_size,
      hoa_monthly: propertyData.hoa_monthly,
    })
    
    return ri.calculate({
      contingencyPct,
      includeHoldingCosts: includeHolding,
    })
  }, [propertyData, condition, contingencyPct, includeHolding])
  
  // Notify parent of estimate changes
  useMemo(() => {
    onEstimateChange?.(estimate.total_rehab)
  }, [estimate.total_rehab, onEstimateChange])
  
  return (
    <div className="space-y-4">
      {/* Header with AI badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-brand-500 to-sky-500 rounded-lg">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy-900 dark:text-white">Quick Estimate</h3>
            <p className="text-[0.625rem] text-gray-500 dark:text-gray-400">AI-powered rehab analysis</p>
          </div>
        </div>
        {onSwitchToDetailed && (
          <button
            onClick={onSwitchToDetailed}
            className="px-3 py-1.5 text-[0.6875rem] font-medium text-brand-500 border border-brand-200 dark:border-brand-700 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
          >
            Switch to Detailed Mode
          </button>
        )}
      </div>
      
      {/* Property Context */}
      <PropertyContextCard estimate={estimate} propertyData={propertyData} />
      
      {/* Condition Selector */}
      <div>
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Property Condition</label>
        <ConditionSelector value={condition} onChange={setCondition} />
      </div>
      
      {/* CapEx Warnings */}
      <CapExWarningsCard warnings={estimate.capex_warnings} />
      
      {/* Cost Breakdown */}
      <CostBreakdownCard estimate={estimate} />
      
      {/* Holding Costs */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeHolding}
            onChange={(e) => setIncludeHolding(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-500 focus:ring-brand-500 dark:bg-navy-700"
          />
          <span className="text-xs text-gray-600 dark:text-gray-300">Include holding costs</span>
        </label>
      </div>
      
      {includeHolding && <HoldingCostsCard estimate={estimate} />}
      
      {/* Contingency Selector */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-[#0465f2] rounded-lg p-3 flex justify-between items-center">
        <div>
          <h4 className="text-xs font-semibold text-amber-800 dark:text-amber-400">Contingency Reserve</h4>
          <p className="text-[0.625rem] text-amber-600 dark:text-amber-500">Buffer for unexpected costs</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={contingencyPct}
            onChange={(e) => setContingencyPct(parseFloat(e.target.value))}
            className="px-2 py-1 border border-amber-300 dark:border-amber-700 rounded-md bg-white dark:bg-navy-700 dark:text-white text-xs"
          >
            <option value={0.05}>5%</option>
            <option value={0.10}>10%</option>
            <option value={0.15}>15%</option>
            <option value={0.20}>20%</option>
          </select>
          <span className="text-sm font-bold text-amber-800 dark:text-amber-400">{formatCurrency(estimate.breakdown.contingency)}</span>
        </div>
      </div>
      
      {/* Total Summary */}
      <div className="bg-gradient-to-r from-brand-500 to-sky-600 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-white">Total Rehab Estimate</h2>
            <div className="flex gap-3 text-[0.625rem] text-white/80 mt-0.5">
              <span>Base: {formatCurrency(estimate.breakdown.construction_total)}</span>
              <span>+</span>
              <span>Contingency: {formatCurrency(estimate.breakdown.contingency)}</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(estimate.total_rehab)}</div>
        </div>
        
        {includeHolding && estimate.holding_costs && (
          <div className="pt-2 border-t border-white/20">
            <div className="flex justify-between items-center">
              <div className="text-white/90 text-xs">
                <span className="font-medium">Total Project Cost</span>
                <span className="text-white/70 ml-2">(Rehab + {estimate.holding_costs.duration_months}mo Holding)</span>
              </div>
              <div className="text-xl font-bold text-white">{formatCurrency(estimate.total_project_cost)}</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        {onSwitchToDetailed && (
          <button
            onClick={onSwitchToDetailed}
            className="flex-1 py-2.5 bg-white dark:bg-navy-700 border-2 border-brand-500 text-brand-500 rounded-lg text-xs font-semibold hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors flex items-center justify-center gap-2"
          >
            <Wrench className="w-3.5 h-3.5" />
            Customize Line Items
          </button>
        )}
      </div>
    </div>
  )
}

