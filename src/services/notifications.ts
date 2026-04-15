import { getAuth } from '@/auth/lib/helpers';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  '';

function authJsonHeaders(): HeadersInit {
  const auth = getAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth?.access_token) {
    headers.Authorization = `Bearer ${auth.access_token}`;
  }
  return headers;
}

function assertEnvelope(json: Record<string, unknown>): void {
  if (
    json.status !== undefined &&
    json.status !== 1 &&
    json.status !== '1'
  ) {
    const msg =
      typeof json.message === 'string' ? json.message : 'Notification request failed';
    throw new Error(msg);
  }
}

export interface RcmNotification {
  notification_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

function parseNotification(raw: Record<string, unknown>): RcmNotification {
  return {
    notification_id: String(raw.notification_id ?? ''),
    title: String(raw.title ?? ''),
    message: String(raw.message ?? ''),
    type: String(raw.type ?? ''),
    is_read: Boolean(raw.is_read),
    created_at: String(raw.created_at ?? ''),
  };
}

function parseNotificationList(data: unknown): RcmNotification[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => parseNotification(row as Record<string, unknown>));
}

export const notificationsService = {
  /** Paginated list: `GET /notifications/list?page=&limit=` */
  async list(page = 1, limit = 20): Promise<RcmNotification[]> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const res = await fetch(
      `${API_BASE}/notifications/list?page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`,
      { method: 'GET', headers: authJsonHeaders() },
    );

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Notifications list failed: ${res.status} ${text}`);
    }

    const json = JSON.parse(text) as Record<string, unknown>;
    assertEnvelope(json);
    return parseNotificationList(json.data);
  },

  /** Full list when supported: `GET /notifications/` */
  async fetchRoot(): Promise<RcmNotification[]> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const res = await fetch(`${API_BASE}/notifications/`, {
      method: 'GET',
      headers: authJsonHeaders(),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Notifications fetch failed: ${res.status} ${text}`);
    }

    const json = JSON.parse(text) as Record<string, unknown>;
    assertEnvelope(json);
    const data = json.data;
    if (Array.isArray(data)) return parseNotificationList(data);
    if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
      return parseNotificationList((data as { items: unknown[] }).items);
    }
    return [];
  },

  /** `PUT /notifications/mark-all-read` — marks every notification read for the user */
  async markAllRead(): Promise<void> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'PUT',
      headers: authJsonHeaders(),
      body: JSON.stringify({}),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Mark all read failed: ${res.status} ${text}`);
    }

    if (!text.trim()) return;
    const json = JSON.parse(text) as Record<string, unknown>;
    assertEnvelope(json);
  },

  /** `POST /notifications/mark-read` */
  async markRead(notificationId: string): Promise<RcmNotification> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const res = await fetch(`${API_BASE}/notifications/mark-read`, {
      method: 'POST',
      headers: authJsonHeaders(),
      body: JSON.stringify({ notification_id: notificationId }),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Mark read failed: ${res.status} ${text}`);
    }

    const json = JSON.parse(text) as Record<string, unknown>;
    assertEnvelope(json);
    const row = json.data as Record<string, unknown> | undefined;
    if (!row) throw new Error('Mark read response missing data');
    return parseNotification(row);
  },

  /** `DELETE /notifications/clear-all` — returns deleted count when present */
  async clearAll(): Promise<number> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const headers = { ...authJsonHeaders() } as Record<string, string>;
    delete headers['Content-Type'];

    const res = await fetch(`${API_BASE}/notifications/clear-all`, {
      method: 'DELETE',
      headers,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Clear all failed: ${res.status} ${text}`);
    }

    if (!text.trim()) return 0;
    const json = JSON.parse(text) as Record<string, unknown>;
    assertEnvelope(json);
    const data = json.data as Record<string, unknown> | undefined;
    const n = data?.deleted_count;
    return n != null ? Number(n) : 0;
  },

  /** `DELETE /notifications/delete` — body must include `notification_id` */
  async remove(notificationId: string): Promise<void> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');
    const id = String(notificationId ?? '').trim();
    if (!id) throw new Error('notification_id is required');

    const res = await fetch(`${API_BASE}/notifications/delete`, {
      method: 'DELETE',
      headers: authJsonHeaders(),
      body: JSON.stringify({ notification_id: id }),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Delete notification failed: ${res.status} ${text}`);
    }

    if (!text.trim()) return;
    const json = JSON.parse(text) as Record<string, unknown>;
    assertEnvelope(json);
  },
};
