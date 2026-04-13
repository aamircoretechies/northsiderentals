import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, Loader2, AlertCircle } from 'lucide-react';
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
  fetchBookingsList,
  mapApiBookingToCardProps,
} from '@/services/bookings';

const PAGE_SIZE = 20;

export function BookingsContent() {
  const [searchInput, setSearchInput] = useState('');
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
    setPage(1);
    void loadPage(1, false);
  }, [statusFilter, loadPage]);

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

  return (
    <div className="flex flex-col items-stretch gap-7">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
        <div className="relative flex items-center flex-1 z-1">
          <SearchIcon
            className="absolute start-4 text-muted-foreground"
            size={16}
          />
          <Input
            id="bookings-search"
            value={searchInput}
            placeholder="Search by confirmation #, car, or status…"
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9 pe-4 w-full"
          />
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
          {loading
            ? 'Loading…'
            : `${filtered.length} booking${filtered.length === 1 ? '' : 's'} shown`}
          {!loading && searchInput.trim() && items.length !== filtered.length
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

      {loading && !items.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="size-10 animate-spin text-[#0061e0]" />
          <p className="text-sm">Loading your bookings…</p>
        </div>
      ) : null}

      {!loading && !error && !filtered.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center text-muted-foreground">
          <p className="font-medium text-foreground">No bookings found</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Try another status filter or check back after you complete a booking
            or quote request.
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
    </div>
  );
}
