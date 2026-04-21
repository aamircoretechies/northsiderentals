export const throttle = (
  func: (...args: unknown[]) => void,
  limit: number,
): ((...args: unknown[]) => void) => {
  let lastFunc: ReturnType<typeof setTimeout> | null = null;
  let lastRan: number | null = null;

  return function (this: unknown, ...args: unknown[]) {
    if (lastRan === null) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      if (lastFunc !== null) {
        clearTimeout(lastFunc);
      }
      lastFunc = setTimeout(
        () => {
          if (Date.now() - (lastRan as number) >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - (lastRan as number)),
      );
    }
  };
};

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function uid(): string {
  return (Date.now() + Math.floor(Math.random() * 1000)).toString();
}

export function getInitials(
  name: string | null | undefined,
  count?: number,
): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase());

  return count && count > 0
    ? initials.slice(0, count).join('')
    : initials.join('');
}

export function toAbsoluteUrl(pathname: string): string {
  const baseUrl = import.meta.env.BASE_URL;

  if (baseUrl && baseUrl !== '/') {
    return import.meta.env.BASE_URL + pathname;
  } else {
    return pathname;
  }
}

/** CDN / API image URLs (e.g. `//host/path`) → usable absolute https URL. */
export function normalizeMediaUrl(url: string): string {
  const raw = url?.trim();
  if (!raw) return '';
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return toAbsoluteUrl(raw);
}

/** Relative paths from the booking API (e.g. `/uploads/...`) → absolute URL using `VITE_API_BASE_URL`. */
export function resolveApiAssetUrl(path: string): string {
  const raw = path?.trim();
  if (!raw) return '';
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    '',
  );
  if (!base) return raw.startsWith('/') ? raw : `/${raw}`;
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

/**
 * Public files on the RCM host (e.g. `/uploads/profile/...` → `https://host/uploads/...`).
 * Prefers the origin derived from `VITE_API_BASE_URL` (strip `/api/v1`) so media stays on the
 * same server as the API; falls back to `VITE_BASE_URL`, then `resolveApiAssetUrl`.
 */
export function resolveRcmPublicUrl(path: string): string {
  const raw = path?.trim();
  if (!raw) return '';
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    '',
  );
  const fromApiOrigin = apiBase?.replace(/\/api\/v1\/?$/i, '') || '';
  const envOrigin =
    (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';

  const base = fromApiOrigin || envOrigin || '';
  if (!base) return resolveApiAssetUrl(raw);
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

/** Origin used for RCM-hosted static/media files (API base with `/api/v1` stripped, or `VITE_BASE_URL`). */
function getRcmMediaOrigin(): string | null {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    '',
  );
  const envOrigin = (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(
    /\/$/,
    '',
  );

  const fromApi = apiBase?.replace(/\/api\/v1\/?$/i, '') || '';
  const candidate = fromApi || envOrigin || '';
  if (!candidate) return null;

  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    try {
      return new URL(candidate).origin;
    } catch {
      return null;
    }
  }
  if (typeof window !== 'undefined') {
    try {
      return new URL(candidate, window.location.origin).origin;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Whether profile/media URLs should be loaded with `Authorization` via `fetch` + blob URL.
 * Relative `/uploads/...` always; absolute `https` only when same origin as RCM media host and
 * path contains `/uploads/` (plain `<img>` cannot send Bearer, so direct URLs often 403).
 */
export function shouldAuthFetchMediaUrl(url: string): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return false;

  let abs = raw;
  if (raw.startsWith('//')) abs = `https:${raw}`;

  const pathnameHasUploads = (pathname: string) => {
    const p = pathname.toLowerCase();
    return p.startsWith('/uploads/') || p.includes('/uploads/');
  };

  if (!abs.startsWith('http://') && !abs.startsWith('https://')) {
    const path = abs.startsWith('/') ? abs : `/${abs}`;
    return pathnameHasUploads(path);
  }

  try {
    const u = new URL(abs);
    if (!pathnameHasUploads(u.pathname)) return false;
    const mediaOrigin = getRcmMediaOrigin();
    if (mediaOrigin) return u.origin === mediaOrigin;
    if (typeof window !== 'undefined' && u.origin === window.location.origin) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  const diff = Math.floor((now.getTime() - inputDate.getTime()) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600)
    return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) > 1 ? 's' : ''} ago`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
  if (diff < 604800)
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
  if (diff < 2592000)
    return `${Math.floor(diff / 604800)} week${Math.floor(diff / 604800) > 1 ? 's' : ''} ago`;
  if (diff < 31536000)
    return `${Math.floor(diff / 2592000)} month${Math.floor(diff / 2592000) > 1 ? 's' : ''} ago`;

  return `${Math.floor(diff / 31536000)} year${Math.floor(diff / 31536000) > 1 ? 's' : ''} ago`;
}

export function formatDate(input: Date | string | number): string {
  const date = new Date(input);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(input: Date | string | number): string {
  const date = new Date(input);
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
}
