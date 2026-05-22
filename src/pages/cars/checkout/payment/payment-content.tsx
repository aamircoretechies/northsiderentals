import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { PaymentCardDisclaimer } from '@/components/payments/payment-card-disclaimer';
import { WindcavePaymentModal } from '@/components/payments/windcave-payment-modal';
import {
  extractHostedPaymentUrl,
  mergeCreateBookingForUiState,
} from '@/services/booking-payload';
import { carsService } from '@/services/cars';
import { fetchBookingByReference } from '@/services/bookings';

const UPDATE_PAY_SETTLE_MS = 3000;
import {
  buildCheckoutConfirmationUrl,
  buildCheckoutPaymentCancelUrl,
  buildCheckoutPaymentFailureUrl,
  buildQuoteConvertConfirmationUrl,
  buildUpdatePayConfirmationUrl,
  loadCheckoutPendingState,
  normalizeHostedPaymentUrlForRcm,
  paymentUrlNeedsReservationRef,
  resolveCheckoutReservationRef,
  saveCheckoutPendingState,
  type CheckoutPendingState,
} from '@/utils/checkout-session';
import { persistPaymentCardDetailsForRcm } from '@/utils/persist-payment-card';
import { clearQuoteConvertPending } from '@/utils/quote-convert-pending';
import { parsePaymentReturnParams, paymentReturnApiReference } from '@/utils/payment-return';
import { isShortReservationNo, resolveReservationRef } from '@/utils/reservation-context';
import {
  getBookingPaymentSnapshot,
  shouldTreatBookingAsFullyPaid,
} from '@/utils/booking-payment-status';

function buildConfirmationSearch(
  search: string,
  options: { convertQuote?: boolean; updatePay?: boolean },
): string {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  if (!params.get('status') && !raw) {
    params.set('status', 'success');
  }
  if (options.convertQuote && params.get('status') === 'success') {
    params.set('convert_quote', '1');
  }
  if (options.updatePay && params.get('status') === 'success') {
    params.set('mode', 'update-pay');
  }
  const qs = params.toString();
  if (qs) return `?${qs}`;
  if (options.convertQuote) return '?status=success&convert_quote=1';
  if (options.updatePay) return '?status=success&mode=update-pay';
  return '?status=success';
}

export function CarsCheckoutPaymentContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    booking: stateBooking,
    formData: stateFormData,
    carData: stateCarData,
    searchParams: stateSearchParams,
    locations: stateLocations,
    paymentUrl: statePaymentUrl,
  } = (location.state || {}) as CheckoutPendingState & {
    paymentUrl?: string;
    updatePay?: boolean;
  };

  const pendingFromStorage = loadCheckoutPendingState();
  const convertQuote = Boolean(pendingFromStorage?.convertQuote);
  const updatePay = Boolean(
    (location.state as { updatePay?: boolean } | null)?.updatePay ??
      pendingFromStorage?.updatePay,
  );

  useEffect(() => {
    if (!convertQuote) clearQuoteConvertPending();
  }, [convertQuote]);
  const booking = stateBooking ?? pendingFromStorage?.booking;
  const formData = stateFormData ?? pendingFromStorage?.formData;
  const carData = stateCarData ?? pendingFromStorage?.carData;
  const searchParams = stateSearchParams ?? pendingFromStorage?.searchParams;
  const locations = stateLocations ?? pendingFromStorage?.locations;

  const [activePaymentUrl, setActivePaymentUrl] = useState<string | null>(null);
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const pollRef = useRef<number | null>(null);
  const paymentDoneRef = useRef(false);
  const autoOpenedModalRef = useRef(false);

  const storedPaymentUrl = useMemo(() => {
    const direct =
      statePaymentUrl ||
      pendingFromStorage?.paymentUrl ||
      extractHostedPaymentUrl(booking);
    return typeof direct === 'string' && /^https?:\/\//i.test(direct.trim())
      ? direct.trim()
      : null;
  }, [booking, pendingFromStorage?.paymentUrl, statePaymentUrl]);

  const mergedBooking = useMemo(
    () => (booking ? mergeCreateBookingForUiState(booking) : null),
    [booking],
  );

  const reservationRef = useMemo(
    () => resolveCheckoutReservationRef(mergedBooking, pendingFromStorage),
    [mergedBooking, pendingFromStorage],
  );

  const paymentUrl = activePaymentUrl ?? storedPaymentUrl;

  const normalizedPaymentUrl = useMemo(() => {
    if (!paymentUrl) return null;
    return reservationRef
      ? normalizeHostedPaymentUrlForRcm(paymentUrl, reservationRef)
      : paymentUrl.trim();
  }, [paymentUrl, reservationRef]);

  const goToConfirmation = useCallback(
    (search = '') => {
      navigate(`/cars/checkout/success${search}`, {
        replace: true,
        state: {
          booking: mergedBooking ?? {},
          formData,
          carData,
          searchParams,
          locations,
        },
      });
    },
    [navigate, mergedBooking, formData, carData, searchParams, locations],
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const completePayment = useCallback(
    (search: string) => {
      if (paymentDoneRef.current) return;
      paymentDoneRef.current = true;
      stopPolling();
      setPaymentModalOpen(false);

      const paymentReturn = parsePaymentReturnParams(search);
      const ref =
        resolveReservationRef(reservationRef) ||
        paymentReturnApiReference(paymentReturn);
      if (ref && paymentReturn.status === 'success') {
        void persistPaymentCardDetailsForRcm(ref, paymentReturn).catch(() => {
          /* backend may persist during /payments/complete */
        });
      }

      goToConfirmation(buildConfirmationSearch(search, { convertQuote, updatePay }));
    },
    [goToConfirmation, stopPolling, convertQuote, updatePay, reservationRef],
  );

  const handleCancelPayment = useCallback(() => {
    paymentDoneRef.current = true;
    stopPolling();
    setPaymentModalOpen(false);
    goToConfirmation('?status=cancelled');
  }, [goToConfirmation, stopPolling]);

  /** Recreate Windcave session with reservationref when stored URL used booking_id path */
  useEffect(() => {
    if (!reservationRef || isShortReservationNo(reservationRef)) {
      setActivePaymentUrl(storedPaymentUrl);
      return;
    }
    if (!storedPaymentUrl) {
      setActivePaymentUrl(null);
      return;
    }
    if (!paymentUrlNeedsReservationRef(storedPaymentUrl, reservationRef)) {
      setActivePaymentUrl(
        normalizeHostedPaymentUrlForRcm(storedPaymentUrl, reservationRef),
      );
      return;
    }

    let cancelled = false;
    setRefreshingSession(true);
    const returnOptions = { convertQuote, updatePay };
    const successUrl = convertQuote
      ? buildQuoteConvertConfirmationUrl()
      : updatePay
        ? buildUpdatePayConfirmationUrl()
        : buildCheckoutConfirmationUrl();
    const resolveSessionAmount = async (): Promise<number> => {
      let amount =
        updatePay &&
        pendingFromStorage?.balanceDue != null &&
        pendingFromStorage.balanceDue > 0.005
          ? pendingFromStorage.balanceDue
          : getBookingPaymentSnapshot(
              (mergedBooking ?? pendingFromStorage?.booking) as
                | Record<string, unknown>
                | undefined,
            ).balanceDue;

      if (!updatePay || amount > 0.005) return amount;

      await new Promise((resolve) => window.setTimeout(resolve, UPDATE_PAY_SETTLE_MS));
      try {
        const fresh = await fetchBookingByReference(reservationRef, { force: true });
        const snap = getBookingPaymentSnapshot(
          fresh?.data as Record<string, unknown> | undefined,
        );
        if (snap.balanceDue > 0.005) amount = snap.balanceDue;
      } catch {
        /* keep stored amount */
      }
      return amount;
    };

    void resolveSessionAmount()
      .then((sessionAmount) => {
        if (cancelled) return;
        return carsService.createPaymentSession({
          reservationref: reservationRef,
          reservation_ref: reservationRef,
          success_url: successUrl,
          cancel_url: buildCheckoutPaymentCancelUrl(returnOptions),
          failure_url: buildCheckoutPaymentFailureUrl(returnOptions),
          update_pay: updatePay,
          amount: sessionAmount > 0.005 ? sessionAmount : undefined,
          balancedue: sessionAmount > 0.005 ? sessionAmount : undefined,
        });
      })
      .then((session) => {
        if (cancelled || !session) return;
        const url = String(
          (session?.data as Record<string, unknown> | undefined)?.payment_url ?? '',
        ).trim();
        const normalizedUrl = normalizeHostedPaymentUrlForRcm(url, reservationRef);
        if (
          /^https?:\/\//i.test(normalizedUrl) &&
          !paymentUrlNeedsReservationRef(normalizedUrl, reservationRef)
        ) {
          setActivePaymentUrl(normalizedUrl);
          saveCheckoutPendingState({
            booking: mergedBooking ?? pendingFromStorage?.booking ?? {},
            formData,
            carData,
            searchParams,
            locations,
            paymentUrl: normalizedUrl,
            reservation_ref: reservationRef,
            convertQuote,
            updatePay,
            balanceDue:
              pendingFromStorage?.balanceDue && pendingFromStorage.balanceDue > 0.005
                ? pendingFromStorage.balanceDue
                : undefined,
          });
        } else {
          setActivePaymentUrl(storedPaymentUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setActivePaymentUrl(storedPaymentUrl);
      })
      .finally(() => {
        if (!cancelled) setRefreshingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    reservationRef,
    storedPaymentUrl,
    convertQuote,
    mergedBooking,
    formData,
    carData,
    searchParams,
    locations,
    pendingFromStorage?.booking,
    updatePay,
  ]);

  useEffect(() => {
    if (mergedBooking && paymentUrl) {
      saveCheckoutPendingState({
        booking: mergedBooking,
        formData,
        carData,
        searchParams,
        locations,
        paymentUrl,
        reservation_ref: reservationRef || pendingFromStorage?.reservation_ref,
        convertQuote,
        updatePay,
      });
    }
  }, [
    mergedBooking,
    carData,
    formData,
    locations,
    paymentUrl,
    reservationRef,
    searchParams,
    convertQuote,
    updatePay,
    pendingFromStorage?.reservation_ref,
  ]);

  /** Open Windcave in an in-app modal once the session URL is ready (not auto for modify-and-pay). */
  useEffect(() => {
    if (!normalizedPaymentUrl || refreshingSession || autoOpenedModalRef.current) {
      return;
    }
    if (updatePay) return;
    autoOpenedModalRef.current = true;
    setPaymentModalOpen(true);
  }, [normalizedPaymentUrl, refreshingSession, updatePay]);

  /** Poll booking payment status while the modal is open (iframe redirect fallback). */
  useEffect(() => {
    if (!reservationRef || paymentDoneRef.current || !paymentModalOpen) return;
    // Modify & pay: stale "paid" from before the edit must not skip Windcave.
    if (updatePay) return;

    const poll = async () => {
      if (paymentDoneRef.current) return;
      try {
        const res = await fetchBookingByReference(reservationRef);
        const data = res?.data as Record<string, unknown> | undefined;
        const snap = getBookingPaymentSnapshot(data);
        if (shouldTreatBookingAsFullyPaid(snap)) {
          completePayment('?status=success');
        }
      } catch {
        /* still on Windcave */
      }
    };

    void poll();
    pollRef.current = window.setInterval(() => void poll(), 4000);
    return () => {
      stopPolling();
    };
  }, [reservationRef, completePayment, stopPolling, paymentModalOpen, updatePay]);

  if (refreshingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-10 h-10 text-[#0061e0] animate-spin" />
        <p className="text-slate-600 text-[15px]">Preparing secure payment…</p>
      </div>
    );
  }

  if (!normalizedPaymentUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto p-8 text-center gap-4">
        <PaymentCardDisclaimer />
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          {updatePay
            ? 'Payment could not be started for your updated booking. Go back, save again, or contact us with your reservation number.'
            : 'No payment session is available right now. Try again or contact us for help.'}
        </p>
        <Button className="rounded-full" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col w-full bg-[#f8fafc] min-h-[60vh] p-4 sm:p-6">
        <div className="max-w-2xl mx-auto w-full space-y-4">
          <PaymentCardDisclaimer />
          <div className="flex flex-col items-center justify-center gap-5 py-10 text-center bg-white rounded-2xl border border-border shadow-sm px-6">
            <p className="text-slate-700 font-medium max-w-md text-[15px] leading-relaxed">
              {convertQuote
                ? 'Add your card in the secure form below to convert this quote into a booking request. You stay on this page the whole time.'
                : updatePay
                  ? 'Pay any updated balance in the secure form below. Completing this step confirms payment for your booking changes.'
                  : 'Enter your card details in the secure form below to complete your booking request. You stay on this page the whole time.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button
                type="button"
                className="rounded-full flex-1 gap-2"
                onClick={() => setPaymentModalOpen(true)}
              >
                <CreditCard className="size-4" />
                {paymentModalOpen ? 'Continue card verification' : 'Verify card securely'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full flex-1"
                onClick={handleCancelPayment}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>

      <WindcavePaymentModal
        open={paymentModalOpen}
        paymentUrl={normalizedPaymentUrl}
        onClose={() => setPaymentModalOpen(false)}
        onComplete={completePayment}
      />
    </>
  );
}
