const CARD_BRAND_STORAGE_KEY = 'checkout_card_brand';

/** Normalize gateway / RCM card type strings for display (e.g. Visa, Mastercard). */
export function formatCardBrand(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower.includes('visa')) return 'Visa';
  if (lower.includes('master') || lower === 'mc') return 'Mastercard';
  if (lower.includes('amex') || lower.includes('american express')) return 'American Express';
  if (lower.includes('diners')) return 'Diners Club';
  if (lower.includes('discover')) return 'Discover';
  if (lower.includes('jcb')) return 'JCB';
  if (lower === 'credit card' || lower === 'creditcard' || lower === 'card') return '';
  if (/^[a-z]+$/i.test(s) && s.length <= 24) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
  return s;
}

export function saveCheckoutCardBrand(brand: string): void {
  const formatted = formatCardBrand(brand);
  if (!formatted) return;
  try {
    sessionStorage.setItem(CARD_BRAND_STORAGE_KEY, formatted);
  } catch {
    // ignore
  }
}

export function loadCheckoutCardBrand(): string {
  try {
    return formatCardBrand(sessionStorage.getItem(CARD_BRAND_STORAGE_KEY));
  } catch {
    return '';
  }
}

/** Read card brand from payment-complete redirect query parameters. */
export function extractCardBrandFromUrl(search: string): string {
  const params = new URLSearchParams(search);
  const candidates = [
    params.get('card_type'),
    params.get('cardtype'),
    params.get('CardType'),
    params.get('cardbrand'),
    params.get('CardBrand'),
    params.get('cardname'),
    params.get('CardName'),
    params.get('brand'),
  ];
  for (const c of candidates) {
    const formatted = formatCardBrand(c);
    if (formatted) return formatted;
  }
  return '';
}

/**
 * Replace generic "Credit Card" card-type labels in RCM agreement HTML with the actual brand.
 */
export function applyCardBrandToAgreementHtml(
  html: string,
  cardBrand: string,
): string {
  const brand = formatCardBrand(cardBrand);
  if (!brand || !html.trim()) return html;

  return html
    .replace(
      /(Card\s*Type\s*:?\s*)(?:<[^>]+>\s*)?(?:Credit\s*Card|creditcard)(?:\s*<\/[^>]+>)?/gi,
      `$1${brand}`,
    )
    .replace(
      /(Type\s*of\s*Card\s*:?\s*)(?:<[^>]+>\s*)?(?:Credit\s*Card|creditcard)(?:\s*<\/[^>]+>)?/gi,
      `$1${brand}`,
    );
}
