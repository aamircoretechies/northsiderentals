import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  extractHostedPaymentUrl,
  mergeCreateBookingForUiState,
} from '@/services/booking-payload';

/**
 * Legacy route: booking now redirects straight to Windcave from details.
 * If someone lands here with a payment URL in state, send them through.
 */
export function CarsCheckoutPaymentContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { booking, formData, carData, searchParams, locations } =
    location.state || {};
  const [status, setStatus] = useState<'redirecting' | 'noop'>('redirecting');

  useEffect(() => {
    const url = extractHostedPaymentUrl(booking);
    if (url) {
      window.location.assign(url);
      return;
    }
    setStatus('noop');
  }, [booking]);

  if (status === 'noop') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto p-8 text-center gap-4">
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Payment is handled on our secure provider&apos;s site right after you
          submit your booking. You don&apos;t need this page anymore.
        </p>
        <Button
          className="rounded-full"
          onClick={() =>
            navigate('/cars/checkout/success', {
              state: {
                booking: mergeCreateBookingForUiState(booking),
                formData,
                carData,
                searchParams,
                locations,
              },
            })
          }
        >
          View booking confirmation
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground underline"
          onClick={() => navigate('/')}
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center gap-3">
      <p className="text-[16px] font-medium text-foreground">
        Redirecting to secure payment…
      </p>
      <p className="text-sm text-muted-foreground max-w-sm">
        If nothing happens, use the link in your confirmation email or start
        your booking again from the car search.
      </p>
    </div>
  );
}
