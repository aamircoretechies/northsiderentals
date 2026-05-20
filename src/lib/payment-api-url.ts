import { getApiBaseUrl } from '@/lib/api-base';

/** Legacy / test hosts — must not be used when `VITE_API_BASE_URL` points at Northside. */
export const STALE_PAYMENT_API_HOSTS = ['rcm-api.coretechiestest.org'] as const;

/**
 * Base URL for `/payments/*` routes: absolute `VITE_API_BASE_URL` in prod,
 * or `{devOrigin}/api/v1` when dev uses the Vite proxy.
 */
export function resolvePaymentApiBaseUrl(): string {
  const raw = getApiBaseUrl();
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${window.location.origin}${path}`.replace(/\/$/, '');
  }
  return raw.replace(/\/$/, '');
}

/** True for our API-hosted payment pages (not Windcave/DPS domains). */
export function isInternalApiPaymentUrl(url: string): boolean {
  try {
    const { pathname, hostname } = new URL(url);
    if (!/\/payments\//i.test(pathname)) return false;
    if (/windcave|securesuite|\.dps\./i.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Rewrites payment URLs that still point at the wrong API host (e.g. test RCM API)
 * to the host configured in `VITE_API_BASE_URL` / dev proxy.
 */
export function normalizePaymentUrlApiHost(paymentUrl: string): string {
  const trimmed = paymentUrl.trim();
  if (!trimmed || !isInternalApiPaymentUrl(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const apiBase = resolvePaymentApiBaseUrl();
    const expectedOrigin = new URL(`${apiBase}/`).origin;
    const isStaleHost = (STALE_PAYMENT_API_HOSTS as readonly string[]).includes(
      parsed.hostname,
    );
    const wrongOrigin = parsed.origin !== expectedOrigin;

    if (!isStaleHost && !wrongOrigin) return trimmed;

    const pathMatch = parsed.pathname.match(/(\/payments\/.*)$/i);
    const paymentSuffix = pathMatch ? pathMatch[1] : parsed.pathname;
    const basePath = new URL(`${apiBase}/`).pathname.replace(/\/$/, '');
    const path = paymentSuffix.startsWith(basePath)
      ? paymentSuffix
      : `${basePath}${paymentSuffix}`;

    if (import.meta.env.DEV) {
      console.warn(
        `[payment] Rewrote payment URL host ${parsed.origin} → ${expectedOrigin} (use ${apiBase}, not test API)`,
      );
    }

    return `${expectedOrigin}${path}${parsed.search}${parsed.hash}`;
  } catch {
    return trimmed;
  }
}
