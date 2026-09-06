import { afterEach, describe, expect, it } from 'vitest'

import {
  markPlanContinuity,
  peekPlanContinuity,
  readPlanContinuity,
  retargetPlanContinuity,
} from '@/lib/makeItWorkContinuity'

describe('makeItWorkContinuity', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('stores and reads continuity for the same address', () => {
    markPlanContinuity({
      address: '4370 Ruth Ln, Delray Beach, FL 33445',
      planLabel: 'Price',
      email: 'buyer@example.com',
    })
    const found = readPlanContinuity('4370 Ruth Ln, Delray Beach, FL 33445')
    expect(found?.planLabel).toBe('Price')
    expect(found?.email).toBe('buyer@example.com')
  })

  it('does not unlock a different property in the same tab', () => {
    markPlanContinuity({
      address: '4370 Ruth Ln, Delray Beach, FL 33445',
      planLabel: 'Price',
    })
    expect(readPlanContinuity('100 Other St, Miami, FL 33101')).toBeNull()
  })

  it('retargets the flag onto the workbench address', () => {
    markPlanContinuity({ address: '4370 Ruth Ln', planLabel: 'Terms', email: 'a@b.co' })
    const remapped = retargetPlanContinuity('4370 Ruth Ln, Delray Beach, FL 33445')
    expect(remapped?.planLabel).toBe('Terms')
    expect(readPlanContinuity('4370 Ruth Ln, Delray Beach, FL 33445')?.email).toBe('a@b.co')
    expect(peekPlanContinuity()?.addressKey).toContain('4370 Ruth Ln, Delray Beach')
  })
})
