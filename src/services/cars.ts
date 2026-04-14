import { getAuth } from '@/auth/lib/helpers';

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

function headersJsonOptionalAuth(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const auth = getAuth();
  if (auth?.access_token) {
    h.Authorization = `Bearer ${auth.access_token}`;
  }
  return h;
}

export const carsService = {
  async getDetails(): Promise<{ rentalsource: RentalSource[] }> {
    const h = headersJsonOptionalAuth();
    delete h['Content-Type'];
    const response = await fetch(`${API_BASE_URL}/cars/get-details`, {
      method: 'GET',
      headers: h,
    });

    if (!response.ok) {
      throw new Error(`Failed to get car details: ${response.statusText}`);
    }

    return response.json();
  },

  async searchCars(data: CarSearchRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/cars/search`, {
      method: 'POST',
      headers: headersJsonOptionalAuth(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to search cars: ${response.statusText}`);
    }

    return response.json();
  },

  async getVehicleDetails(data: CarGetDetailsRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/cars/get-details`, {
      method: 'POST',
      headers: headersJsonOptionalAuth(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to get vehicle details: ${response.statusText}`);
    }

    return response.json();
  },

  async createBooking(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/bookings/create`, {
      method: 'POST',
      headers: headersJsonOptionalAuth(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      try {
        const errJson = await response.json();
        throw new Error(errJson.message || `Failed to create booking: ${response.statusText}`);
      } catch (e) {
        throw new Error(`Failed to create booking: ${response.statusText}`);
      }
    }

    return response.json();
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
    const bookingPath = `/bookings/${encodeURIComponent(reservationRef)}`;
    const fallbackReturnUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${bookingPath}`
        : bookingPath;
    // Send multiple common key variants to maximize backend compatibility.
    body.return_url = fallbackReturnUrl;
    body.success_url = fallbackReturnUrl;
    body.cancel_url = fallbackReturnUrl;
    body.failure_url = fallbackReturnUrl;
    body.redirect_url = fallbackReturnUrl;

    const response = await fetch(`${API_BASE_URL}/payments/create`, {
      method: 'POST',
      headers: headersJsonOptionalAuth(),
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json: Record<string, unknown> | null = null;
    if (text.trim()) {
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        json = null;
      }
    }

    if (!response.ok) {
      const msg =
        (json?.message as string) ||
        (json?.error as string) ||
        `Failed to initiate payment: ${response.statusText}`;
      throw new Error(msg);
    }

    if (
      json &&
      json.status !== undefined &&
      json.status !== 1 &&
      json.status !== '1'
    ) {
      throw new Error(
        (json.message as string) || 'Could not create payment session',
      );
    }

    return (json || {}) as CreatePaymentSessionResponse;
  },
};