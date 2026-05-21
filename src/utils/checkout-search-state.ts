/** Persist car search API response across checkout steps (back button, refresh). */

export const CHECKOUT_SEARCH_DATA_KEY = 'checkout_search_data';

export interface CheckoutSearchState {
  searchData: unknown;
  searchParams?: unknown;
  locations?: unknown;
}

export function saveCheckoutSearchState(state: CheckoutSearchState): void {
  if (!state.searchData) return;
  try {
    sessionStorage.setItem(CHECKOUT_SEARCH_DATA_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function loadCheckoutSearchState(): CheckoutSearchState | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_SEARCH_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutSearchState;
    if (!parsed?.searchData) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCheckoutSearchState(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_SEARCH_DATA_KEY);
  } catch {
    // ignore
  }
}
