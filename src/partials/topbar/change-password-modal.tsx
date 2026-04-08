import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

export function ChangePasswordModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const PasswordInput = ({ placeholder }: { placeholder: string }) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative w-full shadow-sm rounded-[12px]">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className="w-full bg-[#f2f4f8] border-0 rounded-[12px] pl-5 pr-12 py-4 text-[15px] text-[#2c3e50] placeholder:text-[#8692a6] focus:ring-1 focus:ring-[#0061e0] outline-none font-medium transition-shadow"
        />
        <div 
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5e6278] cursor-pointer hover:text-black transition-colors"
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff className="w-5 h-5 stroke-[2]" /> : <Eye className="w-5 h-5 stroke-[2]" />}
        </div>
      </div>
    );
  };

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
            Change Password
          </h1>
        </div>
        
        {/* Content */}
        <div className="px-5 pb-8 pt-4 overflow-y-auto max-h-[85vh] flex flex-col gap-4">
          <PasswordInput placeholder="Current Password" />
          <PasswordInput placeholder="New Password" />
          <PasswordInput placeholder="Confirm New Password" />

          {/* Action Button */}
          <div className="mt-6 mb-2">
            <Button 
              className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-7 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.1)] cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Update
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
