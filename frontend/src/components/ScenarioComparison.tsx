'use client'

import { useState, useEffect } from 'react'
import {
  Plus, Trash2, Save, Edit2, Check, X, Copy,
  TrendingUp, DollarSign, Percent, PiggyBank, Award,
  ChevronDown, ChevronUp, BarChart3
} from 'lucide-react'
import {
  Scenario,
  ProjectionAssumptions,
  createScenario,
  saveScenarios,
  loadScenarios,
  getDefaultProjectionAssumptions
} from '@/lib/projections'

// ============================================
// FORMATTING
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', 
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)
}

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`

const formatCompact = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return formatCurrency(value)
}

// ============================================
// COMPARISON TABLE ROW
// ============================================

function ComparisonRow({
  label,
  values,
  format = 'currency',
  highlight = false,
  highlightBest = false
}: {
  label: string
  values: (number | null)[]
  format?: 'currency' | 'percent' | 'compact' | 'number' | 'multiple'
  highlight?: boolean
  highlightBest?: boolean
}) {
  const formatValue = (v: number | null) => {
    if (v === null) return '—'
    switch (format) {
      case 'currency': return formatCurrency(v)
      case 'percent': return formatPercent(v)
      case 'compact': return formatCompact(v)
      case 'multiple': return `${v.toFixed(1)}x`
      default: return v.toLocaleString()
    }
  }
  
  // Find best value (highest for most metrics)
  const validValues = values.filter((v): v is number => v !== null)
  const bestValue = highlightBest && validValues.length > 1 ? Math.max(...validValues) : null
  
  return (
    <tr className={`border-b border-gray-100 ${highlight ? 'bg-emerald-50' : ''}`}>
      <td className={`py-3 px-4 text-sm ${highlight ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
        {label}
      </td>
      {values.map((value, i) => {
        const isBest = highlightBest && value === bestValue && validValues.length > 1
        return (
          <td 
            key={i} 
            className={`py-3 px-4 text-sm text-right font-medium ${
              isBest ? 'text-emerald-600 bg-emerald-100' : 
              highlight ? 'text-gray-900' : 'text-gray-700'
            }`}
          >
            {formatValue(value)}
            {isBest && <span className="ml-1">★</span>}
          </td>
        )
      })}
    </tr>
  )
}

// ============================================
// SCENARIO CARD (for saving)
// ============================================

