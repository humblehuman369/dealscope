import { describe, it, expect } from 'vitest'
import { SEARCH_HISTORY_KEYS } from '@/hooks/useSearchHistory'

describe('SEARCH_HISTORY_KEYS', () => {
  describe('key hierarchy', () => {
    it('all returns the root key', () => {
      expect(SEARCH_HISTORY_KEYS.all).toEqual(['search-history'])
    })

    it('lists key extends the root', () => {
      const listsKey = SEARCH_HISTORY_KEYS.lists()
      expect(listsKey).toEqual(['search-history', 'list'])
      expect(listsKey.slice(0, 1)).toEqual(SEARCH_HISTORY_KEYS.all)
    })

    it('list key includes params', () => {
      const params = { page: 0, pageSize: 20, successfulOnly: false }
      const listKey = SEARCH_HISTORY_KEYS.list(params)
      expect(listKey).toEqual(['search-history', 'list', params])
    })

    it('stats key extends the root', () => {
      const statsKey = SEARCH_HISTORY_KEYS.stats()
      expect(statsKey).toEqual(['search-history', 'stats'])
      expect(statsKey.slice(0, 1)).toEqual(SEARCH_HISTORY_KEYS.all)
    })

    it('different params produce different keys', () => {
      const key1 = SEARCH_HISTORY_KEYS.list({ page: 0, pageSize: 20, successfulOnly: false })
      const key2 = SEARCH_HISTORY_KEYS.list({ page: 0, pageSize: 20, successfulOnly: true })
      expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2))
    })
  })
})
