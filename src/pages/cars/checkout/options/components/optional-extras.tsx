import { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface OptionalExtraItem {
  id: string;
  name: string;
  price: number;
  type: 'quantity' | 'toggle';
  quantity?: number;
  selected?: boolean;
  description?: string;
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
              {extra.type === 'quantity' && (
                <div className="flex items-center border border-[#0061e0] rounded-full overflow-hidden h-9">
                  <button
                    className="w-10 flex items-center justify-center text-[#0061e0] font-bold text-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => onUpdateQuantity(extra.id, Math.max(0, (extra.quantity || 0) - 1))}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={extra.quantity || 0}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      if (!raw) {
                        onUpdateQuantity(extra.id, 0);
                        return;
                      }
                      const parsed = Number(raw);
                      if (!Number.isFinite(parsed)) return;
                      onUpdateQuantity(extra.id, Math.max(0, Math.floor(parsed)));
                    }}
                    className="w-12 text-center text-black font-extrabold text-[14px] outline-none bg-transparent"
                  />
                  <button
                    className="w-10 flex items-center justify-center text-[#0061e0] font-bold text-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => onUpdateQuantity(extra.id, (extra.quantity || 0) + 1)}
                  >
                    +
                  </button>
                </div>
              )}

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
