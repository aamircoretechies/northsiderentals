/**
 * Create-booking / email-quote payload aligned with POST /bookings/create.
 * Fields without UI use safe defaults; extend the form when you add inputs.
 */

import { format, isValid, parseISO } from 'date-fns';

/** Max quantity per optional extra line (e.g. additional driver fee) — UI and payload clamp to this. */
export const MAX_CHECKOUT_EXTRA_FEE_QTY = 10;

export type BookingType = 'Booking' | 'Quote' | 'Quotation';

/** HTML date (yyyy-MM-dd) → API format e.g. 01/Jan/1990 */
export function formatDobForApi(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  try {
    const d = parseISO(v);
    return isValid(d) ? format(d, 'dd/MMM/yyyy') : v;
  } catch {
    return v;
  }
}

export interface ExtraFeeLine {
  id: number;
  qty: number;
}

export interface ExtraDriverLine {
  firstname: string;
  lastname: string;
  dateofbirth: string;
  licenseno: string;
  email: string;
  state: string;
  city: string;
  postcode: string;
  address: string;
}

const LICENSE_COUNTRY_ID: Record<string, number> = {
  Australia: 7,
  USA: 7,
  UK: 7,
  Other: 7,
};

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** e.g. "5+" → 5 */
export function parseTravellerCount(raw: string): number {
  const s = raw.trim();
  if (!s) return 1;
  const n = parseInt(s.replace('+', ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function licenseCountryToId(countryValue: string): number {
  const trimmed = countryValue?.trim() ?? '';
  const asNum = parseInt(trimmed, 10);
  if (Number.isFinite(asNum) && asNum > 0) return asNum;
  return LICENSE_COUNTRY_ID[trimmed] ?? 7;
}

export interface BuildBookingPayloadInput {
  bookingType: BookingType;
  vehicle_id: number;
  category_id: number;
  pickup_location_id: number;
  dropoff_location_id: number;
  pickup_date: string;
  pickup_time: string;
  dropoff_date: string;
  dropoff_time: string;
  age_id: number;
  campaigncode: string;
  customer_details: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    driver_license_number: string;
    country_id: number;
    /** Address / licence fields collected on checkout passenger step */
    address?: string;
    local_address?: string;
    city?: string;
    state?: string;
    postcode?: string;
    postal_code?: string;
    licenseexpires?: string;
    license_expiry?: string;
    licenseissued?: string;
    license_state?: string;
    /** RCM-style duplicates some stacks still read */
    licenseno?: string;
    firstname?: string;
    lastname?: string;
    dateofbirth?: string;
    mobile?: string;
  };
  number_of_persons: number;
  insurance_id: number;
  extra_fees: ExtraFeeLine[];
  extradriver?: ExtraDriverLine[];
  remark: string;
  comments: string;
  flightin: string;
  flightout: string;
  arrivalpoint: string;
  departurepoint: string;
  newsletter: boolean;
  /** When set (e.g. metro/regional from UI), sent instead of hardcoded 0 */
  areaofuseid?: number;
  /** From selected vehicle search row when present */
  transmission?: number;
  rateperiod_typeid?: number;
  /** Optional overrides for agent / meta (rarely collected in UI) */
  agentname?: string;
  agentemail?: string;
  agentrefno?: string;
  refno?: string;
}

export function buildCreateBookingPayload(
  input: BuildBookingPayloadInput,
): Record<string, unknown> {
  const {
    bookingType,
    vehicle_id,
    category_id,
    pickup_location_id,
    dropoff_location_id,
    pickup_date,
    pickup_time,
    dropoff_date,
    dropoff_time,
    age_id,
    campaigncode,
    customer_details,
    number_of_persons,
    insurance_id,
    extra_fees,
    extradriver = [],
    remark,
    comments,
    flightin,
    flightout,
    arrivalpoint,
    departurepoint,
    newsletter,
    transmission = 1,
    rateperiod_typeid = 1,
    areaofuseid: areaOfUseIdInput,
    agentname = '',
    agentemail = '',
    agentrefno = '',
    refno = '',
  } = input;

  const nonEmpty = (v: string, fallback = '') => {
    const t = String(v ?? '').trim();
    return t || fallback;
  };

  const bookingTypeCode =
    bookingType === 'Quotation' || bookingType === 'Quote' ? 1 : 2;

  const cd = customer_details as Record<string, unknown>;
  const mergedCustomerDetails: Record<string, unknown> = { ...cd };
  // Common RCM aliases so backends that read snake_case or flat licence fields still receive data.
  if (cd.first_name && !cd.firstname) mergedCustomerDetails.firstname = cd.first_name;
  if (cd.last_name && !cd.lastname) mergedCustomerDetails.lastname = cd.last_name;
  if (cd.date_of_birth && !cd.dateofbirth) mergedCustomerDetails.dateofbirth = cd.date_of_birth;
  if (cd.phone) {
    if (!cd.mobile) mergedCustomerDetails.mobile = cd.phone;
  }
  if (cd.driver_license_number && !cd.licenseno) mergedCustomerDetails.licenseno = cd.driver_license_number;
  if (cd.driver_license_number && !cd.licence_no) mergedCustomerDetails.licence_no = cd.driver_license_number;
  if (cd.address && !cd.local_address) mergedCustomerDetails.local_address = cd.address;
  if (cd.postcode && !cd.postal_code) mergedCustomerDetails.postal_code = cd.postcode;
  if (cd.postal_code && !cd.postcode) mergedCustomerDetails.postcode = cd.postal_code;
  if (cd.country_id != null && cd.countryid == null) mergedCustomerDetails.countryid = cd.country_id;
  if (cd.licenseexpires && !cd.license_expiry) mergedCustomerDetails.license_expiry = cd.licenseexpires;
  if (cd.license_state && !cd.licenseissued) mergedCustomerDetails.licenseissued = cd.license_state;

  const payload: Record<string, unknown> = {
    vehicle_id: parsePositiveInt(vehicle_id, 0),
    category_id: parsePositiveInt(category_id, 0),
    pickup_location_id: parsePositiveInt(pickup_location_id, 0),
    dropoff_location_id: parsePositiveInt(dropoff_location_id, 0),
    pickup_date,
    pickup_time,
    dropoff_date,
    dropoff_time,
    age_id: parsePositiveInt(age_id, 0),
    number_of_persons: parsePositiveInt(number_of_persons, 1),
    customer_details: mergedCustomerDetails,
    insurance_id: parsePositiveInt(insurance_id, 0),
    extrakmsid: 0,
    transmission: parsePositiveInt(transmission, 1),
    numbertravelling: parsePositiveInt(number_of_persons, 1),
    emailoption: 1,
    remark: nonEmpty(remark),
    flightin: nonEmpty(flightin),
    flightout: nonEmpty(flightout),
    arrivalpoint: nonEmpty(arrivalpoint),
    departurepoint: nonEmpty(departurepoint),
    areaofuseid: parsePositiveInt(areaOfUseIdInput ?? 0, 0),
    newsletter: Boolean(newsletter),
    rateperiod_typeid: parsePositiveInt(rateperiod_typeid, 1),
    extra_fees: extra_fees.map((e) => ({
      id: parsePositiveInt(e.id, 0),
      qty: Math.min(
        MAX_CHECKOUT_EXTRA_FEE_QTY,
        Math.max(1, parsePositiveInt(e.qty, 1)),
      ),
    })),
    extradriver,
    // Backend expects numeric booking type (1=quote, 2=booking).
    bookingtype: bookingTypeCode,
    booking_type: bookingTypeCode,
    comments: nonEmpty(comments),
  };

  const campaign = nonEmpty(campaigncode);
  if (campaign) payload.campaigncode = campaign;

  const agName = nonEmpty(agentname);
  if (agName) payload.agentname = agName;
  const agEmail = nonEmpty(agentemail);
  if (agEmail) payload.agentemail = agEmail;
  const agRef = nonEmpty(agentrefno);
  if (agRef) payload.agentrefno = agRef;
  const ref = nonEmpty(refno);
  if (ref) payload.refno = ref;

  return payload;
}

/** Map checkout “extras” UI rows to API extra_fees */
export function mapUiExtrasToPayload(
  extras: Array<{
    id: string;
    type?: string;
    selected?: boolean;
    quantity?: number;
  }>,
): ExtraFeeLine[] {
  if (!Array.isArray(extras)) return [];
  return extras
    .filter((e) =>
      e.type === 'quantity' ? (e.quantity ?? 0) > 0 : Boolean(e.selected),
    )
    .map((e) => ({
      id: parsePositiveInt(e.id, 0),
      qty:
        e.type === 'quantity'
          ? Math.min(
              MAX_CHECKOUT_EXTRA_FEE_QTY,
              Math.max(1, parsePositiveInt(e.quantity, 1)),
            )
          : 1,
    }))
    .filter((e) => e.id > 0);
}

/** `data` object from POST /bookings/create when wrapped in { status, data }. */
export function getCreateBookingData(
  res: unknown,
): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') return null;
  const r = res as Record<string, unknown>;
  const d = r.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    return d as Record<string, unknown>;
  }
  return r;
}

/** Windcave (or other) hosted payment URL from create-booking response. */
export function extractHostedPaymentUrl(res: unknown): string | null {
  const d = getCreateBookingData(res);
  if (!d) return null;
  const url = d.payment_url;
  if (typeof url !== 'string') return null;
  const t = url.trim();
  return /^https?:\/\//i.test(t) ? t : null;
}

/**
 * Flatten API response so UI can read `booking_id` at the top level
 * (e.g. success page after skipping hosted payment).
 */
export function mergeCreateBookingForUiState(res: unknown): Record<string, unknown> {
  const d = getCreateBookingData(res);
  const r =
    res && typeof res === 'object' ? { ...(res as Record<string, unknown>) } : {};
  if (!d) return r;
  return {
    ...r,
    ...d,
    booking_id: d.booking_id ?? r.booking_id,
    payment_id: d.payment_id ?? r.payment_id,
    amount: d.amount ?? r.amount,
    currency: d.currency ?? r.currency,
    payment_url: d.payment_url ?? r.payment_url,
  };
}
