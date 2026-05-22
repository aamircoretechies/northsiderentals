import { useState } from 'react';
import { Info, X } from 'lucide-react';

/** Shown whenever Windcave / card capture is presented. */
export function PaymentCardDisclaimer({ className = '' }: { className?: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      className={`relative flex items-start gap-3 rounded-xl border border-[#0061e0]/15 bg-[#0061e0]/5 p-4 pr-8 sm:pr-4 ${className}`}
      role="note"
    >
      <div className="flex-shrink-0 rounded-full bg-[#0061e0]/10 p-2">
        <Info className="size-5 text-[#0061e0]" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[#0061e0] font-bold leading-tight text-[13px] sm:text-[13px]">
          Your card will NOT be charged until vehicle availability is confirmed
        </p>
        <p className="text-slate-600 text-xs leading-tight mt-1">
          We only verify your card details with Windcave. Payment is taken at pickup
          once your booking is confirmed.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="absolute top-2.5 right-2.5 p-1 rounded-full text-[#0061e0]/60 hover:text-[#0061e0] hover:bg-[#0061e0]/10 transition-all cursor-pointer sm:hidden"
        aria-label="Dismiss disclaimer"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
