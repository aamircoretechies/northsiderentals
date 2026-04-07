import { useState, useEffect } from 'react';
import { carsService, RentalSource } from '@/services/cars';

export function useCarDetails() {
  const [rentalsource, setRentalsource] = useState<RentalSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await carsService.getDetails();
        setRentalsource(result.rentalsource);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, []);

  return {
    rentalsource,
    loading,
    error,
  };
}