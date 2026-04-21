import { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MAX_CHECKOUT_EXTRA_FEE_QTY } from '@/services/booking-payload';

export interface OptionalExtraItem {
  id: string;
  name: string;
  price: number;
  type: 'quantity' | 'toggle';
  quantity?: number;
  selected?: boolean;
  description?: string;
  /** Max units user may select (capped in UI, default 10). */
  maxQty?: number;
}

export interface OptionalExtrasProps {
  extras: OptionalExtraItem[];
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onToggle: (id: string, select: boolean) => void;
}

function InfoPopover({ description }: { description: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center outline-hidden"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
        >
          <CircleHelp size={14} className="text-[#8692a6]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="max-w-xs whitespace-pre-wrap text-[12px] leading-relaxed p-3 bg-zinc-900 text-white border-zinc-800 shadow-xl z-[100]"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {description}
      </PopoverContent>
    </Popover>
  );
}

export function OptionalExtras({ extras, onUpdateQuantity, onToggle }: OptionalExtrasProps) {
  return (
    <div className="flex flex-col mb-4">
      <h2 className="text-[#8692a6] font-bold text-[13px] uppercase tracking-wide mb-3 mt-0">
        OPTIONAL EXTRAS
      </h2>
      <div className="flex flex-col gap-3">
        {extras.map((extra) => (
          <div
            key={extra.id}
            className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-4 flex justify-between items-center"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[#0061e0] font-medium text-[14px]">{extra.name}</span>
                {extra.description ? (
                  <InfoPopover description={extra.description} />
                ) : (
                  <CircleHelp size={14} className="text-[#8692a6]" />
                )}
              </div>
              <span className="text-black font-extrabold text-[14px]">
                $ {extra.price.toFixed(2)}
              </span>
            </div>

            <div>
              {extra.type === 'quantity' && (() => {
                const cap = Math.min(
                  MAX_CHECKOUT_EXTRA_FEE_QTY,
                  Math.max(
                    1,
                    Number(extra.maxQty ?? MAX_CHECKOUT_EXTRA_FEE_QTY) ||
                      MAX_CHECKOUT_EXTRA_FEE_QTY,
                  ),
                );
                const qty = Math.max(0, Math.min(cap, Number(extra.quantity ?? 0)));
                return (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease quantity for ${extra.name}`}
                      onClick={() => onUpdateQuantity(extra.id, qty - 1)}
                      disabled={qty <= 0}
                      className="w-9 h-9 rounded-full border border-[#0061e0] text-[#0061e0] flex items-center justify-center text-xl font-bold hover:bg-[#0061e0] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <span className="min-w-[1.5rem] text-center text-[15px] font-extrabold text-black">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity for ${extra.name}`}
                      onClick={() => onUpdateQuantity(extra.id, qty + 1)}
                      disabled={qty >= cap}
                      className="w-9 h-9 rounded-full border border-[#0061e0] text-[#0061e0] flex items-center justify-center text-xl font-bold hover:bg-[#0061e0] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                );
              })()}

              {extra.type === 'toggle' && extra.selected && (
                <Button
                  className="bg-[#0061e0] hover:bg-[#0051cc] text-white font-bold text-[13px] rounded-full px-6 h-9"
                  onClick={() => onToggle(extra.id, false)}
                >
                  REMOVE
                </Button>
              )}

              {extra.type === 'toggle' && !extra.selected && (
                <Button
                  variant="outline"
                  className="border-[#0061e0] text-[#0061e0] hover:bg-[#0061e0] hover:text-white font-bold text-[13px] rounded-full px-7 h-9"
                  onClick={() => onToggle(extra.id, true)}
                >
                  + ADD
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
