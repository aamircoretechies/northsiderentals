import { ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { carsService } from '@/services/cars';
import {
  buildCreateBookingPayload,
  mapUiExtrasToPayload,
  parseTravellerCount,
  licenseCountryToId,
} from '@/services/booking-payload';
import type { CarCardProps } from '@/pages/cars/search-results-grid/components/car-card';
import { getFriendlyError } from '@/utils/api-error-handler';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useAuth } from '@/auth/context/auth-context';

type SearchParams = Record<string, unknown> | undefined;

interface EmailQuoteModalProps {
  trigger: ReactNode;
  carData?: CarCardProps;
  searchParams?: SearchParams;
  extras?: Array<{
    id: string;
    type?: string;
    selected?: boolean;
    quantity?: number;
  }>;
  selectedDamageOption?: string;
}

export function EmailQuoteModal({
  trigger,
  carData,
  searchParams,
  extras,
  selectedDamageOption,
}: EmailQuoteModalProps) {
  const { user } = useAuth();
  const { profile, apiProfile, rcmProfile } = useDashboardData();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState('');
  const [note, setNote] = useState('');
  const quoteCountryId = licenseCountryToId(
    String(
      rcmProfile?.countryid ??
        apiProfile?.countryid ??
        apiProfile?.country_id ??
        '',
    ),
  );

  const applyProfilePrefill = () => {
    setFirstName(
      String(rcmProfile?.first_name ?? apiProfile?.first_name ?? user?.first_name ?? '').trim(),
    );
    setLastName(
      String(rcmProfile?.last_name ?? apiProfile?.last_name ?? user?.last_name ?? '').trim(),
    );
    setEmail(String(rcmProfile?.email ?? profile.email ?? user?.email ?? '').trim());
    setPhone(String(rcmProfile?.mobile ?? apiProfile?.phone ?? user?.phone ?? '').trim());
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setNumberOfPeople('');
    setNote('');
  };

  useEffect(() => {
    if (!open) return;
    applyProfilePrefill();
  }, [open, rcmProfile, apiProfile, profile.email, user]);

  const handleSubmit = async () => {
    if (!carData || carData.unavailable || !searchParams) {
      toast.error('Missing vehicle or search details. Please start from car search.');
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Please enter your first name, last name, and email.');
      return;
    }

    const sp = searchParams as Record<string, string | number | undefined>;
    const categoryFromSearch = parseInt(String(sp.category_id ?? '0'), 10);
    const categoryId =
      categoryFromSearch > 0
        ? categoryFromSearch
        : parseInt(String(carData.vehiclecategorytypeid ?? '0'), 10) || 0;

    const insuranceId =
      selectedDamageOption && selectedDamageOption !== 'std'
        ? parseInt(selectedDamageOption, 10)
        : 0;

    const payload = buildCreateBookingPayload({
      bookingType: 'Quotation',
      vehicle_id: parseInt(String(carData.id), 10),
      category_id: categoryId,
      pickup_location_id: parseInt(String(sp.pickup_location_id ?? '0'), 10),
      dropoff_location_id: parseInt(String(sp.dropoff_location_id ?? '0'), 10),
      pickup_date: String(sp.pickup_date ?? ''),
      pickup_time: String(sp.pickup_time ?? ''),
      dropoff_date: String(sp.dropoff_date ?? ''),
      dropoff_time: String(sp.dropoff_time ?? ''),
      age_id: parseInt(String(sp.age_id ?? '0'), 10),
      campaigncode: String(
        sp.campaigncode ?? sp.promocode ?? sp.couponcode ?? '',
      ),
      customer_details: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || '',
        date_of_birth: '',
        driver_license_number: '',
        country_id: quoteCountryId,
      },
      number_of_persons: parseTravellerCount(numberOfPeople || '1'),
      insurance_id: Number.isFinite(insuranceId) ? insuranceId : 0,
      extra_fees: mapUiExtrasToPayload(extras ?? []),
      extradriver: [],
      remark: note.trim(),
      comments: note.trim(),
      flightin: '',
      flightout: '',
      arrivalpoint: '',
      departurepoint: '',
      newsletter: true,
      transmission: 1,
      rateperiod_typeid: carData.rateperiod_typeid ?? 1,
    });

    setSubmitting(true);
    try {
      await carsService.createBooking(payload);
      toast.success('Quote request sent. Check your email for details.');
      resetForm();
      setOpen(false);
    } catch (e: unknown) {
      toast.error(getFriendlyError(e, 'Could not send quote request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-w-[500px] w-full p-0 gap-0 overflow-hidden bg-white border-0 sm:rounded-[24px]"
      >
        <div className="flex flex-col h-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center px-6 py-5 sticky top-0 bg-white z-10 border-b border-gray-100">
            <button
              type="button"
              className="p-1 cursor-pointer hover:bg-gray-50 rounded-full"
              onClick={() => setOpen(false)}
            >
              <ArrowLeft size={24} className="text-black" />
            </button>
            <DialogTitle className="flex-1 text-center text-[20px] font-bold text-black pr-8">
              Email quote
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Request a quotation by email. Enter your contact details and submit.
          </DialogDescription>

          <div className="flex flex-col px-6 py-6 flex-1">
            <h3 className="text-[#8692a6] font-bold text-[13px] uppercase tracking-wide mb-5">
              Customer details
            </h3>

            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 text-[15px] font-medium text-black placeholder:text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors"
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 text-[15px] font-medium text-black placeholder:text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 text-[15px] font-medium text-black placeholder:text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors"
              />
              <input
                type="tel"
                placeholder="Phone (digits only)"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) setPhone(val);
                }}
                className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 text-[15px] font-medium text-black placeholder:text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors"
              />

              <div className="relative">
                <select
                  value={numberOfPeople}
                  onChange={(e) => setNumberOfPeople(e.target.value)}
                  className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 pr-12 text-[15px] font-medium text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    Number of people traveling
                  </option>
                  <option value="1">1 person</option>
                  <option value="2">2 people</option>
                  <option value="3">3 people</option>
                  <option value="4">4 people</option>
                  <option value="5+">5+ people</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown size={20} className="text-[#8692a6]" />
                </div>
              </div>

              <textarea
                placeholder="Add a note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-[#f4f7fa] rounded-[12px] px-5 py-4 text-[15px] font-medium text-black placeholder:text-[#8692a6] outline-none border border-transparent focus:border-[#0061e0] transition-colors min-h-[120px] resize-none"
              />
            </div>

            <div className="mt-8 flex flex-col gap-4">
              <Button
                type="button"
                className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-7 rounded-full shadow-md transition-colors disabled:opacity-60"
                onClick={() => void handleSubmit()}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin" />
                    Sending…
                  </span>
                ) : (
                  'Submit quote request'
                )}
              </Button>
              <button
                type="button"
                className="w-full text-center text-[#6b7280] font-medium text-[16px] py-3 hover:text-black transition-colors"
                onClick={() => setOpen(false)}
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
