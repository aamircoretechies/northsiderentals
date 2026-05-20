import { extractReservationReferenceFromEnvelope } from '@/services/bookings';
import { isLikelyRcmReservationNo } from '@/utils/reservation-no';

/**
 * Persist RCM `reservation_ref` from quote/booking create through Windcave pay + convert.
 */

export const RESERVATION_CONTEXT_KEY = 'nr_reservation_context';

export type ReservationContextMode = 'quote' | 'convert-quote' | 'checkout' | 'booking';

export interface ReservationContext {
  reservation_ref: string;
  reservation_no?: string;
  mode?: ReservationContextMode;
  updated_at?: number;
}

/** RCM reservationref only — never `booking_id` / `bookingid`. */
export function extractRcmReservationRefFromRecord(
  record?: Record<string, unknown> | null,
): string {
  if (!record) return '';
  const internalId = String(record.booking_id ?? record.bookingid ?? '').trim();
  const candidates = [
    record.rcm_reference_key,
    record.reservationref,
    record.reservation_ref,
    record.ReservationRef,
    record.reservationRef,
    record.reference_key,
    record.reference,
  ];
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (!s || (internalId && s === internalId)) continue;
    return s;
  }
  return '';
}

export function saveReservationContext(ctx: ReservationContext): void {
  const ref = String(ctx.reservation_ref ?? '').trim();
  if (!ref) return;
  try {
    sessionStorage.setItem(
      RESERVATION_CONTEXT_KEY,
      JSON.stringify({
        ...ctx,
        reservation_ref: ref,
        updated_at: Date.now(),
      } satisfies ReservationContext),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function loadReservationContext(): ReservationContext | null {
  try {
    const raw = sessionStorage.getItem(RESERVATION_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReservationContext;
    const ref = String(parsed?.reservation_ref ?? '').trim();
    if (!ref) return null;
    return { ...parsed, reservation_ref: ref };
  } catch {
    return null;
  }
}

export function clearReservationContext(): void {
  try {
    sessionStorage.removeItem(RESERVATION_CONTEXT_KEY);
  } catch {
    // ignore
  }
}

/** True when value is a short display number, not an RCM `reservationref` key. */
export function isShortReservationNo(value: string): boolean {
  return isLikelyRcmReservationNo(value.trim());
}

/**
 * RCM `reservationref` for API calls (`/bookings/by-reference`, `/bookings/edit`, convert).
 * Prefers session when the URL only has a short reservation number.
 */
export function resolveReservationRef(explicit?: string | null): string {
  const fromSession = loadReservationContext()?.reservation_ref ?? '';
  const direct = String(explicit ?? '').trim();

  if (direct && !isShortReservationNo(direct)) return direct;
  if (fromSession && !isShortReservationNo(fromSession)) return fromSession;
  if (fromSession) return fromSession;
  return direct;
}

/**
 * RCM `reservationref` for API/payment/convert — never internal `booking_id`.
 * Prefers workflow/detail ref over route query (often booking id or short res no).
 */
export function pickRcmReservationRef(
  routeOrQueryRef: string,
  bookingInfo?: Record<string, unknown> | null,
  detailEnvelope?: Record<string, unknown> | null,
): string {
  const fromWorkflow = extractRcmReservationRefFromRecord(bookingInfo);
  const fromDetail = detailEnvelope
    ? extractReservationReferenceFromEnvelope(detailEnvelope)
    : extractRcmReservationRefFromRecord(detailEnvelope);
  const fromApi = fromWorkflow || fromDetail;

  const fromRoute = String(routeOrQueryRef ?? '').trim();
  const internalId = String(
    bookingInfo?.booking_id ?? bookingInfo?.bookingid ?? detailEnvelope?.booking_id ?? '',
  ).trim();
  const routeIsBookingId = Boolean(internalId && fromRoute === internalId);
  const safeRoute =
    fromRoute && !routeIsBookingId && !isShortReservationNo(fromRoute) ? fromRoute : '';

  if (fromApi) {
    if (!safeRoute || isShortReservationNo(safeRoute) || routeIsBookingId) return fromApi;
    return fromApi;
  }
  if (safeRoute) return safeRoute;
  if (fromRoute && !routeIsBookingId) return fromRoute;
  return '';
}
