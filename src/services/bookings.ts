import { getAuth } from '@/auth/lib/helpers';
import { createApiUrl } from '@/lib/api-url';
import { getFriendlyErrorMessage } from '@/utils/api-error-handler';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_PUBLIC_BASE_URL = (import.meta.env.VITE_BASE_URL as string | undefined) || '';
const RCM_AGREEMENT_BASE_URL =
  (import.meta.env.VITE_RCM_AGREEMENT_BASE_URL as string | undefined)?.replace(
    /\/$/,
    '',
  ) || 'https://bookings.rentalcarmanager.com';
const BOOKING_LIST_TTL_MS = 60_000;
const BOOKING_DETAIL_TTL_MS = 60_000;
const WORKFLOW_TTL_MS = 30_000;

type CacheEntry<T> = { ts: number; data: T };

const bookingsListCache = new Map<string, CacheEntry<BookingsListResponse>>();
const bookingDetailCache = new Map<string, CacheEntry<BookingByReferenceResponse>>();
const workflowCache = new Map<string, CacheEntry<WorkflowChecklistResponse>>();

const inflightRequests = new Map<string, Promise<unknown>>();

function isFresh(entryTs: number, ttlMs: number): boolean {
  return Date.now() - entryTs < ttlMs;
}

export function getCachedBookingsList(
  params: BookingsListParams = {},
): BookingsListResponse | null {
  const key = `${params.page ?? 1}:${params.limit ?? 20}:${params.status ?? 'all'}`;
  const hit = bookingsListCache.get(key);
  return hit?.data ?? null;
}

export function getCachedBookingByReference(
  reference: string,
): BookingByReferenceResponse | null {
  const key = reference.trim();
  if (!key) return null;
  return bookingDetailCache.get(key)?.data ?? null;
}

export function getCachedWorkflowChecklist(
  reservationRef: string,
  workflowCode = 'checkin',
): WorkflowChecklistResponse | null {
  const key = `${reservationRef.trim()}:${workflowCode}`;
  if (!reservationRef.trim()) return null;
  return workflowCache.get(key)?.data ?? null;
}

export function invalidateBookingsCache(reference?: string): void {
  bookingsListCache.clear();
  workflowCache.clear();
  if (reference?.trim()) {
    bookingDetailCache.delete(reference.trim());
  } else {
    bookingDetailCache.clear();
  }
}

export interface BookingsListParams {
  page?: number;
  limit?: number;
  /** e.g. `all`, `active` — pass through to API */
  status?: string;
}

function buildAuthHeaders(): HeadersInit {
  const auth = getAuth();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (auth?.access_token) {
    headers.Authorization = `Bearer ${auth.access_token}`;
  }
  return headers;
}

function assertApiSuccess(
  json: Record<string, unknown>,
  fallbackMessage: string,
): void {
  if (
    json.status !== undefined &&
    json.status !== 1 &&
    json.status !== '1'
  ) {
    throw new Error(
      getFriendlyErrorMessage({
        message: json.message,
        fallback: fallbackMessage,
      }),
    );
  }
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getValidationFailureMessage(
  dataObj: Record<string, unknown> | null,
  fallback: string,
): string {
  if (!dataObj) return fallback;
  const details = Array.isArray(dataObj.validation_error_details)
    ? dataObj.validation_error_details
    : [];
  const messages = details
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const row = item as Record<string, unknown>;
      return String(row.Message ?? row.message ?? '').trim();
    })
    .filter(Boolean);
  if (messages.length === 0) return fallback;

  const normalized = messages.map((msg) => {
    if (/quotes?\s+cannot\s+be\s+updated/i.test(msg)) {
      return 'This reservation is a quote and cannot be updated from this screen.';
    }
    return msg;
  });
  return normalized.join(' ');
}

/** Raw API response wrapper */
export interface BookingsListResponse {
  status?: number;
  message?: string;
  data?: {
    bookings?: unknown[];
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: unknown;
  };
}

export async function fetchBookingsList(
  params: BookingsListParams = {},
): Promise<BookingsListResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const status = params.status ?? 'all';
  const cacheKey = `${page}:${limit}:${status}`;
  const cacheHit = bookingsListCache.get(cacheKey);
  if (cacheHit && isFresh(cacheHit.ts, BOOKING_LIST_TTL_MS)) {
    return cacheHit.data;
  }
  const inflightKey = `bookings:list:${cacheKey}`;
  const inflight = inflightRequests.get(inflightKey);
  if (inflight) return inflight as Promise<BookingsListResponse>;

  const url = createApiUrl('bookings/list');
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('status', status);

  const request = (async () => {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildAuthHeaders(),
    });

    if (!response.ok) {
      let msg = response.statusText;
      try {
        const err = await response.json();
        msg = err.message || msg;
      } catch {
        /* ignore */
      }
      throw new Error(
        getFriendlyErrorMessage({
          status: response.status,
          message: msg,
          fallback: 'Could not load bookings right now.',
        }),
      );
    }

    const json = (await response.json()) as BookingsListResponse;
    bookingsListCache.set(cacheKey, { ts: Date.now(), data: json });
    return json;
  })();
  inflightRequests.set(inflightKey, request);
  try {
    return await request;
  } finally {
    inflightRequests.delete(inflightKey);
  }
}

function assertBookingEnvelopeOk(json: Record<string, unknown>): void {
  if (
    json.status !== undefined &&
    json.status !== 1 &&
    json.status !== '1'
  ) {
    throw new Error(
      getFriendlyErrorMessage({
        message: json.message,
        fallback: 'Booking not found.',
      }),
    );
  }
}

