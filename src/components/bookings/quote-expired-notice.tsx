import { QUOTE_EXPIRED_PICKUP_MESSAGE } from '@/utils/booking-ui-status';

/** Yellow notice when a quote’s pickup date/time has passed. */
export function QuoteExpiredNotice({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-[#fff8d6] border border-[#ffec99] rounded-[8px] p-4 text-center shadow-sm ${className}`.trim()}
      role="status"
    >
      <p className="text-[12px] text-[#8c6b1d] leading-tight font-medium">
        {QUOTE_EXPIRED_PICKUP_MESSAGE}
      </p>
    </div>
  );
}
