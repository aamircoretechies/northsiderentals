import {
  convertQuoteToBooking,
  invalidateBookingsCache,
  type ConvertQuoteToBookingPayload,
} from '@/services/bookings';
import {
  clearReservationContext,
  extractRcmReservationRefFromRecord,
  isShortReservationNo,
  resolveReservationRef,
} from '@/utils/reservation-context';
import type { WindcaveResultPayload } from '@/utils/payment-return';

export const QUOTE_CONVERT_PENDING_KEY = 'quote_convert_pending';

export interface QuoteConvertPendingState {
  payload: ConvertQuoteToBookingPayload;
  reservation_ref: string;
}

export function saveQuoteConvertPending(state: QuoteConvertPendingState): void {
  const ref = String(state.reservation_ref ?? state.payload.reservation_ref ?? '').trim();
  if (!ref) return;
  try {
    sessionStorage.setItem(
      QUOTE_CONVERT_PENDING_KEY,
      JSON.stringify({
        ...state,
        reservation_ref: ref,
        payload: { ...state.payload, reservation_ref: ref },
      }),
    );
  } catch {
    // ignore
  }
}

export function loadQuoteConvertPending(): QuoteConvertPendingState | null {
  try {
    const raw = sessionStorage.getItem(QUOTE_CONVERT_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuoteConvertPendingState;
    const ref = String(
      parsed?.reservation_ref ?? parsed?.payload?.reservation_ref ?? '',
    ).trim();
    if (!ref || !parsed?.payload) return null;
    return {
      payload: { ...parsed.payload, reservation_ref: ref },
      reservation_ref: ref,
    };
  } catch {
    return null;
  }
}

export function clearQuoteConvertPending(): void {
  try {
    sessionStorage.removeItem(QUOTE_CONVERT_PENDING_KEY);
  } catch {
    // ignore
  }
}

export function shouldConvertQuoteOnPaymentReturn(
  search: string | URLSearchParams,
): boolean {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;
  if (
    params.get('convert_quote') === '1' ||
    params.get('convert_quote') === 'true'
  ) {
    return true;
  }
  return Boolean(loadQuoteConvertPending());
}

/**
 * After backend `/payments/complete` success: POST convert (payment already finalized server-side).
 * `windcave_result` is optional — redirect usually has `status=success` and `booking_id` only.
 */
export async function finalizeQuoteConvertAfterPayment(
  windcaveResult?: WindcaveResultPayload | null,
): Promise<boolean> {
  const pending = loadQuoteConvertPending();
  if (!pending) return false;

  // Always use ref saved before Windcave — redirect `booking_id` may be short res no only.
  const rawRef = pending.reservation_ref ?? pending.payload.reservation_ref;
  const reservationRef = resolveReservationRef(
    extractRcmReservationRefFromRecord({ reservation_ref: rawRef, reservationref: rawRef }) ||
      rawRef,
  );
  if (!reservationRef || isShortReservationNo(reservationRef)) return false;

  const paymentOutcome: WindcaveResultPayload = windcaveResult ?? {
    success: true,
    status: 'success',
  };

  await convertQuoteToBooking({
    ...pending.payload,
    reservation_ref: reservationRef,
    windcave_result: paymentOutcome,
  });

  clearQuoteConvertPending();
  clearReservationContext();
  invalidateBookingsCache(reservationRef);
  return true;
}
