import { getAuth } from '@/auth/lib/helpers';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  '';

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

function assertOk(json: Record<string, unknown>): void {
  if (
    json.status !== undefined &&
    json.status !== 1 &&
    json.status !== '1'
  ) {
    const msg =
      typeof json.message === 'string' ? json.message : 'Change password failed';
    throw new Error(msg);
  }
}

export async function changePasswordApi(
  body: ChangePasswordPayload,
): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const auth = getAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth?.access_token) {
    headers.Authorization = `Bearer ${auth.access_token}`;
  }

  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let payload: Record<string, unknown> | null = null;
  if (text.trim()) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const msg =
      (payload?.message as string) ||
      (payload?.error as string) ||
      (text.trim() ? text.slice(0, 200) : `Request failed: ${res.status}`);
    throw new Error(msg);
  }

  if (payload) assertOk(payload);
}
