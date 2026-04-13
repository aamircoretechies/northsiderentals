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
      typeof json.message === 'string' ? json.message : 'Request failed';
    throw new Error(msg);
  }
}

async function readJson(
  res: Response,
): Promise<Record<string, unknown> | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Sends a password-reset OTP to the given email (unauthenticated). */
export async function requestPasswordResetOtp(email: string): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });

  const payload = await readJson(res);

  if (!res.ok) {
    const msg =
      (payload?.message as string) ||
      (payload?.error as string) ||
      (payload && typeof payload === 'object' && 'errors' in payload
        ? String((payload as { errors?: unknown }).errors)
        : '') ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

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

  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: params.email.trim(),
      otp: params.otp.trim(),
      new_password: params.newPassword,
      confirm_new_password: params.confirmNewPassword,
    }),
  });

  const payload = await readJson(res);

  if (!res.ok) {
    const msg =
      (payload?.message as string) ||
      (payload?.error as string) ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  if (payload) assertOk(payload);
}
