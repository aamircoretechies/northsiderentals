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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com';

export const carsService = {
  async getDetails(): Promise<{ rentalsource: RentalSource[] }> {
    const response = await fetch(`${API_BASE_URL}/cars/get-details`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to get car details: ${response.statusText}`);
    }

    return response.json();
  },

  async searchCars(data: CarSearchRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/cars/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
  }
};