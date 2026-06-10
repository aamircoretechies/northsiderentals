import { sanitizeApiText } from '@/utils/sanitize-api-text';

const CODE_TO_SYMBOL: Record<string, string> = {
  AUD: '$',
  USD: '$',
  NZD: '$',
  CAD: '$',
  GBP: '£',
  EUR: '€',
};

/** Resolve display symbol from RCM currency code and/or `currencysymbol` field. */
export function resolveCurrencySymbol(
  currencyCode?: unknown,
  currencySymbolFromApi?: unknown,
): string {
  const symRaw = sanitizeApiText(currencySymbolFromApi);
  if (symRaw && !/^[A-Za-z]{3}$/.test(symRaw)) {
    return symRaw;
  }
  const code = (
    symRaw && /^[A-Za-z]{3}$/.test(symRaw)
      ? symRaw
      : sanitizeApiText(currencyCode)
  ).toUpperCase();
  if (code && CODE_TO_SYMBOL[code]) return CODE_TO_SYMBOL[code];
  return '$';
}

/** Standard money display, e.g. `$156.00` (AUD default). */
export function formatMoneyAmount(amount: unknown, symbol = '$'): string {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  const sym = symbol || '$';
  return `${sym}${safe.toFixed(2)}`;
}

/** Plain-text label from API (strips HTML). */
export function formatBookingDisplayText(value: unknown): string {
  return sanitizeApiText(value);
}
