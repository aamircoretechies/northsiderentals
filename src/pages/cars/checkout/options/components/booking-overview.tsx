import { normalizeMediaUrl } from '@/lib/helpers';

export interface BookingOverviewProps {
  carImage: string;
  carTitle: string;
  carSubtitle: string;
  pickupDate: string;
  pickupLocation: string;
  returnDate: string;
  returnLocation: string;
  categoryBadge?: string;
}

export function BookingOverview({
  carImage,
  carTitle,
  carSubtitle,
  pickupDate,
  pickupLocation,
  returnDate,
  returnLocation,
  categoryBadge,
}: BookingOverviewProps) {
  const imgSrc = normalizeMediaUrl(carImage);

  return (
    <div className="flex flex-col mb-4 mt-4">
      <h2 className="text-[#8692a6] font-bold text-[13px] uppercase tracking-wide mb-3">BOOKING OVERVIEW</h2>
      <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-4 flex flex-col relative w-full items-stretch">
        <div className="flex gap-4 mb-4">
          <div className="w-[120px] h-[80px] bg-gradient-to-b from-[#eef6fc] to-[#f4f7fa] rounded-[12px] flex items-center justify-center p-2 shrink-0 ring-1 ring-black/[0.04]">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={carTitle || ''}
                loading="lazy"
                decoding="async"
                className="max-w-full max-h-full object-contain mix-blend-darken"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-[10px] text-muted-foreground text-center px-1">
                No image
              </span>
            )}
          </div>
          <div className="flex flex-col justify-center min-w-0">
            {categoryBadge ? (
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#0061e0] mb-1">
                {categoryBadge}
              </span>
            ) : null}
            <h3 className="font-extrabold text-[15px] sm:text-[16px] text-black leading-tight mb-1">{carTitle}</h3>
            <p className="text-[#6b7280] text-[13px] sm:text-[14px]">{carSubtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="flex flex-col">
            <span className="text-[#6b7280] text-[12px] mb-1">Pickup:</span>
            <span className="text-black font-extrabold text-[13px] sm:text-[14px] leading-tight mb-1">{pickupDate}</span>
            <span className="text-[#8692a6] text-[12px] sm:text-[13px] leading-tight">{pickupLocation}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#6b7280] text-[12px] mb-1">Return:</span>
            <span className="text-black font-extrabold text-[13px] sm:text-[14px] leading-tight mb-1">{returnDate}</span>
            <span className="text-[#8692a6] text-[12px] sm:text-[13px] leading-tight">{returnLocation}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
