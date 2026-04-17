import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, Loader2, AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router';
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
import { BookingCard, BookingCardProps } from './components/booking-card';
import {
  bookingReferenceFromFindPayload,
  fetchBookingsList,
  findBookingLookup,
  mapApiBookingToCardProps,
} from '@/services/bookings';

const PAGE_SIZE = 20;

export function BookingsContent() {
  const navigate = useNavigate();
  const { auth, loading: authLoading } = useAuth();
  const isAuthed = Boolean(auth?.access_token);

  const [searchInput, setSearchInput] = useState('');
  const [lookupReservation, setLookupReservation] = useState('');
  const [lookupLastName, setLookupLastName] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<BookingCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setItems([]);
      }
      setError(null);
      try {
        const res = await fetchBookingsList({
          page: nextPage,
          limit: PAGE_SIZE,
          status: statusFilter,
        });
        const raw = res.data?.bookings;
        const list = Array.isArray(raw) ? raw : [];
        const mapped = list
          .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
          .map(mapApiBookingToCardProps);

        setItems((prev) => (append ? [...prev, ...mapped] : mapped));
        setHasMore(mapped.length >= PAGE_SIZE);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load bookings');
        if (!append) setItems([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthed) {
      setLoading(false);
      setItems([]);
      setHasMore(false);
      setError(null);
      return;
    }
    setPage(1);
    void loadPage(1, false);
  }, [authLoading, isAuthed, statusFilter, loadPage]);

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (b) =>
        b.reservationNumber.toLowerCase().includes(q) ||
        b.carName.toLowerCase().includes(q) ||
        b.bookingId.toLowerCase().includes(q) ||
        b.statusLabel.toLowerCase().includes(q),
    );
  }, [items, searchInput]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    void loadPage(next, true);
  };

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
      setLookupError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  };

  const listAreaLoading = authLoading || (isAuthed && loading);

  return (
    <div className="flex flex-col items-stretch gap-7">
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 space-y-3">
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-5 justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {listAreaLoading
                ? 'Loading…'
                : `${filtered.length} booking${filtered.length === 1 ? '' : 's'} shown`}
              {!listAreaLoading &&
                searchInput.trim() &&
                items.length !== filtered.length
                ? ` (filtered from ${items.length})`
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

          {hasMore && !searchInput.trim() ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                className="min-w-[200px]"
                onClick={() => handleLoadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? (
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
