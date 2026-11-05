// Local date, not toISOString(): that is UTC, which is still "yesterday"
// before 8am in the Philippines.
export function toDateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function today() {
  return toDateString(new Date())
}

export function formatDay(date: string, now = new Date()) {
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (date === toDateString(now)) return 'Today'
  if (date === toDateString(yesterday)) return 'Yesterday'

  const parsed = new Date(`${date}T00:00`)
  return parsed.toLocaleDateString('en-PH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: parsed.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}
