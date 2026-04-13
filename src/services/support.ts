import { getAuth } from '@/auth/lib/helpers';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  '';

function assertOk(json: Record<string, unknown>): void {
  if (
    json.status !== undefined &&
    json.status !== 1 &&
    json.status !== '1'
  ) {
    const msg =
      typeof json.message === 'string' ? json.message : 'Could not send support request';
    throw new Error(msg);
  }
}

export type SupportIssuePayload = {
  title: string;
  description: string;
  reservation_ref?: string;
};

export async function submitSupportIssue(
  payload: SupportIssuePayload,
): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const body: Record<string, string> = {
    title: payload.title.trim(),
    description: payload.description.trim(),
  };
  const ref = payload.reservation_ref?.trim();
  if (ref) {
    body.reservation_ref = ref;
  }

  const auth = getAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth?.access_token) {
    headers.Authorization = `Bearer ${auth.access_token}`;
  }

  const res = await fetch(`${API_BASE}/support/issue`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  if (text.trim()) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const msg =
      (parsed?.message as string) ||
      (parsed?.error as string) ||
      (text.trim() ? text.slice(0, 200) : `Request failed: ${res.status}`);
    throw new Error(msg);
  }

  if (parsed) assertOk(parsed);
}
