import { describe, expect, it } from 'vitest'
import { toSchemaDateTime } from '@/lib/seo/dates'

describe('toSchemaDateTime', () => {
  it('anchors a YYYY-MM-DD date at 09:00 America/New_York with the EST offset in winter', () => {
    expect(toSchemaDateTime('2026-01-15')).toBe('2026-01-15T09:00:00-05:00')
  })

  it('uses the EDT offset while daylight saving time is in effect', () => {
    expect(toSchemaDateTime('2026-09-21')).toBe('2026-09-21T09:00:00-04:00')
    expect(toSchemaDateTime('2026-03-08')).toBe('2026-03-08T09:00:00-04:00') // DST starts 02:00 that day
    expect(toSchemaDateTime('2026-11-01')).toBe('2026-11-01T09:00:00-05:00') // DST ends 02:00 that day
  })

  it('passes through values that are already datetimes, empty or malformed', () => {
    expect(toSchemaDateTime('2026-01-15T09:00:00-05:00')).toBe('2026-01-15T09:00:00-05:00')
    expect(toSchemaDateTime(undefined)).toBeUndefined()
    expect(toSchemaDateTime('not-a-date')).toBe('not-a-date')
  })
})
