import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Loader2, Info } from 'lucide-react';
import {
  extractHostedPaymentUrl,
  extractBookingReference,
  mergeCreateBookingForUiState,
} from '@/services/booking-payload';
import { fetchBookingByReference } from '@/services/bookings';
import {
  loadCheckoutPendingState,
  saveCheckoutPendingState,
  type CheckoutPendingState,
} from '@/utils/checkout-session';
import { normalizePaymentReturnToAppOrigin } from '@/utils/app-origin';

const PAYMENT_GATEWAY_LAUNCH_KEY = 'checkout_payment_gateway_launched';

/**
 * Full-page redirect to Windcave (not an iframe).
 * Iframes + "Next" on Windcave often trigger Chrome Private Network Access blocks
 * when the API redirects to localhost or a private IP.
 */
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
  };

  const pendingFromStorage = loadCheckoutPendingState();
  const booking = stateBooking ?? pendingFromStorage?.booking;
  const formData = stateFormData ?? pendingFromStorage?.formData;
  const carData = stateCarData ?? pendingFromStorage?.carData;
  const searchParams = stateSearchParams ?? pendingFromStorage?.searchParams;
  const locations = stateLocations ?? pendingFromStorage?.locations;

  const [redirecting, setRedirecting] = useState(true);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const launchedRef = useRef(false);

  const paymentUrl = useMemo(() => {
    const direct =
      statePaymentUrl ||
      pendingFromStorage?.paymentUrl ||
      extractHostedPaymentUrl(booking);
    return typeof direct === 'string' && /^https?:\/\//i.test(direct.trim())
      ? direct.trim()
      : null;
  }, [booking, pendingFromStorage?.paymentUrl, statePaymentUrl]);

  const reservationRef = useMemo(
    () => extractBookingReference(mergeCreateBookingForUiState(booking)),
    [booking],
  );

  const goToConfirmation = () => {
    navigate('/cars/checkout/success', {
      replace: true,
      state: {
        booking: mergeCreateBookingForUiState(booking),
        formData,
        carData,
        searchParams,
        locations,
      },
    });
  };

  useEffect(() => {
    if (booking && paymentUrl) {
      saveCheckoutPendingState({
        booking: mergeCreateBookingForUiState(booking),
        formData,
        carData,
        searchParams,
        locations,
        paymentUrl,
      });
    }
  }, [booking, carData, formData, locations, paymentUrl, searchParams]);

  useEffect(() => {
    if (!paymentUrl || launchedRef.current) return;

    const launchKey = `${PAYMENT_GATEWAY_LAUNCH_KEY}:${paymentUrl}`;
    const alreadyLaunched = sessionStorage.getItem(launchKey) === '1';

    if (alreadyLaunched) {
      setRedirecting(false);
      return;
    }

    launchedRef.current = true;
    sessionStorage.setItem(launchKey, '1');

    try {
      const target = normalizePaymentReturnToAppOrigin(paymentUrl);
      window.location.replace(target);
    } catch (e) {
      launchedRef.current = false;
      sessionStorage.removeItem(launchKey);
      setLaunchError(
        e instanceof Error ? e.message : 'Could not open the payment page.',
      );
      setRedirecting(false);
    }
  }, [paymentUrl]);

  useEffect(() => {
    if (!reservationRef || redirecting) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetchBookingByReference(reservationRef);
        if (cancelled) return;
        const data = res?.data as Record<string, unknown> | undefined;
        const status = String(data?.payment_status ?? '').toLowerCase();
        const paid =
          status.includes('paid') ||
          status.includes('success') ||
          status.includes('complete') ||
          status.includes('authorised') ||
          status.includes('authorized') ||
          data?.payment_id != null;
        if (paid) {
          goToConfirmation();
        }
      } catch {
        /* still on Windcave or API unavailable */
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [reservationRef, redirecting]);

  if (!paymentUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto p-8 text-center gap-4">
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          No payment session found. If you have already paid, you can view your booking
          confirmation.
        </p>
        <Button className="rounded-full" onClick={goToConfirmation}>
          View booking confirmation
        </Button>
      </div>
    );
  }

  if (launchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto p-8 text-center gap-4">
        <p className="text-destructive text-[15px] leading-relaxed">{launchError}</p>
        <Button
          className="rounded-full"
          onClick={() => {
            sessionStorage.removeItem(`${PAYMENT_GATEWAY_LAUNCH_KEY}:${paymentUrl}`);
            launchedRef.current = false;
            setLaunchError(null);
            setRedirecting(true);
            window.location.replace(paymentUrl);
          }}
        >
          Open payment page
        </Button>
        <Button variant="outline" className="rounded-full" onClick={goToConfirmation}>
          View booking confirmation
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-[#f8fafc] min-h-screen">
      <div className="w-full p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-[#0061e0]/5 border border-[#0061e0]/10 rounded-2xl p-4 sm:p-5">
          <div className="flex-shrink-0 bg-[#0061e0]/10 p-2.5 rounded-full">
            <Info className="w-5 h-5 text-[#0061e0]" />
          </div>
          <div>
            <h3 className="text-[#0061e0] font-bold text-[15px] sm:text-[16px]">
              Your card won&apos;t be charged now.
            </h3>
            <p className="text-slate-600 text-sm sm:text-[14px] leading-relaxed mt-0.5">
              We only take payment at the time of pickup. You will be redirected to Windcave
              to verify your card, then returned to this site to confirm your booking.
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="w-10 h-10 text-[#0061e0] animate-spin" />
        <p className="text-slate-600 font-medium text-center max-w-md">
          {redirecting
            ? 'Redirecting to secure payment…'
            : 'Complete payment in the Windcave window, then return here. This page will update when your card is verified.'}
        </p>
        {!redirecting ? (
          <div className="flex flex-col gap-2 w-full max-w-sm">
            <Button
              className="rounded-full"
              onClick={() => window.location.replace(paymentUrl)}
            >
              Open payment page again
            </Button>
            <Button variant="outline" className="rounded-full" onClick={goToConfirmation}>
              I finished — view confirmation
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
