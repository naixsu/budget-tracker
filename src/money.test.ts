import { describe, expect, it } from 'vitest'
import { centavosToInput, formatPesos, parsePesos } from './money'

describe('parsePesos', () => {
  it.each([
    ['12.34', 1234],
    ['1.15', 115],
    ['0.1', 10],
    ['5', 500],
    ['5.', 500],
    ['.5', 50],
    ['1,234.56', 123456],
    ['₱ 1,000', 100000],
    ['-250.75', -25075],
  ])('%s -> %i', (input, expected) => {
    expect(parsePesos(input)).toBe(expected)
  })

  it.each(['', '.', '-', 'abc', '1.234', '1.2.3', '12a'])(
    'rejects %j',
    (input) => {
      expect(parsePesos(input)).toBeNull()
    },
  )
})

describe('formatPesos', () => {
  it('formats centavos as pesos', () => {
    expect(formatPesos(123456)).toBe('₱1,234.56')
    expect(formatPesos(-500)).toBe('-₱5.00')
  })
})

describe('centavosToInput', () => {
  it('round-trips through parsePesos', () => {
    for (const centavos of [0, 5, 115, 123456, -25075]) {
      expect(parsePesos(centavosToInput(centavos))).toBe(centavos)
    }
  })
})