function ScenarioNameInput({
  value,
  onChange,
  onSave,
  onCancel
}: {
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Scenario name..."
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <button onClick={onSave} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={onCancel} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ============================================
// MAIN COMPARISON COMPONENT
// ============================================

interface ScenarioComparisonProps {
  currentAssumptions: ProjectionAssumptions
  propertyAddress?: string
}

export default function ScenarioComparison({ 
  currentAssumptions, 
  propertyAddress = 'Current Property'
}: ScenarioComparisonProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newScenarioName, setNewScenarioName] = useState('')
  const [expandedView, setExpandedView] = useState(false)
  
  // Load saved scenarios on mount
  useEffect(() => {
    setScenarios(loadScenarios())
  }, [])
  
  // Create current scenario for comparison
  const currentScenario = createScenario('Current', currentAssumptions)
  
  // Get scenarios to compare (current + saved, max 4)
  const compareScenarios = [currentScenario, ...scenarios].slice(0, 4)
  
  const handleSaveScenario = () => {
    if (!newScenarioName.trim()) return
    
    const scenario = createScenario(newScenarioName.trim(), currentAssumptions)
    const updated = [...scenarios, scenario]
    setScenarios(updated)
    saveScenarios(updated)
    setShowSaveDialog(false)
    setNewScenarioName('')
  }
  
  const handleDeleteScenario = (id: string) => {
    const updated = scenarios.filter(s => s.id !== id)
    setScenarios(updated)
    saveScenarios(updated)
  }
  
  const handleDuplicateScenario = (scenario: Scenario) => {
    const duplicate = createScenario(`${scenario.name} (Copy)`, scenario.assumptions)
    const updated = [...scenarios, duplicate]
    setScenarios(updated)
    saveScenarios(updated)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Scenario Comparison</h2>
            <p className="text-sm text-gray-500">Compare different assumptions side-by-side</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {showSaveDialog ? (
            <ScenarioNameInput
              value={newScenarioName}
              onChange={setNewScenarioName}
              onSave={handleSaveScenario}
              onCancel={() => setShowSaveDialog(false)}
            />
          ) : (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Current
            </button>
          )}
        </div>
      </div>
      
      {/* Saved Scenarios Pills */}
      {scenarios.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {scenarios.map(s => (
            <div 
              key={s.id} 
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
            >
              <span className="font-medium">{s.name}</span>
              <button 
                onClick={() => handleDuplicateScenario(s)}
                className="p-1 hover:bg-gray-200 rounded-full"
                title="Duplicate"
              >
                <Copy className="w-3 h-3 text-gray-500" />
              </button>
              <button 
                onClick={() => handleDeleteScenario(s.id)}
                className="p-1 hover:bg-red-100 rounded-full"
                title="Delete"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Comparison Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-700 w-48">Metric</th>
                {compareScenarios.map((s, i) => (
                  <th key={s.id} className="text-right py-4 px-4 font-semibold text-gray-700 min-w-[140px]">
                    <div className="flex items-center justify-end gap-2">
                      {i === 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Current
                        </span>
                      )}
                      <span>{s.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Key Assumptions */}
              <tr className="bg-gray-50">
                <td colSpan={compareScenarios.length + 1} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Key Assumptions
                </td>
              </tr>
              <ComparisonRow
                label="Purchase Price"
                values={compareScenarios.map(s => s.assumptions.purchasePrice)}
                format="compact"
              />
              <ComparisonRow
                label="Down Payment"
                values={compareScenarios.map(s => s.assumptions.downPaymentPct)}
                format="percent"
              />
              <ComparisonRow
                label="Interest Rate"
                values={compareScenarios.map(s => s.assumptions.interestRate)}
                format="percent"
              />
              <ComparisonRow
                label="Monthly Rent"
                values={compareScenarios.map(s => s.assumptions.monthlyRent)}
                format="currency"
              />
              <ComparisonRow
                label="Appreciation Rate"
                values={compareScenarios.map(s => s.assumptions.annualAppreciation)}
                format="percent"
              />
              
              {/* Year 1 Performance */}
              <tr className="bg-gray-50">
                <td colSpan={compareScenarios.length + 1} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Year 1 Performance
                </td>
              </tr>
              <ComparisonRow
                label="Cash Required"
                values={compareScenarios.map(s => s.summary.totalCashInvested)}
                format="compact"
              />
              <ComparisonRow
                label="Annual Cash Flow"
                values={compareScenarios.map(s => s.projections[0].cashFlow)}
                format="currency"
                highlightBest
              />
              <ComparisonRow
                label="Cash-on-Cash Return"
                values={compareScenarios.map(s => s.projections[0].cashOnCash)}
                format="percent"
                highlightBest
              />
              
              {/* 10-Year Summary */}
              <tr className="bg-emerald-50">
                <td colSpan={compareScenarios.length + 1} className="py-2 px-4 text-xs font-bold text-emerald-700 uppercase tracking-wide">
                  10-Year Summary
                </td>
              </tr>
              <ComparisonRow
                label="Total Cash Flow"
                values={compareScenarios.map(s => s.summary.totalCashFlow)}
                format="compact"
                highlightBest
              />
              <ComparisonRow
                label="Total Equity (Year 10)"
                values={compareScenarios.map(s => s.projections[9].totalEquity)}
                format="compact"
                highlightBest
              />
              <ComparisonRow
                label="Total Wealth"
                values={compareScenarios.map(s => s.summary.totalWealth)}
                format="compact"
                highlight
                highlightBest
              />
              <ComparisonRow
                label="Equity Multiple"
                values={compareScenarios.map(s => s.summary.equityMultiple)}
                format="multiple"
                highlight
                highlightBest
              />
              <ComparisonRow
                label="IRR"
                values={compareScenarios.map(s => s.summary.irr)}
                format="percent"
                highlight
                highlightBest
              />
              
              {/* Extended View */}
              {expandedView && (
                <>
                  <tr className="bg-gray-50">
                    <td colSpan={compareScenarios.length + 1} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Year 5 Snapshot
                    </td>
                  </tr>
                  <ComparisonRow
                    label="Property Value"
                    values={compareScenarios.map(s => s.projections[4].propertyValue)}
                    format="compact"
                  />
                  <ComparisonRow
                    label="Loan Balance"
                    values={compareScenarios.map(s => s.projections[4].loanBalance)}
                    format="compact"
                  />
                  <ComparisonRow
                    label="Cumulative Cash Flow"
                    values={compareScenarios.map(s => s.projections[4].cumulativeCashFlow)}
                    format="compact"
                  />
                  <ComparisonRow
                    label="Total Equity"
                    values={compareScenarios.map(s => s.projections[4].totalEquity)}
                    format="compact"
                  />
                </>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpandedView(!expandedView)}
          className="w-full py-3 flex items-center justify-center gap-2 text-sm text-gray-500 hover:bg-gray-50 border-t border-gray-100"
        >
          {expandedView ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show More Details
            </>
          )}
        </button>
      </div>
      
      {/* Best Scenario Highlight */}
      {scenarios.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Best Performing Scenario</h3>
              <p className="text-sm text-gray-600">
                Based on 10-year total wealth, 
                <span className="font-semibold text-amber-700">
                  {' '}{[...compareScenarios].sort((a, b) => b.summary.totalWealth - a.summary.totalWealth)[0].name}
                </span>
                {' '}generates the highest returns with{' '}
                <span className="font-semibold">
                  {formatCompact([...compareScenarios].sort((a, b) => b.summary.totalWealth - a.summary.totalWealth)[0].summary.totalWealth)}
                </span>
                {' '}in total wealth.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {scenarios.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No saved scenarios yet</p>
          <p className="text-sm">Adjust assumptions and click "Save Current" to compare different scenarios</p>
        </div>
      )}
    </div>
  )
}
