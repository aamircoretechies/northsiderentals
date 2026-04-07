import { useState } from 'react';
import { carsService, CarSearchRequest } from '@/services/cars';

export function useCarSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const searchCars = async (params: CarSearchRequest) => {
    try {
      setLoading(true);
      setError(null);
      const result = await carsService.searchCars(params);
      setData(result);
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
    searchCars,
    loading,
    error,
    data,
  };
}
