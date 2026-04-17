import { getAuth } from '@/auth/lib/helpers';
import { getFriendlyErrorMessage } from '@/utils/api-error-handler';

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

function authBearerOnly(): HeadersInit {
  const auth = getAuth();
  const headers: Record<string, string> = {};
  if (auth?.access_token) {
    headers.Authorization = `Bearer ${auth.access_token}`;
  }
  return headers;
}

function authOptionalJsonHeaders(): Record<string, string> {
  const headers = authJsonHeaders() as Record<string, string>;
  return headers;
}

export interface RcmAddress {
  local_address: string | null;
  postal_address: string | null;
  city: string | null;
  state: string | null;
  country_id: number | null;
  country: string | null;
  postal_code: string | null;
}

export interface RcmCountry {
  id: number;
  country: string;
  code: string | null;
  isdefault: boolean;
}

export interface RcmProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  mobile: string | null;
  is_social_login?: boolean;
  method?: string;
  profile_picture: string | null;
  address: RcmAddress;
  countries: RcmCountry[];
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  date_of_birth?: string;
  driver_license_number?: string;
  address?: Record<string, unknown>;
  country_id?: number;
  mobile?: string;
  local_address?: string;
  postal_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  profile_picture?: string | null;
}

export function normalizeProfilePicturePath(
  value: string | null | undefined,
): string | null {
  const t = value?.trim();
  if (!t) return null;
  if (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('//')
  ) {
    return t;
  }
  return t.startsWith('/') ? t : `/${t}`;
}

function assertEnvelope(json: Record<string, unknown>): void {
  if (
    json.status !== undefined &&
    json.status !== 1 &&
    json.status !== '1'
  ) {
    throw new Error(
      getFriendlyErrorMessage({
        message: json.message,
        fallback: 'Could not load your profile. Please try again.',
      }),
    );
  }
}

function parseProfileData(raw: Record<string, unknown>): RcmProfile {
  const addr = (raw.address as Record<string, unknown>) || {};
  const countriesRaw = Array.isArray(raw.countries) ? raw.countries : [];

  const pictureValue =
    raw.profile_picture ??
    raw.profile_image ??
    raw.profile_image_url ??
    raw.avatar ??
    raw.avatar_url;

  return {
    user_id: String(raw.user_id ?? ''),
    first_name: (raw.first_name as string) ?? null,
    last_name: (raw.last_name as string) ?? null,
    email: (raw.email as string) ?? null,
    mobile: (raw.mobile as string) ?? null,
    is_social_login: Boolean(raw.is_social_login),
    method: raw.method != null ? String(raw.method) : undefined,
    profile_picture: normalizeProfilePicturePath(
      pictureValue as string | null | undefined,
    ),
    address: {
      local_address: (addr.local_address as string) ?? null,
      postal_address: (addr.postal_address as string) ?? null,
      city: (addr.city as string) ?? null,
      state: (addr.state as string) ?? null,
      country_id:
        addr.country_id != null ? Number(addr.country_id) : null,
      country: (addr.country as string) ?? null,
      postal_code: (addr.postal_code as string) ?? null,
    },
    countries: countriesRaw.map((c: Record<string, unknown>) => ({
      id: Number(c.id),
      country: String(c.country ?? ''),
      code: c.code != null ? String(c.code) : null,
      isdefault: Boolean(c.isdefault),
    })),
  };
}

function extractPictureUrl(raw: Record<string, unknown> | undefined): string | null {
  if (!raw) return null;
  return normalizeProfilePicturePath(
    (raw.profile_picture ??
      raw.profile_image ??
      raw.profile_image_url ??
      raw.avatar ??
      raw.avatar_url ??
      raw.url) as string | null | undefined,
  );
}

