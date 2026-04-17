
import { useState } from 'react';

export interface RentalFeeSummaryProps {
  days: number;
  dailyRate: number;
  totalExtras: number;
  gstAmount: number;
  currencySymbol?: string;
  children?: React.ReactNode;
}

export function RentalFeeSummary({
  days,
  dailyRate,
  totalExtras,
  gstAmount,
  currencySymbol = '$',
  children,
}: RentalFeeSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sym = currencySymbol || '$';
  const baseTotal = days * dailyRate;
  const totalCost = baseTotal + totalExtras;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 p-6 pt-2  flex flex-col w-full mx-auto md:max-w-[700px] lg:max-w-none lg:static lg:rounded-none lg:shadow-none lg:border-t-0 lg:p-0">
      {/* Top drag handle visual indicator - Clickable for toggle */}
      <div
        className="w-full pt-1 pb-5 lg:hidden cursor-pointer active:opacity-70 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        role="button"
      >
        <div className="w-[40px] h-[5px] bg-[#e5e7eb] rounded-full mx-auto shadow-sm" />
      </div>

      <div className={`${isExpanded ? 'block' : 'hidden'} lg:block`}>
        <h2 className="text-[#8692a6] font-bold text-[13px] uppercase tracking-wide mb-3">
          RENTAL FEE SUMMARY
        </h2>

        <div className="flex justify-between items-center mb-2 gap-3">
          <span className="text-black font-medium text-[14px] leading-snug">
            Daily rate ({days} {days === 1 ? 'day' : 'days'} @ {sym}
            {dailyRate.toFixed(2)} / day)
          </span>
          <span className="text-black font-extrabold text-[15px] shrink-0">
            {sym}
            {(days * dailyRate).toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center mb-3">
          <span className="text-black font-medium text-[14px]">Total extras</span>
          <span className="text-black font-extrabold text-[15px]">
            {sym}
            {totalExtras.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-start mb-0 gap-3">
        <span className="text-[#0061e0] font-medium text-[15px]">Total</span>
        <div className="flex flex-col items-end">
          <span className="text-[#0061e0] font-extrabold text-[18px] leading-none mb-1">
            {sym}
            {totalCost.toFixed(2)}
          </span>
          <span className="text-[#8692a6] text-[12px] font-medium">
            (GST included: {sym}
            {gstAmount.toFixed(2)})
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
