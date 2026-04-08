import React, { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

export function EditProfileModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const InputField = ({ placeholder }: { placeholder: string }) => (
    <input
      type="text"
      placeholder={placeholder}
      className="w-full bg-[#f2f4f8] border-0 rounded-[12px] px-4 py-4 text-[15px] text-[#2c3e50] placeholder:text-[#3f4254] focus:ring-1 focus:ring-[#0061e0] outline-none font-medium transition-shadow shadow-sm"
    />
  );

  const SelectField = ({ placeholder, value }: { placeholder?: string, value?: string }) => (
    <div className="relative w-full shadow-sm rounded-[12px]">
      <select className="w-full bg-[#f2f4f8] border-0 rounded-[12px] px-4 py-4 text-[15px] text-[#2c3e50] focus:ring-1 focus:ring-[#0061e0] outline-none appearance-none font-medium">
        {placeholder && <option value="" disabled selected className="text-[#3f4254] font-medium">{placeholder}</option>}
        {value && <option value={value} selected className="text-[#2c3e50] font-medium">{value}</option>}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>

      <DialogContent 
        className="max-w-md w-full p-0 gap-0 overflow-hidden bg-[#f8f9fa] border-0 sm:rounded-[24px]"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center p-4 pt-6 bg-[#f8f9fa]">
          <DialogClose className="p-2 -ml-2 text-black hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </DialogClose>
          <h1 className="flex-1 text-center font-extrabold text-[20px] text-black pr-8">
            Edit Profile
          </h1>
        </div>
        
        {/* Content */}
        <div className="px-5 pb-6 overflow-y-auto max-h-[85vh]">
          
          {/* Avatar Section */}
          <div className="flex items-center gap-5 mt-4 mb-8">
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden shrink-0 border border-gray-100 shadow-sm relative">
              <img 
                src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&q=80&w=256&h=256" 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[#8692a6] text-[13px] leading-tight">Upload jpg or png format image</span>
              <Button className="bg-[#0061e0] hover:bg-[#0051ba] text-white font-medium px-4 py-2 h-9 rounded-[6px] w-fit shadow-sm">
                Change Picture
              </Button>
            </div>
          </div>

          {/* Personal Info Grid */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <InputField placeholder="Ethan" />
              <InputField placeholder="Carter" />
            </div>
            <InputField placeholder="ethan.carter@gmail.com" />
            <InputField placeholder="Phone (with country code)" />
          </div>

          {/* Address Title */}
          <h2 className="text-[#8692a6] font-bold text-[14px] uppercase tracking-wide mb-3 mt-8">
            ADDRESS
          </h2>

          {/* Address Grid */}
          <div className="flex flex-col gap-3">
            <InputField placeholder="Address" />
            
            <div className="grid grid-cols-2 gap-3">
              <InputField placeholder="City" />
              <InputField placeholder="State" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField value="Australia" />
              <InputField placeholder="Post Code" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 mb-2 flex flex-col gap-4">
            <Button 
              className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-7 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.1)] cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Submit
            </Button>
            
            <DialogClose asChild>
              <button className="text-center w-full text-[#8692a6] font-semibold text-[15px] hover:text-black transition-colors py-2 cursor-pointer">
                Go Back
              </button>
            </DialogClose>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
