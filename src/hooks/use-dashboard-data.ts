import { useState, useCallback } from 'react';
import { dashboardService, DashboardData, RegisterDeviceRequest } from '@/services/dashboard';

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const registerDevice = useCallback(async (deviceData: RegisterDeviceRequest) => {
    console.log('registerDevice() called with', deviceData);
    try {
      setLoading(true);
      setError(null);
      const result = await dashboardService.registerDevice(deviceData);
      console.log('Dashboard data received:', result);
      setData(result);
    } catch (err) {
      console.error('Error registering device:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    registerDevice,
  };
}