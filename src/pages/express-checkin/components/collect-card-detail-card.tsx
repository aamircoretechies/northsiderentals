import { ChevronDown } from 'lucide-react';


export function CollectCardDetailCard() {
  const InputGroup = ({ label, type = "text" }: { label: string, type?: string }) => (
    <div className="flex flex-col gap-1.5 w-full mb-3">
      <label className="text-[13px] text-[#8692a6] font-medium">{label}</label>
      <input
        type={type}
        className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2.5 text-[14px] text-black focus:ring-1 focus:ring-[#0061e0] outline-none"
      />
    </div>
  );

  const SelectGroup = ({ placeholder }: { placeholder: string }) => (
    <div className="relative w-full">
      <select className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2.5 text-[14px] text-[#8692a6] focus:ring-1 focus:ring-[#0061e0] outline-none appearance-none font-medium">
        <option value="" disabled selected>{placeholder}</option>
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[14px] text-black font-semibold">Secure Credit Card Payment</span>
        <div className="flex items-center gap-2">
          {/* Using placeholder images for Visa/Mastercard from simple colors if assets aren't available, but try to use absolute URL if needed. Here just CSS boxes since I don't have the explicit icon path */}
          <div className="w-9 h-6 bg-white border border-gray-200 rounded flex items-center justify-center shrink-0">
             <span className="text-[#1a1f71] text-[9px] font-extrabold italic">VISA</span>
          </div>
          <div className="w-9 h-6 bg-white border border-gray-200 rounded flex items-center justify-center shrink-0 relative overflow-hidden">
             <div className="w-3.5 h-3.5 rounded-full bg-[#eb001b] absolute left-1 mix-blend-multiply opacity-80" />
             <div className="w-3.5 h-3.5 rounded-full bg-[#f79e1b] absolute right-1 mix-blend-multiply opacity-80" />
          </div>
        </div>
      </div>

      <InputGroup label="Card Number *" />
      <InputGroup label="Name On Card *" />
      
      <div className="flex flex-col gap-1.5 mb-3">
        <label className="text-[13px] text-[#8692a6] font-medium">Expiry Date *</label>
        <div className="grid grid-cols-2 gap-4">
          <SelectGroup placeholder="MM" />
          <SelectGroup placeholder="YY" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mb-4">
        <label className="text-[13px] text-[#8692a6] font-medium">CVC *</label>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-3 py-2.5 text-[14px] text-black focus:ring-1 focus:ring-[#0061e0] outline-none"
            />
          </div>
          <div className="shrink-0">
            <span className="text-[#ef4444] text-[13px] inline-block leading-tight max-w-[60px]">What is CVC?</span>
          </div>
        </div>
      </div>

      <span className="text-[14px] text-[#8692a6] mb-3 mt-1 inline-block">Customer Information</span>
      
      <InputGroup label="Email *" type="email" />

      <div className="flex items-start gap-3 mt-2">
        <input 
          type="checkbox" 
          className="mt-1 w-[18px] h-[18px] rounded-[4px] border-[#e2e8f0] text-[#0061e0] focus:ring-[#0061e0]" 
        />
        <span className="text-[13px] text-black leading-snug pt-0.5">
          I have read and accept the <a href="#" className="text-[#0061e0] hover:underline">Terms and Condition</a>
        </span>
      </div>
    </div>
  );
}
