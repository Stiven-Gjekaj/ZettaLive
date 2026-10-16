/** The digits that the user types to go to a channel number. */
export interface NumberEntry {
  digits: string
}

export const MAX_DIGITS = 4

/** Adds a digit. A fifth digit starts a new number. */
export function addDigit(entry: NumberEntry, digit: string): NumberEntry {
  if (!/^\d$/.test(digit)) return entry
  const digits = entry.digits.length >= MAX_DIGITS ? digit : entry.digits + digit
  return { digits }
}

/** The number to go to, or undefined when the digits give no channel number. */
export function entryNumber(entry: NumberEntry): number | undefined {
  const n = Number.parseInt(entry.digits, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** The next channel in a list that wraps at the ends. */
export function stepIn<T>(list: readonly T[], current: T, delta: number): T | undefined {
  if (list.length === 0) return undefined
  const index = list.indexOf(current)
  const from = index === -1 ? (delta > 0 ? -1 : 0) : index
  return list[(((from + delta) % list.length) + list.length) % list.length]
}
