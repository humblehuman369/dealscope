import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update value before delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } },
    )

    rerender({ value: 'world', delay: 300 })

    // After 200ms (before the 300ms delay)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('hello')
  })

  it('updates value after delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } },
    )

    rerender({ value: 'world', delay: 300 })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('world')
  })

  it('resets timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } },
    )

    // Rapid changes at 100ms intervals
    rerender({ value: 'ab', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ value: 'abc', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    rerender({ value: 'abcd', delay: 300 })

    // Value should still be 'a' — timer keeps resetting
    expect(result.current).toBe('a')

    // After the full delay from the last change
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('abcd')
  })

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } },
    )

    rerender({ value: 'updated' })

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('updated')
  })

  it('works with non-string types', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 42, delay: 200 } },
    )

    rerender({ value: 99, delay: 200 })

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe(99)
  })

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const { unmount } = renderHook(() => useDebounce('test', 300))

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
