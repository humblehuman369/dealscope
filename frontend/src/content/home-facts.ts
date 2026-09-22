import { HOME_UPDATED_AT, WORKED_EXAMPLE } from '@/config/site'
import {
  BUYER_COUNT,
  LENDER_COUNT,
  PRO_MONTHLY_PRICE,
  SOURCE_COUNT,
  SPEED_CLAIM,
} from '@/lib/claims'

/**
 * Visible definition under the deal-gap H2 and the `DefinedTerm` node.
 * Do not invent a market-average cap rate or deal gap; the Lake Worth
 * figures below are one worked example.
 */
export const DEAL_GAP_DEFINITION =
  'A deal gap is the difference between what a seller is asking and the most an investor can pay and still hit their return target.'

export const HOME_FACTS_NAME = 'DealGapIQ first-party figures'

export function homeFactsCaption(formattedDate: string): string {
  return `First-party figures as of ${formattedDate}. The Lake Worth row is a single worked example, not a market average.`
}

/** ISO form for Dataset.description (content dates stay YYYY-MM-DD). */
export const HOME_FACTS_CAPTION = homeFactsCaption(HOME_UPDATED_AT)

export const HOME_FACTS = [
  { label: 'Worked example', value: WORKED_EXAMPLE.address },
  { label: 'List price', value: WORKED_EXAMPLE.listPrice },
  { label: 'Target buy price', value: `${WORKED_EXAMPLE.targetBuy} at ${WORKED_EXAMPLE.downPaymentPct} down` },
  { label: 'Deal gap', value: `${WORKED_EXAMPLE.dealGap} (${WORKED_EXAMPLE.dealGapDollars})` },
  { label: 'Verified cash buyers', value: BUYER_COUNT },
  { label: 'Hard money lenders', value: LENDER_COUNT },
  { label: 'Valuation sources', value: String(SOURCE_COUNT) },
  { label: 'Pro monthly price', value: `${PRO_MONTHLY_PRICE}/mo` },
  { label: 'Analysis time', value: SPEED_CLAIM },
] as const
