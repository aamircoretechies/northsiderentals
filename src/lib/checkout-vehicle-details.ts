/**
 * Normalise vehicle-details (`/cars/get-details`) payloads so checkout can read
 * `countries` regardless of envelope shape (root vs `data`, nested objects, key casing).
 */

export type CheckoutCountryOption = { id: number; country: string };

const MAX_COUNTRY_NEST_DEPTH = 8;

export function mapCheckoutCountryRow(row: unknown): CheckoutCountryOption | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = Number(
    r.id ??
      r.country_id ??
      r.countryid ??
      r.CountryId ??
      r.countryId ??
      r.countryID ??
      0,
  );
  const country = String(
    r.country ??
      r.Country ??
      r.name ??
      r.country_name ??
      r.countryname ??
      r.label ??
      r.code ??
      r.Code ??
      '',
  ).trim();
  if (!Number.isFinite(id) || id <= 0 || !country) return null;
  return { id, country };
}

/** Resolve `{ status, data: { … } }` (possibly nested `data`) or flat payloads to one record. */
export function extractVehicleDetailsData(response: unknown): Record<string, unknown> {
  if (!response || typeof response !== 'object') return {};
  let cur: Record<string, unknown> = response as Record<string, unknown>;
  for (let i = 0; i < 4; i++) {
    const d = cur.data;
    if (d != null && typeof d === 'object' && !Array.isArray(d)) {
      cur = d as Record<string, unknown>;
      continue;
    }
    break;
  }
  return cur;
}

const COUNTRY_ARRAY_KEYS = [
  'countries',
  'Countries',
  'countrylist',
  'CountryList',
  'country_list',
  'countryList',
  'countryListData',
  'countrydata',
  'CountryData',
  'nationlist',
  'NationList',
];

/** Do not include `data` here — many payloads use `data` as the envelope; recursing into it can skip sibling `countries`. */
const NESTED_OBJECT_KEYS = [
  'details',
  'vehicle',
  'Vehicle',
  'bookinginfo',
  'booking_info',
  'BookingInfo',
  'customer',
  'profile',
  'meta',
  'result',
  'Result',
];

function tryCountryArray(raw: unknown): CheckoutCountryOption[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .map((item) => mapCheckoutCountryRow(item))
    .filter((x): x is CheckoutCountryOption => x != null);
}

function extractCountriesRecursive(
  data: Record<string, unknown>,
  depth: number,
): CheckoutCountryOption[] {
  if (depth > MAX_COUNTRY_NEST_DEPTH) return [];

  for (const k of COUNTRY_ARRAY_KEYS) {
    const found = tryCountryArray(data[k]);
    if (found.length > 0) return found;
  }

  for (const nk of NESTED_OBJECT_KEYS) {
    const sub = data[nk];
    if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
      const inner = extractCountriesRecursive(sub as Record<string, unknown>, depth + 1);
      if (inner.length > 0) return inner;
    }
  }

  return [];
}

/** Countries list for licence dropdowns (may be empty if API omits the array). */
export function extractCheckoutCountriesFromVehicleDetails(
  data: Record<string, unknown>,
): CheckoutCountryOption[] {
  const raw = data.countries ?? data.Countries;
  if (Array.isArray(raw) && raw.length > 0) {
    const mapped = tryCountryArray(raw);
    if (mapped.length === 0) return extractCountriesRecursive(data, 0);
    let defaultId: number | null = null;
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      if (r.isdefault === true || r.isdefault === 1 || String(r.isdefault).toLowerCase() === 'true') {
        const id = Number(r.id ?? 0);
        if (Number.isFinite(id) && id > 0) {
          defaultId = id;
          break;
        }
      }
    }
    if (defaultId != null) {
      return [...mapped].sort((a, b) => {
        if (a.id === defaultId) return -1;
        if (b.id === defaultId) return 1;
        return a.country.localeCompare(b.country);
      });
    }
    return [...mapped].sort((a, b) => a.country.localeCompare(b.country));
  }
  return extractCountriesRecursive(data, 0);
}

export type CheckoutAreaOfUseOption = { id: number; label: string; locationid: number };

/**
 * RCM `areaofuse` rows: { id, areaofuse, locationid, isdefault }.
 * When `pickupLocationId` is set, keep rows where `locationid` is 0 (global) or matches pickup.
 */
export function extractCheckoutAreaOfUseOptions(
  data: Record<string, unknown>,
  pickupLocationId?: number,
): CheckoutAreaOfUseOption[] {
  const raw = data.areaofuse ?? data.area_of_use ?? data.areaOfUse;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const pid =
    pickupLocationId != null && Number.isFinite(Number(pickupLocationId))
      ? Number(pickupLocationId)
      : null;
  const rows = raw as Record<string, unknown>[];
  const filtered =
    pid != null
      ? rows.filter((row) => {
          const lid = Number(row.locationid ?? row.location_id ?? 0);
          return lid === 0 || lid === pid;
        })
      : rows;

  const mapped: CheckoutAreaOfUseOption[] = [];
  for (const row of filtered) {
    const id = Number(row.id ?? 0);
    const label = String(row.areaofuse ?? row.area_of_use ?? row.name ?? '').trim();
    const locationid = Number(row.locationid ?? row.location_id ?? 0);
    if (!Number.isFinite(id) || id <= 0 || !label) continue;
    mapped.push({ id, label, locationid });
  }

  mapped.sort((a, b) => {
    const rowA = rows.find((r) => Number(r.id) === a.id);
    const rowB = rows.find((r) => Number(r.id) === b.id);
    const defA =
      rowA?.isdefault === true || rowA?.isdefault === 1 ? 0 : 1;
    const defB =
      rowB?.isdefault === true || rowB?.isdefault === 1 ? 0 : 1;
    if (defA !== defB) return defA - defB;
    return a.label.localeCompare(b.label);
  });

  return mapped;
}
