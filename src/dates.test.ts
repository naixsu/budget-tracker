import { describe, expect, it } from 'vitest'
import { formatDay, toDateString } from './dates'

describe('toDateString', () => {
  it('uses the local date', () => {
    expect(toDateString(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05')
    expect(toDateString(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
})

describe('formatDay', () => {
  const now = new Date(2026, 10, 5, 9, 0)

  it('names today and yesterday', () => {
    expect(formatDay('2026-11-05', now)).toBe('Today')
    expect(formatDay('2026-11-04', now)).toBe('Yesterday')
  })

  it('handles yesterday across a month boundary', () => {
    expect(formatDay('2026-10-31', new Date(2026, 10, 1))).toBe('Yesterday')
  })

  it('adds the year only for other years', () => {
    expect(formatDay('2026-11-01', now)).not.toMatch(/2026/)
    expect(formatDay('2025-11-01', now)).toMatch(/2025/)
  })
})
