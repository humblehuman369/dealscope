/** Marketing copy for Cash Buyer & Hard Money directories (homepage, pricing). */

import { formatBuyerTotal } from '@/lib/buyers-api'

/** From lenders.json stats at build time — update when lender data is regenerated. */
export const LENDER_DIRECTORY_TOTAL = 484

export const BUYER_DIRECTORY_TOTAL_FALLBACK = '2,812+'

export function formatLenderDirectoryTotal(total = LENDER_DIRECTORY_TOTAL): string {
  return `${total.toLocaleString('en-US')}+`
}

export function formatBuyerDirectoryLabel(total: number | null | undefined): string {
  if (typeof total === 'number' && total > 0) {
    return `${formatBuyerTotal(total)}+`
  }
  return BUYER_DIRECTORY_TOTAL_FALLBACK
}
