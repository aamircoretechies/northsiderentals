/**
 * RCM numeric codes and field resolvers — values come from API rows, not UI constants.
 */

/** RCM `bookingtype` / `booking_type` for quotations. */
export const RCM_BOOKING_TYPE_QUOTE = 1;
/** RCM `bookingtype` / `booking_type` for reservations / booking requests. */
export const RCM_BOOKING_TYPE_BOOKING = 2;

function pickFiniteNumber(...values: unknown[]): number | undefined {
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return undefined;
}

/** Transmission id from car search row, checkout car state, search params, or workflow bookinginfo. */
export function resolveTransmissionId(sources: {
  carRow?: Record<string, unknown> | null;
  carUi?: Record<string, unknown> | null;
  searchParams?: Record<string, unknown> | null;
  bookingInfo?: Record<string, unknown> | null;
}): number | undefined {
  return pickFiniteNumber(
    sources.carRow?.transmissionid,
    sources.carRow?.transmission_id,
    sources.carRow?.transmissionpreference,
    sources.carUi?.transmissionid,
    sources.carUi?.transmission_id,
    sources.searchParams?.transmission,
    sources.searchParams?.transmission_id,
    sources.searchParams?.transmissionid,
    sources.bookingInfo?.transmission,
    sources.bookingInfo?.transmissionid,
    sources.bookingInfo?.transmission_id,
  );
}

/** Rate period type from selected vehicle / search row. */
export function resolveRatePeriodTypeId(sources: {
  carRow?: Record<string, unknown> | null;
  carUi?: Record<string, unknown> | null;
}): number | undefined {
  return pickFiniteNumber(
    sources.carUi?.rateperiod_typeid,
    sources.carRow?.rateperiod_typeid,
    sources.carRow?.rateperiod_type_id,
  );
}

/** Referral id from existing booking only — omit when unknown (do not default to 1). */
export function resolveReferralId(
  bookingInfo?: Record<string, unknown> | null,
): number | undefined {
  return pickFiniteNumber(bookingInfo?.referralid, bookingInfo?.referral_id);
}

/** Tax rate from search response only (no client default). */
export function resolveTaxRateFromSearch(
  data: Record<string, unknown> | undefined,
): number | undefined {
  if (!data) return undefined;
  const tr = data.taxrate;
  const n = typeof tr === 'number' ? tr : Number(tr);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
