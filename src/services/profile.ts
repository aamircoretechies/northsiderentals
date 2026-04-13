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

function authBearerOnly(): HeadersInit {
  const auth = getAuth();
  const headers: Record<string, string> = {};
  if (auth?.access_token) {
    headers.Authorization = `Bearer ${auth.access_token}`;
  }
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
    const msg =
      typeof json.message === 'string' ? json.message : 'Profile request failed';
    throw new Error(msg);
  }
}

function parseProfileData(raw: Record<string, unknown>): RcmProfile {
  const addr = (raw.address as Record<string, unknown>) || {};
  const countriesRaw = Array.isArray(raw.countries) ? raw.countries : [];

  return {
    user_id: String(raw.user_id ?? ''),
    first_name: (raw.first_name as string) ?? null,
    last_name: (raw.last_name as string) ?? null,
    email: (raw.email as string) ?? null,
    mobile: (raw.mobile as string) ?? null,
    is_social_login: Boolean(raw.is_social_login),
    method: raw.method != null ? String(raw.method) : undefined,
    profile_picture: normalizeProfilePicturePath(
      raw.profile_picture as string | null | undefined,
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

export const profileService = {
  async fetchProfile(): Promise<RcmProfile> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const res = await fetch(`${API_BASE}/profile`, {
      method: 'GET',
      headers: authJsonHeaders(),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Profile GET failed: ${res.status} ${t}`);
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
      throw new Error(`Profile update failed: ${res.status} ${t}`);
    }

    const json = (await res.json()) as Record<string, unknown>;
    assertEnvelope(json);
    const data = json.data as Record<string, unknown> | undefined;
    if (!data) throw new Error('Profile update response missing data');
    return parseProfileData(data);
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
      throw new Error(`Upload failed: ${res.status} ${t}`);
    }

    const json = (await res.json()) as Record<string, unknown>;
    assertEnvelope(json);
    const data = json.data as Record<string, unknown> | undefined;
    if (!data) return profileService.fetchProfile();
    return parseProfileData(data);
  },

  /** Removes the current profile picture on the server. */
  async deleteProfilePicture(): Promise<void> {
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');

    const res = await fetch(`${API_BASE}/profile/delete-picture`, {
      method: 'DELETE',
      headers: authBearerOnly(),
    });

    const body = await res.text();
    if (!res.ok) {
      throw new Error(`Delete picture failed: ${res.status} ${body}`);
    }
    if (body.trim()) {
      try {
        const json = JSON.parse(body) as Record<string, unknown>;
        assertEnvelope(json);
      } catch (e) {
        if (e instanceof SyntaxError) return;
        throw e;
      }
    }
  },
};