export interface FindBookingLookupResponse {
  status?: number;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * Public lookup: `GET /bookings/find?reservation_no=&last_name=`.
 * Works with or without a Bearer token (optional auth).
 */
export async function findBookingLookup(params: {
  reservationNo: string;
  lastName: string;
}): Promise<FindBookingLookupResponse> {
  const reservationNo = params.reservationNo.trim();
  const lastName = params.lastName.trim();
  if (!reservationNo) {
    throw new Error('Please enter your reservation or confirmation number.');
  }
  if (!lastName) {
    throw new Error('Please enter the last name on the booking.');
  }

  const url = createApiUrl('bookings/find');
  url.searchParams.set('reservation_no', reservationNo);
  url.searchParams.set('last_name', lastName);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildAuthHeaders(),
  });

  const text = await response.text();
  let json: Record<string, unknown> | null = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const msg =
      (json?.message as string) ||
      (json?.error as string) ||
      `Request failed: ${response.status}`;
    throw new Error(
      getFriendlyErrorMessage({
        status: response.status,
        message: msg,
        fallback: 'Could not find this booking.',
      }),
    );
  }

  if (!json) {
    throw new Error('Could not read booking response. Please try again.');
  }

  assertBookingEnvelopeOk(json);
  return json as FindBookingLookupResponse;
}

/** RCM reference for `GET /bookings/:ref` / detail route from find-booking payload. */
export function bookingReferenceFromFindPayload(
  data: Record<string, unknown>,
): string {
  const direct = String(data.rcm_reference_key ?? '').trim();
  if (direct) return direct;
  const rcm = (data.rcm_booking_info as Record<string, unknown>) || {};
  const bookingInfo = Array.isArray(rcm.bookinginfo)
    ? (rcm.bookinginfo[0] as Record<string, unknown>)
    : undefined;
  return String(bookingInfo?.reservationref ?? '').trim();
}

/** Map one booking from list API → card props */
export function mapApiBookingToCardProps(b: Record<string, unknown>) {
  const vd = (b.vehicle_details as Record<string, unknown>) || {};
  const dates = (b.booking_dates as Record<string, unknown>) || {};
  const rcm = (b.rcm_booking_info as Record<string, unknown>) || {};
  const bookingInfo = Array.isArray(rcm.bookinginfo)
    ? (rcm.bookinginfo[0] as Record<string, unknown>)
    : undefined;

  const spec =
    (bookingInfo?.vehicledescription1 as string) ||
    (vd.vehicle_name as string) ||
    (vd.category_name as string) ||
    '';

  const pickupDate = dates.pickup_date;
  const pickupTime = dates.pickup_time;
  const dropoffDate = dates.dropoff_date;
  const dropoffTime = dates.dropoff_time;
  const pickup =
    [pickupDate, formatTimeWithAmPm(pickupTime)].filter(Boolean).join(' ').trim() || '—';
  const ret =
    [dropoffDate, formatTimeWithAmPm(dropoffTime)].filter(Boolean).join(' ').trim() || '—';

  const pricing = (b.pricing as Record<string, unknown>) || {};
  const currency = (pricing.currency as string) || 'AUD';
  const total =
    b.totalcost != null ? Number(b.totalcost) : Number(pricing.total) || 0;

  const img =
    (b.car_image as string) ||
    (vd.image as string) ||
    (vd.imageurl as string) ||
    '';

  return {
    bookingId: String(b.booking_id ?? ''),
    /** RCM reservation reference — required for `GET /bookings/by-reference/:ref` */
    detailReference: String(
      (bookingInfo?.reservationref as string) ||
        (b.rcm_reference_key as string) ||
        '',
    ),
    reservationNumber: String(
      b.confirmation_number ?? b.rcm_reservation_no ?? b.booking_id ?? '',
    ),
    carName: String(
      b.car_name ??
        b.category_name ??
        vd.vehicle_name ??
        vd.category_name ??
        'Vehicle',
    ),
    carSpecs: spec.trim() || '—',
    carImage: img,
    pickupDate: pickup,
    returnDate: ret,
    statusLabel: String(b.booking_status ?? '—'),
    paymentStatus: b.payment_status != null ? String(b.payment_status) : '',
    reservationType: b.reservation_type != null ? String(b.reservation_type) : '',
    totalDisplay: `${currency} ${total.toFixed(2)}`,
    isQuote: Boolean(b.is_quote),
  };
}

export interface BookingByReferenceResponse {
  status?: number;
  message?: string;
  data?: Record<string, unknown>;
}

export async function fetchBookingByReference(
  reference: string,
): Promise<BookingByReferenceResponse> {
  const ref = reference.trim();
  if (!ref) {
    throw new Error('Missing booking reference');
  }
  const cacheHit = bookingDetailCache.get(ref);
  if (cacheHit && isFresh(cacheHit.ts, BOOKING_DETAIL_TTL_MS)) {
    return cacheHit.data;
  }
  const inflightKey = `bookings:detail:${ref}`;
  const inflight = inflightRequests.get(inflightKey);
  if (inflight) return inflight as Promise<BookingByReferenceResponse>;

  const url = `${API_BASE_URL.replace(/\/$/, '')}/bookings/by-reference/${encodeURIComponent(ref)}`;

  const request = (async () => {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildAuthHeaders(),
    });

    if (!response.ok) {
      let msg = response.statusText;
      try {
        const err = await response.json();
        msg = err.message || msg;
      } catch {
        /* ignore */
      }
      throw new Error(
        getFriendlyErrorMessage({
          status: response.status,
          message: msg,
          fallback: 'Could not load booking details.',
        }),
      );
    }

    const json = (await response.json()) as BookingByReferenceResponse;
    bookingDetailCache.set(ref, { ts: Date.now(), data: json });
    return json;
  })();
  inflightRequests.set(inflightKey, request);
  try {
    return await request;
  } finally {
    inflightRequests.delete(inflightKey);
  }
}

export interface WorkflowChecklistStep {
  workflowresultid?: number;
  step?: number;
  method?: string;
  name?: string;
  info?: string;
  completed?: boolean;
  workflowstepid?: number;
  params?: unknown;
}

export interface WorkflowChecklistDetails {
  workflowrunid?: number;
  code?: string;
  name?: string;
  info?: string;
  completed?: boolean;
  reservationref?: string;
  [key: string]: unknown;
}

export interface WorkflowChecklistResponse {
  status?: number;
  message?: string;
  data?: {
    list?: WorkflowChecklistStep[];
    details?: WorkflowChecklistDetails[];
    [key: string]: unknown;
  };
}

