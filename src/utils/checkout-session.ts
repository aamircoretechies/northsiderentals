import {
  extractReservationRef,
  mergeCreateBookingForUiState,
} from '@/services/booking-payload';
import { normalizePaymentUrlApiHost } from '@/lib/payment-api-url';
import {
  assertPublicPaymentReturnUrl,
  getAppOrigin,
  normalizePaymentReturnToAppOrigin,
} from '@/utils/app-origin';
import {
  extractRcmReservationRefFromRecord,
  pickRcmReservationRef,
  resolveReservationRef,
} from '@/utils/reservation-context';

export interface PaymentReturnUrlOptions {
  convertQuote?: boolean;
}

/** Persist checkout context across Windcave → backend complete → app confirmation redirects. */

export const CHECKOUT_PENDING_BOOKING_KEY = 'checkout_pending_booking';

export interface CheckoutPendingState {
  booking: Record<string, unknown>;
  formData?: Record<string, unknown>;
  carData?: Record<string, unknown>;
  searchParams?: Record<string, unknown>;
  locations?: unknown[];
  paymentUrl?: string;
  /** Quote → booking: convert after Windcave return */
  convertQuote?: boolean;
  reservation_ref?: string;
}

export function saveCheckoutPendingState(state: CheckoutPendingState): void {
  try {
    sessionStorage.setItem(CHECKOUT_PENDING_BOOKING_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function loadCheckoutPendingState(): CheckoutPendingState | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_PENDING_BOOKING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutPendingState;
    if (!parsed?.booking || typeof parsed.booking !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCheckoutPendingState(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_PENDING_BOOKING_KEY);
  } catch {
    // ignore
  }
}

/**
 * RCM `reservationref` for payment poll / by-reference API — never internal `booking_id`.
 */
/** Same booking shape as new-booking checkout (`details-content`) for `/cars/checkout/payment`. */
export function buildCheckoutPaymentBooking(
  reservationRef: string,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const ref = reservationRef.trim();
  return mergeCreateBookingForUiState({
    reservation_ref: ref,
    reservationref: ref,
    rcm_reference_key: ref,
    ...extra,
  });
}

/** Persist payment session the same way as booking create, optional quote-convert flag. */
export function saveCheckoutPaymentSession(options: {
  reservationRef: string;
  paymentUrl: string;
  booking?: Record<string, unknown>;
  formData?: Record<string, unknown>;
  carData?: Record<string, unknown>;
  searchParams?: Record<string, unknown>;
  locations?: unknown[];
  convertQuote?: boolean;
}): CheckoutPendingState {
  const booking =
    options.booking ??
    buildCheckoutPaymentBooking(options.reservationRef, {
      bookingtype: options.convertQuote ? 2 : undefined,
    });
  const paymentUrl = normalizeHostedPaymentUrlForRcm(
    options.paymentUrl,
    options.reservationRef,
  );
  const state: CheckoutPendingState = {
    booking,
    formData: options.formData,
    carData: options.carData,
    searchParams: options.searchParams,
    locations: options.locations,
    paymentUrl,
    reservation_ref: options.reservationRef,
    convertQuote: options.convertQuote,
  };
  saveCheckoutPendingState(state);
  return state;
}

function firstWorkflowBookingInfo(
  booking?: Record<string, unknown> | null,
): Record<string, unknown> | undefined {
  const info = booking?.bookinginfo;
  if (!Array.isArray(info) || info.length === 0) return undefined;
  const row = info[0];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return undefined;
  return row as Record<string, unknown>;
}

export function resolveCheckoutReservationRef(
  booking?: Record<string, unknown> | null,
  pending?: CheckoutPendingState | null,
): string {
  const fromPendingTop = String(pending?.reservation_ref ?? '').trim();
  const fromPendingBooking = extractRcmReservationRefFromRecord(pending?.booking);
  const fromSession = resolveReservationRef();
  const fromBooking =
    extractReservationRef(booking) ||
    pickRcmReservationRef('', firstWorkflowBookingInfo(booking), booking);

  return resolveReservationRef(
    fromPendingTop || fromPendingBooking || fromSession || fromBooking,
  );
}

/**
 * App route the backend redirects to after `GET /payments/complete` (Windcave return).
 * Backend appends e.g. `?booking_id={reservation_ref}&status=success` (booking_id may be reservation_ref).
 * Set `VITE_PAYMENT_SUCCESS_REDIRECT` to match API `PAYMENT_SUCCESS_REDIRECT`.
 */
export function buildCheckoutConfirmationUrl(): string {
  const origin = getAppOrigin();
  const fromEnv = import.meta.env.VITE_PAYMENT_SUCCESS_REDIRECT?.trim();
  let url: string;
  if (fromEnv) {
    if (/^https?:\/\//i.test(fromEnv)) {
      url = fromEnv;
    } else {
      url = `${origin}${fromEnv.startsWith('/') ? fromEnv : `/${fromEnv}`}`;
    }
  } else {
    url = `${origin}/cars/checkout/success`;
  }
  return assertPublicPaymentReturnUrl(url);
}

/** Payment success URL when converting a quote (triggers convert on return). */
export function buildQuoteConvertConfirmationUrl(): string {
  const base = buildCheckoutConfirmationUrl();
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}convert_quote=1`;
}

/** Cancel return — Windcave redirects here after user cancels on hosted page. */
export function buildCheckoutPaymentCancelUrl(
  options?: PaymentReturnUrlOptions,
): string {
  const base = options?.convertQuote
    ? buildQuoteConvertConfirmationUrl()
    : buildCheckoutConfirmationUrl();
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}status=cancelled`;
}

/** Failure return URL for Windcave / payments API. */
export function buildCheckoutPaymentFailureUrl(
  options?: PaymentReturnUrlOptions,
): string {
  const base = options?.convertQuote
    ? buildQuoteConvertConfirmationUrl()
    : buildCheckoutConfirmationUrl();
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}status=failed`;
}

/**
 * @deprecated Use {@link WindcavePaymentModal} in-app instead. Opens a new tab (debug only).
 * Falls back to same-tab navigation if the popup is blocked.
 */
export function openWindcavePaymentInNewTab(
  paymentUrl: string,
  reservationRef?: string,
): 'tab' | 'same-tab' {
  const normalized = reservationRef
    ? normalizeHostedPaymentUrlForRcm(paymentUrl, reservationRef)
    : paymentUrl.trim();
  const target = normalizePaymentReturnToAppOrigin(normalized);
  const opened = window.open(target, '_blank', 'noopener,noreferrer');
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // ignore
    }
    return 'tab';
  }
  window.location.assign(target);
  return 'same-tab';
}

/** Segment after `/payments/` in hosted payment URL (UUID, numeric id, or reservationref). */
export function extractPaymentUrlPathId(url: string): string {
  try {
    const { pathname } = new URL(url);
    const match = pathname.match(/\/payments\/([^/]+)/i);
    return match ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}

function isInternalPaymentBookingId(segment: string, reservationRef: string): boolean {
  const s = segment.trim();
  const ref = reservationRef.trim();
  if (!s || !ref || s === ref) return false;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
  ) {
    return true;
  }
  if (/^\d+$/.test(s)) return true;
  return false;
}

/** Payment URL uses internal id in path — `/payments/complete` will get "Booking not found". */
export function paymentUrlNeedsReservationRef(url: string, reservationRef: string): boolean {
  return isInternalPaymentBookingId(extractPaymentUrlPathId(url), reservationRef);
}

/** @deprecated Use {@link paymentUrlNeedsReservationRef} */
export function hostedPaymentUrlUsesBookingIdPath(url: string): boolean {
  const segment = extractPaymentUrlPathId(url);
  return /^\d+$/.test(segment);
}

/** Rewrite `/payments/{uuid}` → `/payments/{reservationref}` so Windcave complete uses RCM ref. */
export function rewritePaymentUrlWithReservationRef(
  paymentUrl: string,
  reservationRef: string,
): string {
  const ref = reservationRef.trim();
  if (!ref) return paymentUrl.trim();
  try {
    const parsed = new URL(paymentUrl);
    parsed.pathname = parsed.pathname.replace(
      /\/payments\/[^/]+/i,
      `/payments/${encodeURIComponent(ref)}`,
    );
    return parsed.href;
  } catch {
    return paymentUrl.trim();
  }
}

export function normalizeHostedPaymentUrlForRcm(
  paymentUrl: string,
  reservationRef: string,
): string {
  const trimmed = normalizePaymentUrlApiHost(paymentUrl.trim());
  const ref = reservationRef.trim();
  if (!trimmed || !ref) return trimmed;
  if (paymentUrlNeedsReservationRef(trimmed, ref)) {
    return rewritePaymentUrlWithReservationRef(trimmed, ref);
  }
  return trimmed;
}

export function isCheckoutConfirmationUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizePaymentReturnToAppOrigin(url), getAppOrigin());
    const path = parsed.pathname.replace(/\/$/, '') || '/';
    return (
      path === '/cars/checkout/success' ||
      path === '/booking/confirmation' ||
      path.endsWith('/booking/confirmation')
    );
  } catch {
    return (
      url.includes('/cars/checkout/success') ||
      url.includes('/booking/confirmation')
    );
  }
}
