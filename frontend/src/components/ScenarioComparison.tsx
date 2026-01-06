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
    <tr className={`border-b border-gray-100 dark:border-navy-600 ${highlight ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>
      <td className={`py-2 px-3 text-[13px] font-bold ${highlight ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-white'}`}>
        {label}
      </td>
      {values.map((value, i) => {
        const isBest = highlightBest && value === bestValue && validValues.length > 1
        return (
          <td 
            key={i} 
            className={`py-2 px-3 text-[13px] text-right font-bold ${
              isBest ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' : 
              highlight ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-white'
            }`}
          >
            {formatValue(value)}
            {isBest && <span className="ml-1 text-[10px]">★</span>}
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
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Scenario name..."
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <button onClick={onSave} className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600">
        <Check className="w-3 h-3" />
      </button>
      <button onClick={onCancel} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
        <X className="w-3 h-3" />
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-emerald-400">Scenario Comparison</h2>
          <p className="text-[13px] font-bold text-gray-600 dark:text-white">Compare different assumptions side-by-side</p>
        </div>
        
        <div className="flex items-center gap-2">
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-3 h-3" />
              Save Current
            </button>
          )}
        </div>
      </div>
      
      {/* Saved Scenarios Pills */}
      {scenarios.length > 0 && (
        <div className="bg-white dark:bg-navy-800 rounded-lg p-3 border border-[#0465f2]">
          <p className="text-[13px] font-semibold text-gray-600 dark:text-gray-300 mb-2">Saved Scenarios</p>
          <div className="flex flex-wrap gap-1.5">
            {scenarios.map(s => (
              <div 
                key={s.id} 
                className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-navy-600 rounded text-[13px]"
              >
                <span className="font-medium dark:text-white">{s.name}</span>
                <button 
                  onClick={() => handleDuplicateScenario(s)}
                  className="p-0.5 hover:bg-gray-200 rounded"
                  title="Duplicate"
                >
                  <Copy className="w-2.5 h-2.5 text-gray-500" />
                </button>
                <button 
                  onClick={() => handleDeleteScenario(s.id)}
                  className="p-0.5 hover:bg-red-100 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-2.5 h-2.5 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Comparison Table */}
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-[#0465f2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-navy-700 border-b border-gray-200 dark:border-navy-600">
                <th className="text-left py-2.5 px-3 text-[13px] font-bold text-gray-700 dark:text-white w-40">Metric</th>
                {compareScenarios.map((s, i) => (
                  <th key={s.id} className="text-right py-2.5 px-3 text-[13px] font-bold text-gray-700 dark:text-white min-w-[100px]">
                    <div className="flex items-center justify-end gap-1">
                      {i === 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] rounded">
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
              <tr className="bg-gray-50 dark:bg-navy-700">
                <td colSpan={compareScenarios.length + 1} className="py-1.5 px-3 text-[13px] font-bold text-gray-700 dark:text-white uppercase tracking-wide">
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
              <tr className="bg-gray-50 dark:bg-navy-700">
                <td colSpan={compareScenarios.length + 1} className="py-1.5 px-3 text-[13px] font-bold text-gray-700 dark:text-white uppercase tracking-wide">
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
              <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                <td colSpan={compareScenarios.length + 1} className="py-1.5 px-3 text-[13px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
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
                  <tr className="bg-gray-50 dark:bg-navy-700">
                    <td colSpan={compareScenarios.length + 1} className="py-1.5 px-3 text-[13px] font-bold text-gray-600 dark:text-white uppercase tracking-wide">
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
          className="w-full py-2 flex items-center justify-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-600 border-t border-gray-100 dark:border-navy-600"
        >
          {expandedView ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Show More Details
            </>
          )}
        </button>
      </div>
      
      {/* Best Scenario Highlight */}
      {scenarios.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg p-4 border border-[#0465f2]">
          <h3 className="text-[14px] font-bold text-gray-900 dark:text-white mb-1.5">Best Performing Scenario</h3>
          <p className="text-[14px] text-gray-700 dark:text-gray-300">
            Based on 10-year total wealth, 
            <span className="font-bold text-amber-700 dark:text-amber-400">
              {' '}{[...compareScenarios].sort((a, b) => b.summary.totalWealth - a.summary.totalWealth)[0].name}
            </span>
            {' '}generates the highest returns with{' '}
            <span className="font-bold text-gray-900 dark:text-white">
              {formatCompact([...compareScenarios].sort((a, b) => b.summary.totalWealth - a.summary.totalWealth)[0].summary.totalWealth)}
            </span>
            {' '}in total wealth.
          </p>
        </div>
      )}
      
      {/* Empty State */}
      {scenarios.length === 0 && (
        <div className="bg-white dark:bg-navy-800 rounded-lg p-6 border border-[#0465f2] text-center">
          <p className="text-[14px] font-medium text-gray-600 dark:text-gray-300">No saved scenarios yet</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400">Adjust assumptions and click "Save Current" to compare different scenarios</p>
        </div>
      )}
    </div>
  )
}
