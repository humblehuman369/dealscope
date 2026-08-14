import type { CategoryId } from '@/lib/investor-intelligence'

const CLASS_BY_CATEGORY: Record<CategoryId, string> = {
  'investor-trends': 'ii-cat--trends',
  'finding-deals': 'ii-cat--deals',
  financing: 'ii-cat--financing',
  'single-family-rentals': 'ii-cat--sfr',
  multifamily: 'ii-cat--multifamily',
  'build-to-rent': 'ii-cat--btr',
  flipping: 'ii-cat--flipping',
  markets: 'ii-cat--markets',
}

export function categoryClass(category: CategoryId, displayCategory?: string): string {
  if (displayCategory === 'Housing Policy') return 'ii-cat--policy'
  if (displayCategory === 'Home Prices') return 'ii-cat--prices'
  return CLASS_BY_CATEGORY[category]
}

export function categoryLabel(category: CategoryId, displayCategory?: string): string {
  if (displayCategory) return displayCategory
  const labels: Record<CategoryId, string> = {
    'investor-trends': 'Investor Trends',
    'finding-deals': 'Finding Deals',
    financing: 'Financing',
    'single-family-rentals': 'Single-Family Rentals',
    multifamily: 'Multifamily',
    'build-to-rent': 'Build-to-Rent',
    flipping: 'Flipping',
    markets: 'Market Intelligence',
  }
  return labels[category]
}
