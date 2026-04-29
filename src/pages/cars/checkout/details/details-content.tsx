import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { ContentLoader } from '@/components/common/content-loader';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { carsService } from '@/services/cars';
import { apiJson } from '@/utils/api-client';
import { getFriendlyError } from '@/utils/api-error-handler';

import {
  buildCreateBookingPayload,
  mapUiExtrasToPayload,
  parseTravellerCount,
  licenseCountryToId,
  formatDobForApi,
  extractHostedPaymentUrl,
  mergeCreateBookingForUiState,
} from '@/services/booking-payload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  type CheckoutAreaOfUseOption,
  type CheckoutCountryOption,
  extractCheckoutAreaOfUseOptions,
  extractCheckoutCountriesFromVehicleDetails,
  extractVehicleDetailsData,
  mapCheckoutCountryRow,
} from '@/lib/checkout-vehicle-details';

type CheckoutCountry = CheckoutCountryOption;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED_CHARS = /^[+()\-\s\d]+$/;
const NAME_PATTERN = /^[a-zA-Z\s'-]+$/;
const ADDRESS_ALLOWED_PATTERN = /^[a-zA-Z0-9\s,.'/#-]*$/;
const LOCATION_ALLOWED_PATTERN = /^[a-zA-Z0-9\s,.'-]*$/;
const POSTCODE_PATTERN = /^[a-zA-Z0-9\s-]{3,10}$/;
const FLIGHT_PATTERN = /^[a-zA-Z0-9-]{2,20}$/;
const FIELD_LIMITS: Record<string, number> = {
  firstName: 50,
  lastName: 50,
  email: 100,
  phone: 20,
  licenseNumber: 30,
  address: 160,
  city: 80,
  stateRegion: 80,
  postCode: 10,
  note: 500,
  flightin: 20,
  flightout: 20,
  arrivalpoint: 80,
  departurepoint: 80,
};

function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  const raw = phone.trim();
  if (!raw || !PHONE_ALLOWED_CHARS.test(raw)) return false;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function validateBookingCustomerForm(
  formData: Record<string, string>,
): string | null {
  const firstName = formData.firstName?.trim() ?? '';
  const lastName = formData.lastName?.trim() ?? '';
  const email = formData.email?.trim() ?? '';
  const phone = formData.phone?.trim() ?? '';
  const numberOfPeople = formData.numberOfPeople?.trim() ?? '';
  const dob = formData.dob?.trim() ?? '';
  const licenseNumber = formData.licenseNumber?.trim() ?? '';
  const address = formData.address?.trim() ?? '';
  const city = formData.city?.trim() ?? '';
  const stateRegion = formData.stateRegion?.trim() ?? '';
  const postCode = formData.postCode?.trim() ?? '';
  const licenseExpiry = formData.licenseExpiry?.trim() ?? '';
  const flightin = formData.flightin?.trim() ?? '';
  const flightout = formData.flightout?.trim() ?? '';
  const arrivalpoint = formData.arrivalpoint?.trim() ?? '';
  const departurepoint = formData.departurepoint?.trim() ?? '';

  if (!firstName || !lastName) return 'First name and last name are required.';
  if (!NAME_PATTERN.test(firstName) || !NAME_PATTERN.test(lastName)) {
    return 'Name can only contain letters, spaces, hyphens, and apostrophes.';
  }
  if (!isValidEmail(email)) return 'Please enter a valid email address.';
  if (!isValidPhone(phone)) return 'Please enter a valid phone number.';
  if (!numberOfPeople) return 'Number of travellers is required.';
  if (!dob) return 'Date of birth is required.';
  if (!licenseNumber) return 'Licence number is required.';
  if (!licenseExpiry) return 'Licence expiry date is required.';
  if (!city) return 'City is required.';
  if (!stateRegion) return 'State is required.';
  if (!postCode) return 'Post code is required.';
  if (address && !ADDRESS_ALLOWED_PATTERN.test(address)) return 'Address contains invalid characters.';
  if (
    (city && !LOCATION_ALLOWED_PATTERN.test(city)) ||
    (stateRegion && !LOCATION_ALLOWED_PATTERN.test(stateRegion))
  ) {
    return 'City and state contain invalid characters.';
  }
  if (!POSTCODE_PATTERN.test(postCode)) return 'Please enter a valid post code.';
  if (flightin && !FLIGHT_PATTERN.test(flightin)) return 'Inbound flight format looks invalid.';
  if (flightout && !FLIGHT_PATTERN.test(flightout)) return 'Outbound flight format looks invalid.';
  if (arrivalpoint && !LOCATION_ALLOWED_PATTERN.test(arrivalpoint)) {
    return 'Arrival point contains invalid characters.';
  }
  if (departurepoint && !LOCATION_ALLOWED_PATTERN.test(departurepoint)) {
    return 'Departure point contains invalid characters.';
  }
  return null;
}

function normalizeCountriesFromNavigationState(raw: unknown): CheckoutCountry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => mapCheckoutCountryRow(row))
    .filter((x): x is CheckoutCountry => x != null);
}

function normalizeAreaOfUseFromNavigationState(raw: unknown): CheckoutAreaOfUseOption[] {
  if (!Array.isArray(raw)) return [];
  const out: CheckoutAreaOfUseOption[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = Number(r.id ?? 0);
    const label = String(r.label ?? r.areaofuse ?? r.area_of_use ?? '').trim();
    const locationid = Number(r.locationid ?? r.location_id ?? 0);
    if (!Number.isFinite(id) || id <= 0 || !label) continue;
    out.push({
      id,
      label,
      locationid: Number.isFinite(locationid) ? locationid : 0,
    });
  }
  return out;
}

export function CarsCheckoutDetailsContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, rcmProfile, apiProfile } = useDashboardData();

  const {
    carData,
    extras,
    selectedDamageOption,
    searchParams,
    locations,
    countries: countriesFromOptions = [],
    areaOfUseOptions: areaOfUseOptionsFromNav = [],
  } = (location.state || {}) as {
    carData?: any;
    extras?: any[];
    selectedDamageOption?: string;
    searchParams?: any;
    locations?: any[];
    countries?: CheckoutCountry[];
    areaOfUseOptions?: CheckoutAreaOfUseOption[];
  };

  const [countriesList, setCountriesList] = useState<CheckoutCountry[]>(() =>
    normalizeCountriesFromNavigationState(countriesFromOptions),
  );
  const [areaOfUseList, setAreaOfUseList] = useState<CheckoutAreaOfUseOption[]>(() =>
    normalizeAreaOfUseFromNavigationState(areaOfUseOptionsFromNav),
  );
  const [countriesLoading, setCountriesLoading] = useState(false);

  const useApiCountries = countriesList.length > 0;
  const useApiAreaOfUse = areaOfUseList.length > 0;

  useEffect(() => {
    if (countriesList.length > 0 && areaOfUseList.length > 0) return;
    const car = carData as Record<string, unknown> | undefined;
    const sp = (searchParams ?? {}) as Record<string, unknown>;
    if (car == null || car.id == null || car.id === '') return;
    if (
      sp.pickup_date == null ||
      sp.pickup_time == null ||
      sp.dropoff_date == null ||
      sp.dropoff_time == null ||
      sp.pickup_location_id == null ||
      sp.dropoff_location_id == null
    ) {
      return;
    }

    let cancelled = false;
    setCountriesLoading(true);
    void (async () => {
      try {
        const response = await carsService.getVehicleDetails({
          vehicle_reference: car.id as string | number,
          category_id: Number(sp.category_id) || 0,
          pickup_location_id: Number(sp.pickup_location_id),
          dropoff_location_id: Number(sp.dropoff_location_id),
          pickup_date: String(sp.pickup_date),
          pickup_time: String(sp.pickup_time),
          dropoff_date: String(sp.dropoff_date),
          dropoff_time: String(sp.dropoff_time),
          age_id: Number(sp.age_id) || 0,
        });
        if (cancelled) return;
        const data = extractVehicleDetailsData(response);
        if (countriesList.length === 0) {
          const list = extractCheckoutCountriesFromVehicleDetails(data);
          setCountriesList(list);
          if (list.length > 0) {
            const pick = String(list[0].id);
            setFormData((prev: any) => {
              const legacy = new Set(['']);
              const lic = prev.licenseCountry.trim();
              const st = prev.licenseState.trim();
              return {
                ...prev,
                licenseCountry: legacy.has(lic) ? pick : lic,
                licenseState: legacy.has(st) ? pick : st,
              };
            });
          }
        }
        if (areaOfUseList.length === 0) {
          const areas = extractCheckoutAreaOfUseOptions(
            data,
            Number(sp.pickup_location_id),
          );
          setAreaOfUseList(areas);
          if (areas.length > 0) {
            setFormData((prev: any) => {
              const current = prev.areaOfUse.trim();
              const valid =
                current &&
                areas.some((a) => String(a.id) === current);
              if (valid) return prev;
              return { ...prev, areaOfUse: String(areas[0].id) };
            });
          }
        }
      } catch {
        if (!cancelled) {
          if (countriesList.length === 0) setCountriesList([]);
          if (areaOfUseList.length === 0) setAreaOfUseList([]);
        }
      } finally {
        if (!cancelled) setCountriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [carData, searchParams, countriesList.length, areaOfUseList.length]);

  useEffect(() => {
    if (areaOfUseList.length === 0) return;
    setFormData((prev: any) => {
      const v = prev.areaOfUse.trim();
      if (v && areaOfUseList.some((a) => String(a.id) === v)) return prev;
      return { ...prev, areaOfUse: String(areaOfUseList[0].id) };
    });
  }, [areaOfUseList]);

  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(() => {
    try {
      return sessionStorage.getItem('checkout_agreed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('checkout_agreed', String(agreed));
    } catch (e) {
      console.error('Failed to persist agreed status', e);
    }
  }, [agreed]);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [termsData, setTermsData] = useState<{ title: string; content: string } | null>(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [noticeData, setNoticeData] = useState<{ title: string; content: string } | null>(null);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [formData, setFormData] = useState(() => {
    const fromNav = normalizeCountriesFromNavigationState(countriesFromOptions);
    const defaultCountry = fromNav.length > 0 ? String(fromNav[0].id) : '';
    const areaNav = normalizeAreaOfUseFromNavigationState(areaOfUseOptionsFromNav);
    const defaultArea = areaNav.length > 0 ? String(areaNav[0].id) : '';
    const defaults = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      numberOfPeople: '1',
      dob: '',
      licenseNumber: '',
      licenseCountry: defaultCountry,
      licenseExpiry: '',
      licenseState: defaultCountry,
      areaOfUse: defaultArea,
      address: '',
      city: '',
      stateRegion: '',
      postCode: '',
      note: '',
      flightin: '',
      flightout: '',
      arrivalpoint: '',
      departurepoint: '',
    };

    try {
      const saved = sessionStorage.getItem('checkout_form_data');
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to restore checkout form data', e);
    }
    return defaults;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('checkout_form_data', JSON.stringify(formData));
    } catch (e) {
      console.error('Failed to persist checkout form data', e);
    }
  }, [formData]);
  const [newsletter, setNewsletter] = useState(() => {
    try {
      const saved = sessionStorage.getItem('checkout_newsletter');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('checkout_newsletter', String(newsletter));
    } catch (e) {
      console.error('Failed to persist newsletter status', e);
    }
  }, [newsletter]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    const limit = FIELD_LIMITS[name];
    const nextValue =
      typeof limit === 'number' ? String(value ?? '').slice(0, limit) : value;
    setFormData((prev: any) => ({ ...prev, [name]: nextValue }));
  };

  useEffect(() => {
    const fullName = String(profile?.displayName ?? '').trim();
    const [firstFromDisplay = '', ...rest] = fullName.split(/\s+/).filter(Boolean);
    const lastFromDisplay = rest.join(' ');
    const addr = rcmProfile?.address;

    setFormData((prev: any) => ({
      ...prev,
      firstName:
        prev.firstName ||
        String(rcmProfile?.first_name ?? apiProfile?.first_name ?? firstFromDisplay).slice(0, FIELD_LIMITS.firstName),
      lastName:
        prev.lastName ||
        String(rcmProfile?.last_name ?? apiProfile?.last_name ?? lastFromDisplay).slice(0, FIELD_LIMITS.lastName),
      email:
        prev.email ||
        String(rcmProfile?.email ?? profile?.email ?? '').slice(0, FIELD_LIMITS.email),
      phone:
        prev.phone ||
        String(rcmProfile?.mobile ?? apiProfile?.phone ?? profile?.phone ?? '').slice(0, FIELD_LIMITS.phone),
      address:
        prev.address ||
        String(addr?.local_address ?? apiProfile?.local_address ?? '').slice(0, FIELD_LIMITS.address),
      city:
        prev.city ||
        String(addr?.city ?? '').slice(0, FIELD_LIMITS.city),
      stateRegion:
        prev.stateRegion ||
        String(addr?.state ?? '').slice(0, FIELD_LIMITS.stateRegion),
      postCode:
        prev.postCode ||
        String(addr?.postal_code ?? '').slice(0, FIELD_LIMITS.postCode),
    }));
  }, [profile, rcmProfile, apiProfile]);

  const openTermsModal = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsTermsOpen(true);
    if (!termsData) {
      setTermsLoading(true);
      try {
        const data = await apiJson<Record<string, unknown>>(
          'https://northsiderentals.com.au/wp-json/wp/v2/pages/10078',
          { method: 'GET', auth: 'none', fallbackError: 'Could not load terms and conditions.' },
        );
        setTermsData({
          title: ((data.title as Record<string, unknown> | undefined)?.rendered as string) || 'Terms & Conditions',
          content: ((data.content as Record<string, unknown> | undefined)?.rendered as string) || 'Content could not be loaded.'
        });
      } catch {
        setTermsData({
          title: 'Terms & Conditions',
          content: '<p>Failed to load terms and conditions.</p>'
        });
      } finally {
        setTermsLoading(false);
      }
    }
  };

  const openNoticeModal = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsNoticeOpen(true);
    if (!noticeData) {
      setNoticeLoading(true);
      try {
        const data = await apiJson<Record<string, unknown>>(
          'https://northsiderentals.com.au/wp-json/wp/v2/pages/10085',
          { method: 'GET', auth: 'none', fallbackError: 'Could not load important notice.' },
        );
        setNoticeData({
          title: ((data.title as Record<string, unknown> | undefined)?.rendered as string) || 'Important Notice',
          content: ((data.content as Record<string, unknown> | undefined)?.rendered as string) || 'Content could not be loaded.'
        });
      } catch {
        setNoticeData({
          title: 'Important Notice',
          content: '<p>Failed to load important notice.</p>'
        });
      } finally {
        setNoticeLoading(false);
      }
    }
  };

  const handleContinue = async () => {
    const car = (carData ?? {}) as Record<string, unknown>;
    const extrasList = (extras ?? []) as Array<{
      id: string;
      type?: string;
      selected?: boolean;
      quantity?: number;
    }>;

    if (!agreed) {
      toast.error('Please agree to the Terms and Conditions.');
      return;
    }

    const formError = validateBookingCustomerForm(formData as Record<string, string>);
    if (formError) {
      toast.error(formError);
      return;
    }

    const sp = searchParams || {};
    const categoryFromSearch = parseInt(String(sp.category_id ?? '0'), 10);
    const categoryId =
      categoryFromSearch > 0
        ? categoryFromSearch
        : parseInt(String(car?.vehiclecategorytypeid ?? '0'), 10) || 0;

    const insuranceId =
      selectedDamageOption && selectedDamageOption !== 'std'
        ? parseInt(String(selectedDamageOption), 10)
        : 0;

    const note = formData.note.trim();
    const licenseExpiresApi = formData.licenseExpiry.trim()
      ? formatDobForApi(formData.licenseExpiry)
      : '';
    const dobRaw = formData.dob.trim();
    const dobApi = formatDobForApi(dobRaw);
    const areaParsed = parseInt(String(formData.areaOfUse).trim(), 10);
    const areaofuseid =
      Number.isFinite(areaParsed) && areaParsed > 0 ? areaParsed : 0;

    const payload = buildCreateBookingPayload({
      bookingType: 'Booking',
      vehicle_id: parseInt(String(car?.id ?? '0'), 10),
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
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        firstname: formData.firstName.trim(),
        lastname: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        mobile: formData.phone.trim(),
        // Send both variants because different backend readers use different keys.
        date_of_birth: dobRaw,
        dateofbirth: dobApi,
        driver_license_number: formData.licenseNumber.trim(),
        licenseno: formData.licenseNumber.trim(),
        country_id: licenseCountryToId(formData.licenseCountry),
        address: formData.address.trim(),
        local_address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.stateRegion.trim(),
        postcode: formData.postCode.trim(),
        postal_code: formData.postCode.trim(),
        licenseexpires: licenseExpiresApi,
        license_expiry: licenseExpiresApi,
        licenseissued: formData.licenseState.trim(),
        license_state: formData.licenseState,
      },
      number_of_persons: parseTravellerCount(formData.numberOfPeople),
      insurance_id: Number.isFinite(insuranceId) ? insuranceId : 0,
      extra_fees: mapUiExtrasToPayload(extrasList),
      extradriver: [],
      remark: note,
      comments: note,
      flightin: formData.flightin.trim(),
      flightout: formData.flightout.trim(),
      arrivalpoint: formData.arrivalpoint.trim(),
      departurepoint: formData.departurepoint.trim(),
      newsletter,
      transmission: 1,
      rateperiod_typeid: Number(car?.rateperiod_typeid ?? 1) || 1,
      areaofuseid,
    });

    // Debug payload for backend reconciliation:
    // compare this exact request body with `rcm_booking_info.customerinfo` response.
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[CreateBooking] Outgoing payload', payload);
      // eslint-disable-next-line no-console
      console.log('[CreateBooking] customer_details subset', payload.customer_details);
    }

    setLoading(true);
    try {
      const response = await carsService.createBooking(payload);
      const booking = mergeCreateBookingForUiState(response);
      let paymentUrl = extractHostedPaymentUrl(response);
      const reservationRef = String(
        booking.rcm_reference_key ?? booking.reservation_ref ?? booking.reservationref ?? '',
      ).trim();

      if (!paymentUrl && reservationRef) {
        const paymentSession = await carsService.createPaymentSession({
          reservationref: reservationRef,
          return_url: `${window.location.origin}/bookings`,
          cancel_url: window.location.href,
        });
        paymentUrl = extractHostedPaymentUrl(paymentSession);
      }

      if (paymentUrl) {
        navigate('/cars/checkout/payment', {
          state: {
            paymentUrl,
            booking,
            formData,
            carData,
            searchParams,
            locations,
          },
        });
        return;
      }

      // Clear persistence on successful submission (before navigate)
      try {
        sessionStorage.removeItem('checkout_form_data');
        sessionStorage.removeItem('checkout_agreed');
        sessionStorage.removeItem('checkout_newsletter');
        sessionStorage.removeItem('checkout_nav_state');
      } catch (e) {
        console.error('Failed to clear checkout storage', e);
      }

      navigate('/cars/checkout/success', {
        state: {
          booking,
          formData,
          carData,
          searchParams,
          locations,
        },
      });
    } catch (e: unknown) {
      toast.error(getFriendlyError(e, 'Could not create booking.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="flex flex-col h-full relative mx-auto min-h-screen">
        {/* Header */}


        <div className="flex-1 w-full mx-auto p-4 sm:p-6 flex flex-col gap-8 bg-white mt-0 rounded-[16px] shadow-sm mb-32">

          {/* Customer Details */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[#6b7280] font-bold text-[13px] tracking-wide uppercase">Customer Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative flex flex-col gap-1">
                <label htmlFor="firstName" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>
              <div className="relative flex flex-col gap-1">
                <label htmlFor="lastName" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>
              <div className="relative flex flex-col gap-1">
                <label htmlFor="email" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  autoComplete="email"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>
              <div className="relative flex flex-col gap-1">
                <label htmlFor="phone" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (!next || PHONE_ALLOWED_CHARS.test(next)) {
                      setFormData((prev: any) => ({ ...prev, phone: next }));
                    }
                  }}
                  placeholder="Phone (with country code)"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={20}
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>
              <div className="relative flex flex-col gap-1 md:col-span-1">
                <label htmlFor="numberOfPeople" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">Number of travellers</label>
                <div className="relative">
                  <select
                    id="numberOfPeople"
                    name="numberOfPeople"
                    value={formData.numberOfPeople}
                    onChange={handleChange}
                    className="w-full bg-[#f4f5f8] text-[#333] rounded-[12px] px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none pr-10"
                  >
                    <option value="1">1 person</option>
                    <option value="2">2 people</option>
                    <option value="3">3 people</option>
                    <option value="4">4 people</option>
                    <option value="5+">5+ people</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e95a5]">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[#6b7280] font-bold text-[13px] tracking-wide uppercase">Additional Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative flex flex-col gap-1">
                <label
                  htmlFor="dob"
                  className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide"
                >
                  Date of birth
                </label>
                <input
                  id="dob"
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  onClick={(e) => (e.target as any).showPicker?.()}
                  className="w-full bg-[#f4f5f8] text-[#333] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none cursor-pointer"
                />
              </div>

              <div className="relative flex flex-col gap-1">
                <label htmlFor="licenseNumber" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">License Number</label>
                <input
                  id="licenseNumber"
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="License Number"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>

              <div className="relative flex flex-col gap-1">
                <label htmlFor="licenseCountry" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">
                  License Issuing Country
                  {countriesLoading ? (
                    <span className="ms-1 font-normal normal-case text-[#0061e0]">(loading…)</span>
                  ) : null}
                </label>
                <div className="relative">
                  <select
                    id="licenseCountry"
                    name="licenseCountry"
                    value={formData.licenseCountry}
                    onChange={handleChange}
                    disabled={countriesLoading}
                    className="w-full bg-[#f4f5f8] text-[#333] rounded-[12px] px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none pr-10 disabled:opacity-60"
                  >
                    {useApiCountries && !countriesLoading ? (
                      countriesList.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.country}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {countriesLoading ? 'Loading countries…' : 'No country options'}
                      </option>
                    )}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e95a5]">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="relative flex flex-col gap-1">
                <label
                  htmlFor="licenseExpiry"
                  className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide"
                >
                  Licence expiry
                </label>
                <input
                  id="licenseExpiry"
                  type="date"
                  name="licenseExpiry"
                  value={formData.licenseExpiry}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  onClick={(e) => (e.target as any).showPicker?.()}
                  className="w-full bg-[#f4f5f8] text-[#333] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none cursor-pointer"
                />
              </div>

              <div className="relative flex flex-col gap-1">
                <label htmlFor="licenseState" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">
                  License State/Country
                </label>
                <div className="relative">
                  <select
                    id="licenseState"
                    name="licenseState"
                    value={formData.licenseState}
                    onChange={handleChange}
                    disabled={countriesLoading}
                    className="w-full bg-[#f4f5f8] text-[#333] rounded-[12px] px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none pr-10 disabled:opacity-60"
                  >
                    {useApiCountries && !countriesLoading ? (
                      countriesList.map((c) => (
                        <option key={`st-${c.id}`} value={String(c.id)}>
                          {c.country}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {countriesLoading ? 'Loading countries…' : 'No country options'}
                      </option>
                    )}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e95a5]">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="relative flex flex-col gap-1">
                <label htmlFor="areaOfUse" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">
                  Area of use
                </label>
                <div className="relative">
                  <select
                    id="areaOfUse"
                    name="areaOfUse"
                    value={formData.areaOfUse}
                    onChange={handleChange}
                    disabled={countriesLoading && !useApiAreaOfUse}
                    className="w-full bg-[#f4f5f8] text-[#333] rounded-[12px] px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none pr-10 disabled:opacity-60"
                  >
                    {!useApiAreaOfUse ? (
                      <option value="" disabled>
                        {countriesLoading ? 'Loading options…' : 'Area options unavailable'}
                      </option>
                    ) : (
                      areaOfUseList.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.label}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e95a5]">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="relative flex flex-col gap-1 md:col-span-3">
                <label htmlFor="address" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">Address</label>
                <input
                  id="address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Address"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>

              <div className="relative flex flex-col gap-1">
                <label htmlFor="city" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">City</label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>
              <div className="relative flex flex-col gap-1">
                <label htmlFor="stateRegion" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">State</label>
                <input
                  id="stateRegion"
                  type="text"
                  name="stateRegion"
                  value={formData.stateRegion}
                  onChange={handleChange}
                  placeholder="State"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>
              <div className="relative flex flex-col gap-1">
                <label htmlFor="postCode" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">Post Code</label>
                <input
                  id="postCode"
                  type="text"
                  name="postCode"
                  value={formData.postCode}
                  onChange={handleChange}
                  placeholder="Post Code"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>

              <div className="relative flex flex-col gap-1 md:col-span-3">
                <label htmlFor="note" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">Comments / special requests</label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="Comments / special requests"
                  rows={4}
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          {/* <div className="flex flex-col gap-4">
            <h2 className="text-[#6b7280] font-bold text-[13px] tracking-wide uppercase">
              Travel details (optional)
            </h2>
            <p className="text-[13px] text-muted-foreground -mt-2">
              Flight and arrival information for the booking API when you have it.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative flex flex-col gap-1">
                <label htmlFor="flightin" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">Inbound flight</label>
                <input
                  id="flightin"
                  type="text"
                  name="flightin"
                  value={formData.flightin}
                  onChange={handleChange}
                  placeholder="Inbound flight (e.g. VB123)"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>
              <div className="relative flex flex-col gap-1">
                <label htmlFor="flightout" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">Outbound flight</label>
                <input
                  id="flightout"
                  type="text"
                  name="flightout"
                  value={formData.flightout}
                  onChange={handleChange}
                  placeholder="Outbound flight"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>
              <div className="relative flex flex-col gap-1">
                <label htmlFor="arrivalpoint" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">Arrival point</label>
                <input
                  id="arrivalpoint"
                  type="text"
                  name="arrivalpoint"
                  value={formData.arrivalpoint}
                  onChange={handleChange}
                  placeholder="Arrival point"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>
              <div className="relative flex flex-col gap-1">
                <label htmlFor="departurepoint" className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">Departure point</label>
                <input
                  id="departurepoint"
                  type="text"
                  name="departurepoint"
                  value={formData.departurepoint}
                  onChange={handleChange}
                  placeholder="Departure point"
                  className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>
            </div>
          </div> */}

          {/* <div className="flex items-start gap-3 px-1">
            <Checkbox
              id="newsletter"
              checked={newsletter}
              onCheckedChange={(checked) => setNewsletter(!!checked)}
              className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#0061e0] data-[state=checked]:border-[#0061e0]"
            />
            <label htmlFor="newsletter" className="text-[13px] text-gray-700 leading-tight" style={{ lineHeight: '24px' }}>
              Email me news and offers from Northside Rentals
            </label>
          </div> */}

          {/* Notice & Terms */}
          <div className="flex flex-col gap-6 mt-0">
            <div className="bg-[#fff8d6] border border-[#ffec99] rounded-[8px] p-4 text-center shadow-sm">
              <p className="text-[12px] text-[#8c6b1d] leading-tight font-medium">
                Please note: your reservation is not confirmed until you receive a confirmation email from Northside Rentals confirming your vehicle reservation is now booked.
              </p>
              <a href="#" onClick={openNoticeModal} className="text-[12px] text-[#6b5212] font-bold underline mt-2 block">
                See Important Notice
              </a>
            </div>

            <div className="flex items-start gap-3 px-1">
              <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(!!checked)} className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#0061e0] data-[state=checked]:border-[#0061e0]" />
              <label htmlFor="terms" className="text-[13px] text-gray-700 leading-tight" style={{ lineHeight: '24px' }}>
                I have read and accept the <a href="#" onClick={openTermsModal} className="text-[#0061e0]">Terms and Condition</a>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 sm:p-6 border-t border-gray-100 flex justify-center z-20">
          <div className="flex gap-4 w-full max-w-[1000px]">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1 rounded-full py-6 text-[#6b7280] font-bold text-[16px] border-gray-200 hover:bg-gray-50"
            >
              Go Back
            </Button>
            <Button
              className="flex-1 rounded-full py-6 bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] shadow-sm"
              onClick={handleContinue}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Continue'}
            </Button>
          </div>
        </div>

        {/* Terms Modal */}
        <Dialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
          <DialogContent
            /*  className="max-w-2xl max-h-[85vh]" */
            className="max-w-2xl max-h-[85vh] w-[calc(100%-2rem)] rounded-3xl p-4 pe-3 gap-0 overflow-hidden bg-[#f8f9fa] border-0 sm:rounded-[24px]"

          >

            <DialogHeader>
              <DialogTitle className="text-[16px] font-bold text-[#004a9f] max-w-[80%] text-left" dangerouslySetInnerHTML={{ __html: termsData?.title || 'Terms & Conditions' }} />
            </DialogHeader>
            <div className="mt-0 text-[14px] text-gray-700  overflow-y-auto pe-3">
              {termsLoading ? (
                <ContentLoader />
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: termsData?.content || '' }}
                  className="prose prose-sm max-w-none text-black [&>h1]:text-[20px] [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-[18px] [&>h2]:font-bold [&>h2]:mb-2 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:ml-5 [&>ul]:mb-4"
                />
              )}
              <Button className='bg-[#004a9f] w-full mt-4 h-[48px] rounded-full' onClick={() => setIsTermsOpen(false)}>Done</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notice Modal */}
        <Dialog open={isNoticeOpen} onOpenChange={setIsNoticeOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] w-[calc(100%-2rem)] p-4 pe-1 rounded-3xl gap-0 overflow-hidden bg-[#f8f9fa] border-0 sm:rounded-[24px]">
            <DialogHeader>
              <DialogTitle className="text-[16px] font-bold text-[#004a9f] text-left max-w-[80%]" dangerouslySetInnerHTML={{ __html: noticeData?.title || 'Important Notice' }} />
            </DialogHeader>
            <div className="mt-0 text-[14px] text-gray-700  overflow-y-auto pe-3">
              {noticeLoading ? (
                <ContentLoader />
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: noticeData?.content || '' }}
                  className="prose prose-sm max-w-none text-black [&>h1]:text-[20px] [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-[18px] [&>h2]:font-bold [&>h2]:mb-2 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:ml-5 [&>ul]:mb-4"
                />
              )}
              <Button className='bg-[#004a9f] w-full mt-4 h-[48px] rounded-full' onClick={() => setIsNoticeOpen(false)}>Done</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
