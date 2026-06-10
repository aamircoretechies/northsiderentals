/**
 * Build a `URL` for calling the API. Supports absolute `VITE_API_BASE_URL` (https://host/…/api/v1)
 * and same-origin bases used with the Vite dev proxy (`/api/v1`).
 *
 * `new URL('/api/v1/foo')` throws in the browser — a single string must be absolute — so callers
 * must use this helper whenever they need `URL` + `searchParams`.
 */
export function createApiUrl(path: string): URL {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!raw) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }

  const base = raw.replace(/\/$/, '');
  const segment = path.replace(/^\//, '');
  const joined = `${base}/${segment}`;

  if (/^https?:\/\//i.test(joined)) {
    return new URL(joined);
  }

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost';

  const pathname = joined.startsWith('/') ? joined : `/${joined}`;
  return new URL(pathname, origin);
}
