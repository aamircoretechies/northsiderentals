import { useNavigate } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useDashboardData } from '@/hooks/use-dashboard-data';

export interface FeaturedCar {
  id: number | string;
  title: string;
  description: string;
  daily_rate: string;
  image_url: string;
  link?: string;
  rate_description: string;
  slug?: string;
  transmission?: string;
  year?: string;
  discount_price?: string;
}

interface FeaturedCarsProps {
  cars?: FeaturedCar[];
  locations?: any[];
  searchParams?: any;
}

export function FeaturedCars({ cars, locations, searchParams }: FeaturedCarsProps) {
  const navigate = useNavigate();
  const { data: dashboardData } = useDashboardData();

  const carsToRender: FeaturedCar[] = cars || [];

  if (!carsToRender || carsToRender.length === 0) {
    return (
      <div className="w-full flex flex-col gap-4">
        <h2 className="text-xl font-bold">Featured Cars</h2>
        <div className="text-center text-gray-500">No featured cars available.</div>
      </div>
    );
  }

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    // Format without cents if it's a whole number, e.g. "38.00" -> "38"
    return `$${num % 1 === 0 ? num.toFixed(0) : num.toFixed(2)}`;
  };

  const handleCarClick = (car: FeaturedCar) => {
    // Default search parameters if not provided
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 8);

    const locList = locations?.length ? locations : dashboardData?.locations;
    const defaultLoc =
      locList?.find((l: { isdefault?: boolean }) => l.isdefault)?.id ??
      locList?.[0]?.id;
    const ages = dashboardData?.driverages;
    const defaultAge =
      ages?.find((a) => a.isdefault)?.id ?? ages?.[0]?.id ?? 0;

    if (!defaultLoc || !defaultAge) {
      return;
    }

    const defaultSearchParams = {
      pickup_location_id: Number(defaultLoc),
      dropoff_location_id: Number(defaultLoc),
      pickup_date: tomorrow.toISOString().split('T')[0],
      pickup_time: '09:00',
      dropoff_date: nextWeek.toISOString().split('T')[0],
      dropoff_time: '09:00',
      category_id: 0,
      age_id: Number(defaultAge),
    };

    const finalSearchParams = searchParams || defaultSearchParams;

    navigate('/cars/checkout/options', {
      state: {
        car: {
          ...car,
          searchParams: finalSearchParams,
          locations: locList ?? [],
        },
      },
    });
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <h2 className="text-[22px] font-extrabold text-black mb-2">Featured Cars</h2>
      <div className="flex gap-4 lg:gap-6 overflow-x-auto snap-x pb-4 no-scrollbar">
        {carsToRender.map((car) => (
          <div key={String(car.id)} className="shrink-0 snap-center sm:snap-start flex flex-col w-[280px] md:w-[320px]">
            <div className="bg-white rounded-[24px] p-6 flex flex-col mb-4 relative hover:shadow-md transition-shadow group overflow-hidden h-full min-h-[440px]">
              {/* Image Section */}
              <div className="flex items-center justify-center h-[180px] mb-4 w-full relative z-10 transition-transform duration-300 group-hover:scale-105">
                <img
                  src={car.image_url.startsWith('http') ? car.image_url : toAbsoluteUrl(car.image_url)}
                  alt={car.title}
                  className="max-w-full max-h-full object-contain mix-blend-darken"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="text-gray-400 font-bold text-xl">Image</div>';
                  }}
                />
              </div>

              {/* Text Section */}
              <div className="flex flex-col flex-1 z-10">
                <h3 className="text-[20px] font-extrabold text-[#1f2937] leading-tight group-hover:text-[#0061e0] transition-colors">{car.title}</h3>
                <p className="text-[#6b7280] text-[15px] mt-1 mb-5 font-medium">{car.description}</p>

                <div className="mt-auto">
                  <div className="bg-[#ffc107] rounded-[16px] py-4 px-4 flex flex-col items-center justify-center text-black shadow-sm mb-3 hover:bg-[#ffb000] transition-colors cursor-pointer"
                    onClick={() => handleCarClick(car)}>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[36px] font-extrabold leading-none tracking-tight">{formatPrice(car.daily_rate)}</span>
                      <span className="text-[16px] font-bold">/ day</span>
                    </div>
                  </div>
                  <p className="text-center text-[#4B5563] font-semibold text-[14px] uppercase tracking-wide">{car.rate_description}</p>
                </div>
              </div>

              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
