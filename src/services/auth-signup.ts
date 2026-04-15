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
      typeof json.message === 'string' ? json.message : 'Signup request failed';
    throw new Error(msg);
  }
}

async function parseJson(
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
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const json = await parseJson(res);

    // Try next candidate when route is missing.
    if (res.status === 404) {
      lastErrorMessage =
        (json?.message as string) ||
        (json?.error as string) ||
        `Route not found: POST ${path}`;
      continue;
    }

    if (!res.ok) {
      const msg =
        (json?.message as string) ||
        (json?.error as string) ||
        `Signup failed: ${res.status}`;
      throw new Error(msg);
    }

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

  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email.trim(),
      otp: payload.otp.trim(),
    }),
  });

  const json = await parseJson(res);
  if (!res.ok) {
    const msg =
      (json?.message as string) ||
      (json?.error as string) ||
      `OTP verification failed: ${res.status}`;
    throw new Error(msg);
  }
  if (json) assertOk(json);
}

export async function resendSignupOtp(email: string): Promise<void> {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

  const res = await fetch(`${API_BASE}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });

  const json = await parseJson(res);
  if (!res.ok) {
    const msg =
      (json?.message as string) ||
      (json?.error as string) ||
      `Resend OTP failed: ${res.status}`;
    throw new Error(msg);
  }
  if (json) assertOk(json);
}
