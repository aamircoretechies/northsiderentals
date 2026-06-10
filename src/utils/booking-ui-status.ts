/** List-tab grouping and CTA eligibility (upcoming / active / completed). */

export type BookingUiStatus = 'active' | 'upcoming' | 'completed';

export function parseBookingDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const native = new Date(trimmed);
  if (!Number.isNaN(native.getTime())) return native;

  const m = trimmed.match(
    /^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/,
  );
  if (!m) return null;
  const day = Number(m[1]);
  const mon = m[2].toLowerCase();
  const year = Number(m[3]);
  const hour = Number(m[4] ?? 0);
  const min = Number(m[5] ?? 0);
  const monthMap: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const monthIdx = monthMap[mon];
  if (monthIdx == null) return null;
  const d = new Date(year, monthIdx, day, hour, min, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function bookingUiStatus(
  input: { statusLabel: string; pickupDate?: string; returnDate?: string },
  now: Date = new Date(),
): BookingUiStatus {
  const status = input.statusLabel.toLowerCase();
  if (
    status.includes('cancel') ||
    status.includes('complete') ||
    status.includes('closed')
  ) {
    return 'completed';
  }

  const pickupAt = parseBookingDate(input.pickupDate ?? '');
  const returnAt = parseBookingDate(input.returnDate ?? '');

  if (returnAt && returnAt.getTime() < now.getTime()) return 'completed';
  if (pickupAt && pickupAt.getTime() > now.getTime()) return 'upcoming';
  return 'active';
}

/** Modify & pay / convert quote — only before pickup (Upcoming tab). */
export function isBookingUpcomingForModifyOrConvert(
  input: { statusLabel: string; pickupDate?: string; returnDate?: string },
  now: Date = new Date(),
): boolean {
  return bookingUiStatus(input, now) === 'upcoming';
}

export const QUOTE_EXPIRED_PICKUP_MESSAGE =
  'This quote has expired because the pickup date/time has passed. Please start with the new booking dates to continue.';

/** Quote whose pickup is in the past — cannot convert until customer rebooks. */
export function isQuoteExpiredByPickup(
  input: {
    isQuote?: boolean;
    pickupDate?: string;
    statusLabel?: string;
  },
  now: Date = new Date(),
): boolean {
  if (!input.isQuote) return false;
  const status = (input.statusLabel ?? '').toLowerCase();
  if (status.includes('cancel')) return false;
  const pickupAt = parseBookingDate(input.pickupDate ?? '');
  if (!pickupAt) return false;
  return pickupAt.getTime() <= now.getTime();
}
