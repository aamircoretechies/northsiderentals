import { normalizeProfilePicturePath } from '@/services/profile';
import { apiJson, ApiClientError } from '@/utils/api-client';
import { getFriendlyErrorMessage } from '@/utils/api-error-handler';

export interface RegisterDeviceRequest {
  fcm_token: string;
  device_id: string;
  device_type: string;
  device_name: string;
  device_os_version: string;
  app_version: string;
}

export interface DashboardProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  local_address: string | null;
  postal_address: string | null;
  profile_image_url: string | null;
}

export interface Location {
  id: number;
  location: string;
  isdefault?: boolean;
  ispickupavailable?: boolean;
  isdropoffavailable?: boolean;
  isflightinrequired?: boolean;
  minimumbookingday?: number;
  noticerequired_numberofdays?: number;
  quoteisvalid_numberofdays?: number;
  officeopeningtime?: string;
  officeclosingtime?: string;
  afterhourbookingaccepted?: boolean;
  afterhourfeeid?: number;
  unattendeddropoffaccepted?: boolean;
  unattendeddropofffeeid?: number;
  minimumage?: number;
  phone?: string;
  email?: string;
}

export interface CategoryType {
  id: number;
  vehiclecategorytype?: string;
  displayorder?: string;
  category_id?: number;
  name?: string;
  value?: string;
}

export interface DriverAge {
  id: number;
  driverage: number | string;
  isdefault?: boolean;
  age_id?: number;
}

export interface OfficeTimeRecord {
  locationid: number;
  dayofweek: number;
  openingtime: string;
  closingtime: string;
  startpickup: string;
  endpickup: string;
  startdropoff: string;
  enddropoff: string;
  startdate: string;
  enddate: string;
}

export interface Holiday {
  id: number;
  locationid: number;
  startdate: string;
  enddate: string;
  type: string;
  weekdays: number;
  holidayname: string;
  closingtime: string;
}

export interface FeaturedCar {
  id: number | string;
  title: string;
  description: string;
  daily_rate: string;
  image_url: string;
  link?: string;
  rate_description: string;
  slug?: string;
}

export interface Promotion {
  id: number | string;
  title: string;
  description: string;
  coupon_code: string;
  image_url: string;
  link: string;
  slug: string;
}

export interface DashboardData {
  locations: Location[];
  categorytypes: CategoryType[];
  driverages: DriverAge[];
  officetimes: OfficeTimeRecord[];
  holidays: Holiday[];
  featuredCars: FeaturedCar[];
  promotions: Promotion[];
  profile: DashboardProfile | null;
  unreadCount: number;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  '';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timeoutId);
        reject(err);
      });
  });
}

