import { describe, it, expect } from 'vitest'
import { SAVED_PROPERTIES_KEYS } from '@/hooks/useSavedProperties'

describe('SAVED_PROPERTIES_KEYS', () => {
  describe('key hierarchy', () => {
    it('all returns the root key', () => {
      expect(SAVED_PROPERTIES_KEYS.all).toEqual(['saved-properties'])
    })

    it('lists key extends the root', () => {
      const listsKey = SAVED_PROPERTIES_KEYS.lists()
      expect(listsKey).toEqual(['saved-properties', 'list'])
      // Must be a superset of `all` for React Query invalidation to work
      expect(listsKey.slice(0, 1)).toEqual(SAVED_PROPERTIES_KEYS.all)
    })

    it('list key includes params', () => {
      const params = { page: 0, pageSize: 20, status: 'all', search: '' }
      const listKey = SAVED_PROPERTIES_KEYS.list(params)
      expect(listKey).toEqual(['saved-properties', 'list', params])
    })

    it('stats key extends the root', () => {
      const statsKey = SAVED_PROPERTIES_KEYS.stats()
      expect(statsKey).toEqual(['saved-properties', 'stats'])
      // Must be a superset of `all` for React Query invalidation
      expect(statsKey.slice(0, 1)).toEqual(SAVED_PROPERTIES_KEYS.all)
    })

    it('different params produce different keys', () => {
      const key1 = SAVED_PROPERTIES_KEYS.list({ page: 0, pageSize: 20, status: 'all', search: '' })
      const key2 = SAVED_PROPERTIES_KEYS.list({ page: 1, pageSize: 20, status: 'all', search: '' })
      expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2))
    })

    it('same params produce identical keys', () => {
      const params = { page: 0, pageSize: 10, status: 'analyzing', search: 'test' }
      const key1 = SAVED_PROPERTIES_KEYS.list(params)
      const key2 = SAVED_PROPERTIES_KEYS.list(params)
      expect(JSON.stringify(key1)).toBe(JSON.stringify(key2))
    })
  })
})
