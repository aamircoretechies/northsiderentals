import { HelpCircle, CheckCircle2, Circle, Plus, Minus } from 'lucide-react';

export function BookingDetailsCard() {
  const ExtraItem = ({ 
    title, 
    price, 
    hasInfo = false, 
    actionType, 
    quantity = 0 
  }: { 
    title: string, 
    price: string, 
    hasInfo?: boolean, 
    actionType: 'counter' | 'remove' | 'add', 
    quantity?: number 
  }) => (
    <div className="flex items-center justify-between p-3.5 bg-white border border-[#e2e8f0] rounded-[12px] mb-3">
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[#0061e0] text-[14px] font-medium">{title}</span>
          {hasInfo && <HelpCircle className="w-[14px] h-[14px] text-[#8692a6]" />}
        </div>
        <span className="text-black font-extrabold text-[14px]">{price}</span>
      </div>
      
      {actionType === 'counter' && (
        <div className="flex items-center gap-3 px-3 py-1.5 border border-[#0061e0] rounded-full text-[#0061e0]">
          <button className="text-[#0061e0] hover:text-[#004bb5] font-bold"><Minus className="w-4 h-4" /></button>
          <span className="font-extrabold text-[14px] w-4 text-center text-black">{quantity}</span>
          <button className="text-[#0061e0] hover:text-[#004bb5] font-bold"><Plus className="w-4 h-4" /></button>
        </div>
      )}
      
      {actionType === 'remove' && (
        <button className="bg-[#0061e0] text-white font-bold text-[13px] px-4 py-1.5 rounded-[20px] hover:bg-[#004bb5]">
          REMOVE
        </button>
      )}

      {actionType === 'add' && (
        <button className="bg-white text-[#0061e0] border border-[#0061e0] font-bold text-[13px] px-4 py-1.5 rounded-[20px] hover:bg-[#f0f6ff]">
          + ADD
        </button>
      )}
    </div>
  );

  const DamageOption = ({
    title,
    price,
    selected = false
  }: {
    title: string,
    price: string,
    selected?: boolean
  }) => (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0 last:pb-0">
      <div className="flex flex-col pr-4">
        <div className="text-[13px] text-black pr-2 leading-tight mb-1 inline">
          {title} <HelpCircle className="w-[14px] h-[14px] text-[#8692a6] inline align-text-bottom ml-1" />
        </div>
        <span className="font-extrabold text-[14px] text-black mt-0.5">{price}</span>
      </div>
      <div className="shrink-0 mt-1">
        {selected ? (
          <CheckCircle2 className="w-5 h-5 text-[#0061e0] fill-[#0061e0] stroke-white stroke-1" />
        ) : (
          <Circle className="w-5 h-5 text-[#d1d5db]" />
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      <p className="text-[14px] text-gray-800 font-medium mb-3">Optional Extras</p>
      
      <ExtraItem title="Additional Driver" price="$ 10.00" actionType="counter" quantity={0} />
      <ExtraItem title="Towing Fee" price="$ 10.00" hasInfo actionType="remove" />
      <ExtraItem title="Express Pickup" price="$ 15.00" hasInfo actionType="add" />
      <ExtraItem title="Remote Area Fee" price="$ 70.00" hasInfo actionType="add" />

      <p className="text-[14px] text-gray-800 font-medium mb-2 mt-4">Damage Extra Options</p>
      
      <div className="flex flex-col">
        <DamageOption title="Standard Damage Waiver @ 0.00 per day" price="$ 0.00" selected />
        <DamageOption title="Liability Reduction Waiver 1-6 days @ 10.00 per day" price="$ 10.00 / day" />
        <DamageOption title="Single Vehicle Waiver 1-6 days @ 10.00 per day" price="$ 10.00 / day" />
        <DamageOption title="Combined Damage Waiver 1-6 days @ 10.00 per day" price="$ 10.00 / day" />
      </div>
    </div>
  );
}