function pickArray<T>(root: Record<string, unknown>, key: string): T[] {
  const v = root[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

function mergeResultsBundle(data: Record<string, unknown> | null | undefined) {
  const results = (data?.results as Record<string, unknown> | undefined) || {};
  const pick = <T,>(k: string): T[] => {
    const top = pickArray<T>(data as Record<string, unknown>, k);
    if (top.length) return top;
    return pickArray<T>(results, k);
  };

  return {
    locations: pick<Record<string, unknown>>('locations'),
    categorytypes: pick<Record<string, unknown>>('categorytypes'),
    driverages: pick<Record<string, unknown>>('driverages'),
    officetimes: pick<Record<string, unknown>>('officetimes'),
    holidays: pick<Record<string, unknown>>('holidays'),
    featured_cars: pick<Record<string, unknown>>('featured_cars'),
    promotions: pick<Record<string, unknown>>('promotions'),
  };
}

function assertOkEnvelope(json: Record<string, unknown>): void {
  if (json.status !== undefined && json.status !== 1 && json.status !== '1') {
    throw new Error(
      getFriendlyErrorMessage({
        message: json.message,
        fallback: 'Could not load dashboard data.',
      }),
    );
  }
  const data = json.data as Record<string, unknown> | undefined;
  const inner = data?.status;
  if (inner !== undefined && inner !== 'OK' && inner !== 'ok') {
    const err =
      (data?.error as string) ||
      (typeof data?.message === 'string' ? (data.message as string) : '') ||
      'API returned a non-OK status';
    if (err) {
      throw new Error(
        getFriendlyErrorMessage({
          message: err,
          fallback: 'Could not load dashboard data.',
        }),
      );
    }
  }
}

export function parseRegisterDevicePayload(json: Record<string, unknown>): DashboardData {
  assertOkEnvelope(json);
  const data = (json.data as Record<string, unknown>) || {};
  const b = mergeResultsBundle(data);

  const locations: Location[] = b.locations.map((loc) => ({
    id: Number(loc.id),
    location: String(loc.location || loc.name || ''),
    isdefault: Boolean(loc.isdefault),
    ispickupavailable: loc.ispickupavailable !== false,
    isdropoffavailable: loc.isdropoffavailable !== false,
    isflightinrequired: Boolean(loc.isflightinrequired),
    minimumbookingday: Number(loc.minimumbookingday ?? 0),
    noticerequired_numberofdays: Number(loc.noticerequired_numberofdays ?? 0),
    quoteisvalid_numberofdays: Number(loc.quoteisvalid_numberofdays ?? 0),
    officeopeningtime: loc.officeopeningtime
      ? String(loc.officeopeningtime)
      : undefined,
    officeclosingtime: loc.officeclosingtime
      ? String(loc.officeclosingtime)
      : undefined,
    afterhourbookingaccepted: Boolean(loc.afterhourbookingaccepted),
    afterhourfeeid: Number(loc.afterhourfeeid ?? 0),
    unattendeddropoffaccepted: Boolean(loc.unattendeddropoffaccepted),
    unattendeddropofffeeid: Number(loc.unattendeddropofffeeid ?? 0),
    minimumage: Number(loc.minimumage ?? 0),
    phone: loc.phone ? String(loc.phone) : undefined,
    email: loc.email ? String(loc.email) : undefined,
  }));

  const categorytypes: CategoryType[] = b.categorytypes.map((ct) => ({
    id: Number(ct.id),
    vehiclecategorytype: ct.vehiclecategorytype
      ? String(ct.vehiclecategorytype)
      : undefined,
    displayorder: ct.displayorder != null ? String(ct.displayorder) : undefined,
    name: ct.vehiclecategorytype
      ? String(ct.vehiclecategorytype)
      : ct.name
        ? String(ct.name)
        : undefined,
    value: ct.value ? String(ct.value) : undefined,
  }));

  const driverages: DriverAge[] = b.driverages.map((age) => ({
    id: Number(age.id ?? age.age_id),
    driverage: Number(age.driverage ?? age.age_id ?? 0) || String(age.driverage ?? age.age_id ?? ''),
    isdefault: Boolean(age.isdefault),
    age_id: age.age_id != null ? Number(age.age_id) : undefined,
  }));

  const officetimes: OfficeTimeRecord[] = b.officetimes.map((o) => ({
    locationid: Number(o.locationid),
    dayofweek: Number(o.dayofweek),
    openingtime: String(o.openingtime ?? ''),
    closingtime: String(o.closingtime ?? ''),
    startpickup: String(o.startpickup ?? ''),
    endpickup: String(o.endpickup ?? ''),
    startdropoff: String(o.startdropoff ?? ''),
    enddropoff: String(o.enddropoff ?? ''),
    startdate: String(o.startdate ?? ''),
    enddate: String(o.enddate ?? ''),
  }));

  const holidays: Holiday[] = b.holidays.map((h) => ({
    id: Number(h.id),
    locationid: Number(h.locationid),
    startdate: String(h.startdate ?? ''),
    enddate: String(h.enddate ?? ''),
    type: String(h.type ?? ''),
    weekdays: Number(h.weekdays ?? 0),
    holidayname: String(h.holidayname ?? ''),
    closingtime: String(h.closingtime ?? ''),
  }));

  const featuredCars: FeaturedCar[] = b.featured_cars.map((car) => ({
    id: Number.isFinite(Number(car.id)) ? Number(car.id) : String(car.id ?? ''),
    title: String(car.title || ''),
    description: String(car.description || ''),
    daily_rate:
      car.daily_rate != null ? String(car.daily_rate) : String(car.price ?? '0'),
    image_url: String(car.image_url || car.image || ''),
    link: car.link ? String(car.link) : undefined,
    rate_description: String(car.rate_description || ''),
    slug: car.slug ? String(car.slug) : undefined,
  }));

  const promotions: Promotion[] = b.promotions.map((p) => ({
    id: Number.isFinite(Number(p.id)) ? Number(p.id) : String(p.id ?? ''),
    title: String(p.title || ''),
    description: String(p.description || ''),
    coupon_code: String(p.coupon_code || ''),
    image_url: String(p.image_url || ''),
    link: String(p.link || ''),
    slug: String(p.slug || ''),
  }));

  const rawProfile = data.profile as Record<string, unknown> | null | undefined;
  const profile: DashboardProfile | null = rawProfile
    ? {
        first_name: (rawProfile.first_name as string) ?? null,
        last_name: (rawProfile.last_name as string) ?? null,
        email: (rawProfile.email as string) ?? null,
        phone: (rawProfile.phone as string) ?? null,
        local_address: (rawProfile.local_address as string) ?? null,
        postal_address: (rawProfile.postal_address as string) ?? null,
        profile_image_url: normalizeProfilePicturePath(
          rawProfile.profile_image_url as string | null | undefined,
        ),
      }
    : null;

  const unreadCount = Number(data.unread_count ?? data.unreadCount ?? 0);

  return {
    locations,
    categorytypes,
    driverages,
    officetimes,
    holidays,
    featuredCars,
    promotions,
    profile,
    unreadCount: Number.isFinite(unreadCount) ? unreadCount : 0,
  };
}

export const dashboardService = {
  async registerDevice(
    body: RegisterDeviceRequest,
  ): Promise<DashboardData> {
    if (!API_BASE_URL) {
      throw new Error('VITE_API_BASE_URL is not configured');
    }

    const request = apiJson<Record<string, unknown>>(`${API_BASE_URL}/dashboard/register-device`, {
      method: 'POST',
      auth: 'none',
      body: body as unknown as Record<string, unknown>,
      fallbackError: 'Could not load dashboard data.',
    });

    const json = (await withTimeout(request, 15000)) as Record<string, unknown>;

    // The backend often returns HTTP 200 with `{ status: 0, message, data: null }`
    // for logic-level failures (e.g. unique constraint violations). Surface those
    // as real rejections so callers (and the device-id retry logic) can react.
    const rawStatus = (json as Record<string, unknown>).status;
    const statusValue =
      typeof rawStatus === 'number'
        ? rawStatus
        : typeof rawStatus === 'string'
          ? rawStatus.toLowerCase()
          : rawStatus;
    const isFailure =
      statusValue === 0 ||
      statusValue === '0' ||
      statusValue === false ||
      statusValue === 'false' ||
      statusValue === 'error';
    if (isFailure) {
      const apiMessage =
        typeof (json as Record<string, unknown>).message === 'string'
          ? ((json as Record<string, unknown>).message as string)
          : '';
      throw new ApiClientError({
        message: apiMessage || 'Register device failed',
        responseData: json,
        friendlyMessage: getFriendlyErrorMessage({
          message: apiMessage,
          fallback: 'Could not load dashboard data.',
        }),
      });
    }

    return parseRegisterDevicePayload(json);
  },
};
