import { carsService } from '@/services/cars';
import { formatCardBrand as formatCardBrandLabel } from '@/utils/card-brand';
import type { PaymentReturnParams, WindcaveResultPayload } from '@/utils/payment-return';
import { resolveReservationRef } from '@/utils/reservation-context';

function pickString(source: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function windcaveRecords(
  windcave: WindcaveResultPayload | null | undefined,
): Record<string, unknown>[] {
  if (!windcave || typeof windcave !== 'object') return [];
  const records: Record<string, unknown>[] = [windcave];
  for (const key of ['data', 'result', 'card', 'payment', 'response']) {
    const nested = windcave[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      records.push(nested as Record<string, unknown>);
    }
  }
  return records;
}

/** Card fields required for RCM signature capture on the rental agreement. */
export function extractCardDetailsForRcm(paymentReturn: PaymentReturnParams): {
  masked: string;
  expiry: string;
  name: string;
  cardType: string;
} {
  let masked = paymentReturn.maskedCardNumber.trim();
  let expiry = paymentReturn.cardExpiry.trim();
  let name = paymentReturn.cardholderName.trim();
  let cardType =
    formatCardBrandLabel(paymentReturn.cardType) || paymentReturn.cardType.trim();

  for (const rec of windcaveRecords(paymentReturn.windcaveResult)) {
    masked =
      masked ||
      pickString(
        rec,
        'masked_card_number',
        'card_number_masked',
        'maskedcardnumber',
        'cardno',
        'CardNumber',
        'cardnumber',
      );
    expiry =
      expiry ||
      pickString(rec, 'card_expiry', 'expiry_date', 'expiry', 'CardExpiry', 'cardexpiry');
    name =
      name ||
      pickString(
        rec,
        'cardholder_name',
        'card_name',
        'name_on_card',
        'CardHolderName',
        'cardholder',
      );
    cardType =
      cardType ||
      formatCardBrandLabel(
        pickString(rec, 'card_type', 'cardtype', 'CardType', 'cardbrand', 'paytype'),
      ) ||
      pickString(rec, 'card_type', 'cardtype', 'CardType', 'cardbrand', 'paytype');
  }

  return { masked, expiry, name, cardType };
}

/**
 * POST masked card number, expiry, name, and card type to RCM after Windcave capture.
 * Returns true when all required fields were sent.
 */
export async function persistPaymentCardDetailsForRcm(
  reservationRef: string,
  paymentReturn: PaymentReturnParams,
): Promise<boolean> {
  const ref = resolveReservationRef(reservationRef);
  if (!ref) return false;

  const { masked, expiry, name, cardType } = extractCardDetailsForRcm(paymentReturn);
  if (!masked || !expiry || !name || !cardType) {
    return false;
  }

  await carsService.savePaymentCardDetails({
    reservation_ref: ref,
    reservationref: ref,
    masked_card_number: masked,
    card_expiry: expiry,
    cardholder_name: name,
    card_type: cardType,
  });
  return true;
}
