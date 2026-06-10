import { normalizeMediaUrl } from '@/lib/helpers';

export interface ReservationDetailsProps {
  reservationNumber: string;
  carImage: string;
  carTitle: string;
  carSubtitle: string;
  pickupDate: string;
  pickupLocation: string;
  returnDate: string;
  returnLocation: string;
}

export function ReservationDetails({
  reservationNumber,
  carImage,
  carTitle,
  carSubtitle,
  pickupDate,
  pickupLocation,
  returnDate,
  returnLocation,
}: ReservationDetailsProps) {
  return (
    <div className="flex flex-col relative w-full items-stretch">
      <div className="flex gap-4 mb-1">
        <div className="w-[120px] h-[80px] bg-[#f4f7fa] rounded-[12px] flex items-center justify-center p-2 shrink-0">
          {normalizeMediaUrl(carImage) ? (
            <img
              src={normalizeMediaUrl(carImage)}
              alt="Car"
              className="max-w-full max-h-full object-contain mix-blend-darken"
            />
          ) : (
            <span className="text-[12px] text-[#8692a6]">No image</span>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[#6b7280] text-[13px] mb-0 leading-tight">Reservation Number:</span>
          <span className="text-[#0061e0] font-extrabold text-[15px] sm:text-[16px] leading-tight mb-2">{reservationNumber}</span>
          <h3 className="font-extrabold text-[14px] sm:text-[15px] text-black leading-tight mb-1">{carTitle}</h3>
          <p className="text-[#8692a6] text-[12px] sm:text-[13px]">{carSubtitle}</p>
        </div>
      </div>

      <div className="w-full h-px bg-gray-100 my-2" />

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <span className="text-[#8692a6] text-[12px] mb-1">Pickup:</span>
          <span className="text-black font-bold text-[12px] leading-tight mb-1">{pickupDate}</span>
          <span className="text-[#8692a6] text-[12px] leading-tight">{pickupLocation}</span>
        </div>
        <div className="flex flex-col border-l border-gray-100 pl-4">
          <span className="text-[#8692a6] text-[12px] mb-1">Return:</span>
          <span className="text-black font-bold text-[12px] leading-tight mb-1">{returnDate}</span>
          <span className="text-[#8692a6] text-[12px] leading-tight">{returnLocation}</span>
        </div>
      </div>
    </div>
  );
}