export async function fetchWorkflowChecklist(
  reservationRef: string,
  workflowCode = 'checkin',
): Promise<WorkflowChecklistResponse> {
  const ref = reservationRef.trim();
  if (!ref) {
    throw new Error('Missing reservation reference');
  }
  const cacheKey = `${ref}:${workflowCode}`;
  const cacheHit = workflowCache.get(cacheKey);
  if (cacheHit && isFresh(cacheHit.ts, WORKFLOW_TTL_MS)) {
    return cacheHit.data;
  }
  const inflightKey = `bookings:workflow:${cacheKey}`;
  const inflight = inflightRequests.get(inflightKey);
  if (inflight) return inflight as Promise<WorkflowChecklistResponse>;
  const url = createApiUrl('bookings/workflow-checklist');
  url.searchParams.set('reservation_ref', ref);
  url.searchParams.set('workflow_code', workflowCode);

  const request = (async () => {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildAuthHeaders(),
    });

    if (!response.ok) {
      let msg = response.statusText;
      try {
        const err = await response.json();
        msg = err.message || msg;
      } catch {
        /* ignore */
      }
      throw new Error(
        getFriendlyErrorMessage({
          status: response.status,
          message: msg,
          fallback: 'Could not load booking details.',
        }),
      );
    }

    const json = (await response.json()) as Record<string, unknown>;
    assertApiSuccess(json, 'Failed to load express check-in workflow');
    const typed = json as WorkflowChecklistResponse;
    workflowCache.set(cacheKey, { ts: Date.now(), data: typed });
    return typed;
  })();
  inflightRequests.set(inflightKey, request);
  try {
    return await request;
  } finally {
    inflightRequests.delete(inflightKey);
  }
}

/**
 * Normalizes `GET /bookings/workflow-checklist` `data` (or full response) so lists are found
 * whether keys are snake_case, camelCase, on the root, or under `results` / `results_bundle`.
 */
export function extractWorkflowChecklistArrays(
  raw: Record<string, unknown> | null | undefined,
): {
  bookinginfo: Array<Record<string, unknown>>;
  customerinfo: Array<Record<string, unknown>>;
  extrafees: Array<Record<string, unknown>>;
  optionalfees: Array<Record<string, unknown>>;
  insuranceoptions: Array<Record<string, unknown>>;
  extradrivers: Array<Record<string, unknown>>;
  documentlinkdata: Array<Record<string, unknown>>;
  list: WorkflowChecklistStep[];
} {
  const empty = {
    bookinginfo: [] as Array<Record<string, unknown>>,
    customerinfo: [] as Array<Record<string, unknown>>,
    extrafees: [] as Array<Record<string, unknown>>,
    optionalfees: [] as Array<Record<string, unknown>>,
    insuranceoptions: [] as Array<Record<string, unknown>>,
    extradrivers: [] as Array<Record<string, unknown>>,
    documentlinkdata: [] as Array<Record<string, unknown>>,
    list: [] as WorkflowChecklistStep[],
  };
  if (!raw || typeof raw !== 'object') return empty;

  let root: Record<string, unknown> = { ...raw };
  const nested = raw.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    root = { ...root, ...(nested as Record<string, unknown>) };
  }

  const results =
    (root.results as Record<string, unknown> | undefined) ||
    (root.results_bundle as Record<string, unknown> | undefined) ||
    {};

  const toCamel = (s: string) =>
    s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

  const pickArray = (...names: string[]): Array<Record<string, unknown>> => {
    for (const name of names) {
      const keys = [name, toCamel(name)];
      for (const obj of [root, results]) {
        for (const k of keys) {
          const v = obj[k];
          if (Array.isArray(v)) {
            return v.filter(
              (x): x is Record<string, unknown> =>
                !!x && typeof x === 'object' && !Array.isArray(x),
            ) as Array<Record<string, unknown>>;
          }
        }
      }
    }
    return [];
  };

  const listRaw = root.list;
  const list = Array.isArray(listRaw)
    ? (listRaw as WorkflowChecklistStep[])
    : [];

  return {
    list,
    bookinginfo: pickArray('bookinginfo', 'booking_info'),
    customerinfo: pickArray('customerinfo', 'customer_info'),
    extrafees: pickArray('extrafees', 'extra_fees', 'extraFees'),
    optionalfees: pickArray('optionalfees', 'optional_fees', 'optionalFees'),
    insuranceoptions: pickArray(
      'insuranceoptions',
      'insurance_options',
      'insuranceOptions',
    ),
    extradrivers: pickArray(
      'extradrivers',
      'extra_drivers',
      'extraDrivers',
      'ExtraDrivers',
    ),
    documentlinkdata: pickArray(
      'documentlinkdata',
      'document_link_data',
      'documentLinkData',
    ),
  };
}

export interface EditBookingBasicsPayload {
  booking_id?: string;
  reservation_ref?: string;
  reservationref?: string;
  customer_details?: Record<string, unknown>;
  customer?: Record<string, unknown>;
  insurance_id?: number | string;
  insuranceid?: number | string;
  extrakms_id?: number | string;
  extrakmsid?: number | string;
  number_of_persons?: number;
  numbertravelling?: number | string;
  booking_type?: number | string;
  bookingtype?: number | string;
  referralid?: number | string;
  remark?: string;
  flightin?: string;
  flightout?: string;
  arrivalpoint?: string;
  departurepoint?: string;
  areaofuseid?: number | string;
  newsletter?: boolean;
  agentcode?: string;
  agentname?: string;
  agentemail?: string;
  agentrefno?: string;
  agentcollectedrecalcmode?: string;
  optionalfees?: Array<{ id: number | string; qty: number | string }>;
  pickuplocationid?: number | string;
  transmission?: number | string;
  id?: number | string;
}

