const PAYMENT_DISCLAIMER_MESSAGE =
  "Your card won't be charged. We only take payment at the time of pickup.";

export function confirmWindcaveRedirect(): boolean {
  if (typeof window === 'undefined') return true;
  return window.confirm(PAYMENT_DISCLAIMER_MESSAGE);
}
