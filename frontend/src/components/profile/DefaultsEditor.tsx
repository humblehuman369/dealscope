'use client'

/**
 * DefaultsEditor Component
 * 
 * Allows authenticated users to customize their default investment assumptions.
 * These preferences are saved to their profile and used across all calculations.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useUserAssumptions } from '@/hooks/useDefaults'
import { defaultsService } from '@/services/defaults'
import type { AllAssumptions } from '@/stores/index'

interface SliderConfig {
  key: string
  category: keyof AllAssumptions
  field: string
  label: string
  description: string
  min: number
  max: number
  step: number
  isPercentage?: boolean
  isCurrency?: boolean
  suffix?: string
}

const EDITABLE_DEFAULTS: SliderConfig[] = [
  // Financing
  {
    key: 'financing.down_payment_pct',
    category: 'financing',
    field: 'down_payment_pct',
    label: 'Default Down Payment',
    description: 'Your typical down payment percentage',
    min: 0.05,
    max: 0.50,
    step: 0.05,
    isPercentage: true,
  },
  {
    key: 'financing.interest_rate',
    category: 'financing',
    field: 'interest_rate',
    label: 'Expected Interest Rate',
    description: 'Your expected mortgage rate',
    min: 0.04,
    max: 0.12,
    step: 0.0025,
    isPercentage: true,
  },
  {
    key: 'financing.closing_costs_pct',
    category: 'financing',
    field: 'closing_costs_pct',
    label: 'Closing Costs',
    description: 'Estimated closing costs percentage',
    min: 0.02,
    max: 0.05,
    step: 0.005,
    isPercentage: true,
  },
  // Operating
  {
    key: 'operating.vacancy_rate',
    category: 'operating',
    field: 'vacancy_rate',
    label: 'Vacancy Rate',
    description: 'Expected vacancy in your market',
    min: 0,
    max: 0.15,
    step: 0.01,
    isPercentage: true,
  },
  {
    key: 'operating.property_management_pct',
    category: 'operating',
    field: 'property_management_pct',
    label: 'Property Management',
    description: 'Management fee (0% if self-managed)',
    min: 0,
    max: 0.15,
    step: 0.01,
    isPercentage: true,
  },
  {
    key: 'operating.maintenance_pct',
    category: 'operating',
    field: 'maintenance_pct',
    label: 'Maintenance Reserve',
    description: 'Annual maintenance as % of rent',
    min: 0.03,
    max: 0.15,
    step: 0.01,
    isPercentage: true,
  },
  // Growth
  {
    key: 'appreciation_rate',
    category: 'appreciation_rate' as any,
    field: 'appreciation_rate',
    label: 'Property Appreciation',
    description: 'Expected annual appreciation',
    min: 0,
    max: 0.10,
    step: 0.01,
    isPercentage: true,
  },
  {
    key: 'rent_growth_rate',
    category: 'rent_growth_rate' as any,
    field: 'rent_growth_rate',
    label: 'Rent Growth',
    description: 'Expected annual rent increase',
    min: 0,
    max: 0.10,
    step: 0.01,
    isPercentage: true,
  },
]

function formatValue(value: number, config: SliderConfig): string {
  if (config.isPercentage) {
    return `${(value * 100).toFixed(1)}%`
  }
  if (config.isCurrency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }
  return `${value}${config.suffix || ''}`
}

function getValue(
  assumptions: Partial<AllAssumptions> | null,
  systemDefaults: AllAssumptions | null,
  config: SliderConfig
): number {
  // Check user overrides first
  if (assumptions) {
    if (config.category === 'appreciation_rate' || config.category === 'rent_growth_rate' || config.category === 'expense_growth_rate') {
      const value = (assumptions as any)[config.category]
      if (value !== undefined) return value
    } else {
      const categoryObj = assumptions[config.category]
      if (categoryObj && typeof categoryObj === 'object') {
        const value = (categoryObj as any)[config.field]
        if (value !== undefined) return value
      }
    }
  }
  
  // Fall back to system defaults
  if (systemDefaults) {
    if (config.category === 'appreciation_rate' || config.category === 'rent_growth_rate' || config.category === 'expense_growth_rate') {
      return (systemDefaults as any)[config.category] ?? config.min
    } else {
      const categoryObj = systemDefaults[config.category]
      if (categoryObj && typeof categoryObj === 'object') {
        return (categoryObj as any)[config.field] ?? config.min
      }
    }
  }
  
  return config.min
}

interface DefaultsEditorProps {
  onClose?: () => void
  showHeader?: boolean
}

export function DefaultsEditor({ onClose, showHeader = true }: DefaultsEditorProps) {
  const {
    assumptions,
    hasCustomizations,
    loading,
    error,
    updateAssumptions,
    resetToDefaults,
  } = useUserAssumptions()
  
  const [systemDefaults, setSystemDefaults] = useState<AllAssumptions | null>(null)
  const [localChanges, setLocalChanges] = useState<Partial<AllAssumptions>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Fetch system defaults for comparison
  useEffect(() => {
    defaultsService.getDefaults().then(setSystemDefaults).catch(console.error)
  }, [])
  
  // Merge local changes with saved assumptions
  const mergedAssumptions = { ...assumptions, ...localChanges }
  
  const hasUnsavedChanges = Object.keys(localChanges).length > 0
  
  const handleSliderChange = useCallback((config: SliderConfig, value: number) => {
    setLocalChanges((prev) => {
      const newChanges = { ...prev }
      
      if (config.category === 'appreciation_rate' || config.category === 'rent_growth_rate' || config.category === 'expense_growth_rate') {
        (newChanges as any)[config.category] = value
      } else {
        if (!newChanges[config.category]) {
          newChanges[config.category] = {} as any
        }
        (newChanges[config.category] as any)[config.field] = value
      }
      
      return newChanges
    })
    
    // Clear any previous save status
    setSaveSuccess(false)
    setSaveError(null)
  }, [])
  
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return
    
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    
    try {
      await updateAssumptions(localChanges)
      setLocalChanges({})
      setSaveSuccess(true)
      
      // Auto-dismiss success message
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }, [localChanges, hasUnsavedChanges, updateAssumptions])
  
  const handleReset = useCallback(async () => {
    if (!confirm('Reset all defaults to system values? This will remove all your customizations.')) {
      return
    }
    
    setIsSaving(true)
    setSaveError(null)
    
    try {
      await resetToDefaults()
      setLocalChanges({})
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to reset preferences')
    } finally {
      setIsSaving(false)
    }
  }, [resetToDefaults])
  
  if (!defaultsService.isAuthenticated()) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-yellow-800 font-semibold mb-2">Sign in Required</h3>
        <p className="text-yellow-700 text-sm">
          Please sign in to customize your default investment assumptions.
          Your preferences will be saved and applied to all calculations.
        </p>
      </div>
    )
  }
  
  if (loading && !systemDefaults) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Default Assumptions</h2>
            <p className="text-sm text-gray-600">
              Customize your investment calculation defaults
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
      
      <div className="p-6">
        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error.message}
          </div>
        )}
        
        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {saveError}
          </div>
        )}
        
        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Preferences saved successfully
          </div>
        )}
        
        {hasCustomizations && !hasUnsavedChanges && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Using your custom defaults
          </div>
        )}
        
        {/* Sliders */}
        <div className="space-y-6">
          {/* Financing Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Financing
            </h3>
            <div className="space-y-4">
              {EDITABLE_DEFAULTS.filter(c => c.category === 'financing').map((config) => (
                <SliderInput
                  key={config.key}
                  config={config}
                  value={getValue(mergedAssumptions, systemDefaults, config)}
                  systemDefault={getValue(null, systemDefaults, config)}
                  onChange={(value) => handleSliderChange(config, value)}
                />
              ))}
            </div>
          </div>
          
          {/* Operating Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Operating Expenses
            </h3>
            <div className="space-y-4">
              {EDITABLE_DEFAULTS.filter(c => c.category === 'operating').map((config) => (
                <SliderInput
                  key={config.key}
                  config={config}
                  value={getValue(mergedAssumptions, systemDefaults, config)}
                  systemDefault={getValue(null, systemDefaults, config)}
                  onChange={(value) => handleSliderChange(config, value)}
                />
              ))}
            </div>
          </div>
          
          {/* Growth Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Growth Rates
            </h3>
            <div className="space-y-4">
              {EDITABLE_DEFAULTS.filter(c => 
                c.category === 'appreciation_rate' || c.category === 'rent_growth_rate'
              ).map((config) => (
                <SliderInput
                  key={config.key}
                  config={config}
                  value={getValue(mergedAssumptions, systemDefaults, config)}
                  systemDefault={getValue(null, systemDefaults, config)}
                  onChange={(value) => handleSliderChange(config, value)}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
          <button
            onClick={handleReset}
            disabled={isSaving || (!hasCustomizations && !hasUnsavedChanges)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset to Defaults
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

interface SliderInputProps {
  config: SliderConfig
  value: number
  systemDefault: number
  onChange: (value: number) => void
}

function SliderInput({ config, value, systemDefault, onChange }: SliderInputProps) {
  const isCustomized = Math.abs(value - systemDefault) > 0.001
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <label className="text-sm font-medium text-gray-900">{config.label}</label>
          <p className="text-xs text-gray-500">{config.description}</p>
        </div>
        <div className="text-right">
          <span className={`text-lg font-semibold ${isCustomized ? 'text-teal-600' : 'text-gray-900'}`}>
            {formatValue(value, config)}
          </span>
          {isCustomized && (
            <p className="text-xs text-gray-400">
              Default: {formatValue(systemDefault, config)}
            </p>
          )}
        </div>
      </div>
      
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
      />
      
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{formatValue(config.min, config)}</span>
        <span>{formatValue(config.max, config)}</span>
      </div>
    </div>
  )
}

export default DefaultsEditor