export interface UpdateBookingPayload {
  reservation_ref: string;
  bookingtype: number;
  pickuplocationid: number;
  pickupdatetime: string;
  dropofflocationid: number;
  dropoffdatetime: string;
  vehiclecategoryid: number;
  driverageid: number;
  insuranceid: number;
  extrakmsid: number;
  transmission: number;
  customer: {
    customerid?: number;
    firstname: string;
    lastname: string;
    dateofbirth: string;
    licenseno: string;
    licenseissued?: string;
    licenseexpires?: string;
    email: string;
    phone?: string;
    mobile?: string;
    fulladdress?: string;
    state: string;
    city: string;
    postcode: string;
    country?: string;
    countryid?: number;
    localaddress?: string;
    passport?: string;
    mailinglist?: boolean;
    loyaltycardno?: string;
    address: string;
  };
  referralid: number;
  remark: string;
  numbertravelling: number;
  flightin: string;
  flightout: string;
  arrivalpoint: string;
  departurepoint: string;
  areaofuseid: number;
  newsletter: boolean;
  agentcode: string;
  agentname: string;
  agentemail: string;
  agentrefno: string;
  agentcollectedrecalcmode: string;
  optionalfees: Array<{ id: number; qty: number }>;
}

export async function updateBooking(
  payload: UpdateBookingPayload,
): Promise<{ success?: boolean; status?: number; message?: string; data?: unknown }> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/bookings/update-booking`;
  const reservationRef = String(payload.reservation_ref ?? '').trim();
  if (!reservationRef) throw new Error('Missing reservation reference');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(
      getFriendlyErrorMessage({
        status: response.status,
        message: msg,
        fallback: 'Could not update booking details.',
      }),
    );
  }

  const json = (await response.json()) as Record<string, unknown>;
  const dataObj =
    json.data && typeof json.data === 'object'
      ? (json.data as Record<string, unknown>)
      : null;
  const validationDetails = Array.isArray(dataObj?.validation_error_details)
    ? dataObj.validation_error_details
    : [];
  const nestedSuccess = dataObj?.success;
  if (nestedSuccess === false || validationDetails.length > 0) {
    throw new Error(
      getFriendlyErrorMessage({
        message: getValidationFailureMessage(
          dataObj,
          String(json.message ?? 'Could not update booking details.'),
        ),
        fallback: 'Could not update booking details.',
      }),
    );
  }
  const okBySuccess = json.success === true;
  const okByStatus =
    json.status === 1 || json.status === '1' || json.status === undefined;
  if (!okBySuccess && !okByStatus) {
    throw new Error(
      getFriendlyErrorMessage({
        message: json.message,
        fallback: 'Could not update booking details.',
      }),
    );
  }
  return json as { success?: boolean; status?: number; message?: string; data?: unknown };
}

export async function editBookingBasics(
  payload: EditBookingBasicsPayload,
): Promise<{
  success?: boolean;
  status?: number;
  message?: string;
  data?: unknown;
}> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/bookings/edit`;
  const bookingId = String(payload.booking_id ?? '').trim();
  const reservationRef = String(
    payload.reservation_ref ?? payload.reservationref ?? '',
  ).trim();
  if (!bookingId && !reservationRef) {
    throw new Error(
      'Missing booking identifier. Provide booking_id or reservation_ref.',
    );
  }

  const requestPayload: Record<string, unknown> = {
    customer_details: { ...(payload.customer_details ?? payload.customer ?? {}) },
  };
  if (reservationRef) requestPayload.reservation_ref = reservationRef;
  if (bookingId) requestPayload.booking_id = bookingId;
  if (payload.insurance_id != null) requestPayload.insurance_id = payload.insurance_id;
  else if (payload.insuranceid != null) requestPayload.insurance_id = payload.insuranceid;
  if (payload.extrakms_id != null) requestPayload.extrakms_id = payload.extrakms_id;
  else if (payload.extrakmsid != null) requestPayload.extrakms_id = payload.extrakmsid;
  if (payload.number_of_persons != null) {
    requestPayload.number_of_persons = toFiniteNumber(payload.number_of_persons, 0);
  } else if (payload.numbertravelling != null) {
    requestPayload.number_of_persons = toFiniteNumber(payload.numbertravelling, 0);
  }
  if (payload.bookingtype != null) {
    const bt = toFiniteNumber(payload.bookingtype, 2);
    requestPayload.bookingtype = bt;
    requestPayload.booking_type = bt;
  } else if (payload.booking_type != null) {
    const bt = toFiniteNumber(payload.booking_type, 2);
    requestPayload.bookingtype = bt;
    requestPayload.booking_type = bt;
  }
  if (payload.pickuplocationid != null) {
    const pickupLocationId = toFiniteNumber(payload.pickuplocationid, 0);
    requestPayload.pickuplocationid = pickupLocationId;
    requestPayload.pickup_location_id = pickupLocationId;
  }
  if (payload.transmission != null) {
    const transmission = toFiniteNumber(payload.transmission, 0);
    requestPayload.transmission = transmission;
    requestPayload.transmissionid = transmission;
    requestPayload.transmission_id = transmission;
  }
  if (payload.id != null) {
    const customerId = toFiniteNumber(payload.id, 0);
    requestPayload.id = customerId;
    const customerDetails = requestPayload.customer_details as Record<string, unknown>;
    // Legacy RCM path expects customer id inside customer_details.
    if (customerId > 0 && (customerDetails.id == null || customerDetails.id === '')) {
      customerDetails.id = customerId;
    }
  }
  if (requestPayload.booking_type == null) {
    requestPayload.bookingtype = 2;
    requestPayload.booking_type = 2;
  }
  if (payload.referralid != null) {
    requestPayload.referralid = toFiniteNumber(payload.referralid, 0);
  }
  if (payload.remark != null) requestPayload.remark = String(payload.remark);
  if (payload.flightin != null) requestPayload.flightin = String(payload.flightin);
  if (payload.flightout != null) requestPayload.flightout = String(payload.flightout);
  if (payload.arrivalpoint != null) requestPayload.arrivalpoint = String(payload.arrivalpoint);
  if (payload.departurepoint != null) requestPayload.departurepoint = String(payload.departurepoint);
  if (payload.areaofuseid != null) {
    requestPayload.areaofuseid = toFiniteNumber(payload.areaofuseid, 0);
  }
  if (payload.newsletter != null) requestPayload.newsletter = Boolean(payload.newsletter);
  if (payload.agentcode != null) requestPayload.agentcode = String(payload.agentcode);
  if (payload.agentname != null) requestPayload.agentname = String(payload.agentname);
  if (payload.agentemail != null) requestPayload.agentemail = String(payload.agentemail);
  if (payload.agentrefno != null) requestPayload.agentrefno = String(payload.agentrefno);
  if (payload.agentcollectedrecalcmode != null) {
    requestPayload.agentcollectedrecalcmode = String(payload.agentcollectedrecalcmode);
  }
  if (Array.isArray(payload.optionalfees)) {
    requestPayload.optionalfees = payload.optionalfees.map((x) => ({
      id: toFiniteNumber(x.id, 0),
      qty: Math.max(0, toFiniteNumber(x.qty, 0)),
    }));
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  });

  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(
      getFriendlyErrorMessage({
        status: response.status,
        message: msg,
        fallback: 'Could not update booking details.',
      }),
    );
  }

  const json = (await response.json()) as Record<string, unknown>;
  const dataObj =
    json.data && typeof json.data === 'object'
      ? (json.data as Record<string, unknown>)
      : null;
  const validationDetails = Array.isArray(dataObj?.validation_error_details)
    ? dataObj.validation_error_details
    : [];
  const nestedSuccess = dataObj?.success;
  if (nestedSuccess === false || validationDetails.length > 0) {
    throw new Error(
      getFriendlyErrorMessage({
        message: getValidationFailureMessage(
          dataObj,
          String(json.message ?? 'Could not update booking details.'),
        ),
        fallback: 'Could not update booking details.',
      }),
    );
  }
  const okBySuccess = json.success === true;
  const okByStatus =
    json.status === 1 || json.status === '1' || json.status === undefined;
  if (!okBySuccess && !okByStatus) {
    throw new Error(
      getFriendlyErrorMessage({
        message: json.message,
        fallback: 'Could not update booking details.',
      }),
    );
  }
  return json as {
    success?: boolean;
    status?: number;
    message?: string;
    data?: unknown;
  };
}

