import { ReactNode, useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

export function EmailQuoteModal({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent 
        showCloseButton={false} 
        className="max-w-[500px] w-full p-0 gap-0 overflow-hidden bg-white border-0 sm:rounded-[24px]"
      >
        <div className="flex flex-col h-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center px-6 py-5 sticky top-0 bg-white z-10 border-b border-gray-100">
            <button 
              className="p-1 cursor-pointer hover:bg-gray-50 rounded-full"
              onClick={() => setOpen(false)}
            >
              <ArrowLeft size={24} className="text-black" />
            </button>
            <h2 className="flex-1 text-center text-[20px] font-bold text-black pr-8">
              Email Qoute
            </h2>
          </div>

          <div className="flex flex-col px-6 py-6 flex-1">
            <h3 className="text-[#8692a6] font-bold text-[13px] uppercase tracking-wide mb-5">
              CUSTOMER DETAILS
            </h3>

            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="First Name" 
                className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 text-[15px] font-medium text-black placeholder:text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors"
              />
              <input 
                type="text" 
                placeholder="Last Name" 
                className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 text-[15px] font-medium text-black placeholder:text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors"
              />
              <input 
                type="email" 
                placeholder="Email" 
                className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 text-[15px] font-medium text-black placeholder:text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors"
              />
              <input 
                type="tel" 
                placeholder="Phone (with country code)" 
                className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 text-[15px] font-medium text-black placeholder:text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors"
              />
              
              <div className="relative">
                <select 
                  className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 pr-12 text-[15px] font-medium text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors appearance-none cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled hidden>Number of People Traveling</option>
                  <option value="1">1 Person</option>
                  <option value="2">2 People</option>
                  <option value="3">3 People</option>
                  <option value="4+">4+ People</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown size={20} className="text-[#8692a6]" />
                </div>
              </div>

              <textarea 
                placeholder="Add a note" 
                className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 text-[15px] font-medium text-black placeholder:text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors min-h-[120px] resize-none"
              />
            </div>

            <div className="mt-8 flex flex-col gap-4">
              <Button 
                className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-7 rounded-full shadow-md transition-colors"
                onClick={() => setOpen(false)}
              >
                Submit Quote Request
              </Button>
              <button 
                className="w-full text-center text-[#6b7280] font-medium text-[16px] py-3 hover:text-black transition-colors"
                onClick={() => setOpen(false)}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
