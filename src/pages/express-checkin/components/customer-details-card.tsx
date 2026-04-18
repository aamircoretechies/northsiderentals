import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { RcmCountry } from '@/services/profile';

export interface CustomerDetailsForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  numberTravelling: string;
  dateOfBirth: string;
  licenseNo: string;
  licenseIssued: string;
  licenseExpires: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

const inputClass =
  'w-full bg-white border border-[#e2e8f0] rounded-[8px] px-4 py-3 text-[14px] text-[#2c3e50] focus:ring-1 focus:ring-[#0061e0] outline-none';

export function CustomerDetailsCard({
  value,
  onChange,
  countries = [],
}: {
  value: CustomerDetailsForm;
  onChange: (patch: Partial<CustomerDetailsForm>) => void;
  countries?: RcmCountry[];
}) {
  const [comboboxOpen, setComboboxOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="First Name"
        value={value.firstName}
        onChange={(e) => onChange({ firstName: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="Last Name"
        value={value.lastName}
        onChange={(e) => onChange({ lastName: e.target.value })}
        className={inputClass}
      />
      <input
        type="email"
        placeholder="Email"
        value={value.email}
        onChange={(e) => onChange({ email: e.target.value })}
        className={inputClass}
      />
      <input
        type="tel"
        placeholder="Phone (digits only)"
        value={value.phone}
        onChange={(e) => {
          const val = e.target.value;
          if (/^\d*$/.test(val)) onChange({ phone: val });
        }}
        className={inputClass}
        autoComplete="tel"
      />
      <input
        type="number"
        inputMode="numeric"
        min={1}
        placeholder="Number of People Traveling"
        value={value.numberTravelling}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (!raw) {
            onChange({ numberTravelling: '' });
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          onChange({ numberTravelling: String(Math.max(1, Math.floor(parsed))) });
        }}
        className={inputClass}
      />
      <input
        type="date"
        placeholder="Date of Birth"
        value={value.dateOfBirth}
        onChange={(e) => onChange({ dateOfBirth: e.target.value })}
        onKeyDown={(e) => e.preventDefault()}
        onClick={(e) => (e.target as any).showPicker?.()}
        className={cn(inputClass, "cursor-pointer")}
      />
      <input
        type="text"
        placeholder="License Number"
        value={value.licenseNo}
        onChange={(e) => onChange({ licenseNo: e.target.value })}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="License Issuing Country"
        value={value.licenseIssued}
        onChange={(e) => onChange({ licenseIssued: e.target.value })}
        className={inputClass}
      />
      <input
        type="date"
        placeholder="License Expiry"
        value={value.licenseExpires}
        onChange={(e) => onChange({ licenseExpires: e.target.value })}
        onKeyDown={(e) => e.preventDefault()}
        onClick={(e) => (e.target as any).showPicker?.()}
        className={cn(inputClass, "cursor-pointer")}
      />
      <input
        type="text"
        placeholder="Address"
        value={value.address}
        onChange={(e) => onChange({ address: e.target.value })}
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="City"
          value={value.city}
          onChange={(e) => onChange({ city: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="State"
          value={value.state}
          onChange={(e) => onChange({ state: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 pb-2">
        <div className="relative w-full">
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  inputClass,
                  "flex items-center justify-between text-left",
                  !value.country && "text-[#8692a6]"
                )}
              >
                <span className="truncate">
                  {value.country || 'Country'}
                </span>
                <ChevronDown className={cn("w-4 h-4 opacity-50 transition-transform", comboboxOpen && "rotate-180")} />
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[var(--radix-popover-trigger-width)] p-0 border border-gray-100 shadow-xl rounded-[12px] overflow-hidden" 
              align="start"
            >
              <Command className="w-full">
                <CommandInput placeholder="Search country..." className="border-none" />
                <CommandList className="max-h-[250px] overflow-y-auto">
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup>
                    {countries.length > 0 ? (
                      countries.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.country}
                          onSelect={() => {
                            onChange({ country: c.country });
                            setComboboxOpen(false);
                          }}
                          className="px-4 py-3 flex items-center justify-between cursor-pointer data-[selected=true]:bg-gray-50 text-[14px]"
                        >
                          <span className="truncate">{c.country}</span>
                          {c.country === value.country && <Check className="w-4 h-4 text-[#0061e0] shrink-0" />}
                        </CommandItem>
                      ))
                    ) : (
                      <CommandItem
                        value="Australia"
                        onSelect={() => {
                          onChange({ country: "Australia" });
                          setComboboxOpen(false);
                        }}
                        className="px-4 py-3 flex items-center justify-between cursor-pointer data-[selected=true]:bg-gray-50 text-[14px]"
                      >
                        Australia
                      </CommandItem>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <input
          type="text"
          placeholder="Post Code"
          value={value.postcode}
          onChange={(e) => {
            const val = e.target.value;
            if (/^\d*$/.test(val)) onChange({ postcode: val });
          }}
          className={inputClass}
        />
      </div>
    </div>
  );
}

