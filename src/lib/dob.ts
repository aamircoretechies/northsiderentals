import { format, isValid, parse, parseISO } from 'date-fns';

/**
 * Parse common manual DOB formats to ISO date (yyyy-MM-dd).
 * Accepts HTML date input values, YYYY-MM-DD, AU-style D/M/Y, and dd/MMM/yyyy.
 */
export function normalizeDobToIso(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = parseISO(v);
    if (!isValid(d)) return null;
    return validateYearRange(d) ? v : null;
  }

  const ref = new Date(2000, 0, 1);
  const formats = [
    'dd/MM/yyyy',
    'd/M/yyyy',
    'dd-MM-yyyy',
    'd-M-yyyy',
    'dd.MM.yyyy',
    'dd/MMM/yyyy',
    'd/MMM/yyyy',
  ] as const;

  const now = new Date();
  for (const fmt of formats) {
    const d = parse(v, fmt, ref);
    if (isValid(d) && validateYearRange(d, now)) {
      return format(d, 'yyyy-MM-dd');
    }
  }

  return null;
}

function validateYearRange(d: Date, now: Date = new Date()): boolean {
  const y = d.getFullYear();
  if (y < 1900) return false;
  if (d > now) return false;
  return true;
}
