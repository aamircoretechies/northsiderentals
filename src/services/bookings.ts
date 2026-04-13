import { getAuth } from '@/auth/lib/helpers';
import { createApiUrl } from '@/lib/api-url';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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

  const url = createApiUrl('bookings/list');
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('status', status);

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
    throw new Error(msg || 'Failed to load bookings');
  }

  return response.json();
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
    '';

  const pickupDate = dates.pickup_date;
  const pickupTime = dates.pickup_time;
  const dropoffDate = dates.dropoff_date;
  const dropoffTime = dates.dropoff_time;
  const pickup =
    [pickupDate, pickupTime].filter(Boolean).join(' ').trim() || '—';
  const ret =
    [dropoffDate, dropoffTime].filter(Boolean).join(' ').trim() || '—';

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
    carName: String(b.car_name ?? vd.vehicle_name ?? 'Vehicle'),
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

  const url = `${API_BASE_URL.replace(/\/$/, '')}/bookings/${encodeURIComponent(ref)}`;

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
    throw new Error(msg || 'Failed to load booking');
  }

  return response.json();
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
  const url = createApiUrl('bookings/workflow-checklist');
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
    throw new Error(msg || 'Failed to load express check-in workflow');
  }

  return response.json();
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
  booking_id: string;
  reservation_ref: string;
  customer_details: Record<string, unknown>;
  insurance_id: number;
  number_of_persons: number;
}

export async function editBookingBasics(
  payload: EditBookingBasicsPayload,
): Promise<{ status?: number; message?: string; data?: unknown }> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/bookings/edit`;
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
    throw new Error(msg || 'Failed to update booking details');
  }

  return response.json();
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
    throw new Error(msg || 'Failed to add extra driver');
  }

  return response.json();
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
    throw new Error(msg || 'Failed to load required documents');
  }
  return response.json();
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
    throw new Error(msg || 'Failed to upload document file');
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
    throw new Error(msg || 'Failed to store uploaded document');
  }
  return response.json();
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
    throw new Error(msg || 'Failed to delete document');
  }
  return response.json();
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

function pickInvoicePathFromRecord(r: Record<string, unknown>): string | null {
  for (const k of RECEIPT_URL_KEYS) {
    const v = r[k];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
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
    throw new Error(msg);
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

  const pickupWhen = [dates.pickup_date, dates.pickup_time]
    .filter(Boolean)
    .join(' ')
    .trim();
  const returnWhen = [dates.dropoff_date, dates.dropoff_time]
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

  const agreementRaw = String(data.rental_agreement_url ?? '');
  let rentalAgreementUrl = agreementRaw;
  if (agreementRaw && !/^https?:\/\//i.test(agreementRaw)) {
    const docBase = String(bookingInfo?.urlpathfordocuments ?? '').replace(
      /\/$/,
      '',
    );
    rentalAgreementUrl = docBase ? `${docBase}/${agreementRaw.replace(/^\//, '')}` : agreementRaw;
  }

  const receiptPath = String(data.payment_invoice_url ?? '');
  const receiptUrl = receiptPath ? resolveApiAssetUrl(receiptPath) : '';
  const documentsBaseUrl = String(bookingInfo?.urlpathfordocuments ?? '').replace(
    /\/$/,
    '',
  );

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
  };
}
