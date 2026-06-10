import { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, Loader2, AlertCircle, X } from 'lucide-react';
import { ScreenLoader } from '@/components/common/screen-loader';
import { useLocation, useNavigate } from 'react-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/context/auth-context';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BookingCard } from './components/booking-card';
import type { BookingCardProps } from './components/booking-card';
import {
  bookingReferenceFromFindPayload,
  fetchBookingsList,
  findBookingLookup,
  mapApiBookingToCardProps,
} from '@/services/bookings';
import { getFriendlyError } from '@/utils/api-error-handler';
import { queryKeys } from '@/lib/query-keys';
import {
  type BookingsRefreshLocationState,
  refetchBookingsList,
} from '@/utils/refresh-bookings-list';
import { bookingUiStatus } from '@/utils/booking-ui-status';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function BookingsContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { auth, loading: authLoading } = useAuth();
  const isAuthed = Boolean(auth?.access_token);

  const [searchInput, setSearchInput] = useState('');
  const [lookupReservation, setLookupReservation] = useState('');
  const [lookupLastName, setLookupLastName] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'active' | 'upcoming' | 'completed'>(
    'active',
  );
  const [error, setError] = useState<string | null>(null);
  const {
    data,
    error: queryError,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.bookingsList('all', 1, PAGE_SIZE),
    enabled: isAuthed,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await fetchBookingsList({
        page: pageParam,
        limit: PAGE_SIZE,
        status: 'all',
      });
      const raw = res.data?.bookings;
      const list = Array.isArray(raw) ? raw : [];
      const mapped = list
        .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
        .map(mapApiBookingToCardProps)
        /** Drop orphan rows the API returns without an RCM ref (no detail, placeholder vehicle). */
        .filter((card) => Boolean(card.detailReference?.trim()));
      return { mapped, nextPage: mapped.length >= PAGE_SIZE ? pageParam + 1 : undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  useEffect(() => {
    const state = (location.state ?? null) as BookingsRefreshLocationState | null;
    if (!state?.refreshBookings || !isAuthed) return;

    let cancelled = false;
    void refetchBookingsList(queryClient, state.reservationRef).finally(() => {
      if (cancelled) return;
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: {} },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [
    location.key,
    location.pathname,
    location.search,
    location.state,
    isAuthed,
    queryClient,
    navigate,
  ]);

  useEffect(() => {
    if (!isAuthed) {
      setError(null);
      return;
    }
    setError(null);
  }, [isAuthed, statusFilter]);

  useEffect(() => {
    if (!isAuthed || authLoading) return;
    // clear stale local error once query succeeds
    if (data) setError(null);
  }, [isAuthed, authLoading, data]);

  useEffect(() => {
    if (!queryError) return;
    setError(getFriendlyError(queryError, 'Could not load bookings.'));
  }, [queryError]);

  const items = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.mapped),
    [data],
  );

  const isGlobalSearch = Boolean(searchInput.trim());

  const filtered = useMemo(() => {
    const now = new Date();
    const statusScoped = items.filter((b) => bookingUiStatus(b, now) === statusFilter);
    const q = normalizeSearchText(searchInput);
    if (!q) return statusScoped;
    // Global search across all status tabs (no active/upcoming/completed filter).
    return items.filter((b) => {
      const haystack = normalizeSearchText(
        [
          b.reservationNumber,
          b.carName,
          b.carSpecs,
          b.bookingId,
          b.statusLabel,
          b.reservationType ?? '',
          b.pickupDate,
          b.returnDate,
        ]
          .map((x) => String(x ?? ''))
          .join(' '),
      );
      return haystack.includes(q);
    });
  }, [items, searchInput, statusFilter]);

  useEffect(() => {
    if (!isAuthed) return;
    if (!searchInput.trim()) return;
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [isAuthed, searchInput, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleLoadMore = () => void fetchNextPage();

  const handleFindBooking = async () => {
    setLookupError(null);
    try {
      setLookupLoading(true);
      const res = await findBookingLookup({
        reservationNo: lookupReservation,
        lastName: lookupLastName,
      });
      const data = res.data;
      if (!data || typeof data !== 'object') {
        throw new Error(res.message || 'No booking data returned');
      }
      const ref = bookingReferenceFromFindPayload(data as Record<string, unknown>);
      if (!ref) {
        throw new Error('Booking found but reference is missing. Please contact support.');
      }
      navigate(`/bookings/${encodeURIComponent(ref)}`);
    } catch (e) {
      setLookupError(getFriendlyError(e, 'Could not find this booking.'));
    } finally {
      setLookupLoading(false);
    }
  };

  const listAreaLoading = authLoading || (isAuthed && isLoading);

  return (
    <div className="flex flex-col items-stretch gap-7">
      {!isAuthed ? (
        <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Find a booking</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Input
              id="bookings-lookup-reservation"
              value={lookupReservation}
              onChange={(e) => setLookupReservation(e.target.value)}
              placeholder="Confirmation / reservation #"
              className="flex-1 px-2 py-2 text-[13px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleFindBooking();
              }}
            />
            <Input
              id="bookings-lookup-lastname"
              value={lookupLastName}
              onChange={(e) => setLookupLastName(e.target.value)}
              placeholder="Last name on booking"
              className="flex-1 sm:max-w-[220px] px-2 py-2 text-[13px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleFindBooking();
              }}
            />
            <Button
              type="button"
              className="shrink-0 bg-[#0061e0] hover:bg-[#0052cc] text-white"
              disabled={lookupLoading}
              onClick={() => void handleFindBooking()}
            >
              {lookupLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin me-2 inline" />
                  Finding…
                </>
              ) : (
                'Find'
              )}
            </Button>
          </div>
          {lookupError ? (
            <p className="text-sm text-destructive">{lookupError}</p>
          ) : null}
        </div>
      ) : null}

      {isAuthed ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <div className="relative flex items-center flex-1 z-1">
              <SearchIcon
                className="absolute start-4 text-muted-foreground"
                size={16}
              />
              <Input
                id="bookings-search"
                value={searchInput}
                placeholder="Search all bookings by confirmation #, car, or status…"
                onChange={(e) => setSearchInput(e.target.value)}
                className="ps-9 pe-10 w-full"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute end-3 p-1 rounded-full hover:bg-gray-100/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div
              className={cn(
                'flex items-center gap-2',
                isGlobalSearch && 'opacity-60',
              )}
            >
              {[
                { id: 'active', label: 'Active' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'completed', label: 'Completed' },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  variant={
                    !isGlobalSearch && statusFilter === tab.id ? 'primary' : 'outline'
                  }
                  className="h-9 px-3"
                  onClick={() => {
                    setStatusFilter(tab.id as 'active' | 'upcoming' | 'completed');
                    if (isGlobalSearch) setSearchInput('');
                  }}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
            {/*   <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as 'active' | 'upcoming' | 'completed')
              }
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select> */}
          </div>

          <div className="flex flex-wrap items-center gap-5 justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {!listAreaLoading
                ? isGlobalSearch
                  ? `${filtered.length} booking${filtered.length === 1 ? '' : 's'} found (all statuses)`
                  : `${filtered.length} booking${filtered.length === 1 ? '' : 's'} shown`
                : null}
            </h3>
          </div>

          {error ? (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Could not load bookings</p>
                <p className="text-destructive/90 mt-1">{error}</p>
              </div>
            </div>
          ) : null}

          {listAreaLoading && !items.length ? (
            <ScreenLoader />
          ) : null}

          {!listAreaLoading && !error && !filtered.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center text-muted-foreground">
              <p className="font-medium text-foreground">
                {isGlobalSearch ? 'No matching bookings' : 'No bookings in your list'}
              </p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                {isGlobalSearch
                  ? 'Try a different confirmation number, car name, or clear search to browse by status.'
                  : 'Try another status tab or adjust your search. New bookings may take a moment to appear here.'}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5">
            {filtered.map((booking) => (
              <BookingCard key={booking.bookingId} {...booking} />
            ))}
          </div>

          {hasNextPage && !searchInput.trim() ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                className="min-w-[200px]"
                onClick={() => handleLoadMore()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="size-4 animate-spin me-2" />
                    Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          ) : null}
        </>
      ) : !authLoading ? (
        <p className="text-sm text-muted-foreground text-center sm:text-start">
          Sign in to see your bookings here with search and filters.
        </p>
      ) : null}
    </div>
  );
}
