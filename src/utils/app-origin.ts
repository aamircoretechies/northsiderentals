/**
 * Resolve the public app origin for payment return URLs.
 * Prevents Windcave/backend redirects to localhost when the user is on a public site
 * (Chrome Private Network Access blocks public → private navigation).
 */

function isPrivateNetworkHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (!h) return false;
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local')) {
    return true;
  }
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    return isPrivateNetworkHost(new URL(origin).hostname);
  } catch {
    return false;
  }
}

/** Origin used for success/cancel URLs sent to the payment API. */
export function getAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    try {
      const parsed = new URL(fromEnv);
      const pageIsPublic =
        typeof window !== 'undefined' &&
        window.location?.hostname &&
        !isPrivateNetworkHost(window.location.hostname);
      if (pageIsPublic && isPrivateNetworkHost(parsed.hostname)) {
        return window.location.origin;
      }
      return parsed.origin;
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

/**
 * If the return URL points at a private host but the user is on a public site,
 * keep pathname + query on the current app origin (backend misconfigured redirect).
 */
export function normalizePaymentReturnToAppOrigin(returnUrl: string): string {
  const appOrigin = getAppOrigin();
  if (!appOrigin) return returnUrl;

  try {
    const parsed = new URL(returnUrl);
    const pageHost =
      typeof window !== 'undefined' ? window.location.hostname : '';
    const pageIsPublic = Boolean(pageHost) && !isPrivateNetworkHost(pageHost);
    if (pageIsPublic && isPrivateNetworkHost(parsed.hostname)) {
      const path = parsed.pathname || '/cars/checkout/success';
      return `${appOrigin}${path}${parsed.search}${parsed.hash}`;
    }
    return parsed.href;
  } catch {
    return returnUrl;
  }
}

export function assertPublicPaymentReturnUrl(url: string): string {
  const normalized = normalizePaymentReturnToAppOrigin(url);
  try {
    const parsed = new URL(normalized);
    const pageHost =
      typeof window !== 'undefined' ? window.location.hostname : '';
    if (
      pageHost &&
      !isPrivateNetworkHost(pageHost) &&
      isPrivateNetworkHost(parsed.hostname)
    ) {
      throw new Error(
        'Payment return URL must use your public site address, not localhost or a private IP. Set VITE_PUBLIC_APP_URL or fix the API success_url redirect.',
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('Payment return URL')) throw e;
  }
  return normalized;
}

export { isPrivateNetworkHost, isLocalDevOrigin };
