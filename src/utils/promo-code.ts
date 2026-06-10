/** Promo code carried from search through checkout (campaigncode / promocode / couponcode). */

export function getPromoCodeFromSearchParams(
  sp: Record<string, unknown> | null | undefined,
): string {
  if (!sp) return '';
  return String(
    sp.campaigncode ?? sp.promocode ?? sp.couponcode ?? '',
  ).trim();
}

export function withPromoFields(
  promo: string,
  target: Record<string, unknown>,
): Record<string, unknown> {
  const code = promo.trim();
  if (!code) return target;
  return {
    ...target,
    campaigncode: code,
    promocode: code,
    couponcode: code,
  };
}
