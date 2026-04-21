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
const PHONE_ALLOWED_CHARS = /^[+()\-\s\d]+$/;
const NAME_PATTERN = /^[a-zA-Z\s'-]*$/;
const ADDRESS_ALLOWED_PATTERN = /^[a-zA-Z0-9\s,.'/#-]*$/;
const LOCATION_ALLOWED_PATTERN = /^[a-zA-Z0-9\s,.'-]*$/;
const POSTCODE_ALLOWED_PATTERN = /^[a-zA-Z0-9\s-]*$/;

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
        onChange={(e) => {
          const next = e.target.value.slice(0, 50);
          if (NAME_PATTERN.test(next)) onChange({ firstName: next });
        }}
        maxLength={50}
        className={inputClass}
      />
      <input
        type="text"
        placeholder="Last Name"
        value={value.lastName}
        onChange={(e) => {
          const next = e.target.value.slice(0, 50);
          if (NAME_PATTERN.test(next)) onChange({ lastName: next });
        }}
        maxLength={50}
        className={inputClass}
      />
      <input
        type="email"
        placeholder="Email"
        value={value.email}
        onChange={(e) => onChange({ email: e.target.value.slice(0, 100) })}
        maxLength={100}
        className={inputClass}
      />
      <input
        type="tel"
        placeholder="Phone (with country code)"
        value={value.phone}
        onChange={(e) => {
          const val = e.target.value;
          if (!val || PHONE_ALLOWED_CHARS.test(val)) onChange({ phone: val });
        }}
        className={inputClass}
        autoComplete="tel"
        inputMode="tel"
        maxLength={20}
      />
      <div className="flex items-center justify-between rounded-[8px] border border-[#e2e8f0] bg-white px-3 py-2.5">
        <span className="text-[14px] text-[#2c3e50]">Number of People Traveling</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease travellers"
            onClick={() => {
              const current = Math.min(20, Math.max(1, Number(value.numberTravelling || 1)));
              onChange({ numberTravelling: String(Math.max(1, current - 1)) });
            }}
            disabled={Number(value.numberTravelling || 1) <= 1}
            className="size-8 rounded-full border border-[#d0d7e2] bg-white text-[18px] leading-none font-bold text-[#374151] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            -
          </button>
          <span className="min-w-[2rem] text-center text-[15px] font-semibold tabular-nums text-[#2c3e50]">
            {Math.min(20, Math.max(1, Number(value.numberTravelling || 1)))}
          </span>
          <button
            type="button"
            aria-label="Increase travellers"
            onClick={() => {
              const current = Math.min(20, Math.max(1, Number(value.numberTravelling || 1)));
              onChange({ numberTravelling: String(Math.min(20, current + 1)) });
            }}
            disabled={Number(value.numberTravelling || 1) >= 20}
            className="size-8 rounded-full border border-[#d0d7e2] bg-white text-[18px] leading-none font-bold text-[#374151] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>
      <input
        type="date"
        placeholder="Date of Birth (Driver)"
        value={value.dateOfBirth}
        onChange={(e) => onChange({ dateOfBirth: e.target.value })}
        onKeyDown={(e) => e.preventDefault()}
        onClick={(e) => (e.target as any).showPicker?.()}
        className={cn(inputClass, "cursor-pointer")}
        aria-label="Driver date of birth"
        title="Driver date of birth"
      />
      <input
        type="text"
        placeholder="Driver Licence Number"
        value={value.licenseNo}
        onChange={(e) => onChange({ licenseNo: e.target.value.slice(0, 30) })}
        maxLength={30}
        className={inputClass}
        aria-label="Driver licence number"
      />
      <input
        type="text"
        placeholder="Driver Licence Issuing Country/State"
        value={value.licenseIssued}
        onChange={(e) => onChange({ licenseIssued: e.target.value.slice(0, 80) })}
        maxLength={80}
        className={inputClass}
        aria-label="Driver licence issuing country or state"
      />
      <input
        type="date"
        placeholder="Driver Licence Expiry Date"
        value={value.licenseExpires}
        onChange={(e) => onChange({ licenseExpires: e.target.value })}
        onKeyDown={(e) => e.preventDefault()}
        onClick={(e) => (e.target as any).showPicker?.()}
        className={cn(inputClass, "cursor-pointer")}
        aria-label="Driver licence expiry date"
        title="Driver licence expiry date"
      />
      <input
        type="text"
        placeholder="Address"
        value={value.address}
        onChange={(e) => {
          const next = e.target.value.slice(0, 160);
          if (ADDRESS_ALLOWED_PATTERN.test(next)) onChange({ address: next });
        }}
        maxLength={160}
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="City"
          value={value.city}
          onChange={(e) => {
            const next = e.target.value.slice(0, 80);
            if (LOCATION_ALLOWED_PATTERN.test(next)) onChange({ city: next });
          }}
          maxLength={80}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="State"
          value={value.state}
          onChange={(e) => {
            const next = e.target.value.slice(0, 80);
            if (LOCATION_ALLOWED_PATTERN.test(next)) onChange({ state: next });
          }}
          maxLength={80}
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
            const val = e.target.value.slice(0, 10);
            if (POSTCODE_ALLOWED_PATTERN.test(val)) onChange({ postcode: val });
          }}
          maxLength={10}
          className={inputClass}
        />
      </div>
    </div>
  );
}

