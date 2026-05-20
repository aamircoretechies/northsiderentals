/** Status-based UI flags for booking detail / list screens. */

export function isBookingHired(statusLabel: string): boolean {
  const s = statusLabel.toLowerCase();
  return (
    s.includes('hired') ||
    s.includes('on hire') ||
    s.includes('out on hire') ||
    s.includes('vehicle out')
  );
}

export function isBookingReturned(statusLabel: string): boolean {
  const s = statusLabel.toLowerCase();
  return (
    s.includes('returned') ||
    s.includes('complete') ||
    s.includes('closed') ||
    s.includes('cancelled') ||
    s.includes('canceled')
  );
}
