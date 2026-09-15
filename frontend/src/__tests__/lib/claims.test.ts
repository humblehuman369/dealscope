import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BUYER_COUNT,
  LENDER_COUNT,
  PRO_MONTHLY_AMOUNT,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_AMOUNT,
  PRO_YEARLY_PER_MONTH,
  PRO_YEARLY_PRICE,
  SOURCE_COUNT,
  SPEED_CLAIM,
  SPEED_CLAIM_SENTENCE,
  ANON_VERDICTS_PER_DAY,
  STARTER_VERDICTS_PER_MONTH,
} from '@/lib/claims'
import { ANON_FUNNEL_COPY, STARTER_LIMIT_COPY } from '@/lib/anonFunnelCopy'
import { FREE_ANALYSES_PER_MONTH } from '@/constants/subscriptions'
import { PRO_PRICE_ANNUAL, PRO_PRICE_MONTHLY } from '@/lib/planFeatures'
import { ALL_SOURCE_IDS } from '@/utils/propertySourceMapper'

const REPO_ROOT = path.resolve(__dirname, '../../../../')

function directoryRowCount(relPath: string, pick?: (payload: unknown) => unknown): number {
  const payload = JSON.parse(readFileSync(path.join(REPO_ROOT, relPath), 'utf8')) as unknown
  const rows = pick ? pick(payload) : payload
  if (!Array.isArray(rows)) {
    throw new Error(`Expected an array in ${relPath}`)
  }
  return rows.length
}

describe('claims', () => {
  it('formats exact cash-buyer and lender directory row counts with commas and no plus', () => {
    const buyers = directoryRowCount('backend/app/data/buyers.json')
    const lenders = directoryRowCount(
      'backend/app/data/lenders.json',
      (payload) => (payload as { lenders: unknown }).lenders,
    )
    expect(buyers).toBe(2812)
    expect(lenders).toBe(484)
    expect(BUYER_COUNT).toBe(buyers.toLocaleString('en-US'))
    expect(LENDER_COUNT).toBe(lenders.toLocaleString('en-US'))
    expect(BUYER_COUNT).toBe('2,812')
    expect(LENDER_COUNT).toBe('484')
    expect(BUYER_COUNT).not.toContain('+')
    expect(LENDER_COUNT).not.toContain('+')
  })

  it('uses the Discovery source roster length', () => {
    expect(SOURCE_COUNT).toBe(ALL_SOURCE_IDS.length)
    expect(SOURCE_COUNT).toBe(5)
  })

  it('reads Pro prices from the same constants checkout uses', () => {
    expect(PRO_MONTHLY_PRICE).toBe(PRO_PRICE_MONTHLY)
    expect(PRO_YEARLY_PRICE).toBe(PRO_PRICE_ANNUAL)
    expect(PRO_MONTHLY_PRICE).toBe('$34.99')
    expect(PRO_YEARLY_PRICE).toBe('$349.99')
    expect(PRO_MONTHLY_AMOUNT).toBe('34.99')
    expect(PRO_YEARLY_AMOUNT).toBe('349.99')
  })

  it('derives the yearly-per-month figure from the yearly price', () => {
    const yearly = Number(PRO_YEARLY_PRICE.replace(/[^0-9.]/g, ''))
    expect(PRO_YEARLY_PER_MONTH).toBe((yearly / 12).toFixed(2))
  })

  it('exports the approved speed phrase', () => {
    expect(SPEED_CLAIM).toBe('under 60 seconds')
    expect(SPEED_CLAIM_SENTENCE).toBe('Under 60 seconds')
  })

  it('is the only typed source for free-verdict counts used in funnel copy', () => {
    expect(ANON_VERDICTS_PER_DAY).toBe(1)
    expect(STARTER_VERDICTS_PER_MONTH).toBe(3)
    expect(FREE_ANALYSES_PER_MONTH).toBe(STARTER_VERDICTS_PER_MONTH)
    expect(ANON_FUNNEL_COPY.gateBody).toContain(`${STARTER_VERDICTS_PER_MONTH} more verdicts`)
    expect(STARTER_LIMIT_COPY.title).toContain(`${STARTER_VERDICTS_PER_MONTH} free verdicts`)
  })
})
