/**
 * Property Details Utility Functions
 * 
 * Formatting and helper functions for property data display.
 */

import { formatCurrencySafe, formatNumberSafe } from '@/utils/formatters'

// Re-export canonical formatters (previously defined locally)
export const formatCurrency = formatCurrencySafe
export const formatNumber = formatNumberSafe

/**
 * Format a date string to readable format
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

/**
 * Format property type for display
 */
export function formatPropertyType(type: string | null | undefined): string {
  if (!type) return 'N/A'
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Get rating color based on school rating
 */
export function getRatingColor(rating: number): string {
  if (rating >= 8) return 'bg-teal-500 text-white'
  if (rating >= 6) return 'bg-amber-500 text-white'
  return 'bg-red-500 text-white'
}

/**
 * Calculate days ago from a date string
 */
export function getDaysAgo(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
