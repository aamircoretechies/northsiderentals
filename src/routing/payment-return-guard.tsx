import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { resolvePaymentApiBaseUrl } from '@/lib/payment-api-url';
import { getAppOrigin, normalizePaymentReturnToAppOrigin } from '@/utils/app-origin';
import {
  isCheckoutConfirmationPath,
  resolvePaymentReturnSearchFromUrl,
} from '@/utils/payment-return';

/** App routes that must never be hijacked by payment-return handling. */
const PROTECTED_APP_PATH_PREFIXES = [
  '/bookings',
  '/express-checkin',
  '/home',
  '/cars/checkout/options',
  '/cars/checkout/details',
  '/cars/checkout/payment',
] as const;

function isProtectedAppRoute(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  return PROTECTED_APP_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function getConfiguredPaymentApiOrigin(): string {
  try {
    const base = resolvePaymentApiBaseUrl();
    if (!/^https?:\/\//i.test(base)) return '';
    return new URL(`${base}/`).origin;
  } catch {
    return '';
  }
}

/**
 * When Windcave or the API redirects to the backend host with payment query params,
 * send the user to the in-app confirmation route.
 *
 * Does NOT run on `/bookings/modify?reservation_ref=…` — that query param is for
 * booking management, not a payment return (misreading it caused the quotation popup).
 */
export function PaymentReturnGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const pathname = location.pathname.replace(/\/$/, '') || '/';
    const search = location.search;

    if (isCheckoutConfirmationPath(pathname)) return;

    if (isProtectedAppRoute(pathname)) return;

    const onPaymentsComplete =
      pathname.includes('/payments/complete') ||
      pathname.endsWith('/payments/complete');

    if (!search && !pathname.includes('/payments/')) return;

    const params = new URLSearchParams(search);

    const hasPaymentReturnParams =
      params.has('status') ||
      params.has('payment_status') ||
      params.has('result') ||
      params.has('booking_id') ||
      params.has('confirmation_number') ||
      params.has('card_type') ||
      params.has('success_url') ||
      params.has('cancel_url') ||
      params.has('failed_url') ||
      params.has('failure_url') ||
      onPaymentsComplete;

    if (!hasPaymentReturnParams) return;

    const appOrigin = getAppOrigin();
    const paymentApiOrigin = getConfiguredPaymentApiOrigin();
    const onPaymentApiHost =
      Boolean(paymentApiOrigin) &&
      typeof window !== 'undefined' &&
      window.location.origin === paymentApiOrigin;
    const onApiHost =
      typeof window !== 'undefined' &&
      Boolean(appOrigin) &&
      window.location.origin !== appOrigin;

    if (!onPaymentApiHost && !onApiHost && !onPaymentsComplete) return;

    const resolvedSearch = resolvePaymentReturnSearchFromUrl(
      `${window.location.origin}${location.pathname}${search}`,
    );

    if (resolvedSearch) {
      try {
        const url = new URL(
          normalizePaymentReturnToAppOrigin(
            `${appOrigin}/cars/checkout/success${resolvedSearch}`,
          ),
        );
        navigate(`${url.pathname}${url.search}`, { replace: true });
      } catch {
        navigate(`/cars/checkout/success${resolvedSearch}`, { replace: true });
      }
      return;
    }

    if (onPaymentsComplete || onPaymentApiHost || onApiHost) {
      const target = normalizePaymentReturnToAppOrigin(
        `${appOrigin}/cars/checkout/success${search}`,
      );
      try {
        const url = new URL(target);
        navigate(`${url.pathname}${url.search}`, { replace: true });
      } catch {
        navigate(`/cars/checkout/success${search}`, { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate]);

  return null;
}
