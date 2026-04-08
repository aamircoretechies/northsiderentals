import * as React from 'react';
import { Trash2, Pen, CalendarIcon, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

export function ExtraDriversCard() {
  const [open, setOpen] = React.useState(false);

  const InputPlaceholder = ({ placeholder, icon }: { placeholder: string, icon?: React.ReactNode }) => (
    <div className="relative w-full mb-3">
      <input
        type="text"
        placeholder={placeholder}
        className="w-full bg-[#f4f7fa] border-0 rounded-[8px] px-4 py-3.5 text-[15px] text-black placeholder:text-[#8692a6] focus:ring-1 focus:ring-[#0061e0] outline-none"
      />
      {icon && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
          {icon}
        </div>
      )}
    </div>
  );

  const UploadBox = ({ text }: { text: string }) => (
    <div className="flex flex-col items-center justify-center border-[1.5px] border-dashed border-[#0061e0] rounded-[16px] bg-white py-6 mb-4 cursor-pointer hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-2 text-[#0061e0]">
        <ImageIcon className="w-5 h-5 stroke-[2]" />
        <span className="font-medium text-[15px]">{text}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between bg-[#f8f9fa] rounded-[12px] p-4 border border-gray-100">
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-[13px] font-medium w-3">1</span>
            <div className="flex flex-col">
              <span className="text-black text-[14px] font-medium mb-0.5">Ethan Carter</span>
              <span className="text-gray-400 text-[12px]">DOB 15/06/1992</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <button className="cursor-pointer w-8 h-8 rounded-full bg-[#ef4444] flex items-center justify-center hover:bg-[#dc2626] transition-colors shadow-sm">
              <Trash2 className="w-4 h-4 text-white" />
            </button>
            <button className="cursor-pointer w-8 h-8 rounded-full bg-[#ffc107] flex items-center justify-center hover:bg-[#ffb000] transition-colors shadow-sm">
              <Pen className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <DialogTrigger asChild>
          <Button variant="outline" className="w-full text-[#0061e0] border-[#0061e0] font-bold py-6 rounded-full hover:bg-[#f0f6ff]">
            + Add More Driver
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent 
        className="max-w-md w-full p-0 gap-0 overflow-hidden bg-white border-0 sm:rounded-[24px]"
        showCloseButton={false}
      >
        <div className="flex items-center p-4">
          <DialogClose className="cursor-pointer p-2 -ml-2 text-black hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
            <ArrowLeft className="w-6 h-6" />
          </DialogClose>
          <h1 className="flex-1 text-center font-extrabold text-[18px] text-black pr-8">
            Upload Driver License
          </h1>
        </div>
        
        <div className="px-5 pb-6 overflow-y-auto max-h-[85vh]">
          <h2 className="text-[#8692a6] font-bold text-[13px] uppercase tracking-wide mb-4 mt-2">
            DRIVER LICENSE DETAILS
          </h2>
          
          <div className="flex flex-col">
            <InputPlaceholder placeholder="Driver Full Name" />
            <InputPlaceholder placeholder="License Number" />
            <InputPlaceholder placeholder="Issuing Authority" />
            <InputPlaceholder placeholder="License Expiry" icon={<CalendarIcon className="w-5 h-5 text-gray-500" />} />
          </div>

          <h2 className="text-[#8692a6] font-bold text-[13px] uppercase tracking-wide mb-4 mt-4">
            UPLOAD LICENSE IMAGES
          </h2>

          <UploadBox text="Upload Front Side" />
          <UploadBox text="Upload Back Side" />

          <div className="mt-8 mb-2 flex flex-col gap-4">
            <Button 
              className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-6 rounded-full shadow-sm"
              onClick={() => setOpen(false)}
            >
              Submit
            </Button>
            
            <DialogClose asChild>
              <button className="cursor-pointer text-center w-full text-[#8692a6] font-medium text-[15px] hover:text-black transition-colors py-2">
                Go Back
              </button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
