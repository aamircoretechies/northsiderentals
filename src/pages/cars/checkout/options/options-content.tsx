import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { BookingOverview } from './components/booking-overview';
import { OptionalExtras, OptionalExtraItem } from './components/optional-extras';
import { DamageCoverOptions, DamageCoverItem } from './components/damage-cover-options';
import { RentalFeeSummary } from './components/rental-fee-summary';
import { EmailQuoteModal } from './components/email-quote-modal';
import { carsService } from '@/services/cars';
import { ContentLoader } from '@/components/common/content-loader';

function gstIncludedInTotal(total: number, taxRate: number): number {
  if (total <= 0 || taxRate <= 0) return 0;
  return (total * taxRate) / (1 + taxRate);
}

function concatFeeDescription(row: Record<string, unknown>): string {
  const parts = [
    row.feedescription,
    row.feedescription1,
    row.feedescription2,
    row.feedescription3,
  ]
    .map((x) => String(x ?? '').trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).join('\n\n');
}

export function CarsCheckoutOptionsContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const carData = location.state?.car;

  const searchParams = carData?.searchParams;
  const locations = carData?.locations;

  const formatDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr || !timeStr) return undefined;
    try {
      const [year, month, day] = dateStr.split('-');
      const [hourStr, minuteStr] = timeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${day}/${month}/${year} ${formattedHour}:${minuteStr} ${ampm}`;
    } catch (e) {
      return undefined;
    }
  };

  const getLocationName = (id?: number) => {
    if (!id || !locations) return undefined;
    const loc = locations.find((l: any) => String(l.id) === String(id));
    return loc ? loc.location : undefined;
  };

  const pDateFormatted =
    formatDateTime(searchParams?.pickup_date, searchParams?.pickup_time) ?? '—';
  const pLocationFormatted =
    getLocationName(searchParams?.pickup_location_id) ?? '—';
  const rDateFormatted =
    formatDateTime(searchParams?.dropoff_date, searchParams?.dropoff_time) ?? '—';
  const rLocationFormatted =
    getLocationName(searchParams?.dropoff_location_id) ?? '—';

  const dailyRate = carData?.discount_price
    ? Number(carData.discount_price)
    : 0;

  const getDays = (pDate?: string, rDate?: string) => {
    if(!pDate || !rDate) return 6;
    const d1 = new Date(pDate);
    const d2 = new Date(rDate);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    return diff > 0 ? diff : 1;
  };
  const rentalDays = getDays(searchParams?.pickup_date, searchParams?.dropoff_date);

  const [extras, setExtras] = useState<OptionalExtraItem[]>([]);
  const [damageOptions, setDamageOptions] = useState<DamageCoverItem[]>([]);
  const [selectedDamageOption, setSelectedDamageOption] = useState('std');
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchDetails() {
      if (!carData || !searchParams) {
        if (active) setLoadingDetails(false);
        return;
      }
      try {
        if (active) setLoadingDetails(true);
        const requestData = {
          vehicle_reference: carData.id,
          category_id: searchParams.category_id || 0,
          pickup_location_id: searchParams.pickup_location_id,
          dropoff_location_id: searchParams.dropoff_location_id,
          pickup_date: searchParams.pickup_date,
          pickup_time: searchParams.pickup_time,
          dropoff_date: searchParams.dropoff_date,
          dropoff_time: searchParams.dropoff_time,
          age_id: searchParams.age_id || 0
        };
        const response = await carsService.getVehicleDetails(requestData);
        if (active && response.data) {
          const fetchedExtras = response.data.optionalfees || [];
          setExtras(fetchedExtras.map((fee: any) => {
            const feeDays = fee.numberofdays || rentalDays || 1;
            const price = fee.type === 'Daily' ? (fee.fees || 0) * feeDays : (fee.totalfeeamount || fee.fees || 0);
            return {
              id: String(fee.id),
              name: fee.name,
              price: price,
              type: fee.name.toLowerCase().includes('driver') ? 'quantity' : 'toggle',
              quantity: 0,
              selected: false,
              description: concatFeeDescription(fee as Record<string, unknown>),
            };
          }));

          const fetchedDamage = response.data.insuranceoptions || [];
          const mappedDamage = fetchedDamage.map((ins: any) => {
            const insDays = ins.numberofdays || rentalDays || 1;
            const perDay = Number(ins.fees ?? ins.price ?? 0);
            const totalFromApi = ins.totalinsuranceamount ?? ins.total_price;
            
            const totalCost = totalFromApi != null ? Number(totalFromApi) : (ins.type === 'Daily' ? perDay * insDays : perDay);

            return {
              id: String(ins.id),
              name: ins.name,
              cost: totalCost,
              description: concatFeeDescription(ins as Record<string, unknown>),
            };
          });
          setDamageOptions(mappedDamage);
          if (mappedDamage.length > 0) {
            setSelectedDamageOption(mappedDamage[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load vehicle details', err);
      } finally {
        if (active) setLoadingDetails(false);
      }
    }
    fetchDetails();
    return () => { active = false; };
  }, [carData, searchParams, rentalDays]);

  const toggleExtra = (id: string, select: boolean) => {
    setExtras((current) =>
      current.map((e) => (e.id === id ? { ...e, selected: select } : e))
    );
  };

  const updateQuantity = (id: string, qty: number) => {
    setExtras((current) =>
      current.map((e) => (e.id === id ? { ...e, quantity: qty } : e))
    );
  };

  // Calculate extras cost (quantity based + selected toggle-base)
  const totalOptionalExtras = extras.reduce((sum, e) => {
    if (e.type === 'quantity') return sum + e.price * (e.quantity || 0);
    if (e.type === 'toggle' && e.selected) return sum + e.price;
    return sum;
  }, 0);

  const selectedDamageOptionData = damageOptions.find(d => d.id === selectedDamageOption);
  const totalDamageCover = selectedDamageOptionData ? selectedDamageOptionData.cost : 0;
  
  const totalExtras = totalOptionalExtras + totalDamageCover;

  const currencySymbol =
    carData?.searchMeta?.currency_symbol ??
    carData?.currency_symbol ??
    '$';
  const taxRate = carData?.searchMeta?.taxrate ?? 0.1;
  const taxInclusive = carData?.searchMeta?.taxinclusive !== false;
  const rentalSubtotal = rentalDays * dailyRate;
  const totalCostEstimate = rentalSubtotal + totalExtras;
  const gstAmount =
    taxInclusive && totalCostEstimate > 0
      ? gstIncludedInTotal(totalCostEstimate, taxRate)
      : 0;

  const carSubtitle = [
    carData?.transmission,
    carData?.year ? `${carData.year} Model` : '',
  ]
    .filter(Boolean)
    .join(', ');

  if (loadingDetails) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <ContentLoader />
      </div>
    );
  }

  const actionButtons = (
    <div className="grid grid-cols-2 gap-4 mt-6">
      <EmailQuoteModal
        carData={carData}
        searchParams={searchParams}
        extras={extras}
        selectedDamageOption={selectedDamageOption}
        trigger={
          <Button
            variant="outline"
            className="w-full border-[#0061e0] text-[#0061e0] bg-white hover:bg-[#0061e0] hover:text-white font-bold text-[16px] py-4 sm:py-6 rounded-full"
          >
            Email Quote
          </Button>
        }
      />
      <Button
        className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-4 sm:py-6 rounded-full shadow-md"
        onClick={() => navigate('/cars/checkout/details', { state: { carData, extras, damageOptions, selectedDamageOption, searchParams, locations } })}
      >
        Make a Booking
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-full pb-[250px] relative">
      {/* Header */}


      <div className="flex-1 w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Small Grid: Booking & Fee Summary */}
        <div className="col-span-1 flex flex-col gap-6 lg:order-last">
          <BookingOverview
            carImage={carData?.image_url ?? ''}
            carTitle={carData?.title ?? 'Vehicle'}
            carSubtitle={carSubtitle || '—'}
            categoryBadge={carData?.subtitle}
            pickupDate={pDateFormatted}
            pickupLocation={pLocationFormatted}
            returnDate={rDateFormatted}
            returnLocation={rLocationFormatted}
          />

          <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-4 hidden lg:flex flex-col">
            <RentalFeeSummary
              days={rentalDays}
              dailyRate={dailyRate}
              totalExtras={totalExtras}
              gstAmount={gstAmount}
              currencySymbol={currencySymbol}
            >
              {actionButtons}
            </RentalFeeSummary>
          </div>

          {/* Mobile version of RentalFeeSummary (floating) */}
          <div className="lg:hidden">
            <RentalFeeSummary
              days={rentalDays}
              dailyRate={dailyRate}
              totalExtras={totalExtras}
              gstAmount={gstAmount}
              currencySymbol={currencySymbol}
            >
              {actionButtons}
            </RentalFeeSummary>
          </div>
        </div>

        {/* Large Grid: Options & Buttons */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          <OptionalExtras
            extras={extras}
            onToggle={toggleExtra}
            onUpdateQuantity={updateQuantity}
          />

          <DamageCoverOptions
            options={damageOptions}
            selectedOptionId={selectedDamageOption}
            onSelect={setSelectedDamageOption}
          />
        </div>
      </div>
    </div>
  );
}
