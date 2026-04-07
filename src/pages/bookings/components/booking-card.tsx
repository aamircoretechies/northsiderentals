import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';

export interface BookingCardProps {
  reservationNumber: string;
  carName: string;
  carSpecs: string;
  carImage: string;
  pickupDate: string;
  returnDate: string;
  status: 'Allocated' | 'Pending' | 'Completed' | 'Cancelled';
}

export function BookingCard({
  reservationNumber,
  carName,
  carSpecs,
  carImage,
  pickupDate,
  returnDate,
  status
}: BookingCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden flex flex-col w-full">
      {/* Top Section */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
        {/* Car Image Box */}
        <div className="bg-[#f4f5f8] rounded-[12px] p-2 flex items-center justify-center w-full sm:w-[200px] h-[120px] shrink-0">
          <img 
            src={carImage} 
            alt={carName} 
            className="w-full h-full object-contain"
          />
        </div>

        {/* Car & Reservation Details */}
        <div className="flex flex-col justify-center h-full gap-2 sm:gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[#6b7280] text-[14px]">Reservation Number:</span>
            <a href="#" className="font-bold text-[#0061e0] text-[18px] sm:text-[20px] hover:underline">
              {reservationNumber}
            </a>
          </div>
          
          <div className="flex flex-col gap-0.5">
            <h3 className="text-black font-extrabold text-[16px] sm:text-[18px]">
              {carName}
            </h3>
            <span className="text-[#6b7280] text-[14px]">
              {carSpecs}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Date Section */}
      <div className="border-t border-b border-gray-100 grid grid-cols-2">
        <div className="p-4 sm:p-5 flex flex-col gap-1 border-r border-gray-100">
          <span className="text-[#6b7280] text-[15px]">Pickup:</span>
          <span className="text-black font-bold text-[16px] sm:text-[18px]">{pickupDate}</span>
        </div>
        <div className="p-4 sm:p-5 flex flex-col gap-1">
          <span className="text-[#6b7280] text-[15px]">Return:</span>
          <span className="text-black font-bold text-[16px] sm:text-[18px]">{returnDate}</span>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00a651]"></div>
          <span className="text-[#00a651] font-semibold text-[16px]">{status}</span>
        </div>
        <Button 
          className="bg-[#0061e0] hover:bg-[#0052cc] text-white px-6 py-2 h-auto text-[15px] font-medium rounded-[8px]"
          onClick={() => navigate(`/bookings/${reservationNumber}`)}
        >
          View Details
        </Button>
      </div>
    </div>
  );
}
