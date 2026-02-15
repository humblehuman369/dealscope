import { describe, it, expect } from 'vitest'
import { API_BASE_URL } from '@/lib/env'

describe('env', () => {
  it('API_BASE_URL is empty string (uses relative paths through proxy)', () => {
    expect(API_BASE_URL).toBe('')
  })

  it('API_BASE_URL is a string type', () => {
    expect(typeof API_BASE_URL).toBe('string')
  })
})
