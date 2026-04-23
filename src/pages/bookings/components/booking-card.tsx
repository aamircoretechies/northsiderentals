import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeMediaUrl } from '@/lib/helpers';
import { fetchBookingByReference, fetchWorkflowChecklist } from '@/services/bookings';
import { queryKeys } from '@/lib/query-keys';

export interface BookingCardProps {
  bookingId: string;
  /** RCM `reservationref` — used for booking detail API */
  detailReference?: string;
  reservationNumber: string;
  carName: string;
  carSpecs: string;
  carImage: string;
  pickupDate: string;
  returnDate: string;
  /** Raw API booking status */
  statusLabel: string;
  paymentStatus?: string;
  reservationType?: string;
  totalDisplay?: string;
  isQuote?: boolean;
}

function statusStyle(label: string): { dot: string; text: string } {
  const s = label.toLowerCase();
  if (s.includes('cancel')) {
    return { dot: 'bg-red-500', text: 'text-red-600' };
  }
  if (s.includes('complete') || s.includes('closed')) {
    return { dot: 'bg-emerald-500', text: 'text-emerald-600' };
  }
  if (s.includes('allocat')) {
    return { dot: 'bg-[#00a651]', text: 'text-[#00a651]' };
  }
  return { dot: 'bg-amber-500', text: 'text-amber-600' };
}

export function BookingCard({
  bookingId,
  detailReference,
  reservationNumber,
  carName,
  carSpecs,
  carImage,
  pickupDate,
  returnDate,
  statusLabel,
  paymentStatus,
  reservationType,
  totalDisplay,
  isQuote,
}: BookingCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const imgSrc = normalizeMediaUrl(carImage);
  const { dot, text } = statusStyle(statusLabel);
  /** Prefer RCM reservation ref; fall back to booking id when list row shape differs. */
  const refForNav = (detailReference?.trim() || bookingId?.trim() || '').trim();
  const prefetchBooking = () => {
    const ref = refForNav;
    if (!ref) return;
    void queryClient.prefetchQuery({
      queryKey: queryKeys.bookingsDetail(ref),
      queryFn: () => fetchBookingByReference(ref),
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.bookingsWorkflow(ref, 'checkin'),
      queryFn: () => fetchWorkflowChecklist(ref, 'checkin'),
    });
  };

  return (
    <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden flex flex-col w-full">
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
        <div className="bg-[#f4f5f8] rounded-[12px] p-2 flex items-center justify-center w-full sm:w-[200px] h-[120px] shrink-0">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={carName}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground">No image</span>
          )}
        </div>

        <div className="flex flex-col justify-center h-full gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-[#6b7280] text-[14px]">Confirmation #</span>
            <span className="font-bold text-[#0061e0] text-[18px] sm:text-[20px]">
              {reservationNumber}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <h3 className="text-black font-extrabold text-[16px] sm:text-[18px]">
              {carName}
            </h3>
            <span className="text-[#6b7280] text-[14px]">{carSpecs}</span>
          </div>

          {totalDisplay ? (
            <p className="text-[15px] font-semibold text-foreground">
              {totalDisplay}
              {paymentStatus ? (
                <span className="text-muted-foreground font-normal text-[13px] ms-2">
                  · {paymentStatus}
                </span>
              ) : null}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 text-[12px]">
            {isQuote ? (
              <span className="rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 font-medium">
                Quote
              </span>
            ) : null}
            {reservationType ? (
              <span className="rounded-full bg-muted text-muted-foreground px-2.5 py-0.5">
                {reservationType}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-b border-gray-100 grid grid-cols-2">
        <div className="p-4 sm:p-5 flex flex-col gap-1 border-r border-gray-100">
          <span className="text-[#6b7280] text-[15px]">Pickup</span>
          <span className="text-black font-bold text-[16px] sm:text-[18px] leading-tight">
            {pickupDate}
          </span>
        </div>
        <div className="p-4 sm:p-5 flex flex-col gap-1">
          <span className="text-[#6b7280] text-[15px]">Return</span>
          <span className="text-black font-bold text-[16px] sm:text-[18px] leading-tight">
            {returnDate}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
          <span className={`font-semibold text-[16px] ${text}`}>
            {statusLabel}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="px-6 py-2 h-auto text-[15px] font-medium rounded-[8px] w-full sm:w-auto"
            onClick={() => {
              const ref = refForNav;
              if (ref) navigate(`/bookings/${encodeURIComponent(ref)}`);
            }}
            onMouseEnter={prefetchBooking}
            onFocus={prefetchBooking}
          >
            View details
          </Button>
          <Button
            className="bg-[#0061e0] hover:bg-[#0052cc] text-white px-6 py-2 h-auto text-[15px] font-medium rounded-[8px] w-full sm:w-auto"
            onClick={() => {
              const ref = refForNav;
              if (ref) {
                navigate(`/bookings/modify?reservation_ref=${encodeURIComponent(ref)}&mode=update-pay`, {
                  state: { reservationRef: ref, mode: 'update-pay' },
                });
              }
            }}
            onMouseEnter={prefetchBooking}
            onFocus={prefetchBooking}
          >
            Modify Booking & Pay
          </Button>
        </div>
      </div>
    </div>
  );
}
