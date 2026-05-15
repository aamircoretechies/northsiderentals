/**
 * Shared API base URL — must be set in production via VITE_API_BASE_URL.
 */

export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!raw) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }
  return raw.replace(/\/$/, '');
}
