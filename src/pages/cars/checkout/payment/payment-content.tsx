import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';

export function CarsCheckoutPaymentContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { booking, formData, carData, searchParams, locations } = location.state || {};

  return (
    <div className="flex flex-col h-full bg-white relative max-w-[600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white sticky top-0 z-10">

        <h1 className="text-[18px] font-extrabold text-black">Verify Card</h1>
        <div className="w-10"></div> {/* Spacer for center alignment */}
      </div>

      <div className="flex-1 w-full p-6 flex flex-col gap-6">

        {/* Reservation Number */}
        <div className="flex items-center gap-2">
          <span className="text-[#6b7280] text-[14px]">Reservation #:</span>
          <span className="text-[#0061e0] font-bold text-[14px]">{booking?.rcm_reservation_no || booking?.booking_id || "1815075CA249B36"}</span>
        </div>

        {/* Info Box */}
        <div className="bg-[#fff8d6] border border-[#ffec99] rounded-[8px] p-5 text-center shadow-sm">
          <p className="text-[14px] text-[#6b5212] leading-relaxed">
            You card won't be charged. We only take payment at the time of pickup
          </p>
        </div>

        {/* Payment Form Placeholder representing Windcave iFrame contents */}
        <div className="flex flex-col gap-5 mt-4">
          <div className="flex items-center justify-between pb-2 border-b border-transparent">
            <h2 className="text-[16px] text-black font-medium">Secure Credit Card Payment</h2>
            <div className="flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-5" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5" />
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] text-[#6b7280]">Card Number *</label>
              <input
                type="text"
                className="w-full bg-white text-[#333] border border-gray-200 rounded-[8px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] text-[#6b7280]">Name On Card *</label>
              <input
                type="text"
                className="w-full bg-white text-[#333] border border-gray-200 rounded-[8px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] text-[#6b7280]">Expiry Date *</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <select className="w-full bg-white text-[#6b7280] border border-gray-200 rounded-[8px] px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0061e0]">
                    <option value="" disabled selected>MM</option>
                    <option value="01">01</option>
                    <option value="02">02</option>
                    <option value="03">03</option>
                    <option value="04">04</option>
                    <option value="05">05</option>
                    <option value="06">06</option>
                    <option value="07">07</option>
                    <option value="08">08</option>
                    <option value="09">09</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#6b7280]">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                <div className="relative">
                  <select className="w-full bg-white text-[#6b7280] border border-gray-200 rounded-[8px] px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0061e0]">
                    <option value="" disabled selected>YY</option>
                    <option value="25">25</option>
                    <option value="26">26</option>
                    <option value="27">27</option>
                    <option value="28">28</option>
                    <option value="29">29</option>
                    <option value="30">30</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#6b7280]">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] text-[#6b7280]">CVC *</label>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  className="flex-1 bg-white text-[#333] border border-gray-200 rounded-[8px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0]"
                />
                <a href="#" className="text-[#dc2626] text-[14px] hover:underline whitespace-nowrap min-w-[80px]">
                  What is<br />CVC?
                </a>
              </div>
            </div>

          </div>

          {/* Customer Information Section */}
          <div className="flex flex-col gap-4 mt-2">
            <h3 className="text-[15px] text-[#6b7280]">Customer Information</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] text-[#6b7280]">Email *</label>
              <input
                type="email"
                defaultValue={formData?.email || ""}
                className="w-full bg-white text-[#333] border border-gray-200 rounded-[8px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0061e0]"
              />
            </div>
          </div>
        </div>
        {/* Footer Buttons */}
        <div className="   flex flex-col items-center gap-4 mt-4">
          <Button
            className="w-full rounded-[4px] py-6 bg-[#e31b23] hover:bg-[#c9181f] text-white font-bold text-[16px]"
            onClick={() => navigate('/cars/checkout/success', { state: { booking, formData, carData, searchParams, locations } })}
          >
            Submit
          </Button>
          <button
            onClick={() => navigate(-1)}
            className="text-[#6b7280] font-medium text-[15px] hover:text-black cursor-pointer bg-transparent border-none"
          >
            Cancel
          </button>
        </div>
      </div>



    </div>
  );
}
