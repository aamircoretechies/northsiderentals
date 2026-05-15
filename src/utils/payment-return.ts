import { isLikelyRcmReservationNo } from '@/utils/reservation-no';

/**
 * Query params after backend `/payments/complete` redirects to the app confirmation route.
 */

export type PaymentReturnStatus = 'success' | 'failed' | 'cancelled' | 'unknown';

export interface PaymentReturnParams {
  status: PaymentReturnStatus;
  confirmationNumber: string;
  rcmReservationNo: string;
  bookingId: string;
  reservationRef: string;
  cardType: string;
}

function pickParam(params: URLSearchParams, ...keys: string[]): string {
  for (const key of keys) {
    const v = params.get(key)?.trim();
    if (v) return v;
  }
  return '';
}

export function parsePaymentReturnParams(
  search: string | URLSearchParams,
): PaymentReturnParams {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;

  const rawStatus = pickParam(params, 'status', 'payment_status', 'result').toLowerCase();
  let status: PaymentReturnStatus = 'unknown';
  if (rawStatus === 'success' || rawStatus === 'approved' || rawStatus === '1') {
    status = 'success';
  } else if (rawStatus === 'failed' || rawStatus === 'failure' || rawStatus === 'error') {
    status = 'failed';
  } else if (rawStatus === 'cancelled' || rawStatus === 'canceled' || rawStatus === 'cancel') {
    status = 'cancelled';
  }

  return {
    status,
    confirmationNumber: pickParam(
      params,
      'confirmation_number',
      'confirmation_no',
      'confirmationNumber',
    ),
    rcmReservationNo: pickParam(
      params,
      'rcm_reservation_no',
      'reservation_no',
      'reservationdocumentno',
      'reservation_document_no',
    ),
    bookingId: pickParam(params, 'booking_id', 'bookingid'),
    reservationRef: pickParam(
      params,
      'reservation_ref',
      'reservationref',
      'reservationRef',
      'rcm_reference_key',
    ),
    cardType: pickParam(params, 'card_type', 'cardtype', 'CardType', 'cardbrand'),
  };
}

/** Short `reservation_no` from payment redirect (e.g. 149167) — not reservationref. */
export function paymentReturnReservationNo(p: PaymentReturnParams): string {
  if (p.rcmReservationNo) return p.rcmReservationNo;
  if (p.confirmationNumber && isLikelyRcmReservationNo(p.confirmationNumber)) {
    return p.confirmationNumber;
  }
  return '';
}

/** Reservation ref for API lookup (`/bookings/by-reference`). */
export function paymentReturnReference(p: PaymentReturnParams): string {
  return (
    p.reservationRef ||
    paymentReturnReservationNo(p) ||
    p.confirmationNumber ||
    p.bookingId ||
    ''
  );
}

export function isCheckoutConfirmationPath(pathname: string): boolean {
  return (
    pathname === '/cars/checkout/success' ||
    pathname === '/booking/confirmation' ||
    pathname.endsWith('/booking/confirmation')
  );
}
