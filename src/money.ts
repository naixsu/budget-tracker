const formatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export function formatPesos(centavos: number) {
  return formatter.format(centavos / 100)
}

// Parses the string digit by digit instead of parseFloat * 100,
// which turns "1.15" into 114.99999999999999.
export function parsePesos(input: string): number | null {
  const match = input
    .replace(/[,₱\s]/g, '')
    .match(/^(-)?(\d*)(?:\.(\d{0,2}))?$/)
  if (!match) return null

  const [, sign, whole, fraction = ''] = match
  if (whole === '' && fraction === '') return null

  const centavos = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'))
  return sign ? -centavos : centavos
}

export function centavosToInput(centavos: number) {
  return (centavos / 100).toFixed(2)
}
