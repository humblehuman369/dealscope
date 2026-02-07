// ===========================================
// Onboarding — Shared Types & Constants
// ===========================================

import { Home, Building2, Rocket, Zap, Briefcase } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── Types ──────────────────────────────────────

export interface OnboardingData {
  full_name: string
  investment_experience: string
  preferred_strategies: string[]
  target_markets: string[]
  investment_budget_min: number
  investment_budget_max: number
  target_cash_on_cash: number
  target_cap_rate: number
  risk_tolerance: string
  financing_type: string
  down_payment_pct: number
}

export interface StrategyItem {
  id: string
  label: string
  desc: string
  icon: LucideIcon
  color: string
}

export interface FinancingType {
  id: string
  label: string
  desc: string
  defaultDownPayment: number
  icon: string
}

export interface DownPaymentOption {
  value: number
  label: string
  desc: string
}

export interface BudgetRange {
  min: number
  max: number
  label: string
}

// ── Constants ──────────────────────────────────

export const STRATEGIES: StrategyItem[] = [
  { id: 'ltr', label: 'Long-Term Rental', desc: 'Buy and hold for monthly cash flow', icon: Home, color: 'bg-blue-500' },
  { id: 'str', label: 'Short-Term Rental', desc: 'Airbnb/VRBO vacation rentals', icon: Building2, color: 'bg-purple-500' },
  { id: 'brrrr', label: 'BRRRR', desc: 'Buy, Rehab, Rent, Refinance, Repeat', icon: Rocket, color: 'bg-orange-500' },
  { id: 'flip', label: 'Fix & Flip', desc: 'Renovate and sell for profit', icon: Zap, color: 'bg-pink-500' },
  { id: 'house_hack', label: 'House Hack', desc: 'Live in one unit, rent the others', icon: Home, color: 'bg-green-500' },
  { id: 'wholesale', label: 'Wholesale', desc: 'Assign contracts for assignment fees', icon: Briefcase, color: 'bg-cyan-500' },
]

export const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Just Getting Started', desc: 'New to real estate investing', icon: '🌱' },
  { value: 'intermediate', label: 'Some Experience', desc: '1-5 deals completed', icon: '📈' },
  { value: 'advanced', label: 'Experienced Investor', desc: '5-20 deals under your belt', icon: '🎯' },
  { value: 'expert', label: 'Expert / Full-Time', desc: '20+ deals, investing is your business', icon: '🏆' },
] as const

export const RISK_LEVELS = [
  { value: 'conservative', label: 'Conservative', desc: 'Stable returns, lower risk', color: 'border-green-500 bg-green-50 dark:bg-green-900/20' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced approach', color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Higher risk for higher returns', color: 'border-red-500 bg-red-50 dark:bg-red-900/20' },
] as const

export const BUDGET_RANGES: BudgetRange[] = [
  { min: 0, max: 100000, label: 'Under $100K' },
  { min: 100000, max: 250000, label: '$100K - $250K' },
  { min: 250000, max: 500000, label: '$250K - $500K' },
  { min: 500000, max: 1000000, label: '$500K - $1M' },
  { min: 1000000, max: 5000000, label: '$1M - $5M' },
  { min: 5000000, max: 999999999, label: '$5M+' },
]

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const

export const FINANCING_TYPES: FinancingType[] = [
  { id: 'conventional', label: 'Conventional', desc: 'Traditional 20% down mortgage', defaultDownPayment: 0.20, icon: '🏦' },
  { id: 'fha', label: 'FHA', desc: 'Low down payment (3.5%), owner-occupied', defaultDownPayment: 0.035, icon: '🏠' },
  { id: 'va', label: 'VA', desc: 'Zero down for veterans', defaultDownPayment: 0, icon: '🎖️' },
  { id: 'cash', label: 'Cash', desc: 'All-cash purchase, no financing', defaultDownPayment: 1.0, icon: '💵' },
  { id: 'hard_money', label: 'Hard Money', desc: 'Short-term for flips/BRRRR (10-30% down)', defaultDownPayment: 0.10, icon: '⚡' },
]

export const DOWN_PAYMENT_OPTIONS: DownPaymentOption[] = [
  { value: 0, label: '0%', desc: 'VA or seller financing' },
  { value: 0.035, label: '3.5%', desc: 'FHA minimum' },
  { value: 0.05, label: '5%', desc: 'Low conventional' },
  { value: 0.10, label: '10%', desc: 'Hard money typical' },
  { value: 0.20, label: '20%', desc: 'Conventional, no PMI' },
  { value: 0.25, label: '25%', desc: 'Investment property' },
]

export const TOTAL_STEPS = 5

export const POPULAR_MARKETS = ['FL', 'TX', 'NC', 'AZ', 'GA', 'TN', 'OH', 'IN'] as const
