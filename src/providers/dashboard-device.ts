import { RegisterDeviceRequest } from '@/services/dashboard';

const DEVICE_ID_STORAGE_KEY = `${import.meta.env.VITE_APP_NAME || 'app'}-device-id`;

function createLocalDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `web-${Date.now().toString(36)}-${rand}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'web-client';
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)?.trim();
    if (existing) return existing;
    const next = createLocalDeviceId();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, next);
    return next;
  } catch {
    return createLocalDeviceId();
  }
}

export function rotateDeviceId(): string {
  const next = createLocalDeviceId();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, next);
    } catch {
      // ignore storage write errors; still return a new in-memory id for this request
    }
  }
  return next;
}

export function isDeviceIdConflictError(error: unknown): boolean {
  const parts: string[] = [];
  if (error instanceof Error) parts.push(error.message);
  if (error && typeof error === 'object') {
    const rec = error as Record<string, unknown>;
    if (typeof rec.message === 'string') parts.push(rec.message);
    const data = rec.responseData;
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (typeof d.message === 'string') parts.push(d.message);
    }
  }
  parts.push(String(error ?? ''));
  const msg = parts.join('\n').toLowerCase();
  if (!msg) return false;
  return (
    msg.includes('device_id') &&
    (msg.includes('unique') || msg.includes('duplicate'))
  );
}

export const defaultDevicePayload = (): RegisterDeviceRequest => ({
  fcm_token: 'web-fcm-token',
  device_id: getOrCreateDeviceId(),
  device_type: 'web',
  device_name:
    typeof navigator !== 'undefined' ? navigator.userAgent : 'web-client',
  device_os_version:
    typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
  app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
});
