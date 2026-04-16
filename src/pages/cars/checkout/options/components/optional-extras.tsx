import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center">
                        <CircleHelp size={14} className="text-[#8692a6]" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs whitespace-pre-wrap text-[12px] leading-relaxed">
                      {extra.description}
                    </TooltipContent>
                  </Tooltip>
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
                  <span className="w-6 text-center text-black font-extrabold text-[14px]">
                    {extra.quantity || 0}
                  </span>
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
