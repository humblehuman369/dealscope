import { describe, it, expect } from 'vitest'
import { API_BASE_URL, WORKFLOW_V1_ENV_ENABLED, isCapacitor, usesNativeIap } from '@/lib/env'

describe('env', () => {
  it('API_BASE_URL is empty string (uses relative paths through proxy)', () => {
    expect(API_BASE_URL).toBe('')
  })

  it('API_BASE_URL is a string type', () => {
    expect(typeof API_BASE_URL).toBe('string')
  })

  it('native flags re-evaluate (jsdom is not Capacitor)', () => {
    expect(isCapacitor()).toBe(false)
    expect(usesNativeIap()).toBe(false)
  })

  it('workflow v1 stays off unless NEXT_PUBLIC_WORKFLOW_V1 is true', () => {
    expect(WORKFLOW_V1_ENV_ENABLED).toBe(false)
  })
})
