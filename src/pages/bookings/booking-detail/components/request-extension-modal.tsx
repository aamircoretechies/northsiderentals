import { useState } from 'react';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

interface RequestExtensionModalProps {
  trigger: React.ReactNode;
}

export function RequestExtensionModal({ trigger }: RequestExtensionModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent 
        showCloseButton={false}
        className="max-w-md p-0 flex flex-col gap-0 border-0 bg-[#f8f9fc] sm:rounded-[24px] overflow-hidden sm:max-h-[85vh] h-[100dvh] sm:h-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-center p-4 sm:p-5 relative bg-white sticky top-0 z-10">
          <button 
            className="absolute left-4 p-2 cursor-pointer hover:bg-gray-50 rounded-full"
            onClick={() => setOpen(false)}
          >
            <ArrowLeft size={24} className="text-black" />
          </button>
          <h2 className="text-[18px] font-extrabold text-black tracking-tight">Request Extension</h2>
        </div>

        {/* Scrollable Content Range */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center">
          
          {/* Main Card */}
          <div className="bg-white rounded-[16px] w-full border border-gray-100 shadow-sm flex flex-col overflow-hidden mb-8">
            
            {/* Top Car Info */}
            <div className="p-4 sm:p-5 flex gap-4 border-b border-gray-50">
              <div className="w-[110px] h-[75px] shrink-0 bg-[#f8f9fc] rounded-[10px] flex items-center justify-center p-1.5">
                <img 
                  src="https://cdn.pixabay.com/photo/2012/05/29/00/43/car-49278_1280.jpg" 
                  alt="MG HS-Excite" 
                  className="w-full h-full object-contain mix-blend-multiply" 
                />
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                <span className="text-[#6b7280] text-[13px]">Reservation Number:</span>
                <span className="font-bold text-[#0061e0] text-[15px]">1815075CA249B36</span>
                <h3 className="text-black font-extrabold text-[14px] mt-1">MG HS-Excite - 5 seater</h3>
                <p className="text-[#6b7280] text-[12px]">Automatic, 2023 Model</p>
              </div>
            </div>

            {/* Middle Grid Pick/Return */}
            <div className="grid grid-cols-2 border-b border-gray-50">
              <div className="p-4 sm:p-5 flex flex-col gap-1 border-r border-gray-50">
                <span className="text-[#6b7280] text-[13px]">Pickup:</span>
                <span className="text-black font-extrabold text-[13px]">07/03/2026 9:00 AM</span>
                <span className="text-[#6b7280] text-[13px] leading-tight mt-0.5">Welshpool, Perth Airport<br/>Perth - 102121</span>
              </div>
              <div className="p-4 sm:p-5 flex flex-col gap-1">
                <span className="text-[#6b7280] text-[13px]">Return:</span>
                <span className="text-black font-extrabold text-[13px]">14/03/2026 9:00 AM</span>
                <span className="text-[#6b7280] text-[13px] leading-tight mt-0.5">Welshpool, Perth Airport<br/>Perth - 102121</span>
              </div>
            </div>

            {/* Bottom Form Fields */}
            <div className="p-4 sm:p-5 flex flex-col gap-3 pb-6">
              <span className="text-[12px] font-bold text-black tracking-wide uppercase">NEW RETURN DATE & TIME</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-[48px] bg-[#f8f9fc] rounded-[10px] flex items-center px-4 gap-3 cursor-pointer hover:bg-gray-100 transition-colors">
                  <Calendar size={18} className="text-[#0061e0]" />
                  <span className="text-black font-semibold text-[14px]">DD/MM/YYYY</span>
                </div>
                <div className="h-[48px] bg-[#f8f9fc] rounded-[10px] flex items-center px-4 gap-3 cursor-pointer hover:bg-gray-100 transition-colors">
                  <Clock size={18} className="text-[#0061e0]" />
                  <span className="text-black font-semibold text-[14px]">HH:MM AM</span>
                </div>
              </div>
            </div>
            
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col items-center gap-4 mt-auto sm:mt-0">
            <Button 
              className="w-full bg-[#ffb700] hover:bg-[#e5a400] text-black font-bold h-[52px] rounded-[26px] text-[16px]"
              onClick={() => setOpen(false)}
            >
              Submit Extend Request
            </Button>
            
            <button 
              className="text-[#6b7280] font-medium text-[15px] p-2 hover:text-black transition-colors"
              onClick={() => setOpen(false)}
            >
              Go Back
            </button>
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
