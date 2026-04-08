import { CalendarIcon, ChevronDown } from 'lucide-react';

export function CustomerDetailsCard() {
  const InputPlaceholder = ({ placeholder, icon }: { placeholder: string, icon?: React.ReactNode }) => (
    <div className="relative w-full">
      <input
        type="text"
        placeholder={placeholder}
        className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-4 py-3 text-[14px] text-[#6b7280] focus:ring-1 focus:ring-[#0061e0] outline-none"
      />
      {icon && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
    </div>
  );

  const SelectPlaceholder = ({ placeholder, value }: { placeholder?: string, value?: string }) => (
    <div className="relative w-full">
      <select className="w-full bg-white border border-[#e2e8f0] rounded-[8px] px-4 py-3 text-[14px] text-[#2c3e50] focus:ring-1 focus:ring-[#0061e0] outline-none appearance-none font-medium">
        {placeholder && <option value="" disabled selected className="text-[#6b7280] font-normal">{placeholder}</option>}
        {value && <option value={value} selected>{value}</option>}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <InputPlaceholder placeholder="First Name" />
      <InputPlaceholder placeholder="Last Name" />
      <InputPlaceholder placeholder="Email" />
      <InputPlaceholder placeholder="Phone (with country code)" />

      <SelectPlaceholder placeholder="Number of People Traveling" />
      <InputPlaceholder placeholder="Date of Birth" icon={<CalendarIcon className="w-5 h-5 text-gray-400" />} />
      <InputPlaceholder placeholder="License Number" />

      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-gray-400 font-medium px-1">License Issuing Country</span>
        <SelectPlaceholder value="Australia" />
      </div>

      <InputPlaceholder placeholder="License Expiry" icon={<CalendarIcon className="w-5 h-5 text-gray-400" />} />

      <InputPlaceholder placeholder="Address" />

      <div className="grid grid-cols-2 gap-3">
        <InputPlaceholder placeholder="City" />
        <InputPlaceholder placeholder="State" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectPlaceholder value="Australia" />
        <InputPlaceholder placeholder="Post Code" />
      </div>
    </div>
  );
}
