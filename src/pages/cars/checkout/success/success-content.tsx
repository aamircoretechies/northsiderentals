import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { XCircle, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { normalizeMediaUrl } from '@/lib/helpers';
import {
  mergeCreateBookingForUiState,
  extractBookingReference,
  extractReservationRef,
  extractReservationNo,
} from '@/services/booking-payload';
import { fetchBookingByReference, invalidateBookingsCache } from '@/services/bookings';
import {
  clearCheckoutPendingState,
  loadCheckoutPendingState,
  resolveCheckoutReservationRef,
} from '@/utils/checkout-session';
import { inferIsQuote } from '@/utils/booking-status';
import { saveCheckoutCardBrand, formatCardBrand as formatCardBrandLabel } from '@/utils/card-brand';
import { persistPaymentCardDetailsForRcm } from '@/utils/persist-payment-card';
import {
  buildWindcaveResultFromPaymentReturn,
  parsePaymentReturnParams,
  paymentReturnApiReference,
  paymentReturnReference,
  paymentReturnReservationNo,
} from '@/utils/payment-return';
import { ReservationConfirmationCard } from '@/pages/cars/checkout/components/reservation-confirmation-card';
import { getFriendlyError } from '@/utils/api-error-handler';
import {
  clearStaleQuoteConvertForCheckoutPayment,
  finalizeQuoteConvertAfterPayment,
  loadQuoteConvertPending,
  shouldConvertQuoteOnPaymentReturn,
} from '@/utils/quote-convert-pending';
import {
  loadReservationContext,
  resolveReservationRef,
} from '@/utils/reservation-context';
import { toast } from 'sonner';
import { bookingsListRefreshNavigateOptions } from '@/utils/refresh-bookings-list';

export function CarsCheckoutSuccessContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [fetching, setFetching] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState(false);
  const [quoteConvertDone, setQuoteConvertDone] = useState(false);
  const quoteConvertInFlightRef = useRef(false);
  const [apiBooking, setApiBooking] = useState<Record<string, unknown> | null>(
    null,
  );

  const shouldFinalizeQuoteConvert = shouldConvertQuoteOnPaymentReturn(searchParams);

  useEffect(() => {
    clearStaleQuoteConvertForCheckoutPayment();
  }, []);

  const paymentReturn = useMemo(
    () => parsePaymentReturnParams(searchParams),
    [searchParams],
  );

  const pending = loadCheckoutPendingState();
  const state = (location.state || {}) as Record<string, unknown>;

  const booking = useMemo(() => {
    const fromState = state.booking as Record<string, unknown> | undefined;
    if (fromState) return mergeCreateBookingForUiState(fromState);
    if (pending?.booking) return mergeCreateBookingForUiState(pending.booking);
    return {};
  }, [state.booking, pending?.booking]);

  const resolvedBooking = apiBooking ?? booking;

  const carData =
    (state.carData as Record<string, unknown> | undefined) ?? pending?.carData;
  const searchParamsData =
    (state.searchParams as Record<string, unknown> | undefined) ??
    pending?.searchParams;
  const locations =
    (state.locations as Array<{ id: unknown; location?: string }> | undefined) ??
    (pending?.locations as Array<{ id: unknown; location?: string }> | undefined);

  const reservationNo = useMemo(() => {
    const fromPayment = paymentReturnReservationNo(paymentReturn);
    if (fromPayment) return fromPayment;
    const fromApi = apiBooking ? extractReservationNo(apiBooking) : '';
    if (fromApi) return fromApi;
    return extractReservationNo(booking) || extractReservationNo(resolvedBooking) || '';
  }, [apiBooking, paymentReturn, booking, resolvedBooking]);

  const cardTypeLabel = useMemo(() => {
    const fromUrl = formatCardBrandLabel(paymentReturn.cardType);
    return fromUrl || '';
  }, [paymentReturn.cardType]);

  const hasUrlStatus = searchParams.has('status');
  const isPaymentSuccess = paymentReturn.status === 'success';
  const isFailed = paymentReturn.status === 'failed';
  const isCancelled = paymentReturn.status === 'cancelled';
  const hasBookingReference = Boolean(
    extractBookingReference(resolvedBooking) || paymentReturnReference(paymentReturn),
  );
  /** Create-booking redirect without payment query — still a valid submitted state. */
  const isBookingSubmittedWithoutPayment =
    !hasUrlStatus && hasBookingReference && !isFailed && !isCancelled;

  const reservationContextMode = loadReservationContext()?.mode;
  const checkoutPending = loadCheckoutPendingState();
  const isNewBookingCheckout =
    Boolean(checkoutPending) && checkoutPending?.convertQuote !== true;
  const isConvertQuoteFlow =
    !isNewBookingCheckout &&
    (shouldFinalizeQuoteConvert ||
      quoteConvertDone ||
      paymentReturn.convertQuote ||
      reservationContextMode === 'convert-quote' ||
      searchParams.get('mode') === 'convert-quote');

  const isQuoteOnly = useMemo(() => {
    if (isPaymentSuccess || isConvertQuoteFlow) return false;
    return inferIsQuote({
      is_quote: resolvedBooking.is_quote,
      bookingtype: resolvedBooking.bookingtype ?? resolvedBooking.booking_type,
      reservation_type: resolvedBooking.reservation_type,
      booking_status: resolvedBooking.booking_status,
    });
  }, [resolvedBooking, isPaymentSuccess, isConvertQuoteFlow]);

  const successTitle = isConvertQuoteFlow
    ? quoteConvertDone || (isPaymentSuccess && !convertingQuote)
      ? 'Booking request submitted'
      : 'Convert quote to booking'
    : isPaymentSuccess
      ? 'Booking confirmed'
      : isQuoteOnly
        ? 'Quotation submitted'
        : isBookingSubmittedWithoutPayment
          ? 'Booking request submitted'
          : 'Submission received';

  const bookingNotConfirmedNotice =
    'Please note your reservation is not confirmed until you receive a confirmation email from Northside Rentals confirming your vehicle reservation is now booked.';

  const confirmationMessage =
    successTitle === 'Quotation submitted'
      ? 'A copy of your quote will be sent to your email. Please save your reservation number for reference.'
      : bookingNotConfirmedNotice;

  const lookupRef = useMemo(
    () =>
      resolveCheckoutReservationRef(
        resolvedBooking as Record<string, unknown>,
        pending,
      ) ||
      paymentReturnApiReference(paymentReturn) ||
      resolveReservationRef(loadReservationContext()?.reservation_ref) ||
      resolveReservationRef(loadQuoteConvertPending()?.reservation_ref) ||
      extractReservationRef(resolvedBooking),
    [paymentReturn, resolvedBooking, pending],
  );

  useEffect(() => {
    if (paymentReturn.cardType) {
      saveCheckoutCardBrand(paymentReturn.cardType);
    }
  }, [paymentReturn.cardType]);

  useEffect(() => {
    if (!lookupRef || isFailed || isCancelled) return;

    let cancelled = false;
    setFetching(true);
    void fetchBookingByReference(lookupRef)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data;
        if (data && typeof data === 'object') {
          setApiBooking(data as Record<string, unknown>);
        }
      })
      .catch(() => {
        /* URL params and create-booking state remain primary */
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lookupRef, isFailed, isCancelled]);

  useEffect(() => {
    if (!isPaymentSuccess || !reservationNo) return;
    if (!shouldFinalizeQuoteConvert || quoteConvertDone) {
      clearCheckoutPendingState();
    }
  }, [isPaymentSuccess, reservationNo, shouldFinalizeQuoteConvert, quoteConvertDone]);

  useEffect(() => {
    if (!isPaymentSuccess || !shouldFinalizeQuoteConvert || quoteConvertDone) return;
    if (!loadQuoteConvertPending()) return;

    const windcaveResult = buildWindcaveResultFromPaymentReturn(
      paymentReturn,
      searchParams,
    );
    if (quoteConvertInFlightRef.current) return;

    let cancelled = false;
    quoteConvertInFlightRef.current = true;
    setConvertingQuote(true);

    void finalizeQuoteConvertAfterPayment(windcaveResult)
      .then((converted) => {
        if (cancelled) return;
        if (converted) {
          setQuoteConvertDone(true);
          clearCheckoutPendingState();
          toast.success('Your quote has been converted to a booking request.');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(
            getFriendlyError(
              e,
              'Card saved but quote conversion failed. Please contact us.',
            ),
          );
        }
      })
      .finally(() => {
        quoteConvertInFlightRef.current = false;
        if (!cancelled) setConvertingQuote(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isPaymentSuccess,
    shouldFinalizeQuoteConvert,
    quoteConvertDone,
    paymentReturn,
    searchParams,
    lookupRef,
  ]);

  useEffect(() => {
    if (!quoteConvertDone) return;
    const ref = resolveReservationRef(lookupRef);
    if (!ref) return;
    invalidateBookingsCache(ref);
    void queryClient.invalidateQueries({ queryKey: ['bookings', 'list'] });
  }, [quoteConvertDone, lookupRef, queryClient]);

  const goToBookingsList = useCallback(() => {
    const ref =
      resolveReservationRef(lookupRef) ||
      paymentReturnApiReference(paymentReturn) ||
      undefined;
    navigate('/bookings', bookingsListRefreshNavigateOptions(ref));
  }, [navigate, lookupRef, paymentReturn]);

  useEffect(() => {
    if (!isPaymentSuccess) return;
    const ref = resolveReservationRef(lookupRef) || paymentReturnApiReference(paymentReturn);
    if (!ref) return;

    if (paymentReturn.cardType) {
      saveCheckoutCardBrand(paymentReturn.cardType);
    }

    void persistPaymentCardDetailsForRcm(ref, paymentReturn).catch(() => {
      /* backend may persist card details during /payments/complete */
    });
  }, [isPaymentSuccess, lookupRef, paymentReturn]);

  const formatDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr || !timeStr) return undefined;
    try {
      const date = String(dateStr).trim();
      const rawTime = String(timeStr).trim();
      const m = rawTime.match(/^(\d{1,2}):(\d{2})/);
      const time = m
        ? (() => {
            const hh = Number(m[1]);
            const mm = m[2];
            const hour24 = ((hh % 24) + 24) % 24;
            const hour12 = hour24 % 12 || 12;
            const ampm = hour24 >= 12 ? 'PM' : 'AM';
            return `${String(hour12).padStart(2, '0')}:${mm} ${ampm}`;
          })()
        : rawTime;
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        return `${day}/${month}/${year} ${time}`;
      }
      return `${date} ${time}`;
    } catch {
      return undefined;
    }
  };

  const getLocationName = (id?: number) => {
    if (!id || !locations) return undefined;
    const loc = locations.find((l) => String(l.id) === String(id));
    return loc ? String(loc.location ?? '').trim() : undefined;
  };

  const sp = searchParamsData as Record<string, unknown> | undefined;
  const pDateFormatted =
    formatDateTime(String(sp?.pickup_date ?? ''), String(sp?.pickup_time ?? '')) ?? '—';
  const pLocationFormatted = getLocationName(Number(sp?.pickup_location_id)) ?? '—';
  const rDateFormatted =
    formatDateTime(String(sp?.dropoff_date ?? ''), String(sp?.dropoff_time ?? '')) ?? '—';
  const rLocationFormatted = getLocationName(Number(sp?.dropoff_location_id)) ?? '—';

  const getDays = (pDate?: string, rDate?: string) => {
    const apiDaysCandidates = [
      carData?.numberofdays,
      (carData?.searchMeta as Record<string, unknown> | undefined)?.numberofdays,
      sp?.numberofdays,
    ];
    for (const candidate of apiDaysCandidates) {
      const n = Number(candidate ?? 0);
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (!pDate || !rDate) return 0;
    const d1 = new Date(pDate);
    const d2 = new Date(rDate);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    return diff > 0 ? diff : 0;
  };
  const rentalDays = getDays(
    String(sp?.pickup_date ?? ''),
    String(sp?.dropoff_date ?? ''),
  );
  const carImg = normalizeMediaUrl(String(carData?.image_url ?? ''));

  if (isFailed || isCancelled) {
    return (
      <div className="flex flex-col bg-white relative max-w-[600px] mx-auto text-center justify-between min-h-[60vh]">
        <div className="flex-1 w-full p-6 pt-16 flex flex-col items-center gap-6">
          <div
            className={`w-[80px] h-[80px] rounded-full flex items-center justify-center shadow-sm ${isCancelled ? 'bg-amber-500' : 'bg-destructive'}`}
          >
            {isCancelled ? (
              <AlertCircle size={48} strokeWidth={2.5} className="text-white" />
            ) : (
              <XCircle size={48} strokeWidth={2.5} className="text-white" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-black font-bold text-[22px]">
              {isCancelled ? 'Payment cancelled' : 'Payment failed'}
            </h1>
            <p className="text-[#333] text-[15px] leading-relaxed max-w-[400px]">
              {isCancelled
                ? 'Your card was not saved. You can try again from your booking or contact us for help.'
                : 'We could not verify your card. Please try again or use a different card.'}
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6 flex flex-col items-center gap-3 w-full">
          <Button
            className="w-full rounded-full py-6 bg-[#0061e0] hover:bg-[#0052cc] text-white font-bold"
            onClick={() => {
              const ref = resolveCheckoutReservationRef(
                resolvedBooking as Record<string, unknown>,
                pending,
              );
              if (ref && pending?.convertQuote) {
                navigate(
                  `/bookings/modify?reservation_ref=${encodeURIComponent(ref)}&mode=update-pay`,
                  {
                    replace: true,
                    state: { reservationRef: ref, mode: 'update-pay' },
                  },
                );
                return;
              }
              navigate(-1);
            }}
          >
            Try again
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-full"
            onClick={() => goToBookingsList()}
          >
            View bookings
          </Button>
        </div>
      </div>
    );
  }

  const tripSummary =
    carData != null ? (
      <div className="bg-[#f0f4f8] rounded-[16px] p-4 flex flex-col gap-4 w-full text-left mt-2">
        <div className="flex items-center gap-3">
          {carImg ? (
            <img
              src={carImg}
              alt={String(carData?.title ?? '')}
              loading="lazy"
              className="w-[64px] h-[64px] object-contain rounded-[10px] bg-white p-1"
            />
          ) : null}
          <div className="flex flex-col text-left min-w-0">
            <span className="text-black font-bold text-[15px]">{String(carData?.title ?? '')}</span>
            <span className="text-[#333] text-[13px]">{rentalDays} days</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div>
            <span className="text-[#6b7280]">Pickup</span>
            <p className="font-semibold text-black">{pDateFormatted}</p>
            <p className="text-[#6b7280]">{pLocationFormatted}</p>
          </div>
          <div>
            <span className="text-[#6b7280]">Return</span>
            <p className="font-semibold text-black">{rDateFormatted}</p>
            <p className="text-[#6b7280]">{rLocationFormatted}</p>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#f8f9fa] p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-[24px] shadow-sm border border-gray-100 px-6 py-8">
        <ReservationConfirmationCard
          title={successTitle}
          reservationNo={reservationNo}
          numberLabel={isQuoteOnly ? 'Quote no' : 'Reservation no'}
          message={
            convertingQuote
              ? 'Saving your card and converting your quote to a booking request…'
              : confirmationMessage
          }
          loading={(fetching && !reservationNo) || convertingQuote}
          extra={
            <>
              {cardTypeLabel ? (
                <p className="text-[#333] text-[14px]">Card: {cardTypeLabel}</p>
              ) : null}
              {tripSummary}
            </>
          }
          onDone={() => goToBookingsList()}
        />
      </div>

    </div>
  );
}
