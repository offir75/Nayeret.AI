/**
 * Approximate ILS exchange rates used for cross-currency totals.
 * All dashboard components must import from here so every widget
 * uses the same rates and produces consistent totals.
 *
 * Replace with a live-rate fetch (e.g. Bank of Israel API) when ready.
 */
export const TO_ILS: Record<string, number> = {
  ILS: 1,
  USD: 3.65,
  EUR: 3.95,
  GBP: 4.60,
};

/** Convert an amount in any supported currency to ILS. */
export function toILS(amount: number, currency: string): number {
  return amount * (TO_ILS[currency] ?? 1);
}
