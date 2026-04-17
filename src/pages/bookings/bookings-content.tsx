import { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
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

const PAGE_SIZE = 20;

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseBookingDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Try native parser first for ISO-like strings.
  const native = new Date(trimmed);
  if (!Number.isNaN(native.getTime())) return native;

  // Supports values like "17/Apr/2026" or "17/Apr/2026 09:00".
  const m = trimmed.match(
    /^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/,
  );
  if (!m) return null;
  const day = Number(m[1]);
  const mon = m[2].toLowerCase();
  const year = Number(m[3]);
  const hour = Number(m[4] ?? 0);
  const min = Number(m[5] ?? 0);
  const monthMap: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const monthIdx = monthMap[mon];
  if (monthIdx == null) return null;
  const d = new Date(year, monthIdx, day, hour, min, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function bookingUiStatus(
  booking: BookingCardProps,
  now: Date,
): 'active' | 'upcoming' | 'completed' {
  const status = booking.statusLabel.toLowerCase();
  if (
    status.includes('cancel') ||
    status.includes('complete') ||
    status.includes('closed')
  ) {
    return 'completed';
  }

  const pickupAt = parseBookingDate(booking.pickupDate);
  const returnAt = parseBookingDate(booking.returnDate);

  if (returnAt && returnAt.getTime() < now.getTime()) return 'completed';
  if (pickupAt && pickupAt.getTime() > now.getTime()) return 'upcoming';
  return 'active';
}

export function BookingsContent() {
  const navigate = useNavigate();
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
        .map(mapApiBookingToCardProps);
      return { mapped, nextPage: mapped.length >= PAGE_SIZE ? pageParam + 1 : undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

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

  const filtered = useMemo(() => {
    const now = new Date();
    const statusScoped = items.filter((b) => bookingUiStatus(b, now) === statusFilter);
    const q = normalizeSearchText(searchInput);
    if (!q) return statusScoped;
    // Search should work with car names even when status tabs differ.
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
      <div className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Find a booking</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Enter your confirmation or reservation number and the last name on the
            reservation. Works with or without signing in.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Input
            id="bookings-lookup-reservation"
            value={lookupReservation}
            onChange={(e) => setLookupReservation(e.target.value)}
            placeholder="Confirmation / reservation #"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleFindBooking();
            }}
          />
          <Input
            id="bookings-lookup-lastname"
            value={lookupLastName}
            onChange={(e) => setLookupLastName(e.target.value)}
            placeholder="Last name on booking"
            className="flex-1 sm:max-w-[220px]"
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
                placeholder="Filter your list by confirmation #, car, or status…"
                onChange={(e) => setSearchInput(e.target.value)}
                className="ps-9 pe-4 w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: 'active', label: 'Active' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'completed', label: 'Completed' },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  variant={statusFilter === tab.id ? 'primary' : 'outline'}
                  className="h-9 px-3"
                  onClick={() =>
                    setStatusFilter(tab.id as 'active' | 'upcoming' | 'completed')
                  }
                >
                  {tab.label}
                </Button>
              ))}
            </div>
            <Select
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
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-5 justify-between">
            {!listAreaLoading ? (
              <h3 className="text-sm font-medium text-muted-foreground">
                {`${filtered.length} booking${filtered.length === 1 ? '' : 's'} shown`}
                {searchInput.trim() && items.length !== filtered.length
                  ? ` (filtered from ${items.length})`
                  : null}
              </h3>
            ) : null}
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
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="size-10 animate-spin text-[#0061e0]" />
              <p className="text-sm">Loading your bookings…</p>
            </div>
          ) : null}

          {!listAreaLoading && !error && !filtered.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center text-muted-foreground">
              <p className="font-medium text-foreground">No bookings in your list</p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                Use &quot;Find a booking&quot; above with your confirmation number and last
                name, or try another status filter after you have bookings on this account.
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
          Sign in to see your booking list here. You can still open any reservation with
          &quot;Find a booking&quot; above.
        </p>
      ) : null}
    </div>
  );
}
