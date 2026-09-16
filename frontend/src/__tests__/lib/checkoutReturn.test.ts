import { afterEach, describe, expect, it } from 'vitest'
import {
  LAST_PROPERTY_PATH_KEY,
  isBareAddressPath,
  rememberPropertyPath,
  resolveCheckoutReturnTo,
  withProWelcome,
} from '@/lib/checkoutReturn'

describe('resolveCheckoutReturnTo', () => {
  afterEach(() => {
    sessionStorage.removeItem(LAST_PROPERTY_PATH_KEY)
  })

  it('keeps a property URL', () => {
    expect(resolveCheckoutReturnTo('/discovery?address=1+Oak')).toBe('/discovery?address=1+Oak')
  })

  it('treats / and bare discovery as missing and falls back to last property or /search', () => {
    expect(resolveCheckoutReturnTo('/')).toBe('/search')
    expect(resolveCheckoutReturnTo('/discovery')).toBe('/search')
    rememberPropertyPath('/discovery?address=1+Oak')
    expect(resolveCheckoutReturnTo('/')).toBe('/discovery?address=1+Oak')
  })
})

describe('isBareAddressPath', () => {
  it('detects discovery without an address', () => {
    expect(isBareAddressPath('/discovery')).toBe(true)
    expect(isBareAddressPath('/discovery?view=workbench')).toBe(true)
    expect(isBareAddressPath('/discovery?address=1+Oak')).toBe(false)
  })
})

describe('withProWelcome', () => {
  it('appends welcome=pro without dropping existing query', () => {
    expect(withProWelcome('/search')).toBe('/search?welcome=pro')
    expect(withProWelcome('/discovery?address=1+Oak')).toBe(
      '/discovery?address=1+Oak&welcome=pro',
    )
  })
})
