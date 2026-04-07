import { useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { carsService } from '@/services/cars';

export function CarsCheckoutDetailsContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { carData, extras, selectedDamageOption, searchParams, locations } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    numberOfPeople: '',
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
    note: ''
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContinue = async () => {
    if (!agreed) {
      alert("Please agree to the Terms and Conditions.");
      return;
    }
    
    const payload = {
      vehicle_id: parseInt(carData?.id || '0'),
      category_id: parseInt(searchParams?.category_id || '0'),
      pickup_location_id: parseInt(searchParams?.pickup_location_id || '0'),
      dropoff_location_id: parseInt(searchParams?.dropoff_location_id || '0'),
      pickup_date: searchParams?.pickup_date || "2026-04-02",
      pickup_time: searchParams?.pickup_time || "10:00",
      dropoff_date: searchParams?.dropoff_date || "2026-04-09",
      dropoff_time: searchParams?.dropoff_time || "10:00",
      age_id: parseInt(searchParams?.age_id || '0'),
      number_of_persons: parseInt(formData.numberOfPeople || '1'),
      customer_details: {
        first_name: formData.firstName || "Customer",
        last_name: formData.lastName || "Name",
        email: formData.email || "test@example.com",
        phone: formData.phone || "+61400000000",
        date_of_birth: formData.dob || "01/Jan/1990",
        driver_license_number: formData.licenseNumber || "DLXXXX",
        country_id: 7
      },
      insurance_id: selectedDamageOption && selectedDamageOption !== 'std' ? parseInt(selectedDamageOption) : 0,
      extrakmsid: 0,
      transmission: 1,
      numbertravelling: parseInt(formData.numberOfPeople || '1'),
      emailoption: 1,
      referralid: 0,
      campaigncode: searchParams?.campaigncode || "",
      agentcode: "RCMAgent",
      agentname: "",
      agentemail: "",
      agentrefno: "",
      agentcollectedamount: 1,
      rental_source_id: 73,
      remark: formData.note,
      flightin: "",
      flightout: "",
      arrivalpoint: "",
      departurepoint: "",
      areaofuseid: 0,
      newsletter: true,
      refno: "",
      relocationspecialid: 1,
      packageid: 1,
      rateperiod_typeid: 1,
      urlid: 1,
      extra_fees: extras?.filter((e: any) => e.type === 'quantity' ? e.quantity > 0 : e.selected).map((e: any) => ({
        id: parseInt(e.id || '0'),
        qty: e.type === 'quantity' ? e.quantity : 1
      })) || [],
      extradriver: [],
      booking_type: "Booking",
      comments: formData.note
    };

    setLoading(true);
    try {
      const response = await carsService.createBooking(payload);
      navigate('/cars/checkout/payment', { state: { booking: response, formData, carData, searchParams, locations } });
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
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
            <div className="relative">
              <select name="numberOfPeople" value={formData.numberOfPeople} onChange={handleChange} className="w-full bg-[#f4f5f8] text-[#8e95a5] rounded-[12px] px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none pr-10">
                <option value="" disabled>Number of People Traveling</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5+">5+</option>
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
            <div className="relative">
              <input
                type="text"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                placeholder="Date of Birth"
                onFocus={(e) => (e.target.type = 'date')}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = 'text';
                }}
                className="w-full bg-[#f4f5f8] text-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none pr-10"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e95a5]">
                <Calendar size={18} />
              </div>
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

            <div className="relative">
              <input
                type="text"
                name="licenseExpiry"
                value={formData.licenseExpiry}
                onChange={handleChange}
                placeholder="License Expiry"
                onFocus={(e) => (e.target.type = 'date')}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = 'text';
                }}
                className="w-full bg-[#f4f5f8] text-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none pr-10"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e95a5]">
                <Calendar size={18} />
              </div>
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
              placeholder="Add a note"
              rows={4}
              className="w-full bg-[#f4f5f8] text-[#333] placeholder-[#8e95a5] rounded-[12px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#0061e0] border-none resize-none md:col-span-3"
            ></textarea>
          </div>
        </div>

        {/* Notice & Terms */}
        <div className="flex flex-col gap-6 mt-4">
          <div className="bg-[#fff8d6] border border-[#ffec99] rounded-[8px] p-4 text-center shadow-sm">
            <p className="text-[12px] text-[#8c6b1d] leading-tight font-medium">
              Please note: your reservation is not confirmed until you receive a confirmation email from Northside Rentals confirming your vehicle reservation is now booked.
            </p>
            <a href="#" className="text-[12px] text-[#6b5212] font-bold underline mt-2 block">
              See Important Notice
            </a>
          </div>

          <div className="flex items-start gap-3 px-1">
            <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(!!checked)} className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#0061e0] data-[state=checked]:border-[#0061e0]" />
            <label htmlFor="terms" className="text-[13px] text-gray-700 leading-tight">
              I have read and accept the <a href="#" className="text-[#0061e0]">Terms and Condition</a>
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

    </div>
  );
}
