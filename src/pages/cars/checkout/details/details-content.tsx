import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

export function CarsCheckoutDetailsContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { carData, extras, selectedDamageOption, searchParams, locations } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [termsData, setTermsData] = useState<{ title: string; content: string } | null>(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [noticeData, setNoticeData] = useState<{ title: string; content: string } | null>(null);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    numberOfPeople: '1',
    dob: '',
    licenseNumber: '',
    licenseCountry: 'Australia',
    licenseExpiry: '',
    licenseState: 'Australia',
    areaOfUse: '',
    address: '',
    city: '',
    stateRegion: '',
    postCode: '',
    note: '',
    flightin: '',
    flightout: '',
    arrivalpoint: '',
    departurepoint: '',
  });
  const [newsletter, setNewsletter] = useState(true);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
    if (!agreed) {
      toast.error('Please agree to the Terms and Conditions.');
      return;
    }

    const missing: string[] = [];
    if (!formData.firstName.trim()) missing.push('first name');
    if (!formData.lastName.trim()) missing.push('last name');
    if (!formData.email.trim()) missing.push('email');
    if (!formData.phone.trim()) missing.push('phone');
    if (!formData.numberOfPeople?.trim()) missing.push('number of travellers');
    if (!formData.dob.trim()) missing.push('date of birth');
    if (!formData.licenseNumber.trim()) missing.push('licence number');
    if (missing.length > 0) {
      toast.error(`Please complete: ${missing.join(', ')}.`);
      return;
    }

    const sp = searchParams || {};
    const categoryFromSearch = parseInt(String(sp.category_id ?? '0'), 10);
    const categoryId =
      categoryFromSearch > 0
        ? categoryFromSearch
        : parseInt(String(carData?.vehiclecategorytypeid ?? '0'), 10) || 0;

    const insuranceId =
      selectedDamageOption && selectedDamageOption !== 'std'
        ? parseInt(String(selectedDamageOption), 10)
        : 0;

    const note = formData.note.trim();
    const payload = buildCreateBookingPayload({
      bookingType: 'Booking',
      vehicle_id: parseInt(String(carData?.id ?? '0'), 10),
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
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        date_of_birth: formatDobForApi(formData.dob),
        driver_license_number: formData.licenseNumber.trim(),
        country_id: licenseCountryToId(formData.licenseCountry),
      },
      number_of_persons: parseTravellerCount(formData.numberOfPeople),
      insurance_id: Number.isFinite(insuranceId) ? insuranceId : 0,
      extra_fees: mapUiExtrasToPayload(extras ?? []),
      extradriver: [],
      remark: note,
      comments: note,
      flightin: formData.flightin.trim(),
      flightout: formData.flightout.trim(),
      arrivalpoint: formData.arrivalpoint.trim(),
      departurepoint: formData.departurepoint.trim(),
      newsletter,
      transmission: 1,
      rateperiod_typeid: carData?.rateperiod_typeid ?? 1,
    });

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
        });
        paymentUrl = extractHostedPaymentUrl(paymentSession);
      }

      if (paymentUrl) {
        window.location.assign(paymentUrl);
        return;
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


        <div className="flex-1 w-full mx-auto p-4 sm:p-6 pb-32 flex flex-col gap-8 bg-white mt-0 rounded-[16px] shadow-sm mb-32">

          {/* Customer Details */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[#6b7280] font-bold text-[13px] tracking-wide uppercase">Customer Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone (with country code)"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />
              <div className="relative md:col-span-1">
                <span className="sr-only">Number of people traveling</span>
                <select
                  name="numberOfPeople"
                  value={formData.numberOfPeople}
                  onChange={handleChange}
                  className="w-full bg-[#f4f5f8] text-[#333] rounded-[12px] px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none pr-10"
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
                  className="w-full bg-[#f4f5f8] text-[#333] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>

              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="License Number"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />

              <div className="relative">
                <span className="absolute left-4 top-2 text-[10px] text-[#8e95a5] font-medium leading-tight z-10">License Issuing Country</span>
                <select name="licenseCountry" value={formData.licenseCountry} onChange={handleChange} className="w-full bg-[#f4f5f8] text-[#333] rounded-[12px] px-4 pt-5 pb-2 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none pr-10">
                  <option value="Australia">Australia</option>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                  <option value="Other">Other</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e95a5] mt-1">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <div className="relative flex flex-col gap-1">
                <label
                  htmlFor="licenseExpiry"
                  className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide"
                >
                  Licence expiry (optional)
                </label>
                <input
                  id="licenseExpiry"
                  type="date"
                  name="licenseExpiry"
                  value={formData.licenseExpiry}
                  onChange={handleChange}
                  className="w-full bg-[#f4f5f8] text-[#333] rounded-[12px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
                />
              </div>

              <div className="relative">
                <select name="licenseState" value={formData.licenseState} onChange={handleChange} className="w-full bg-[#f4f5f8] text-[#333] rounded-[12px] px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none pr-10">
                  <option value="Australia">Australia (Country)</option>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e95a5]">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <div className="relative">
                <select name="areaOfUse" value={formData.areaOfUse} onChange={handleChange} className="w-full bg-[#f4f5f8] text-[#8e95a5] rounded-[12px] px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none pr-10">
                  <option value="" disabled>Area of use</option>
                  <option value="metro">Metro</option>
                  <option value="regional">Regional</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e95a5]">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Address"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none md:col-span-3"
              />

              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />
              <input
                type="text"
                name="stateRegion"
                value={formData.stateRegion}
                onChange={handleChange}
                placeholder="State"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />
              <input
                type="text"
                name="postCode"
                value={formData.postCode}
                onChange={handleChange}
                placeholder="Post Code"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />

              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                placeholder="Comments / special requests (maps to remark & comments)"
                rows={4}
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none resize-none md:col-span-3"
              ></textarea>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-[#6b7280] font-bold text-[13px] tracking-wide uppercase">
              Travel details (optional)
            </h2>
            <p className="text-[13px] text-muted-foreground -mt-2">
              Flight and arrival information for the booking API when you have it.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="flightin"
                value={formData.flightin}
                onChange={handleChange}
                placeholder="Inbound flight (e.g. VB123)"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />
              <input
                type="text"
                name="flightout"
                value={formData.flightout}
                onChange={handleChange}
                placeholder="Outbound flight"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />
              <input
                type="text"
                name="arrivalpoint"
                value={formData.arrivalpoint}
                onChange={handleChange}
                placeholder="Arrival point"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />
              <input
                type="text"
                name="departurepoint"
                value={formData.departurepoint}
                onChange={handleChange}
                placeholder="Departure point"
                className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 px-1">
            <Checkbox
              id="newsletter"
              checked={newsletter}
              onCheckedChange={(checked) => setNewsletter(!!checked)}
              className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#0061e0] data-[state=checked]:border-[#0061e0]"
            />
            <label htmlFor="newsletter" className="text-[13px] text-gray-700 leading-tight">
              Email me news and offers from Northside Rentals
            </label>
          </div>

          {/* Notice & Terms */}
          <div className="flex flex-col gap-6 mt-4">
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
              <label htmlFor="terms" className="text-[13px] text-gray-700 leading-tight">
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[20px] font-bold text-black" dangerouslySetInnerHTML={{ __html: termsData?.title || 'Terms & Conditions' }} />
            </DialogHeader>
            <div className="mt-2 text-[14px] text-gray-700">
              {termsLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-[#0061e0]" />
                </div>
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: termsData?.content || '' }}
                  className="prose prose-sm max-w-none text-black [&>h1]:text-[20px] [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-[18px] [&>h2]:font-bold [&>h2]:mb-2 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:ml-5 [&>ul]:mb-4"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Notice Modal */}
        <Dialog open={isNoticeOpen} onOpenChange={setIsNoticeOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[20px] font-bold text-black" dangerouslySetInnerHTML={{ __html: noticeData?.title || 'Important Notice' }} />
            </DialogHeader>
            <div className="mt-2 text-[14px] text-gray-700">
              {noticeLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-[#0061e0]" />
                </div>
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: noticeData?.content || '' }}
                  className="prose prose-sm max-w-none text-black [&>h1]:text-[20px] [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-[18px] [&>h2]:font-bold [&>h2]:mb-2 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:ml-5 [&>ul]:mb-4"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
