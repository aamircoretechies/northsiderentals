import { normalizePaymentReturnToAppOrigin } from '@/utils/app-origin';
import { isLikelyRcmReservationNo } from '@/utils/reservation-no';

/**
 * Query params after backend `GET /payments/complete` (Windcave redirect handler).
 * Backend finalizes payment (getdpspayment → RCM token → confirmpayment); the client
 * does not receive a result token. Redirect includes `booking_id` (UUID or reservation_ref),
 * `status` (success | failed | cancelled), and optional Windcave `result`.
 */

export type PaymentReturnStatus = 'success' | 'failed' | 'cancelled' | 'unknown';

/** Payload for quote convert (`windcave_result` on POST /bookings/edit or /quotations/convert). */
export type WindcaveResultPayload = Record<string, unknown>;

export interface PaymentReturnParams {
  status: PaymentReturnStatus;
  confirmationNumber: string;
  rcmReservationNo: string;
  bookingId: string;
  reservationRef: string;
  cardType: string;
  maskedCardNumber: string;
  cardExpiry: string;
  cardholderName: string;
  /** Parsed from `windcave_result` query or built from redirect params */
  windcaveResult: WindcaveResultPayload | null;
  convertQuote: boolean;
}

function pickParam(params: URLSearchParams, ...keys: string[]): string {
  for (const key of keys) {
    const v = params.get(key)?.trim();
    if (v) return v;
  }
  return '';
}

/**
 * `booking_id` on `/payments/complete` redirect may be internal id, UUID, or RCM `reservationref`.
 */
export function bookingIdQueryLooksLikeReservationRef(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (isLikelyRcmReservationNo(t)) return false;
  if (/^\d+$/.test(t)) return false;
  return true;
}