export const profileService = {
  async fetchProfile(): Promise<RcmProfile> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const res = await fetch(`${API_BASE}/profile`, {
      method: 'GET',
      headers: authJsonHeaders(),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(
        getFriendlyErrorMessage({
          status: res.status,
          message: t,
          fallback: 'Could not load your profile. Please try again.',
        }),
      );
    }

    const json = (await res.json()) as Record<string, unknown>;
    assertEnvelope(json);
    const data = json.data as Record<string, unknown> | undefined;
    if (!data) throw new Error('Profile response missing data');
    return parseProfileData(data);
  },

  async updateProfile(body: UpdateProfilePayload): Promise<RcmProfile> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: authJsonHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(
        getFriendlyErrorMessage({
          status: res.status,
          message: t,
          fallback: 'Could not update your profile. Please try again.',
        }),
      );
    }

    const json = (await res.json()) as Record<string, unknown>;
    assertEnvelope(json);
    const data = json.data as Record<string, unknown> | undefined;
    if (!data) return profileService.fetchProfile();
    const parsed = parseProfileData(data);
    if (!parsed.profile_picture) {
      const fresh = await profileService.fetchProfile();
      return fresh;
    }
    return parsed;
  },

  async uploadProfilePicture(file: File): Promise<RcmProfile> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const form = new FormData();
    form.append('profile_picture', file);

    const res = await fetch(`${API_BASE}/profile/upload-picture`, {
      method: 'POST',
      headers: authBearerOnly(),
      body: form,
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(
        getFriendlyErrorMessage({
          status: res.status,
          message: t,
          fallback: 'Could not upload your photo. Please try again.',
        }),
      );
    }

    const json = (await res.json()) as Record<string, unknown>;
    assertEnvelope(json);
    const data = json.data as Record<string, unknown> | undefined;
    if (!data) return profileService.fetchProfile();
    const parsed = parseProfileData(data);
    const inlineUrl = extractPictureUrl(data);
    if (inlineUrl && !parsed.profile_picture) {
      return { ...parsed, profile_picture: inlineUrl };
    }
    if (!parsed.profile_picture) return profileService.fetchProfile();
    return parsed;
  },

  /** Removes the current profile picture on the server. */
  async deleteProfilePicture(): Promise<void> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');
    const attempts: Array<{
      endpoint: string;
      method: 'DELETE' | 'PATCH' | 'PUT';
      body?: string;
      headers: HeadersInit;
    }> = [
      {
        endpoint: `${API_BASE}/profile/delete-picture`,
        method: 'DELETE',
        headers: authBearerOnly(),
      },
      {
        endpoint: `${API_BASE}/profile/remove-picture`,
        method: 'DELETE',
        headers: authBearerOnly(),
      },
      {
        endpoint: `${API_BASE}/profile`,
        method: 'PATCH',
        headers: authOptionalJsonHeaders(),
        body: JSON.stringify({ profile_picture: null }),
      },
      {
        endpoint: `${API_BASE}/profile`,
        method: 'PUT',
        headers: authOptionalJsonHeaders(),
        body: JSON.stringify({ profile_picture: null }),
      },
    ];

    let lastError = 'Delete picture failed';
    for (const attempt of attempts) {
      const res = await fetch(attempt.endpoint, {
        method: attempt.method,
        headers: attempt.headers,
        body: attempt.body,
      });
      const body = await res.text();
      if (!res.ok) {
        lastError = getFriendlyErrorMessage({
          status: res.status,
          message: body,
          fallback: 'Could not remove your photo. Please try again.',
        });
        continue;
      }
      if (body.trim()) {
        try {
          const json = JSON.parse(body) as Record<string, unknown>;
          assertEnvelope(json);
        } catch (e) {
          if (!(e instanceof SyntaxError)) throw e;
        }
      }
      return;
    }
    throw new Error(lastError);
  },

  async deleteAccount(userId?: string): Promise<void> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const attempts: Array<{
      endpoint: string;
      method: 'DELETE' | 'POST';
      body?: string;
      headers: HeadersInit;
    }> = [
      {
        endpoint: `${API_BASE}/profile/delete-account`,
        method: 'DELETE',
        headers: authBearerOnly(),
      },
      {
        endpoint: `${API_BASE}/profile/delete-account`,
        method: 'POST',
        headers: authOptionalJsonHeaders(),
        body: JSON.stringify(userId ? { user_id: userId } : {}),
      },
      {
        endpoint: `${API_BASE}/profile`,
        method: 'DELETE',
        headers: authBearerOnly(),
      },
      ...(userId
        ? [
            {
              endpoint: `${API_BASE}/user/${encodeURIComponent(userId)}`,
              method: 'DELETE' as const,
              headers: authBearerOnly(),
            },
          ]
        : []),
      {
        endpoint: `${API_BASE}/user`,
        method: 'DELETE',
        headers: authOptionalJsonHeaders(),
        body: JSON.stringify(userId ? { user_id: userId } : {}),
      },
    ];

    let lastError = 'Delete account failed';
    for (const attempt of attempts) {
      const res = await fetch(attempt.endpoint, {
        method: attempt.method,
        headers: attempt.headers,
        body: attempt.body,
      });
      const text = await res.text();
      if (!res.ok) {
        lastError = getFriendlyErrorMessage({
          status: res.status,
          message: text,
          fallback: 'Could not delete account. Please try again.',
        });
        continue;
      }
      if (text.trim()) {
        try {
          const json = JSON.parse(text) as Record<string, unknown>;
          assertEnvelope(json);
        } catch (e) {
          if (!(e instanceof SyntaxError)) throw e;
        }
      }
      return;
    }
    throw new Error(lastError);
  },
};
