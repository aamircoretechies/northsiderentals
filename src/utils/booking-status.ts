/** RCM quote vs booking status helpers (list, detail, lookup). */

function toStatusNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function inferIsQuote(record: {
  is_quote?: unknown;
  isQuote?: unknown;
  bookingtype?: unknown;
  booking_type?: unknown;
  reservation_type?: unknown;
  reservationtype?: unknown;
  booking_status?: unknown;
}): boolean {
  if (record.is_quote === true || record.isQuote === true) return true;
  const bt = toStatusNumber(record.bookingtype ?? record.booking_type);
  if (bt === 1) return true;
  const rt = String(
    record.reservation_type ?? record.reservationtype ?? '',
  ).toLowerCase();
  if (rt.includes('quote') || rt.includes('quotation')) return true;
  const bs = String(record.booking_status ?? '').toLowerCase();
  if (bs.includes('quote') || bs.includes('quotation')) return true;
  return false;
}

/**
 * RCM often returns "Reservation Request" for quotes; show a clear quote label instead.
 */
export function formatBookingStatusLabel(
  rawStatus: string,
  isQuote: boolean,
  reservationType?: string,
): string {
  const s = (rawStatus || '').trim();
  const typeLabel = (reservationType || '').trim();
  if (!isQuote) return s || typeLabel || '—';

  if (typeLabel) {
    const tl = typeLabel.toLowerCase();
    if (tl.includes('quote') || tl.includes('quotation')) return typeLabel;
  }

  const lower = s.toLowerCase();
  if (
    !s ||
    lower.includes('reservation request') ||
    lower.includes('booking request') ||
    lower === 'request'
  ) {
    return typeLabel || s || '—';
  }
  if (lower.includes('quote') || lower.includes('quotation')) return s;
  return s;
}
