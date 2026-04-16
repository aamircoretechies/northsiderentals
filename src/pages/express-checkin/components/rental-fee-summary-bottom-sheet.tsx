import { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface RentalFeeSummaryBottomSheetProps {
  days: number;
  dailyRate: number;
  totalExtras: number;
  totalCost: number;
  gstAmount: number;
  onSave: () => void;
}

export function RentalFeeSummaryBottomSheet({
  days,
  dailyRate,
  totalExtras,
  totalCost,
  gstAmount,
  onSave,
}: RentalFeeSummaryBottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[20px] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pt-3 px-5 pb-6 transition-all duration-300 ease-in-out">
      {/* Top drag handle indicator - Clickable for toggle */}
      <div 
        className="w-full pt-1 pb-5 cursor-pointer active:opacity-70 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto shadow-sm" />
      </div>
      
      <div className={`${isExpanded ? 'block' : 'hidden'}`}>
        <h2 className="text-[#8692a6] font-bold text-[13px] uppercase tracking-wide mb-4">
          RENTAL FEE SUMMARY
        </h2>

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-black text-[15px]">
              Daily Rate ({days} days @ ${dailyRate.toFixed(2)} per day)
            </span>
            <span className="font-extrabold text-black text-[15px]">
              $ {(days * dailyRate).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-black text-[15px]">Total Extras</span>
            <span className="font-extrabold text-black text-[15px]">
              $ {totalExtras.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex justify-between items-center font-extrabold text-[#0061e0] text-[16px] mt-1">
          <span>Total Cost</span>
          <span>$ {totalCost.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-end mt-[-8px]">
          <span className="text-[#8692a6] text-[13px]">
            (Inc. GST: ${gstAmount.toFixed(2)})
          </span>
        </div>
      </div>

      <Button
        className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-6 mt-2 rounded-full shadow-md"
        onClick={onSave}
      >
        Save
      </Button>
    </div>
  );
}
