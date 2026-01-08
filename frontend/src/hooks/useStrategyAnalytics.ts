/**
 * useStrategyAnalytics Hook
 * 
 * Manages state and calculations for the strategy analytics views.
 * Handles assumption adjustments, IQ Target calculations, and view state.
 */

import { useState, useMemo, useCallback } from 'react'
import { 
  calculateIQTarget, 
  getMetricsAtPrice, 
  TargetAssumptions,
  IQTargetResult,
  StrategyId
} from '@/lib/iqTarget'
import { SubTabId } from '@/components/analytics/types'

// ============================================
// TYPES
// ============================================

export interface PropertyData {
  listPrice: number
  monthlyRent: number
  averageDailyRate: number
  occupancyRate: number
  propertyTaxes: number
  insurance: number
  bedrooms: number
  bathrooms: number
  sqft: number
  arv?: number
  address: string
  city: string
  state: string
}

export interface AnalyticsState {
  activeStrategy: StrategyId | null
  activeSubTab: SubTabId
  compareView: 'target' | 'list'
  assumptions: TargetAssumptions
  tuneGroupsOpen: Record<string, boolean>
}

export interface UseStrategyAnalyticsResult {
  // State
  state: AnalyticsState
  
  // Actions
  setActiveStrategy: (strategy: StrategyId) => void
  setActiveSubTab: (tab: SubTabId) => void
  setCompareView: (view: 'target' | 'list') => void
  updateAssumption: <K extends keyof TargetAssumptions>(key: K, value: TargetAssumptions[K]) => void
  resetAssumptions: () => void
  toggleTuneGroup: (groupId: string) => void
  
  // Computed values
  iqTarget: IQTargetResult | null
  metricsAtList: ReturnType<typeof getMetricsAtPrice> | null
  metricsAtTarget: ReturnType<typeof getMetricsAtPrice> | null
}

// ============================================
// DEFAULT ASSUMPTIONS
// ============================================

function createDefaultAssumptions(property: PropertyData): TargetAssumptions {
  // Calculate ARV if not provided (use 15% above list as default estimate)
  const arv = property.arv || property.listPrice * 1.15
  
  // Estimate rehab cost based on property age/condition (use 5% of ARV as rough default)
  const rehabCost = arv * 0.05
  
  return {
    listPrice: property.listPrice,
    // Financing
    downPaymentPct: 0.20,
    interestRate: 0.0725, // Current market rate estimate
    loanTermYears: 30,
    closingCostsPct: 0.03,
    // Income
    monthlyRent: property.monthlyRent || property.listPrice * 0.007, // 0.7% rule estimate
    averageDailyRate: property.averageDailyRate || (property.monthlyRent / 30) * 1.5 || 150,
    occupancyRate: property.occupancyRate || 0.70,
    vacancyRate: 0.05,
    // Expenses
    propertyTaxes: property.propertyTaxes || property.listPrice * 0.012, // 1.2% estimate
    insurance: property.insurance || 1800,
    managementPct: 0.08,
    maintenancePct: 0.05,
    // Rehab/ARV
    rehabCost,
    arv,
    holdingPeriodMonths: 6,
    sellingCostsPct: 0.08,
    // House Hack
    roomsRented: Math.max(1, (property.bedrooms || 3) - 1),
    totalBedrooms: property.bedrooms || 3,
    // Wholesale
    wholesaleFeePct: 0.007 // 0.7% of market value
  }
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useStrategyAnalytics(property: PropertyData): UseStrategyAnalyticsResult {
  // Initialize state
  const [state, setState] = useState<AnalyticsState>(() => ({
    activeStrategy: null,
    activeSubTab: 'metrics',
    compareView: 'target',
    assumptions: createDefaultAssumptions(property),
    tuneGroupsOpen: {}
  }))
  
  // Actions
  const setActiveStrategy = useCallback((strategy: StrategyId) => {
    setState(prev => ({
      ...prev,
      activeStrategy: strategy,
      activeSubTab: 'metrics', // Reset to metrics tab when switching strategies
      compareView: 'target'
    }))
  }, [])
  
  const setActiveSubTab = useCallback((tab: SubTabId) => {
    setState(prev => ({
      ...prev,
      activeSubTab: tab
    }))
  }, [])
  
  const setCompareView = useCallback((view: 'target' | 'list') => {
    setState(prev => ({
      ...prev,
      compareView: view
    }))
  }, [])
  
  const updateAssumption = useCallback(<K extends keyof TargetAssumptions>(
    key: K, 
    value: TargetAssumptions[K]
  ) => {
    setState(prev => ({
      ...prev,
      assumptions: {
        ...prev.assumptions,
        [key]: value
      }
    }))
  }, [])
  
  const resetAssumptions = useCallback(() => {
    setState(prev => ({
      ...prev,
      assumptions: createDefaultAssumptions(property)
    }))
  }, [property])
  
  const toggleTuneGroup = useCallback((groupId: string) => {
    setState(prev => ({
      ...prev,
      tuneGroupsOpen: {
        ...prev.tuneGroupsOpen,
        [groupId]: !prev.tuneGroupsOpen[groupId]
      }
    }))
  }, [])
  
  // Computed: IQ Target for active strategy
  const iqTarget = useMemo(() => {
    if (!state.activeStrategy) return null
    return calculateIQTarget(state.activeStrategy, state.assumptions)
  }, [state.activeStrategy, state.assumptions])
  
  // Computed: Metrics at list price
  const metricsAtList = useMemo(() => {
    if (!state.activeStrategy) return null
    return getMetricsAtPrice(
      state.activeStrategy, 
      state.assumptions.listPrice, 
      state.assumptions
    )
  }, [state.activeStrategy, state.assumptions])
  
  // Computed: Metrics at target price
  const metricsAtTarget = useMemo(() => {
    if (!state.activeStrategy || !iqTarget) return null
    return getMetricsAtPrice(
      state.activeStrategy, 
      iqTarget.targetPrice, 
      state.assumptions
    )
  }, [state.activeStrategy, iqTarget, state.assumptions])
  
  return {
    state,
    setActiveStrategy,
    setActiveSubTab,
    setCompareView,
    updateAssumption,
    resetAssumptions,
    toggleTuneGroup,
    iqTarget,
    metricsAtList,
    metricsAtTarget
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get strategy-specific tabs
 */
export function getTabsForStrategy(strategyId: StrategyId): SubTabId[] {
  switch (strategyId) {
    case 'ltr':
    case 'str':
    case 'brrrr':
    case 'house_hack':
      return ['metrics', 'funding', '10year', 'growth', 'score', 'whatif']
    case 'flip':
      return ['metrics', 'funding', 'comps', 'score', 'whatif']
    case 'wholesale':
      return ['metrics', 'buyer', 'comps', 'score']
    default:
      return ['metrics', 'funding', '10year', 'score']
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(value)
}

/**
 * Format compact currency (K/M notation)
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000)}K`
  }
  return formatCurrency(value)
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}
