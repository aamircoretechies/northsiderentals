import { CircleHelp, Circle, CircleCheck } from 'lucide-react';

export interface DamageCoverItem {
  id: string;
  name: string;
  cost: number;
}

export interface DamageCoverOptionsProps {
  options: DamageCoverItem[];
  selectedOptionId: string;
  onSelect: (id: string) => void;
}

export function DamageCoverOptions({
  options,
  selectedOptionId,
  onSelect,
}: DamageCoverOptionsProps) {
  return (
    <div className="flex flex-col mb-4">
      <h2 className="text-[#8692a6] font-bold text-[13px] uppercase tracking-wide mb-3 mt-0">
        DAMAGE COVER OPTIONS
      </h2>
      <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm flex flex-col">
        {options.map((option, index) => {
          const isSelected = selectedOptionId === option.id;
          return (
            <div
              key={option.id}
              className={`p-5 flex justify-between items-center cursor-pointer transition-colors hover:bg-gray-50 ${index !== options.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              onClick={() => onSelect(option.id)}
            >
              <div className="flex flex-col gap-1 pr-4">
                <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                  <span className="text-black font-medium text-[13px]">{option.name}</span>
                  <CircleHelp size={14} className="text-[#0061e0]" strokeWidth={2} />
                </div>
                <span className="text-black font-extrabold text-[14px]">
                  $ {option.cost.toFixed(2)}
                </span>
              </div>
              <div className="shrink-0 flex items-center justify-center">
                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-[#0061e0] flex items-center justify-center text-white shrink-0">
                    <CircleCheck size={20} className="fill-[#0061e0] text-white shrink-0" strokeWidth={2.5} />
                  </div>
                ) : (
                  <Circle size={24} className="text-gray-300" strokeWidth={1} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
