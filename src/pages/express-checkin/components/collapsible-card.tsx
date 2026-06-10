import { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleCardProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

export function CollapsibleCard({ title, isOpen, onToggle, children }: CollapsibleCardProps) {
  return (
    <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm mb-4 overflow-hidden">
      <div 
        className="flex items-center justify-between p-5 cursor-pointer select-none"
        onClick={onToggle}
      >
        <h2 className="text-[#8692a6] font-bold text-[14px] uppercase tracking-wide m-0">{title}</h2>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-[#8692a6]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#8692a6]" />
        )}
      </div>
      {isOpen && (
        <div className="px-5 pb-5">
          {children}
        </div>
      )}
    </div>
  );
}
