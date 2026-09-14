/** Marketing copy for Cash Buyer & Hard Money directories (homepage, pricing). */

import { formatBuyerTotal } from '@/lib/buyers-api'
import { BUYER_COUNT, BUYER_TOTAL, LENDER_TOTAL } from '@/lib/claims'

/**
 * Marketing fallback for the lender directory total. The live number comes
 * from GET /api/lenders/stats (dataset: backend/app/data/lenders.json).
 */
export const LENDER_DIRECTORY_TOTAL = LENDER_TOTAL

export const BUYER_DIRECTORY_TOTAL_FALLBACK = BUYER_COUNT

export function formatLenderDirectoryTotal(total = LENDER_DIRECTORY_TOTAL): string {
  return total.toLocaleString('en-US')
}

export function formatBuyerDirectoryLabel(total: number | null | undefined): string {
  if (typeof total === 'number' && total > 0) {
    return formatBuyerTotal(total)
  }
  return formatBuyerTotal(BUYER_TOTAL)
}
