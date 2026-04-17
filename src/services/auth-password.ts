import { apiJson } from '@/utils/api-client';
import { getFriendlyErrorMessage } from '@/utils/api-error-handler';

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
    throw new Error(
      getFriendlyErrorMessage({
        message: json.message,
        fallback: 'Could not update password.',
      }),
    );
  }
}

export async function changePasswordApi(
  body: ChangePasswordPayload,
): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const payload = await apiJson<Record<string, unknown> | null>(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    auth: 'required',
    body,
    fallbackError: 'Could not update password.',
  });

  if (payload) assertOk(payload);
}
