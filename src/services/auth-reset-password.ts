import { apiJson } from '@/utils/api-client';
import { getFriendlyErrorMessage } from '@/utils/api-error-handler';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  '';

function assertOk(json: Record<string, unknown>): void {
  if (
    json.status !== undefined &&
    json.status !== 1 &&
    json.status !== '1'
  ) {
    throw new Error(
      getFriendlyErrorMessage({
        message: json.message,
        fallback: 'Request failed.',
      }),
    );
  }
}

/** Sends a password-reset OTP to the given email (unauthenticated). */
export async function requestPasswordResetOtp(email: string): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const payload = await apiJson<Record<string, unknown>>(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    auth: 'none',
    body: { email: email.trim() },
    fallbackError: 'Could not send password reset code.',
  });

  if (payload) assertOk(payload);
}

/** Completes password reset using email + OTP + new password (unauthenticated). */
export async function resetPasswordWithOtp(params: {
  email: string;
  otp: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const payload = await apiJson<Record<string, unknown>>(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    auth: 'none',
    body: {
      email: params.email.trim(),
      otp: params.otp.trim(),
      new_password: params.newPassword,
      confirm_new_password: params.confirmNewPassword,
    },
    fallbackError: 'Could not reset password.',
  });

  if (payload) assertOk(payload);
}
