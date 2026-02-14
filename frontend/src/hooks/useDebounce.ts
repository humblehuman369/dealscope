'use client'

/**
 * useDebounce — delays updating a value until after a pause in changes.
 *
 * Prevents firing API calls on every keystroke.  Default delay is 300 ms,
 * which feels instant but collapses rapid typing into one request.
 *
 * Usage:
 *   const [search, setSearch] = useState('')
 *   const debouncedSearch = useDebounce(search, 300)
 *   // use debouncedSearch in your query / useEffect
 */

import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debouncedValue
}