export interface AddExtraDriverPayload {
  reservation_ref: string;
  customerid: number;
  customer: {
    firstname: string;
    lastname: string;
    dateofbirth: string;
    licenseno: string;
    email: string;
    state: string;
    city: string;
    postcode: string;
    address: string;
  };
}

export async function addExtraDriver(
  payload: AddExtraDriverPayload,
): Promise<{ status?: number; message?: string; data?: unknown }> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/bookings/add-extra-driver`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(
      getFriendlyErrorMessage({
        status: response.status,
        message: msg,
        fallback: 'Could not save extra driver details.',
      }),
    );
  }

  const json = (await response.json()) as Record<string, unknown>;
  assertApiSuccess(json, 'Failed to add extra driver');
  return json as { status?: number; message?: string; data?: unknown };
}

export interface RcmDocumentItem {
  documentlinksetupid?: number;
  customerid?: number;
  customerfirstname?: string;
  customerlastname?: string;
  title?: string;
  text?: string;
  isuploaded?: number;
  workflowstepid?: number;
  documentlinkid?: number;
  doctype?: string | null;
  notes?: string;
  seqno?: number;
  storageprovider?: string;
  [key: string]: unknown;
}

export interface ListRcmDocumentsResponse {
  status?: number;
  message?: string;
  data?: RcmDocumentItem[];
}

export async function listRcmDocuments(
  reservationRef: string,
  workflowCode = 'checkin',
): Promise<ListRcmDocumentsResponse> {
  const ref = reservationRef.trim();
  if (!ref) throw new Error('Missing reservation reference');
  const url = createApiUrl('documents/rcm/list');
  url.searchParams.set('reservation_ref', ref);
  url.searchParams.set('workflow_code', workflowCode);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildAuthHeaders(),
  });
  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(
      getFriendlyErrorMessage({
        status: response.status,
        message: msg,
        fallback: 'Could not load required documents.',
      }),
    );
  }
  const json = (await response.json()) as Record<string, unknown>;
  assertApiSuccess(json, 'Failed to load required documents');
  return json as ListRcmDocumentsResponse;
}

export async function uploadRcmDocumentFile(
  file: File,
): Promise<{ status?: number; message?: string; data?: unknown; url?: string }> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/documents/rcm/upload`;
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: form,
  });
  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(
      getFriendlyErrorMessage({
        status: response.status,
        message: msg,
        fallback: 'Could not upload document. Please try again.',
      }),
    );
  }
  return response.json();
}

export interface StoreRcmDocumentPayload {
  reservation_ref: string;
  url: string;
  documentlinksetupid: number;
  customer_id: number;
  vehicle_id: number;
  description: string;
  doctype: string;
  source: string;
  originalname: string;
  storageprovider: string;
  resultsprovider: Record<string, unknown>;
  workflow_code: string;
  sequencenumber: number;
  istaggedincloudinary: boolean;
}

export async function storeRcmDocument(
  payload: StoreRcmDocumentPayload,
): Promise<{ status?: number; message?: string; data?: unknown }> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/documents/rcm/store`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(
      getFriendlyErrorMessage({
        status: response.status,
        message: msg,
        fallback: 'Could not save uploaded document.',
      }),
    );
  }
  const json = (await response.json()) as Record<string, unknown>;
  assertApiSuccess(json, 'Failed to store uploaded document');
  return json as { status?: number; message?: string; data?: unknown };
}

export async function deleteRcmDocument(payload: {
  reservation_ref: string;
  document_link_id: number;
}): Promise<{ status?: number; message?: string; data?: unknown }> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/documents/rcm/delete`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      msg = err.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(
      getFriendlyErrorMessage({
        status: response.status,
        message: msg,
        fallback: 'Could not delete document.',
      }),
    );
  }
  const json = (await response.json()) as Record<string, unknown>;
  assertApiSuccess(json, 'Failed to delete document');
  return json as { status?: number; message?: string; data?: unknown };
}

