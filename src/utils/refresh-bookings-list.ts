import type { QueryClient } from '@tanstack/react-query';
import { invalidateBookingsCache } from '@/services/bookings';

export type BookingsRefreshLocationState = {
  refreshBookings?: boolean;
  reservationRef?: string;
};

/** Navigation state so `/bookings` refetches after create / quote / convert. */
export function bookingsListRefreshNavigateOptions(reservationRef?: string): {
  replace: boolean;
  state: BookingsRefreshLocationState;
} {
  const ref = reservationRef?.trim();
  return {
    replace: true,
    state: {
      refreshBookings: true,
      ...(ref ? { reservationRef: ref } : {}),
    },
  };
}

/** Clear service cache + React Query list cache before or after navigating to bookings. */
export async function prepareBookingsListRefresh(
  queryClient: QueryClient,
  reservationRef?: string,
): Promise<void> {
  invalidateBookingsCache(reservationRef);
  await queryClient.invalidateQueries({ queryKey: ['bookings', 'list'] });
}

/** Force a network refetch of the bookings list (infinite query). */
export async function refetchBookingsList(
  queryClient: QueryClient,
  reservationRef?: string,
): Promise<void> {
  await prepareBookingsListRefresh(queryClient, reservationRef);
  await queryClient.refetchQueries({ queryKey: ['bookings', 'list'] });
}
