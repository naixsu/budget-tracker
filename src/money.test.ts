import { describe, expect, it } from 'vitest'
import {
  centavosToInput,
  formatPesos,
  parsePesos,
  sanitizeAmountInput,
} from './money'

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

describe('sanitizeAmountInput', () => {
  it.each([
    ['asd', ''],
    ['12a3', '123'],
    ['1,234.56', '1,234.56'],
    ['1.2.3', '1.23'],
    ['1.234', '1.23'],
    ['5.', '5.'],
    ['-50', '50'],
  ])('%j -> %j', (input, expected) => {
    expect(sanitizeAmountInput(input, false)).toBe(expected)
  })

  it('keeps a leading minus only when allowed', () => {
    expect(sanitizeAmountInput('-50', true)).toBe('-50')
    expect(sanitizeAmountInput('5-0', true)).toBe('50')
  })
})

describe('centavosToInput', () => {
  it('round-trips through parsePesos', () => {
    for (const centavos of [0, 5, 115, 123456, -25075]) {
      expect(parsePesos(centavosToInput(centavos))).toBe(centavos)
    }
  })
})
