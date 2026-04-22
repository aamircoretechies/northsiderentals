import { Check } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { normalizeMediaUrl } from '@/lib/helpers';

export function CarsCheckoutSuccessContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { booking, carData, searchParams, locations } = location.state || {};

  const formatDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr || !timeStr) return undefined;
    try {
      const date = String(dateStr).trim();
      const rawTime = String(timeStr).trim();
      const m = rawTime.match(/^(\d{1,2}):(\d{2})/);
      const time = m
        ? (() => {
            const hh = Number(m[1]);
            const mm = m[2];
            const hour24 = ((hh % 24) + 24) % 24;
            const hour12 = hour24 % 12 || 12;
            const ampm = hour24 >= 12 ? 'PM' : 'AM';
            return `${String(hour12).padStart(2, '0')}:${mm} ${ampm}`;
          })()
        : rawTime;
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        return `${day}/${month}/${year} ${time}`;
      }
      return `${date} ${time}`;
    } catch (e) {
      return undefined;
    }
  };

  const getLocationName = (id?: number) => {
    if (!id || !locations) return undefined;
    const loc = locations.find((l: any) => String(l.id) === String(id));
    return loc ? String(loc.location ?? '').trim() : undefined;
  };

  const pDateFormatted =
    formatDateTime(searchParams?.pickup_date, searchParams?.pickup_time) ?? '—';
  const pLocationFormatted =
    getLocationName(searchParams?.pickup_location_id) ?? '—';
  const rDateFormatted =
    formatDateTime(searchParams?.dropoff_date, searchParams?.dropoff_time) ?? '—';
  const rLocationFormatted =
    getLocationName(searchParams?.dropoff_location_id) ?? '—';

  const getDays = (pDate?: string, rDate?: string) => {
    const apiDaysCandidates = [
      carData?.numberofdays,
      carData?.searchMeta?.numberofdays,
      searchParams?.numberofdays,
    ];
    for (const candidate of apiDaysCandidates) {
      const n = Number(candidate ?? 0);
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (!pDate || !rDate) return 0;
    const d1 = new Date(pDate);
    const d2 = new Date(rDate);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    return diff > 0 ? diff : 0;
  };
  const rentalDays = getDays(searchParams?.pickup_date, searchParams?.dropoff_date);
  const carImg = normalizeMediaUrl(carData?.image_url ?? '');

  return (
    <div className="flex flex-col bg-white relative max-w-[600px] mx-auto  text-center justify-between">

      <div className="flex-1 w-full p-6 pt-16 flex flex-col items-center gap-6 ">

        {/* Success Icon */}
        <div className="w-[80px] h-[80px] bg-[#0061e0] rounded-full flex items-center justify-center shadow-sm">
          <Check size={48} strokeWidth={3} className="text-white" />
        </div>

        {/* Headings */}
        <div className="flex flex-col gap-2 mt-2">
          <h1 className="text-[#0061e0] font-bold text-[22px] sm:text-[24px]">Booking Request Submitted</h1>
          <h2 className="text-black font-extrabold text-[18px]">
            Booking ID: {booking?.booking_id ?? '—'}
          </h2>
        </div>

        {/* Description */}
        <p className="text-[#333] text-[15px] leading-relaxed max-w-[400px]">
          Please note your reservation is NOT confirmed until you receive a booking confirmation email from Northside Rentals confirming your vehicle reservation is now booked.
        </p>

        {/* Car Details Card */}
        <div className="bg-[#f0f4f8] rounded-[16px] p-5 flex flex-col gap-5 w-full text-left mt-4">

          <div className="flex items-center gap-4">
            {carImg ? (
              <img
                src={carImg}
                alt={carData?.title || ''}
                loading="lazy"
                className="w-[80px] h-[80px] object-contain rounded-[12px] bg-white p-1 shadow-sm"
              />
            ) : (
              <div className="w-[80px] h-[80px] rounded-[12px] bg-white flex items-center justify-center text-xs text-muted-foreground shadow-sm">
                No image
              </div>
            )}
            <div className="flex flex-col">
              <h3 className="text-black font-extrabold text-[18px]">
                {carData?.title ?? ''}
              </h3>
              <span className="text-[#333] text-[14px]">Rental: {rentalDays} days</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[#6b7280] text-[13px]">Pickup:</span>
              <span className="text-black font-bold text-[14px]">{pDateFormatted}</span>
              <span className="text-[#6b7280] text-[13px] leading-tight">{pLocationFormatted}</span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[#6b7280] text-[13px]">Return:</span>
              <span className="text-black font-bold text-[14px]">{rDateFormatted}</span>
              <span className="text-[#6b7280] text-[13px] leading-tight">{rLocationFormatted}</span>
            </div>
          </div>

        </div>
      </div>
      {/* Footer Buttons */}
      <div className=" p-4 sm:p-6 flex flex-col items-center gap-4">
        <Button
          className="w-full rounded-full py-6 bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[18px] shadow-sm"
          onClick={() => navigate('/cars/search-results-grid')}
        >
          Done
        </Button>
      </div>




    </div>
  );
}
