import {
  assertPublicPaymentReturnUrl,
  getAppOrigin,
  normalizePaymentReturnToAppOrigin,
} from '@/utils/app-origin';

/** Persist checkout context across Windcave → backend complete → app confirmation redirects. */

export const CHECKOUT_PENDING_BOOKING_KEY = 'checkout_pending_booking';

export interface CheckoutPendingState {
  booking: Record<string, unknown>;
  formData?: Record<string, unknown>;
  carData?: Record<string, unknown>;
  searchParams?: Record<string, unknown>;
  locations?: unknown[];
  paymentUrl?: string;
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
 * App route the backend redirects to after `POST /payments/complete` (Windcave return).
 * Set `VITE_PAYMENT_SUCCESS_REDIRECT` to override (e.g. https://yourapp.com/booking/confirmation).
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

/** Cancel / failure return — same confirmation route with status query for UI handling. */
export function buildCheckoutPaymentCancelUrl(): string {
  const base = buildCheckoutConfirmationUrl();
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}status=cancelled`;
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
