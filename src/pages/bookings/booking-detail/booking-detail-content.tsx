import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { RequestExtensionModal } from './components/request-extension-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function BookingDetailContent() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#f4f7fa] pb-[250px] relative lg:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button className="p-2 cursor-pointer hover:bg-gray-50 rounded-full -ml-2" onClick={() => navigate(-1)}>
            <ArrowLeft size={24} className="text-black" />
          </button>
        </div>
        <h1 className="text-[18px] font-extrabold text-black">Booking Details</h1>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="font-semibold text-[#0061e0] text-[15px] hover:underline cursor-pointer bg-transparent border-0 p-0">
                Self Service
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[260px] p-2 rounded-[16px]">
              <DropdownMenuItem className="py-4 px-4 focus:bg-gray-50 cursor-pointer rounded-[8px]">
                <span className="text-[18px] text-black tracking-tight" style={{ textDecoration: 'underline', textDecorationThickness: '1.5px', textUnderlineOffset: '4px' }}>Book Airport Shuttle</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="py-4 px-4 focus:bg-gray-50 cursor-pointer rounded-[8px]">
                <span className="text-[18px] text-black tracking-tight">Book PTV Inspection</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="py-4 px-4 focus:bg-gray-50 cursor-pointer rounded-[8px]">
                <span className="text-[18px] text-black tracking-tight" style={{ textDecoration: 'underline', textDecorationThickness: '1.5px', textUnderlineOffset: '4px' }}>Book A Service</span>
              </DropdownMenuItem>
              <RequestExtensionModal trigger={
                <DropdownMenuItem className="py-4 px-4 focus:bg-gray-50 cursor-pointer rounded-[8px]" onSelect={(e) => e.preventDefault()}>
                  <span className="text-[18px] text-black tracking-tight">Request Extension</span>
                </DropdownMenuItem>
              } />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
        
        {/* Reservation Number (Mobile Only Top) */}
        <div className="lg:hidden col-span-1 -mb-2">
          <span className="text-[#6b7280] text-[15px]">Reservation Number: </span>
          <span className="font-bold text-[#0061e0] text-[15px]">1815075CA249B36</span>
        </div>

        {/* Small Grid: Booking & Fee Summary (matches options page layout) */}
        <div className="col-span-1 flex flex-col gap-6 lg:order-last">
          {/* Reservation Number (Desktop Top) */}
          <div className="hidden lg:block -mb-2">
            <span className="text-[#6b7280] text-[15px]">Reservation Number: </span>
            <span className="font-bold text-[#0061e0] text-[15px]">1815075CA249B36</span>
          </div>

          {/* Booking Overview Card */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-[14px] font-bold text-[#6b7280] tracking-wide">BOOKING OVERVIEW</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#ffb700]"></div>
                <span className="text-[#ffb700] text-[14px] font-bold">Open</span>
              </div>
            </div>
            
            <div className="bg-white rounded-[12px] border border-gray-100 shadow-sm flex flex-col">
              {/* Car Info */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                <div className="w-[120px] h-[80px] sm:w-[140px] sm:h-[90px] shrink-0 bg-[#f8f9fc] rounded-[10px] flex items-center justify-center p-2">
                  <img src="https://cdn.pixabay.com/photo/2012/05/29/00/43/car-49278_1280.jpg" alt="Car" className="w-full h-full object-contain mix-blend-multiply" />
                </div>
                <div className="flex flex-col justify-center gap-0.5">
                  <h3 className="text-black font-extrabold text-[16px]">MG HS-Excite - 5 seater</h3>
                  <p className="text-[#6b7280] text-[13px]">Automatic, 2023 Model</p>
                  <p className="text-[#6b7280] text-[13px] mt-1">Booked on: 06/03/2026 10:01</p>
                </div>
              </div>

              {/* Grid Pick Return */}
              <div className="grid grid-cols-2 border-t border-gray-100">
                <div className="p-4 sm:p-5 flex flex-col gap-1 border-r border-gray-100">
                  <span className="text-[13px] text-[#6b7280]">Pickup:</span>
                  <p className="font-extrabold text-[14px] text-black">07/03/2026 9:00 AM</p>
                  <p className="text-[13px] text-[#6b7280]">Welshpool, Perth Airport</p>
                  <p className="text-[13px] text-[#6b7280]">Perth - 102121</p>
                </div>
                <div className="p-4 sm:p-5 flex flex-col gap-1">
                  <span className="text-[13px] text-[#6b7280]">Return:</span>
                  <p className="font-extrabold text-[14px] text-black">08/03/2026 9:00 AM</p>
                  <p className="text-[13px] text-[#6b7280]">Welshpool, Perth Airport</p>
                  <p className="text-[13px] text-[#6b7280]">Perth - 102121</p>
                </div>
              </div>

              {/* View Agreement */}
              <div className="border-t border-gray-100 p-4 flex justify-center items-center">
                <a href="#" className="font-medium text-[#0061e0] text-[14px] hover:underline">View Agreement</a>
              </div>
            </div>
          </div>

          {/* Desktop Summary Fixed in layout */}
          <div className="hidden lg:flex flex-col">
             <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-5 flex flex-col">
              <h3 className="text-[15px] font-bold text-[#6b7280] tracking-wide mb-4">RENTAL FEE SUMMARY</h3>
              
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[15px] text-black">Daily Rate (6 days @ $43 per day)</span>
                  <span className="text-[15px] font-bold text-black">$ 258.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[15px] text-black">Total Extras</span>
                  <span className="text-[15px] font-bold text-black">$ 10.00</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[15px] font-medium text-[#0061e0]">Total Cost</span>
                  <span className="text-[16px] font-bold text-[#0061e0]">$ 280.00</span>
                </div>
                <div className="flex justify-end">
                  <span className="text-[13px] text-[#6b7280]">(Inc. GST: $12.00)</span>
                </div>
              </div>
              
              <Button className="w-full mt-6 bg-[#ffb700] hover:bg-[#e5a400] text-black font-bold h-[48px] rounded-[8px] text-[16px]">
                Express Check-in
              </Button>
            </div>
          </div>
        </div>

        {/* Large Grid: Options Cards */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold text-[#6b7280] tracking-wide px-1">EXTRAS</span>
            <div className="bg-white rounded-[12px] border border-gray-100 shadow-sm p-4 sm:p-5 flex justify-between items-center">
              <span className="text-black text-[15px]">Additional Driver x 1</span>
              <span className="font-bold text-black text-[15px]">$ 10.00</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold text-[#6b7280] tracking-wide px-1">DAMAGE COVER OPTIONS</span>
            <div className="bg-white rounded-[12px] border border-gray-100 shadow-sm p-4 sm:p-5 flex justify-between items-center">
              <span className="text-black text-[15px]">Standard Damage Waiver @ 0.00 per day</span>
              <span className="font-bold text-black text-[15px]">$ 0.00</span>
            </div>
          </div>
        </div>
        
      </div>

      {/* Mobile Rental Fee Summary Footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-[24px] z-20">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
        </div>
        <div className="p-5 flex flex-col">
          <h3 className="text-[14px] font-bold text-[#6b7280] tracking-wide mb-3">RENTAL FEE SUMMARY</h3>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-black">Daily Rate (6 days @ $43 per day)</span>
              <span className="text-[14px] font-bold text-black">$ 258.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-black">Total Extras</span>
              <span className="text-[14px] font-bold text-black">$ 10.00</span>
            </div>
          </div>

          <div className="mt-3 pt-3 flex flex-col gap-0.5">
            <div className="flex justify-between items-center">
              <span className="text-[15px] font-medium text-[#0061e0]">Total Cost</span>
              <span className="text-[15px] font-bold text-[#0061e0]">$ 280.00</span>
            </div>
            <div className="flex justify-end">
              <span className="text-[12px] text-[#6b7280]">(Inc. GST: $12.00)</span>
            </div>
          </div>

          <Button className="w-full mt-5 bg-[#ffb700] hover:bg-[#e5a400] text-black font-extrabold h-[48px] rounded-[8px] text-[16px]">
            Express Check-in
          </Button>
        </div>
      </div>
    </div>
  );
}