/** Turn relative API paths (e.g. receipt) into absolute URLs */
export function resolveApiAssetUrl(pathOrUrl: string): string {
  const s = pathOrUrl.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  const base = API_BASE_URL.replace(/\/$/, '');
  let path = s.startsWith('/') ? s : `/${s}`;
  // Avoid https://host/api/v1/api/v1/... when base already ends with /api/v1
  if (base.endsWith('/api/v1') && path.startsWith('/api/v1')) {
    path = path.slice('/api/v1'.length) || '/';
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function apiOrigin(): string {
  const base = API_BASE_URL.trim();
  if (/^https?:\/\//i.test(base)) {
    try {
      return new URL(base).origin;
    } catch {
      /* ignore */
    }
  }
  const publicBase = API_PUBLIC_BASE_URL.trim();
  if (/^https?:\/\//i.test(publicBase)) {
    try {
      return new URL(publicBase).origin;
    } catch {
      /* ignore */
    }
  }
  return '';
}

function resolveUploadsUrl(pathOrUrl: string): string {
  const s = pathOrUrl.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  const origin = apiOrigin();
  let path = s.startsWith('/') ? s : `/${s}`;
  // Convert /api/v1/uploads/... -> /uploads/... because files are hosted at origin root.
  path = path.replace(/^\/api\/v1(?=\/uploads\/)/i, '');
  return origin ? `${origin}${path}` : path;
}

function documentOriginFromBase(documentsBaseUrl?: string): string {
  const base = String(documentsBaseUrl ?? '').trim();
  if (!base || !/^https?:\/\//i.test(base)) return '';
  try {
    return new URL(base).origin;
  } catch {
    return '';
  }
}

function rcmAgreementOrigin(): string {
  const base = RCM_AGREEMENT_BASE_URL.trim();
  if (!base || !/^https?:\/\//i.test(base)) return '';
  try {
    return new URL(base).origin;
  } catch {
    return '';
  }
}

function resolveAgreementUrl(pathOrUrl: string, documentsBaseUrl?: string): string {
  const s = pathOrUrl.trim();
  if (!s) return '';
  // Absolute links (including RCM Agreement.aspx URLs) must keep their original host.
  if (/^https?:\/\//i.test(s)) return s;

  const agreementOrigin = rcmAgreementOrigin();
  if (agreementOrigin) {
    const path = s.startsWith('/') ? s : `/${s}`;
    return `${agreementOrigin}${path}`;
  }

  if (s.startsWith('/public/')) {
    const docOrigin = documentOriginFromBase(documentsBaseUrl);
    if (docOrigin) return `${docOrigin}${s}`;
  }

  const origin = apiOrigin();
  const path = s.startsWith('/') ? s : `/${s}`;
  return origin ? `${origin}${path}` : path;
}

const RECEIPT_URL_KEYS = [
  'invoice_url',
  'invoiceUrl',
  'invoice_path',
  'invoicePath',
  'pdf_url',
  'pdfUrl',
  'document_url',
  'documentUrl',
  'receipt_url',
  'receiptUrl',
  'url',
  'path',
  'file_url',
  'fileUrl',
  'download_url',
  'downloadUrl',
  'href',
] as const;

function scoreInvoiceCandidate(raw: string): number {
  const s = raw.trim().toLowerCase();
  if (!s) return 0;
  let score = 1;
  if (s.includes('/uploads/invoice/')) score += 100;
  if (s.includes('customerinvoice')) score += 80;
  if (s.includes('invoice')) score += 60;
  if (s.endsWith('.pdf') || s.includes('.pdf?')) score += 50;
  if (s.includes('receipt')) score += 15;
  if (s.includes('agreement.aspx')) score -= 80;
  return score;
}

function pickInvoicePathFromRecord(r: Record<string, unknown>): string | null {
  let best: { value: string; score: number } | null = null;
  for (const k of RECEIPT_URL_KEYS) {
    const v = r[k];
    if (typeof v !== 'string' || v.trim().length === 0) continue;
    const value = v.trim();
    const score = scoreInvoiceCandidate(value);
    if (!best || score > best.score) {
      best = { value, score };
    }
  }
  return best?.value ?? null;
}

/** Parse JSON receipt API body for a document URL or path */
export function extractInvoiceUrlFromReceiptPayload(body: unknown): string | null {
  if (body == null) return null;
  if (typeof body === 'string') {
    const s = body.trim();
    if (/^https?:\/\//i.test(s) || (s.startsWith('/') && s.length > 1)) return s;
    return null;
  }
  if (typeof body !== 'object') return null;

  const o = body as Record<string, unknown>;
  const fromRoot = pickInvoicePathFromRecord(o);
  if (fromRoot) return fromRoot;

  const data = o.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const fromData = pickInvoicePathFromRecord(d);
    if (fromData) return fromData;
    const inner = d.data;
    if (inner && typeof inner === 'object') {
      const fromInner = pickInvoicePathFromRecord(inner as Record<string, unknown>);
      if (fromInner) return fromInner;
    }
  }

  return null;
}

function resolveInvoiceTargetUrl(
  pathOrUrl: string,
  documentsBaseUrl?: string,
): string {
  const s = pathOrUrl.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  // Invoices are served from API/base uploads path, not RCM agreement/documents origin.
  if (
    /^\/?uploads\/invoice\//i.test(s) ||
    /^\/?api\/v1\/uploads\/invoice\//i.test(s)
  ) {
    return resolveUploadsUrl(s.startsWith('/') ? s : `/${s}`);
  }
  if (s.startsWith('/public/')) {
    const docOrigin = documentOriginFromBase(documentsBaseUrl);
    if (docOrigin) return `${docOrigin}${s}`;
  }
  const base = documentsBaseUrl?.replace(/\/$/, '') ?? '';
  if (base && !s.startsWith('/api')) {
    return `${base}/${s.replace(/^\//, '')}`;
  }
  return resolveApiAssetUrl(s);
}

/**
 * Receipt endpoint returns JSON with an invoice path/URL — do not open that API URL in a new tab.
 * Fetches with auth, then navigates the current tab to the real document (or inlines a PDF blob).
 */
export async function openBookingReceipt(
  receiptApiUrl: string,
  options?: { documentsBaseUrl?: string },
): Promise<void> {
  const url = receiptApiUrl.trim();
  if (!url) throw new Error('Missing receipt URL');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...buildAuthHeaders(),
      Accept: 'application/json, application/pdf, application/octet-stream, text/html, */*',
    },
  });

  if (!response.ok) {
    let msg = response.statusText || 'Failed to load receipt';
    try {
      const err = await response.json();
      msg =
        (typeof err.message === 'string' && err.message) ||
        (typeof err.error === 'string' && err.error) ||
        msg;
    } catch {
      /* ignore */
    }
    throw new Error(
      getFriendlyErrorMessage({
        status: response.status,
        message: msg,
        fallback: 'Could not open receipt right now.',
      }),
    );
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  if (
    contentType.includes('application/pdf') ||
    (contentType.includes('application/octet-stream') &&
      !contentType.includes('json'))
  ) {
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.location.assign(objectUrl);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
    return;
  }

  if (contentType.includes('text/html')) {
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.location.assign(objectUrl);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
    return;
  }

  let body: unknown;
  const text = await response.text();
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Unexpected receipt response');
  }

  const rawPath = extractInvoiceUrlFromReceiptPayload(body);
  if (!rawPath) {
    throw new Error('No invoice link in receipt response');
  }

  const target = resolveInvoiceTargetUrl(rawPath, options?.documentsBaseUrl);
  if (!target) throw new Error('Could not resolve invoice URL');

  window.location.assign(target);
}

export interface BookingDetailPricingLine {
  label: string;
  sublabel?: string;
  amount: number;
}

export interface BookingDetailView {
  bookingId: string;
  referenceKey: string;
  confirmationLabel: string;
  bookingStatus: string;
  paymentStatus: string | null;
  reservationType: string;
  isQuote: boolean;
  carName: string;
  carSpecs: string;
  carImage: string;
  bookedOnLabel: string;
  pickupWhen: string;
  pickupWhereName: string;
  pickupWhereAddress: string;
  returnWhen: string;
  returnWhereName: string;
  returnWhereAddress: string;
  rentalAgreementUrl: string;
  summaryLines: BookingDetailPricingLine[];
  totalCost: number;
  balanceDue: number;
  currency: string;
  currencySymbol: string;
  gstAmount: number | null;
  gstInclusive: boolean;
  extrasRows: BookingDetailPricingLine[];
  damageCoverRows: BookingDetailPricingLine[];
  expressCheckinCompleted: boolean;
  agreementSigned: boolean;
  receiptUrl: string;
  /** RCM document root for relative invoice paths from receipt API */
  documentsBaseUrl: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  customerDateOfBirth: string;
  customerLicenseNo: string;
  customerLicenseIssued: string;
  customerLicenseExpires: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerCountry: string;
  customerPostcode: string;
  /** From bookinginfo.numbertravelling */
  numberTravelling: string;
  pickupLocationId: number;
  bookingType: number;
  transmission: number;
  customerId: number;
}

function pickNonEmpty(...vals: unknown[]): string {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatTimeWithAmPm(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const withMeridiem = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/);
  if (withMeridiem) {
    const hh = Number(withMeridiem[1]);
    const mm = withMeridiem[2];
    if (Number.isFinite(hh)) {
      const hour12 = ((hh % 12) + 12) % 12 || 12;
      return `${String(hour12).padStart(2, '0')}:${mm} ${withMeridiem[3].toUpperCase()}`;
    }
  }
  const twentyFour = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFour) {
    const hh = Number(twentyFour[1]);
    const mm = twentyFour[2];
    if (Number.isFinite(hh)) {
      const hour24 = ((hh % 24) + 24) % 24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = hour24 % 12 || 12;
      return `${String(hour12).padStart(2, '0')}:${mm} ${ampm}`;
    }
  }
  return raw;
}

/** Normalize detail API `data` for the booking detail screen */
export function mapBookingDetailToView(
  data: Record<string, unknown>,
): BookingDetailView {
  const rcm = (data.rcm_booking_info as Record<string, unknown>) || {};
  const bookingInfo = Array.isArray(rcm.bookinginfo)
    ? (rcm.bookinginfo[0] as Record<string, unknown>)
    : undefined;
  const customerInfo = Array.isArray(rcm.customerinfo)
    ? (rcm.customerinfo[0] as Record<string, unknown>)
    : undefined;

  const dates = (data.booking_dates as Record<string, unknown>) || {};
  const vd = (data.vehicle_details as Record<string, unknown>) || {};
  const pricing = (data.pricing as Record<string, unknown>) || {};

  const sym = String(bookingInfo?.currencysymbol ?? '$');
  const currency = String(pricing.currency ?? bookingInfo?.currencyname ?? 'AUD');

  const pickupWhen = [dates.pickup_date, formatTimeWithAmPm(dates.pickup_time)]
    .filter(Boolean)
    .join(' ')
    .trim();
  const returnWhen = [dates.dropoff_date, formatTimeWithAmPm(dates.dropoff_time)]
    .filter(Boolean)
    .join(' ')
    .trim();

  const pickupName = String(
    bookingInfo?.pickuplocationname ?? '',
  );
  const pickupAddr = String(bookingInfo?.pickuplocationaddress ?? '');
  const dropName = String(bookingInfo?.dropofflocationname ?? '');
  const dropAddr = String(bookingInfo?.dropofflocationaddress ?? '');

  const totalsRaw = Array.isArray(pricing.totals) ? pricing.totals : [];
  const totals = totalsRaw.filter(
    (t): t is Record<string, unknown> => !!t && typeof t === 'object',
  );
  const summaryLines: BookingDetailPricingLine[] = totals
    .filter((t) => {
      const ty = String(t.type ?? '').toLowerCase();
      const name = String(t.name ?? '');
      return ty !== 'total' && name.toUpperCase() !== 'TOTAL';
    })
    .map((t) => {
      const qty = t.qty != null ? Number(t.qty) : undefined;
      const name = String(t.name ?? 'Line item');
      const typeStr = String(t.type ?? '').trim();
      const sub =
        qty != null && qty > 0 && typeStr
          ? `Qty ${qty} · ${typeStr}`
          : typeStr || undefined;
      return {
        label: name,
        sublabel: sub,
        amount: num(t.total),
      };
    });

  const extrafeesRaw = Array.isArray(rcm.extrafees) ? rcm.extrafees : [];
  const extrafees = extrafeesRaw.filter(
    (e): e is Record<string, unknown> => !!e && typeof e === 'object',
  );

  const extrasRows: BookingDetailPricingLine[] = extrafees
    .filter((e) => !e.isinsurancefee)
    .map((e) => {
      const days = num(e.numberofdays);
      const fee = num(e.fees);
      const sub = `${String(e.type ?? '')}${days ? ` · ${days} day(s)` : ''}${fee ? ` @ ${sym}${fee.toFixed(2)}` : ''}`;
      return {
        label: String(e.name ?? 'Extra'),
        sublabel: sub.trim() || undefined,
        amount: num(e.totalfeeamount),
      };
    });

  const damageCoverRows: BookingDetailPricingLine[] = extrafees
    .filter((e) => Boolean(e.isinsurancefee))
    .map((e) => {
      const days = num(e.numberofdays);
      const fee = num(e.fees);
      const excess = num(e.insuranceexcessamount);
      const sub = `${String(e.type ?? '')}${days ? ` · ${days} day(s)` : ''}${fee ? ` @ ${sym}${fee.toFixed(2)}` : ''}${excess ? ` · excess ${sym}${excess.toFixed(2)}` : ''}`;
      return {
        label: String(e.name ?? 'Cover'),
        sublabel: sub.trim() || undefined,
        amount: num(e.totalfeeamount),
      };
    });

  const refKey = String(
    data.rcm_reference_key ??
      bookingInfo?.reservationref ??
      '',
  );

  const agreementRaw = pickNonEmpty(
    bookingInfo?.agreementpage,
    bookingInfo?.agreementurl,
    data.agreementpage,
    data.agreementurl,
  );
  const documentsBaseUrl = String(bookingInfo?.urlpathfordocuments ?? '').replace(
    /\/$/,
    '',
  );
  // Always use VITE_RCM_AGREEMENT_BASE_URL for relative paths.
  // Do NOT join with urlpathfordocuments — that is a blob storage root, not the RCM booking portal.
  const rentalAgreementUrl = resolveAgreementUrl(agreementRaw);

  const receiptPath = String(data.payment_invoice_url ?? '');
  const receiptUrl = receiptPath ? resolveApiAssetUrl(receiptPath) : '';

  const totalCost =
    data.totalcost != null ? num(data.totalcost) : num(pricing.total);
  const balanceDue =
    data.balancedue != null ? num(data.balancedue) : totalCost;

  const gstVal = bookingInfo?.gst != null ? num(bookingInfo.gst) : null;

  const carImage =
    String(data.car_image ?? vd.image ?? vd.imageurl ?? '') || '';
  const customerDetails =
    (data.customer_details as Record<string, unknown>) || {};

  return {
    bookingId: String(data.booking_id ?? ''),
    referenceKey: refKey,
    confirmationLabel: String(
      data.confirmation_number ?? data.rcm_reservation_no ?? refKey ?? '—',
    ),
    bookingStatus: String(data.booking_status ?? '—'),
    paymentStatus:
      data.payment_status != null && String(data.payment_status).length
        ? String(data.payment_status)
        : null,
    reservationType: String(data.reservation_type ?? ''),
    isQuote: Boolean(data.is_quote),
    carName: String(data.car_name ?? vd.vehicle_name ?? 'Vehicle'),
    carSpecs: String(bookingInfo?.vehicledescription1 ?? '').trim() || '—',
    carImage,
    bookedOnLabel: String(bookingInfo?.reservationcreateddate ?? '—'),
    pickupWhen: pickupWhen || '—',
    pickupWhereName: pickupName || '—',
    pickupWhereAddress: pickupAddr,
    returnWhen: returnWhen || '—',
    returnWhereName: dropName || '—',
    returnWhereAddress: dropAddr,
    rentalAgreementUrl,
    summaryLines,
    totalCost,
    balanceDue,
    currency,
    currencySymbol: sym,
    gstAmount: gstVal,
    gstInclusive: Boolean(bookingInfo?.isgstinclusive),
    extrasRows,
    damageCoverRows,
    expressCheckinCompleted: Boolean(data.express_checkin_completed),
    agreementSigned: Boolean(data.agreement_signed),
    receiptUrl,
    documentsBaseUrl,
    customerFirstName: pickNonEmpty(
      customerDetails.first_name,
      customerInfo?.firstname,
    ),
    customerLastName: pickNonEmpty(
      customerDetails.last_name,
      customerInfo?.lastname,
    ),
    customerEmail: pickNonEmpty(customerDetails.email, customerInfo?.email),
    customerPhone: pickNonEmpty(
      customerDetails.phone,
      customerDetails.mobile,
      customerInfo?.mobile,
      customerInfo?.phone,
    ),
    customerDateOfBirth: pickNonEmpty(customerInfo?.dateofbirth),
    customerLicenseNo: pickNonEmpty(
      customerDetails.driver_license_number,
      customerInfo?.licenseno,
    ),
    customerLicenseIssued: pickNonEmpty(customerInfo?.licenseissued),
    customerLicenseExpires: pickNonEmpty(customerInfo?.licenseexpires),
    customerAddress: pickNonEmpty(
      customerDetails.address,
      customerInfo?.address,
      customerInfo?.fulladdress,
    ),
    customerCity: pickNonEmpty(customerDetails.city, customerInfo?.city),
    customerState: pickNonEmpty(customerDetails.state, customerInfo?.state),
    customerCountry: pickNonEmpty(customerInfo?.country),
    customerPostcode: pickNonEmpty(
      customerDetails.postcode,
      customerInfo?.postcode,
    ),
    numberTravelling: pickNonEmpty(bookingInfo?.numbertravelling),
    pickupLocationId: num(
      bookingInfo?.pickuplocationid ?? bookingInfo?.pickup_location_id,
    ),
    bookingType: num(
      bookingInfo?.bookingtype ??
        bookingInfo?.booking_type ??
        bookingInfo?.reservationtype,
    ),
    transmission: num(
      bookingInfo?.transmission ??
        bookingInfo?.transmissionid ??
        bookingInfo?.transmission_preference,
    ),
    customerId: num(customerInfo?.id ?? customerInfo?.customerid ?? data.customer_id),
  };
}
