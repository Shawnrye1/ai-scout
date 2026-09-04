/** Money is integer cents. Formatting is the only place it becomes a string. */
export function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/** Whole dollars, for allowances that are always round. */
export function usdWhole(cents: number): string {
  return `$${Math.round(cents / 100)}`
}
