import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Loader2, Info } from 'lucide-react';
import {
  extractHostedPaymentUrl,
  mergeCreateBookingForUiState,
} from '@/services/booking-payload';

export function CarsCheckoutPaymentContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { booking, formData, carData, searchParams, locations, paymentUrl: statePaymentUrl } =
    (location.state || {}) as any;

  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState<string | null>(statePaymentUrl || null);

  useEffect(() => {
    if (!url) {
      const extractedUrl = extractHostedPaymentUrl(booking);
      if (extractedUrl) {
        setUrl(extractedUrl);
      }
    }
  }, [booking, url]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-md mx-auto p-8 text-center gap-4">
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          No payment session found. If you have already paid, you can view your booking confirmation.
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
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-[#f8fafc] min-h-screen">
      {/* Disclaimer Message */}
      <div className="w-full  p-4 ">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-[#0061e0]/5 border border-[#0061e0]/10 rounded-2xl p-4 sm:p-5">
          <div className="flex-shrink-0 bg-[#0061e0]/10 p-2.5 rounded-full">
            <Info className="w-5 h-5 text-[#0061e0]" />
          </div>
          <div>
            <h3 className="text-[#0061e0] font-bold text-[15px] sm:text-[16px]">
              Your card won't be charged now.
            </h3>
            <p className="text-slate-600 text-sm sm:text-[14px] leading-relaxed mt-0.5">
              We only take payment at the time of pickup. This secure portal is used to verify your card details for the reservation.
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Payment Gateway */}
      <div className="flex-1 relative w-full flex flex-col items-center bg-white">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20 gap-4">
            <Loader2 className="w-10 h-10 text-[#0061e0] animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Connecting to secure gateway...</p>
          </div>
        )}
        <iframe
          src={url}
          className={`w-full flex-1 border-none z-10 min-h-[800px] transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setLoading(false)}
          title="Secure Payment Gateway"
          allow="payment"
        />
      </div>

      {/* Mobile-friendly bottom padding */}
      <div className="h-20 sm:hidden bg-white" />
    </div>
  );
}
