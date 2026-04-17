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
  reservationref?: string;
  reservation_ref?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com';

export const carsService = {
  async getDetails(): Promise<{ rentalsource: RentalSource[] }> {
    return apiJson<{ rentalsource: RentalSource[] }>(`${API_BASE_URL}/cars/get-details`, {
      method: 'GET',
      auth: 'optional',
      fallbackError: 'Could not load car details.',
    });
  },

  async searchCars(data: CarSearchRequest): Promise<any> {
    return apiJson<any>(`${API_BASE_URL}/cars/search`, {
      method: 'POST',
      auth: 'optional',
      body: data,
      fallbackError: 'Could not search available cars.',
    });
  },

  async getVehicleDetails(data: CarGetDetailsRequest): Promise<any> {
    return apiJson<any>(`${API_BASE_URL}/cars/get-details`, {
      method: 'POST',
      auth: 'optional',
      body: data,
      fallbackError: 'Could not load vehicle details.',
    });
  },

  async createBooking(data: any): Promise<any> {
    const json = await apiJson<Record<string, unknown>>(`${API_BASE_URL}/bookings/create`, {
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
    const reservationRef = String(
      params.reservationref ?? params.reservation_ref ?? '',
    ).trim();
    if (!reservationRef) {
      throw new Error('Reservation reference is required to create payment');
    }
    const body: Record<string, string> = {};
    body.reservationref = reservationRef;
    body.reservation_ref = reservationRef;
    const fallbackReturnUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/bookings`
        : '/bookings';
    // Send multiple common key variants to maximize backend compatibility.
    body.return_url = fallbackReturnUrl;
    body.success_url = fallbackReturnUrl;
    body.cancel_url = fallbackReturnUrl;
    body.failure_url = fallbackReturnUrl;
    body.redirect_url = fallbackReturnUrl;
    body.returnUrl = fallbackReturnUrl;
    body.successUrl = fallbackReturnUrl;
    body.cancelUrl = fallbackReturnUrl;
    body.failureUrl = fallbackReturnUrl;
    body.redirectUrl = fallbackReturnUrl;

    const json = await apiJson<Record<string, unknown>>(`${API_BASE_URL}/payments/create`, {
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
};