import { Info } from 'lucide-react';

/** Shown whenever Windcave / card capture is presented. */
export function PaymentCardDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-[#0061e0]/15 bg-[#0061e0]/5 p-4 ${className}`}
      role="note"
    >
      <div className="flex-shrink-0 rounded-full bg-[#0061e0]/10 p-2">
        <Info className="size-5 text-[#0061e0]" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[#0061e0] font-bold text-[14px] sm:text-[15px]">
          Your card will NOT be charged until vehicle availability is confirmed
        </p>
        <p className="text-slate-600 text-sm leading-relaxed mt-1">
          We only verify your card details with Windcave. Payment is taken at pickup
          once your booking is confirmed.
        </p>
      </div>
    </div>
  );
}
