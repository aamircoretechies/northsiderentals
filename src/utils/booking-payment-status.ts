import { sanitizeApiText } from '@/utils/sanitize-api-text';

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export type BookingPaymentSnapshot = {
  balanceDue: number;
  totalCost: number;
  paymentStatus: string;
  markedPaid: boolean;
};

function firstBookingInfoRow(
  data: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const rcm = data.rcm_booking_info;
  if (rcm && typeof rcm === 'object' && !Array.isArray(rcm)) {
    const list = (rcm as Record<string, unknown>).bookinginfo;
    if (Array.isArray(list) && list[0] && typeof list[0] === 'object') {
      return list[0] as Record<string, unknown>;
    }
  }
  if (Array.isArray(data.bookinginfo) && data.bookinginfo[0]) {
    const row = data.bookinginfo[0];
    if (row && typeof row === 'object') return row as Record<string, unknown>;
  }
  return undefined;
}

export function getBookingPaymentSnapshot(
  data: Record<string, unknown> | null | undefined,
): BookingPaymentSnapshot {
  if (!data || typeof data !== 'object') {
    return {
      balanceDue: 0,
      totalCost: 0,
      paymentStatus: '',
      markedPaid: false,
    };
  }
  const pricing = (data.pricing as Record<string, unknown>) || {};
  const info = firstBookingInfoRow(data);

  let totalCost =
    data.totalcost != null ? num(data.totalcost) : num(pricing.total);

  const balanceCandidates: number[] = [];
  if (data.balancedue != null) balanceCandidates.push(num(data.balancedue));
  if (pricing.balancedue != null) balanceCandidates.push(num(pricing.balancedue));
  if (info?.balancedue != null) balanceCandidates.push(num(info.balancedue));
  if (info?.totalcost != null) balanceCandidates.push(num(info.totalcost));

  if (info?.totalcost != null) totalCost = num(info.totalcost);

  /** After modify-and-pay, root `balancedue` can be 156 while nested `bookinginfo` is still 0. */
  let balanceDue =
    balanceCandidates.length > 0 ? Math.max(...balanceCandidates) : totalCost;
  if (balanceDue <= 0 && totalCost > 0) balanceDue = totalCost;

  const paymentStatus = sanitizeApiText(String(data.payment_status ?? ''));
  const ps = paymentStatus.toLowerCase();
  const rcmPayment = info ? num(info.payment) : 0;

  /** Balance due wins over stale payment_status / payment_id from an earlier capture. */
  const markedPaid =
    balanceDue <= 0.005 &&
    (ps.includes('paid') ||
      ps.includes('success') ||
      ps.includes('complete') ||
      ps.includes('authorised') ||
      ps.includes('authorized') ||
      (data.payment_id != null && rcmPayment > 0));

  return { balanceDue, totalCost, paymentStatus, markedPaid };
}

/** Poll / redirect should not treat stale "paid" as done while balance remains. */
export function shouldTreatBookingAsFullyPaid(
  snapshot: BookingPaymentSnapshot,
): boolean {
  if (snapshot.balanceDue > 0.005) return false;
  return snapshot.markedPaid;
}