function parsePaymentReturnStatus(params: URLSearchParams): PaymentReturnStatus {
  const statusRaw = pickParam(params, 'status', 'payment_status').toLowerCase();
  if (statusRaw === 'success' || statusRaw === 'approved' || statusRaw === '1') {
    return 'success';
  }
  if (statusRaw === 'failed' || statusRaw === 'failure' || statusRaw === 'error') {
    return 'failed';
  }
  if (statusRaw === 'cancelled' || statusRaw === 'canceled' || statusRaw === 'cancel') {
    return 'cancelled';
  }

  const resultRaw = pickParam(params, 'result').toLowerCase();
  if (resultRaw === 'success' || resultRaw === 'approved') return 'success';
  if (resultRaw === 'failed' || resultRaw === 'failure' || resultRaw === 'declined') {
    return 'failed';
  }
  if (resultRaw === 'cancelled' || resultRaw === 'canceled' || resultRaw === 'cancel') {
    return 'cancelled';
  }

  if (params.get('success') === 'true' || params.get('success') === '1') {
    return 'success';
  }

  return 'unknown';
}

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // not JSON
  }
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded !== trimmed) {
      const parsed = JSON.parse(decoded) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/** Parse `windcave_result` from payment-complete redirect (JSON in query or discrete fields). */
export function parseWindcaveResultFromParams(
  search: string | URLSearchParams,
): WindcaveResultPayload | null {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;

  const embedded = pickParam(
    params,
    'windcave_result',
    'windcaveResult',
    'payment_result',
    'paymentResult',
  );
  if (embedded) {
    const fromJson = tryParseJsonObject(embedded);
    if (fromJson) return fromJson;
  }

  const status = parsePaymentReturnStatus(params);
  const success = status === 'success';
  const windcaveResultParam = pickParam(params, 'result');

  const cardType = pickParam(
    params,
    'card_type',
    'cardtype',
    'CardType',
    'cardbrand',
    'paytype',
  );
  const amountRaw = pickParam(params, 'amount', 'payment_amount', 'authorised_amount');
  const amount = amountRaw ? Number(amountRaw) : undefined;
  const transactionId = pickParam(
    params,
    'transaction_id',
    'transactionid',
    'txn_id',
    'dps_txn_ref',
  );
  const sessionId = pickParam(params, 'session_id', 'sessionid', 'payment_session_id');

  if (!success && !cardType && !transactionId && !embedded && !windcaveResultParam) {
    return null;
  }

  const result: WindcaveResultPayload = {
    success,
    status: status === 'unknown' ? (success ? 'success' : 'unknown') : status,
  };
  if (windcaveResultParam) result.result = windcaveResultParam;
  if (cardType) {
    result.card_type = cardType;
    result.paytype = cardType;
  }
  if (Number.isFinite(amount)) result.amount = amount;
  if (transactionId) result.transaction_id = transactionId;
  if (sessionId) result.session_id = sessionId;

  const masked = pickParam(
    params,
    'masked_card_number',
    'card_number_masked',
    'maskedcardnumber',
  );
  if (masked) result.masked_card_number = masked;

  const expiry = pickParam(params, 'card_expiry', 'expiry_date', 'expiry');
  if (expiry) result.card_expiry = expiry;

  const name = pickParam(params, 'cardholder_name', 'card_name', 'name_on_card');
  if (name) result.cardholder_name = name;

  return result;
}

export function isConvertQuotePaymentReturn(
  search: string | URLSearchParams,
): boolean {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;
  return (
    params.get('convert_quote') === '1' || params.get('convert_quote') === 'true'
  );
}

export function parsePaymentReturnParams(
  search: string | URLSearchParams,
): PaymentReturnParams {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;

  const status = parsePaymentReturnStatus(params);
  const windcaveResult = parseWindcaveResultFromParams(params);
  const convertQuote = isConvertQuotePaymentReturn(params);

  const bookingId = pickParam(params, 'booking_id', 'bookingid');
  let reservationRef = pickParam(
    params,
    'reservation_ref',
    'reservationref',
    'reservationRef',
    'rcm_reference_key',
  );
  if (!reservationRef && bookingIdQueryLooksLikeReservationRef(bookingId)) {
    reservationRef = bookingId;
  }

  return {
    status,
    windcaveResult,
    convertQuote,
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
    bookingId,
    reservationRef,
    cardType: pickParam(params, 'card_type', 'cardtype', 'CardType', 'cardbrand'),
    maskedCardNumber: pickParam(
      params,
      'masked_card_number',
      'card_number_masked',
      'maskedcardnumber',
      'cardno',
      'CardNumber',
    ),
    cardExpiry: pickParam(
      params,
      'card_expiry',
      'expiry_date',
      'expiry',
      'CardExpiry',
      'cardexpiry',
    ),
    cardholderName: pickParam(
      params,
      'cardholder_name',
      'card_name',
      'name_on_card',
      'CardHolderName',
      'cardholder',
    ),
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

/**
 * RCM `reservationref` from redirect — excludes short reservation numbers
 * (use {@link paymentReturnReservationNo} for display only).
 */
export function paymentReturnApiReference(p: PaymentReturnParams): string {
  const ref = p.reservationRef.trim();
  if (ref && !isLikelyRcmReservationNo(ref)) return ref;
  const bookingId = p.bookingId.trim();
  if (bookingIdQueryLooksLikeReservationRef(bookingId)) return bookingId;
  return '';
}

/**
 * Minimal payload for quote convert when backend already finalized on `/payments/complete`.
 */
export function buildWindcaveResultFromPaymentReturn(
  paymentReturn: PaymentReturnParams,
  search?: string | URLSearchParams,
): WindcaveResultPayload | null {
  if (paymentReturn.status !== 'success') return null;

  const params =
    search == null
      ? null
      : typeof search === 'string'
        ? new URLSearchParams(search)
        : search;

  const result: WindcaveResultPayload = paymentReturn.windcaveResult
    ? { ...paymentReturn.windcaveResult }
    : {
        success: true,
        status: 'success',
      };

  if (!result.success) result.success = true;
  if (!result.status) result.status = 'success';

  if (params) {
    const raw = pickParam(params, 'result');
    if (raw) result.result = raw;
  }
  if (paymentReturn.cardType) {
    result.card_type = paymentReturn.cardType;
    result.paytype = paymentReturn.cardType;
  }
  if (paymentReturn.maskedCardNumber) {
    result.masked_card_number = paymentReturn.maskedCardNumber;
  }
  if (paymentReturn.cardExpiry) {
    result.card_expiry = paymentReturn.cardExpiry;
  }
  if (paymentReturn.cardholderName) {
    result.cardholder_name = paymentReturn.cardholderName;
  }

  return result;
}

/**
 * Build app confirmation query from a payment-complete or API redirect URL.
 * Prefers `success_url` / `cancel_url` / `failed_url` when the user lands on the API host.
 */
export function resolvePaymentReturnSearchFromUrl(
  href: string,
): string | null {
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return null;
  }

  const path = parsed.pathname.replace(/\/$/, '') || '/';

  if (isCheckoutConfirmationPath(path)) {
    const params = parsePaymentReturnParams(parsed.search);
    if (params.status !== 'unknown' || parsed.search) {
      return parsed.search.startsWith('?')
        ? parsed.search
        : parsed.search
          ? `?${parsed.search}`
          : '?status=success';
    }
    return null;
  }

  if (!/\/payments\//i.test(path)) return null;

  const status = parsePaymentReturnStatus(parsed.searchParams);
  const pickRedirect = (): string | null => {
    if (status === 'cancelled') {
      return (
        parsed.searchParams.get('cancel_url')?.trim() ||
        parsed.searchParams.get('cancelUrl')?.trim() ||
        null
      );
    }
    if (status === 'failed') {
      return (
        parsed.searchParams.get('failed_url')?.trim() ||
        parsed.searchParams.get('failure_url')?.trim() ||
        parsed.searchParams.get('failedUrl')?.trim() ||
        null
      );
    }
    return (
      parsed.searchParams.get('success_url')?.trim() ||
      parsed.searchParams.get('successUrl')?.trim() ||
      null
    );
  };

  const redirectTarget = pickRedirect();
  if (redirectTarget) {
    try {
      const appUrl = new URL(normalizePaymentReturnToAppOrigin(redirectTarget));
      if (isCheckoutConfirmationPath(appUrl.pathname.replace(/\/$/, '') || '/')) {
        const merged = new URLSearchParams(appUrl.search);
        for (const [key, value] of parsed.searchParams.entries()) {
          if (!merged.has(key)) merged.set(key, value);
        }
        if (!merged.get('status') && status !== 'unknown') {
          merged.set('status', status);
        }
        const qs = merged.toString();
        return qs ? `?${qs}` : '?status=success';
      }
    } catch {
      // fall through
    }
  }

  const params = parsePaymentReturnParams(parsed.search);
  if (params.status === 'unknown') return null;
  return parsed.search.startsWith('?')
    ? parsed.search
    : parsed.search
      ? `?${parsed.search}`
      : null;
}

/** Reservation ref for API lookup (`/bookings/by-reference`). */
export function paymentReturnReference(p: PaymentReturnParams): string {
  const apiRef = paymentReturnApiReference(p);
  if (apiRef) return apiRef;
  return (
    paymentReturnReservationNo(p) ||
    p.confirmationNumber ||
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
