import { getApiBaseUrl } from '@/lib/api-base';
import { getAppOrigin } from '@/utils/app-origin';
import { apiJson } from '@/utils/api-client';
import { getFriendlyErrorMessage } from '@/utils/api-error-handler';

export interface RentalSource {
  id: string;
  name: string;
}

export interface CarSearchRequest {
  pickup_location_id: number;
  dropoff_location_id: number;
  pickup_date: string;
  pickup_time: string;
  dropoff_date: string;
  dropoff_time: string;
  category_id: number;
  age_id: number;
  campaigncode?: string;
  promocode?: string;
  couponcode?: string;
}

export interface CarGetDetailsRequest {
  vehicle_reference: number | string;
  category_id: number;
  pickup_location_id: number;
  dropoff_location_id: number;
  pickup_date: string;
  pickup_time: string;
  dropoff_date: string;
  dropoff_time: string;
  age_id: number;
}

export interface CreatePaymentSessionResponse {
  status?: number;
  message?: string;
  data?: {
    payment_url?: string;
    booking_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CreatePaymentSessionRequest {
  booking_id?: string | number;
  reservationref?: string;
  reservation_ref?: string;
  /** App confirmation route after backend `/payments/complete` — do not bypass that step. */
  success_url?: string;
  cancel_url?: string;
  failure_url?: string;
}

/** Car search text fields: return plain text from API (see docs/BACKEND.md). Client strips HTML if present. */

export const carsService = {
  async getDetails(): Promise<{ rentalsource: RentalSource[] }> {
    return apiJson<{ rentalsource: RentalSource[] }>(`${getApiBaseUrl()}/cars/get-details`, {
      method: 'GET',
      auth: 'optional',
      fallbackError: 'Could not load car details.',
    });
  },

  async searchCars(data: CarSearchRequest): Promise<any> {
    return apiJson<any>(`${getApiBaseUrl()}/cars/search`, {
      method: 'POST',
      auth: 'optional',
      body: data as unknown as Record<string, unknown>,
      fallbackError: 'Could not search available cars.',
    });
  },

  async getVehicleDetails(data: CarGetDetailsRequest): Promise<any> {
    return apiJson<any>(`${getApiBaseUrl()}/cars/get-details`, {
      method: 'POST',
      auth: 'optional',
      body: data as unknown as Record<string, unknown>,
      fallbackError: 'Could not load vehicle details.',
    });
  },

  async createBooking(data: any): Promise<any> {
    const json = await apiJson<Record<string, unknown>>(`${getApiBaseUrl()}/bookings/create`, {
      method: 'POST',
      auth: 'optional',
      body: data,
      fallbackError: 'Could not create booking.',
    });
    if (
      json.status !== undefined &&
      json.status !== 1 &&
      json.status !== '1'
    ) {
      throw new Error(
        getFriendlyErrorMessage({
          message: json.message,
          fallback: 'Could not create booking.',
        }),
      );
    }
    return json;
  },

  async createPaymentSession(
    params: CreatePaymentSessionRequest,
  ): Promise<CreatePaymentSessionResponse> {
    const bookingId = String(params.booking_id ?? '').trim();
    const reservationRef = String(
      params.reservationref ?? params.reservation_ref ?? '',
    ).trim();
    if (!bookingId && !reservationRef) {
      throw new Error('booking_id or reservation reference is required to create payment');
    }

    const body: Record<string, string> = {};
    if (reservationRef) {
      body.reservationref = reservationRef;
      body.reservation_ref = reservationRef;
      // `/payments/complete` accepts reservation_ref as `booking_id` on redirect.
      body.booking_id = reservationRef;
      body.bookingid = reservationRef;
    } else if (bookingId) {
      body.booking_id = bookingId;
      body.bookingid = bookingId;
    }

    // Windcave returns to backend `/payments/complete` by default; success_url is where
    // the API redirects the user after finalize (with status & confirmation_number).
    if (params.success_url?.trim()) {
      const success = params.success_url.trim();
      body.success_url = success;
      body.successUrl = success;
    }
    if (params.cancel_url?.trim()) {
      const cancel = params.cancel_url.trim();
      body.cancel_url = cancel;
      body.cancelUrl = cancel;
    }
    if (params.failure_url?.trim()) {
      const failure = params.failure_url.trim();
      body.failure_url = failure;
      body.failureUrl = failure;
      body.failed_url = failure;
    }

    const appOrigin = getAppOrigin();
    if (appOrigin) {
      body.frontend_origin = appOrigin;
      body.app_origin = appOrigin;
    }

    const json = await apiJson<Record<string, unknown>>(`${getApiBaseUrl()}/payments/create`, {
      method: 'POST',
      auth: 'optional',
      body,
      fallbackError: 'Could not initiate payment.',
    });
    if (
      json.status !== undefined &&
      json.status !== 1 &&
      json.status !== '1'
    ) {
      throw new Error(
        getFriendlyErrorMessage({
          message: json.message,
          fallback: 'Could not create payment session.',
        }),
      );
    }
    return json as CreatePaymentSessionResponse;
  },

  /**
   * Persist masked card details on the RCM booking after Windcave token capture
   * (required for signature capture on the rental agreement).
   */
  async savePaymentCardDetails(params: {
    reservation_ref?: string;
    reservationref?: string;
    booking_id?: string;
    masked_card_number: string;
    card_expiry: string;
    cardholder_name: string;
    card_type: string;
  }): Promise<Record<string, unknown>> {
    const reservationRef = String(
      params.reservationref ?? params.reservation_ref ?? '',
    ).trim();
    const bookingId = String(params.booking_id ?? '').trim();
    if (!reservationRef && !bookingId) {
      throw new Error('Reservation reference is required to save card details');
    }

    const body: Record<string, string> = {
      masked_card_number: params.masked_card_number.trim(),
      card_expiry: params.card_expiry.trim(),
      cardholder_name: params.cardholder_name.trim(),
      card_type: params.card_type.trim(),
    };
    if (reservationRef) {
      body.reservation_ref = reservationRef;
      body.reservationref = reservationRef;
    } else if (bookingId) {
      body.booking_id = bookingId;
      body.bookingid = bookingId;
    }

    return apiJson<Record<string, unknown>>(`${getApiBaseUrl()}/payments/card-details`, {
      method: 'POST',
      auth: 'optional',
      body,
      fallbackError: 'Could not save card details on booking.',
    });
  },
};