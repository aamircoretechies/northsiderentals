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
        fallback: 'Signup request failed.',
      }),
    );
  }
}

export async function requestSignupOtp(payload: {
  email: string;
  country_code: string;
  mobile: string;
  password: string;
}): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const body = JSON.stringify({
    email: payload.email.trim(),
    country_code: payload.country_code.trim(),
    mobile: payload.mobile.trim(),
    password: payload.password,
  });

  // Register endpoint for signup OTP creation.
  const candidatePaths = ['/auth/register'];
  let lastErrorMessage = 'Signup failed';

  for (const path of candidatePaths) {
    const json = await apiJson<Record<string, unknown>>(`${API_BASE}${path}`, {
      method: 'POST',
      auth: 'none',
      body,
      fallbackError: 'Signup failed.',
    });
    if (json) assertOk(json);
    return;
  }

  throw new Error(lastErrorMessage);
}

export async function verifySignupOtp(payload: {
  email: string;
  otp: string;
}): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const json = await apiJson<Record<string, unknown>>(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    auth: 'none',
    body: {
      email: payload.email.trim(),
      otp: payload.otp.trim(),
    },
    fallbackError: 'OTP verification failed.',
  });
  if (json) assertOk(json);
}

export async function resendSignupOtp(email: string): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const json = await apiJson<Record<string, unknown>>(`${API_BASE}/auth/resend-otp`, {
    method: 'POST',
    auth: 'none',
    body: { email: email.trim() },
    fallbackError: 'Could not resend OTP.',
  });
  if (json) assertOk(json);
}
