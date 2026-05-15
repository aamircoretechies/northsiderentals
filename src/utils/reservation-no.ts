/** RCM short numeric reservation number helpers (no service imports — safe for bookings list). */

function pickFirstNonEmptyString(...values: unknown[]): string {
  for (const v of values) {
    const t = String(v ?? '').trim();
    if (t) return t;
  }
  return '';
}

/** RCM short numeric reservation no (e.g. 149167) — not long reservationref strings. */
export function isLikelyRcmReservationNo(value: string): boolean {
  const t = value.trim();
  return /^\d{4,12}$/.test(t);
}

/** Short numeric reservation number for UI (e.g. `149167`). Not `reservationref`. */
export function extractReservationNoForDisplay(
  data: Record<string, unknown> | null | undefined,
): string {
  if (!data) return '';
  const direct = pickFirstNonEmptyString(
    data.reservation_no,
    data.reservationNo,
    data.rcm_reservation_no,
    data.rcmReservationNo,
    data.reservationdocumentno,
    data.reservationDocumentNo,
    data.ReservationDocumentNo,
    data.quote_no,
    data.quoteNo,
  );
  if (direct) return direct;

  const confirmation = pickFirstNonEmptyString(
    data.confirmation_number,
    data.confirmation_no,
  );
  if (confirmation && isLikelyRcmReservationNo(confirmation)) return confirmation;

  const bookingInfo = data.bookinginfo ?? data.booking_info ?? data.BookingInfo;
  if (Array.isArray(bookingInfo) && bookingInfo[0] && typeof bookingInfo[0] === 'object') {
    return extractReservationNoForDisplay(bookingInfo[0] as Record<string, unknown>);
  }
  const rcm = data.rcm_booking_info;
  if (rcm && typeof rcm === 'object') {
    return extractReservationNoForDisplay(rcm as Record<string, unknown>);
  }
  return '';
}
