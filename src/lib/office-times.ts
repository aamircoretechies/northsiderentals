import { parse, startOfDay } from 'date-fns';
import type { OfficeTimeRecord } from '@/services/dashboard';

function parseApiDateLoose(s: string): Date {
  const part = (s || '').trim().substring(0, 11);
  return parse(part, 'dd-MMM-yyyy', new Date());
}

/** API uses 1 = Monday … 7 = Sunday */
export function apiDayOfWeekFromDate(ref: Date): number {
  const js = ref.getDay();
  return js === 0 ? 7 : js;
}

function dateRangeSpanDays(row: OfficeTimeRecord): number {
  try {
    const a = parseApiDateLoose(row.startdate).getTime();
    const b = parseApiDateLoose(row.enddate).getTime();
    return Math.abs(b - a);
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Picks the most specific office-hours row for a location and calendar date
 * (prefers the narrowest start/end date range when several rows match).
 */
export function pickOfficeSlot(
  rows: OfficeTimeRecord[],
  locationId: number,
  ref: Date,
): OfficeTimeRecord | null {
  if (!rows?.length) return null;
  const dow = apiDayOfWeekFromDate(ref);
  const dayRows = rows.filter(
    (r) => r.locationid === locationId && r.dayofweek === dow,
  );
  if (!dayRows.length) return null;

  const ref0 = startOfDay(ref);
  const inRange = dayRows.filter((r) => {
    try {
      const a = startOfDay(parseApiDateLoose(r.startdate));
      const b = startOfDay(parseApiDateLoose(r.enddate));
      return ref0 >= a && ref0 <= b;
    } catch {
      return false;
    }
  });

  const pool = inRange.length ? inRange : dayRows;
  return [...pool].sort((a, b) => dateRangeSpanDays(a) - dateRangeSpanDays(b))[0];
}

function parseHHMM24(t: string): number | null {
  const raw = (t || '').trim();
  if (!raw) return null;
  if (raw === '24:00') return 24 * 60;
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

export function effectivePickupWindow(slot: OfficeTimeRecord): {
  start: string;
  end: string;
} {
  const start = slot.startpickup?.trim() || slot.openingtime;
  const end = slot.endpickup?.trim() || slot.closingtime;
  return { start, end };
}

export function effectiveDropoffWindow(slot: OfficeTimeRecord): {
  start: string;
  end: string;
} {
  const start = slot.startdropoff?.trim() || slot.openingtime;
  const end = slot.enddropoff?.trim() || slot.closingtime;
  return { start, end };
}

/** `timeOptions` use `hh:mm a` (e.g. 09:00 AM). Keep only those inside [start,end] 24h inclusive. */
export function filter12hTimeOptions(
  timeOptions: string[],
  start24: string,
  end24: string,
): string[] {
  const sm = parseHHMM24(start24);
  const em = parseHHMM24(end24);
  if (sm == null || em == null) return timeOptions;

  return timeOptions.filter((opt) => {
    try {
      const d = parse(opt, 'hh:mm a', new Date());
      const mins = d.getHours() * 60 + d.getMinutes();
      return mins >= sm && mins <= em;
    } catch {
      return true;
    }
  });
}
