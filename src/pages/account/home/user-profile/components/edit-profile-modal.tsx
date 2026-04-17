import React, { useEffect, useRef, useState } from 'react';
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
import { ProfileAvatarImage } from '@/components/common/profile-avatar-image';
import { useAuth } from '@/auth/context/auth-context';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { toAbsoluteUrl } from '@/lib/helpers';

const profileFormInputClassName =
  'w-full bg-[#f2f4f8] border-0 rounded-[12px] px-4 py-4 text-[15px] text-[#2c3e50] placeholder:text-[#3f4254] focus:ring-1 focus:ring-[#0061e0] outline-none font-medium transition-shadow shadow-sm read-only:opacity-70';

/** Module-level so React does not remount inputs every parent render (focus loss). */
function ProfileFormInput({
  placeholder,
  value,
  onChange,
  type = 'text',
  readOnly,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      readOnly={readOnly}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={profileFormInputClassName}
    />
  );
}

export function EditProfileModal({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const {
    profile,
    rcmProfile,
    apiProfile,
    profileBusy,
    updateProfile,
    uploadProfilePicture,
    deleteProfilePicture,
  } = useDashboardData();

  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [localAddress, setLocalAddress] = useState('');
  const [postalAddress, setPostalAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryId, setCountryId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const addr = rcmProfile?.address;
    const dash = apiProfile;
    setFirstName(rcmProfile?.first_name ?? dash?.first_name ?? user?.first_name ?? '');
    setLastName(rcmProfile?.last_name ?? dash?.last_name ?? user?.last_name ?? '');
    setMobile(rcmProfile?.mobile ?? dash?.phone ?? user?.phone ?? '');
    setLocalAddress(addr?.local_address ?? dash?.local_address ?? '');
    setPostalAddress(addr?.postal_address ?? dash?.postal_address ?? '');
    setCity(addr?.city ?? '');
    setState(addr?.state ?? '');
    setPostalCode(addr?.postal_code ?? '');
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
    setDriverLicense('');
  }, [open, rcmProfile, apiProfile, user]);

  const countries = rcmProfile?.countries ?? [];
  const email = rcmProfile?.email || profile.email || user?.email || '';
  const avatarSrc =
    profile.avatarUrl || toAbsoluteUrl('/media/avatars/blank.png');

  const handleSubmit = async () => {
    try {
      const idNum = countryId ? Number(countryId) : 0;
      const selected = countries.find((c) => c.id === idNum);
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName} ${lastName}`.trim(),
        mobile: mobile.trim(),
        local_address: localAddress.trim(),
        postal_address: postalAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        country_id: idNum,
        country: selected?.country?.trim() || '',
        date_of_birth: dateOfBirth.trim() || undefined,
        driver_license_number: driverLicense.trim() || undefined,
      });
      toast.success('Profile updated');
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
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
          <div className="flex items-center gap-5 mt-4 mb-8">
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden shrink-0 border border-gray-100 shadow-sm relative bg-muted">
              {profile.avatarUrl ? (
                <ProfileAvatarImage
                  src={profile.avatarUrl}
                  fallbackLabel={profile.displayName}
                  alt="Profile"
                  className="size-full object-cover"
                  fallbackClassName="size-full"
                />
              ) : (
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="size-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[#8692a6] text-[13px] leading-tight">
                Upload jpg or png format image
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try {
                    await uploadProfilePicture(f);
                    toast.success('Photo updated');
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Upload failed');
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-[#0061e0] hover:bg-[#0051ba] text-white font-medium px-4 py-2 h-9 rounded-[6px] w-fit shadow-sm"
                  disabled={profileBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  Change Picture
                </Button>
                {profile.avatarUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={profileBusy}
                    onClick={async () => {
                      try {
                        await deleteProfilePicture();
                        toast.success('Photo removed');
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : 'Remove failed',
                        );
                      }
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <ProfileFormInput
                placeholder="First name"
                value={firstName}
                onChange={setFirstName}
              />
              <ProfileFormInput
                placeholder="Last name"
                value={lastName}
                onChange={setLastName}
              />
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
              onChange={setMobile}
            />
            <ProfileFormInput
              placeholder="Date of birth (YYYY-MM-DD)"
              value={dateOfBirth}
              onChange={setDateOfBirth}
            />
            <ProfileFormInput
              placeholder="Driver licence number"
              value={driverLicense}
              onChange={setDriverLicense}
            />
          </div>

          <h2 className="text-[#8692a6] font-bold text-[14px] uppercase tracking-wide mb-3 mt-8">
            ADDRESS
          </h2>

          <div className="flex flex-col gap-3">
            <ProfileFormInput
              placeholder="Local address"
              value={localAddress}
              onChange={setLocalAddress}
            />
            <ProfileFormInput
              placeholder="Postal address"
              value={postalAddress}
              onChange={setPostalAddress}
            />

            <div className="grid grid-cols-2 gap-3">
              <ProfileFormInput placeholder="City" value={city} onChange={setCity} />
              <ProfileFormInput placeholder="State" value={state} onChange={setState} />
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
                  if (/^\d*$/.test(v)) setPostalCode(v);
                }}
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
              Submit
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
