import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Check, ChevronDown, ArrowLeft } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { normalizeDobToIso } from '@/lib/dob';
import { ProfileAvatarImage } from '@/components/common/profile-avatar-image';
import { useAuth } from '@/auth/context/auth-context';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useLocation, useNavigate } from 'react-router';

const profileFormInputClassName =
  'w-full bg-[#f2f4f8] border-0 rounded-[12px] px-4 py-4 text-[15px] text-[#2c3e50] placeholder:text-[#3f4254] focus:ring-1 focus:ring-[#0061e0] outline-none font-medium transition-shadow shadow-sm read-only:opacity-70';
const NAME_MAX_LENGTH = 50;
const MOBILE_MAX_LENGTH = 20;
const ADDRESS_MAX_LENGTH = 160;
const CITY_STATE_MAX_LENGTH = 80;
const POSTAL_CODE_MAX_LENGTH = 10;
const NAME_PATTERN = /^[a-zA-Z\s'-]+$/;
const POSTAL_CODE_PATTERN = /^[a-zA-Z0-9\s-]{3,10}$/;

function clampName(value: string): string {
  return value.slice(0, NAME_MAX_LENGTH);
}

function clampText(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

/** Module-level so React does not remount inputs every parent render (focus loss). */
function ProfileFormInput({
  placeholder,
  value,
  onChange,
  type = 'text',
  readOnly,
  maxLength,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      readOnly={readOnly}
      maxLength={maxLength}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={profileFormInputClassName}
    />
  );
}

export function EditProfileModal({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    profile,
    rcmProfile,
    apiProfile,
    profileBusy,
    updateProfile,
  } = useDashboardData();

  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [mobile, setMobile] = useState('');
  const [localAddress, setLocalAddress] = useState('');
  const [postalAddress, setPostalAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryId, setCountryId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('edit') === '1') {
      setOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (!open) return;
    const addr = rcmProfile?.address;
    const dash = apiProfile;
    setFirstName(
      clampName(rcmProfile?.first_name ?? dash?.first_name ?? user?.first_name ?? ''),
    );
    setLastName(
      clampName(rcmProfile?.last_name ?? dash?.last_name ?? user?.last_name ?? ''),
    );
    setMobile(clampText(rcmProfile?.mobile ?? dash?.phone ?? user?.phone ?? '', MOBILE_MAX_LENGTH));
    setLocalAddress(
      clampText(addr?.local_address ?? dash?.local_address ?? '', ADDRESS_MAX_LENGTH),
    );
    setPostalAddress(
      clampText(addr?.postal_address ?? dash?.postal_address ?? '', ADDRESS_MAX_LENGTH),
    );
    setCity(clampText(addr?.city ?? '', CITY_STATE_MAX_LENGTH));
    setState(clampText(addr?.state ?? '', CITY_STATE_MAX_LENGTH));
    setPostalCode(clampText(addr?.postal_code ?? '', POSTAL_CODE_MAX_LENGTH));
    let nextCountry =
      addr?.country_id != null && Number.isFinite(Number(addr.country_id))
        ? String(addr.country_id)
        : '';
    if (!nextCountry && rcmProfile?.countries?.length) {
      const def = rcmProfile.countries.find((c) => c.isdefault);
      if (def) nextCountry = String(def.id);
    }
    setCountryId(nextCountry);
    setDateOfBirth('');
  }, [open, rcmProfile, apiProfile, user]);

  const countries = rcmProfile?.countries ?? [];
  const email = rcmProfile?.email || profile.email || user?.email || '';

  const handleSubmit = async () => {
    const cleanedFirst = firstName.trim();
    const cleanedLast = lastName.trim();
    if (!cleanedFirst || !cleanedLast) {
      toast.error('First name and last name are required');
      return;
    }
    if (!mobile.trim()) {
      toast.error('Phone number is required');
      return;
    }
    const cleanedPostalCode = postalCode.trim();
    if (cleanedPostalCode) {
      if (cleanedPostalCode.startsWith('-') || !POSTAL_CODE_PATTERN.test(cleanedPostalCode)) {
        toast.error('Please enter a valid postal code.');
        return;
      }
    }
    if (cleanedFirst.length > NAME_MAX_LENGTH || cleanedLast.length > NAME_MAX_LENGTH) {
      toast.error(`Name cannot exceed ${NAME_MAX_LENGTH} characters.`);
      return;
    }
    if (!NAME_PATTERN.test(cleanedFirst) || !NAME_PATTERN.test(cleanedLast)) {
      toast.error("Name can only contain letters, spaces, hyphens, and apostrophes.");
      return;
    }
    try {
      const idNum = countryId ? Number(countryId) : 0;
      const selected = countries.find((c) => c.id === idNum);

      let dateOfBirthPayload: string | undefined;
      const dobRaw = dateOfBirth.trim();
      if (dobRaw) {
        const iso = normalizeDobToIso(dobRaw);
        if (!iso) {
          toast.error(
            'Please enter a valid date of birth (YYYY-MM-DD or DD/MM/YYYY).',
          );
          return;
        }
        dateOfBirthPayload = iso;
      }

      await updateProfile({
        first_name: cleanedFirst,
        last_name: cleanedLast,
        full_name: `${cleanedFirst} ${cleanedLast}`.trim(),
        mobile: mobile.trim(),
        local_address: localAddress.trim(),
        postal_address: postalAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: cleanedPostalCode,
        country_id: idNum,
        country: selected?.country?.trim() || '',
        date_of_birth: dateOfBirthPayload,
      });
      toast.success('Profile updated');
      setOpen(false);
      const params = new URLSearchParams(location.search);
      if (params.get('edit') === '1') {
        params.delete('edit');
        navigate(
          {
            pathname: location.pathname,
            search: params.toString() ? `?${params.toString()}` : '',
          },
          { replace: true },
        );
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Update failed';
      if (/400|422|required|validation/i.test(raw)) {
        toast.error(`Please fix the highlighted profile fields: ${raw}`);
      } else if (/401|403|unauthor/i.test(raw)) {
        toast.error('Your session expired. Please sign in again and retry.');
      } else {
        toast.error(raw);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className="max-w-md w-full p-0 gap-0 overflow-hidden bg-[#f8f9fa] border-0 sm:rounded-[16px] pb-4"
        showCloseButton={false}
      >
        <div className="flex items-center p-4 pt-6 bg-[#f8f9fa]">
          <DialogClose className="p-2 -ml-2 text-black hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </DialogClose>
          <DialogTitle className="flex-1 text-center font-extrabold text-[20px] text-black pr-8">
            Edit Profile
          </DialogTitle>
        </div>
        <DialogDescription className="sr-only">
          Update your name, contact details, and postal address. Use the buttons below
          to save or go back.
        </DialogDescription>

        <div className="px-5 pb-6 overflow-y-auto max-h-[85vh]">
          <div className="flex items-center gap-4 mt-4 mb-8">
            <div className="size-[72px] shrink-0 overflow-hidden rounded-full border border-gray-100 shadow-sm bg-muted">
              <ProfileAvatarImage
                src={profile.avatarUrl}
                fallbackLabel={profile.displayName}
                alt="Profile"
                className="size-full object-cover"
                fallbackClassName="size-full"
              />
            </div>
            <span className="text-[#8692a6] text-[13px] leading-snug">
              Change your profile photo from the Personal Info card.
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  maxLength={NAME_MAX_LENGTH}
                  onChange={(e) => {
                    const next = clampName(e.target.value);
                    setFirstName(next);
                    const trimmed = next.trim();
                    if (trimmed.length > NAME_MAX_LENGTH) {
                      setFirstNameError('Name cannot exceed 50 characters.');
                    } else if (trimmed && !NAME_PATTERN.test(trimmed)) {
                      setFirstNameError(
                        "Name can only contain letters, spaces, hyphens, and apostrophes.",
                      );
                    } else {
                      setFirstNameError(null);
                    }
                  }}
                  className={profileFormInputClassName}
                />
                {firstName.length >= Math.max(1, NAME_MAX_LENGTH - 2) ? (
                  <p className="text-[11px] text-[#8692a6]">
                    {firstName.length}/{NAME_MAX_LENGTH} (Max {NAME_MAX_LENGTH} characters)
                  </p>
                ) : null}
                {firstNameError ? (
                  <p className="text-[12px] text-destructive">{firstNameError}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  maxLength={NAME_MAX_LENGTH}
                  onChange={(e) => {
                    const next = clampName(e.target.value);
                    setLastName(next);
                    const trimmed = next.trim();
                    if (trimmed.length > NAME_MAX_LENGTH) {
                      setLastNameError('Name cannot exceed 50 characters.');
                    } else if (trimmed && !NAME_PATTERN.test(trimmed)) {
                      setLastNameError(
                        "Name can only contain letters, spaces, hyphens, and apostrophes.",
                      );
                    } else {
                      setLastNameError(null);
                    }
                  }}
                  className={profileFormInputClassName}
                />
                {lastName.length >= Math.max(1, NAME_MAX_LENGTH - 2) ? (
                  <p className="text-[11px] text-[#8692a6]">
                    {lastName.length}/{NAME_MAX_LENGTH} (Max {NAME_MAX_LENGTH} characters)
                  </p>
                ) : null}
                {lastNameError ? (
                  <p className="text-[12px] text-destructive">{lastNameError}</p>
                ) : null}
              </div>
            </div>
            <ProfileFormInput
              placeholder="Email"
              value={email}
              onChange={() => { }}
              readOnly
            />
            <ProfileFormInput
              placeholder="Phone (with country code)"
              value={mobile}
              onChange={(v) => setMobile(clampText(v, MOBILE_MAX_LENGTH))}
              maxLength={MOBILE_MAX_LENGTH}
            />
            <div className="flex flex-col gap-1">
              <input
                type="text"
                placeholder="Date of birth (YYYY-MM-DD or DD/MM/YYYY)"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                onBlur={() => {
                  const t = dateOfBirth.trim();
                  if (!t) return;
                  const iso = normalizeDobToIso(t);
                  if (iso) setDateOfBirth(iso);
                }}
                className={profileFormInputClassName}
                autoComplete="bday"
                aria-label="Date of birth"
              />
              <p className="text-[11px] text-[#8692a6] px-1">
                Optional. Recognised formats are normalized when you leave the field; the server receives a standard date
                string.
              </p>
            </div>
          </div>

          <h2 className="text-[#8692a6] font-bold text-[14px] uppercase tracking-wide mb-3 mt-8">
            ADDRESS
          </h2>

          <div className="flex flex-col gap-3">
            <ProfileFormInput
              placeholder="Local address"
              value={localAddress}
              onChange={(v) => setLocalAddress(clampText(v, ADDRESS_MAX_LENGTH))}
              maxLength={ADDRESS_MAX_LENGTH}
            />
            <p className="text-[11px] text-[#8692a6] px-1 -mt-2">
              Local address: {localAddress.length}/{ADDRESS_MAX_LENGTH}
            </p>
            <ProfileFormInput
              placeholder="Postal address"
              value={postalAddress}
              onChange={(v) => setPostalAddress(clampText(v, ADDRESS_MAX_LENGTH))}
              maxLength={ADDRESS_MAX_LENGTH}
            />
            <p className="text-[11px] text-[#8692a6] px-1 -mt-2">
              Postal address: {postalAddress.length}/{ADDRESS_MAX_LENGTH}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <ProfileFormInput
                placeholder="City"
                value={city}
                onChange={(v) => setCity(clampText(v, CITY_STATE_MAX_LENGTH))}
                maxLength={CITY_STATE_MAX_LENGTH}
              />
              <ProfileFormInput
                placeholder="State"
                value={state}
                onChange={(v) => setState(clampText(v, CITY_STATE_MAX_LENGTH))}
                maxLength={CITY_STATE_MAX_LENGTH}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative w-full">
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full bg-[#f2f4f8] border-0 rounded-[12px] px-4 py-4 text-[15px] text-[#2c3e50] focus:ring-1 focus:ring-[#0061e0] outline-none font-medium flex items-center justify-between shadow-sm transition-all text-left"
                    >
                      <span className="truncate">
                        {countries.find((c) => String(c.id) === countryId)?.country || 'Country'}
                      </span>
                      <ChevronDown className={cn("w-4 h-4 opacity-50 transition-transform", comboboxOpen && "rotate-180")} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border border-gray-100 shadow-xl rounded-[12px] overflow-hidden" align="start">
                    <Command className="w-full">
                      <CommandInput placeholder="Search country..." className="border-none" />
                      <CommandList className="max-h-[250px] overflow-y-auto">
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {countries.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.country}
                              onSelect={() => {
                                setCountryId(String(c.id));
                                setComboboxOpen(false);
                              }}
                              className="px-4 py-3 flex items-center justify-between cursor-pointer data-[selected=true]:bg-gray-50"
                            >
                              <span className="truncate">{c.country}</span>
                              {String(c.id) === countryId && <Check className="w-4 h-4 text-[#0061e0] shrink-0" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <ProfileFormInput
                placeholder="Post code"
                value={postalCode}
                onChange={(v) => {
                  setPostalCode(clampText(v, POSTAL_CODE_MAX_LENGTH));
                }}
                maxLength={POSTAL_CODE_MAX_LENGTH}
              />
            </div>
          </div>

          <div className="mt-10 mb-2 flex flex-col gap-4">
            <Button
              type="button"
              className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-7 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.1)] cursor-pointer"
              disabled={profileBusy}
              onClick={() => void handleSubmit()}
            >
              {profileBusy ? 'Saving...' : 'Submit'}
            </Button>

            <DialogClose asChild>
              <button
                type="button"
                className="text-center w-full text-[#8692a6] font-semibold text-[15px] hover:text-black transition-colors py-2 cursor-pointer"
              >
                Go Back
              </button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
