import { useState } from 'react';
import { carsService, CarGetDetailsRequest } from '@/services/cars';

export function useCarCheckoutDetails() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);

  const fetchDetails = async (params: CarGetDetailsRequest) => {
    try {
      setLoading(true);
      setError(null);
      const result = await carsService.getVehicleDetails(params);
      setDetails(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchDetails,
    details,
    loading,
    error,
  };
}
