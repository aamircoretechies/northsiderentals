import { apiJson } from '@/utils/api-client';
import { getFriendlyErrorMessage } from '@/utils/api-error-handler';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  '';

function assertEnvelope(json: Record<string, unknown>): void {
  if (
    json.status !== undefined &&
    json.status !== 1 &&
    json.status !== '1'
  ) {
    throw new Error(
      getFriendlyErrorMessage({
        message: json.message,
        fallback: 'Could not process notifications right now.',
      }),
    );
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

    const json = await apiJson<Record<string, unknown>>(
      `${API_BASE}/notifications/list?page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`,
      { method: 'GET', auth: 'optional', fallbackError: 'Could not load notifications.' },
    );
    assertEnvelope(json);
    return parseNotificationList(json.data);
  },

  /** Full list when supported: `GET /notifications/` */
  async fetchRoot(): Promise<RcmNotification[]> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const json = await apiJson<Record<string, unknown>>(`${API_BASE}/notifications/`, {
      method: 'GET',
      auth: 'optional',
      fallbackError: 'Could not load notifications.',
    });
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

    const json = await apiJson<Record<string, unknown> | null>(`${API_BASE}/notifications/mark-all-read`, {
      method: 'PUT',
      auth: 'optional',
      body: {},
      fallbackError: 'Could not mark notifications as read.',
    });
    if (!json) return;
    assertEnvelope(json);
  },

  /** `POST /notifications/mark-read` */
  async markRead(notificationId: string): Promise<RcmNotification> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const json = await apiJson<Record<string, unknown>>(`${API_BASE}/notifications/mark-read`, {
      method: 'POST',
      auth: 'optional',
      body: { notification_id: notificationId },
      fallbackError: 'Could not update notification status.',
    });
    assertEnvelope(json);
    const row = json.data as Record<string, unknown> | undefined;
    if (!row) throw new Error('Mark read response missing data');
    return parseNotification(row);
  },

  /** `DELETE /notifications/clear-all` — returns deleted count when present */
  async clearAll(): Promise<number> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const json = await apiJson<Record<string, unknown> | null>(`${API_BASE}/notifications/clear-all`, {
      method: 'DELETE',
      auth: 'optional',
      fallbackError: 'Could not clear notifications.',
    });
    if (!json) return 0;
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

    const json = await apiJson<Record<string, unknown> | null>(`${API_BASE}/notifications/delete`, {
      method: 'DELETE',
      auth: 'optional',
      body: { notification_id: id },
      fallbackError: 'Could not delete notification.',
    });
    if (!json) return;
    assertEnvelope(json);
  },
};
