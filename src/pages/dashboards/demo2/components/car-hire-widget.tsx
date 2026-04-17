import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  MapPin,
  ChevronDown,
  Calendar as CalendarIcon,
  Clock,
  User,
  Tag,
  ChevronsRight,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { addDays, format, parse, startOfDay } from 'date-fns';
import { useCarSearch } from '@/hooks/use-car-search';
import {
  effectiveDropoffWindow,
  effectivePickupWindow,
  filter12hTimeOptions,
  pickOfficeSlot,
} from '@/lib/office-times';
import type { DriverAge, Location, OfficeTimeRecord } from '@/services/dashboard';

interface CarHireWidgetProps {
  locations?: Location[];
  driverAges?: DriverAge[];
  officetimes?: OfficeTimeRecord[];
}

const ALL_TIME_OPTIONS = [
  '05:00 AM',
  '06:00 AM',
  '07:00 AM',
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
  '09:00 PM',
  '10:00 PM',
  '11:00 PM',
];

export function CarHireWidget({
  locations = [],
  driverAges = [],
  officetimes = [],
}: CarHireWidgetProps) {
  const [pickupLocation, setPickupLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  const [selectedDriverAge, setSelectedDriverAge] = useState('');

  useEffect(() => {
    if (!locations.length) {
      setPickupLocation('');
      setReturnLocation('');
      return;
    }
    const def = locations.find((l) => l.isdefault)?.id ?? locations[0].id;
    const s = String(def);
    setPickupLocation(s);
    setReturnLocation(s);
  }, [locations]);

  useEffect(() => {
    if (!driverAges.length) {
      setSelectedDriverAge('');
      return;
    }
    const lastAge = driverAges[driverAges.length - 1];
    setSelectedDriverAge(String(lastAge.id));
  }, [driverAges]);

  const [pickupDate, setPickupDate] = useState<Date>(() => startOfDay(new Date()));
  const [returnDate, setReturnDate] = useState<Date>(() =>
    addDays(startOfDay(new Date()), 2),
  );
  const [pickupTime, setPickupTime] = useState('09:00 AM');
  const [returnTime, setReturnTime] = useState('09:00 AM');
  const [promoCode, setPromoCode] = useState('');

  const navigate = useNavigate();
  const { searchCars, loading } = useCarSearch();

  const pickupLoc = useMemo(
    () => locations.find((l) => String(l.id) === pickupLocation),
    [locations, pickupLocation],
  );

  const minPickupDate = useMemo(() => {
    const n = pickupLoc?.noticerequired_numberofdays ?? 0;
    return addDays(startOfDay(new Date()), n);
  }, [pickupLoc]);

  const minReturnDate = useMemo(() => {
    const m = pickupLoc?.minimumbookingday ?? 0;
    return addDays(startOfDay(pickupDate), m);
  }, [pickupLoc, pickupDate]);

  const pickupSlot = useMemo(() => {
    if (!pickupLocation || !officetimes.length) return null;
    return pickOfficeSlot(officetimes, Number(pickupLocation), pickupDate);
  }, [officetimes, pickupLocation, pickupDate]);

  const returnSlot = useMemo(() => {
    if (!returnLocation || !officetimes.length) return null;
    return pickOfficeSlot(officetimes, Number(returnLocation), returnDate);
  }, [officetimes, returnLocation, returnDate]);

  const pickupTimeOptions = useMemo(() => {
    if (!pickupSlot) return ALL_TIME_OPTIONS;
    const w = effectivePickupWindow(pickupSlot);
    return filter12hTimeOptions(ALL_TIME_OPTIONS, w.start, w.end);
  }, [pickupSlot]);

  const returnTimeOptions = useMemo(() => {
    if (!returnSlot) return ALL_TIME_OPTIONS;
    const w = effectiveDropoffWindow(returnSlot);
    return filter12hTimeOptions(ALL_TIME_OPTIONS, w.start, w.end);
  }, [returnSlot]);

  useEffect(() => {
    if (!pickupTimeOptions.includes(pickupTime)) {
      setPickupTime(pickupTimeOptions[0] ?? '09:00 AM');
    }
  }, [pickupTimeOptions, pickupTime]);

  useEffect(() => {
    if (!returnTimeOptions.includes(returnTime)) {
      setReturnTime(returnTimeOptions[0] ?? '09:00 AM');
    }
  }, [returnTimeOptions, returnTime]);

  useEffect(() => {
    if (!pickupDate || !returnDate) return;
    if (returnDate < minReturnDate) {
      setReturnDate(minReturnDate);
    }
  }, [pickupDate, returnDate, minReturnDate]);

  const handleFindCars = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!pickupDate || !returnDate) return;
    if (!pickupLocation || !returnLocation || !selectedDriverAge) return;
    if (returnDate < minReturnDate) return;

    try {
      const formattedPickupTime = format(
        parse(pickupTime, 'hh:mm a', new Date()),
        'HH:mm',
      );
      const formattedReturnTime = format(
        parse(returnTime, 'hh:mm a', new Date()),
        'HH:mm',
      );

      const params = {
        pickup_location_id: parseInt(pickupLocation, 10),
        dropoff_location_id: parseInt(returnLocation, 10),
        pickup_date: format(pickupDate, 'yyyy-MM-dd'),
        pickup_time: formattedPickupTime,
        dropoff_date: format(returnDate, 'yyyy-MM-dd'),
        dropoff_time: formattedReturnTime,
        category_id: 0,
        age_id: parseInt(selectedDriverAge, 10),
        campaigncode: promoCode,
        promocode: promoCode,
        couponcode: promoCode,
      };

      const result = await searchCars(params);
      navigate('/cars/search-results-grid', {
        state: {
          searchData: result,
          searchParams: params,
          locations,
        },
      });
    } catch (error) {
      console.error('Failed to search cars:', error);
    }
  };

  const canSearch =
    Boolean(pickupLocation) &&
    Boolean(returnLocation) &&
    Boolean(selectedDriverAge) &&
    Boolean(pickupDate) &&
    Boolean(returnDate) &&
    returnDate >= minReturnDate;

  return (
    <div className="mx-auto flex w-full flex-col gap-4 font-sans">
      <div className="relative flex w-full flex-col gap-6 rounded-[24px] bg-[#ffc107] p-6 text-black shadow-sm">
        <h2 className="text-[22px] font-extrabold text-black">Car Hire</h2>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Select
              value={pickupLocation || undefined}
              onValueChange={setPickupLocation}
              disabled={!locations.length}
            >
              <SelectTrigger className="h-auto w-full cursor-pointer gap-4 rounded-xl border-none bg-white p-4 text-left font-sans shadow-none hover:bg-gray-50 focus:ring-0 [&>svg:last-child]:hidden">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="shrink-0 text-[#0061e0]">
                    <MapPin className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 truncate text-[12px] font-bold uppercase tracking-wide text-slate-500">
                      Pickup Location
                    </div>
                    <div className="truncate text-[16px] font-bold text-black">
                      <SelectValue
                        placeholder={
                          locations.length ? 'Select location' : 'No locations'
                        }
                      />
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" strokeWidth={2.5} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={String(location.id)} value={String(location.id)}>
                    {location.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={returnLocation || undefined}
              onValueChange={setReturnLocation}
              disabled={!locations.length}
            >
              <SelectTrigger className="h-auto w-full cursor-pointer gap-4 rounded-xl border-none bg-white p-4 text-left font-sans shadow-none hover:bg-gray-50 focus:ring-0 [&>svg:last-child]:hidden">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="shrink-0 text-[#0061e0]">
                    <MapPin className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 truncate text-[12px] font-bold uppercase tracking-wide text-slate-500">
                      Return Location
                    </div>
                    <div className="truncate text-[16px] font-bold text-black">
                      <SelectValue
                        placeholder={
                          locations.length ? 'Select location' : 'No locations'
                        }
                      />
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" strokeWidth={2.5} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={String(location.id)} value={String(location.id)}>
                    {location.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <div className="mb-1 pl-1 text-[13px] font-bold uppercase tracking-widest text-black">
                  Pickup Date & Time
                </div>
                <div className="flex flex-col items-stretch overflow-hidden rounded-xl border border-transparent bg-white shadow-sm sm:h-[64px] sm:flex-row sm:items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-full flex-1 items-center gap-3 border-none px-4 py-3 text-left hover:bg-gray-50 focus:outline-none sm:py-0"
                      >
                        <CalendarIcon
                          className="h-[22px] w-[22px] shrink-0 text-[#0061e0]"
                          strokeWidth={2}
                        />
                        <span className="truncate text-[16px] font-bold text-black">
                          {pickupDate ? format(pickupDate, 'dd/MM/yyyy') : 'Select Date'}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={pickupDate}
                        onSelect={(d) => d && setPickupDate(startOfDay(d))}
                        initialFocus
                        disabled={(date) => startOfDay(date) < minPickupDate}
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="h-[1px] w-full bg-amber-400/30 sm:h-[60%] sm:w-[1px]" />

                  <Select value={pickupTime} onValueChange={setPickupTime}>
                    <SelectTrigger className="h-full flex-[0.8] cursor-pointer items-center gap-3 rounded-none border-none bg-transparent px-4 py-3 text-left font-sans shadow-none hover:bg-gray-50 focus:ring-0 sm:py-0 [&>svg:last-child]:hidden">
                      <Clock
                        className="h-[22px] w-[22px] shrink-0 text-[#0061e0]"
                        strokeWidth={2}
                      />
                      <span className="truncate text-[16px] font-bold text-black">
                        <SelectValue placeholder="Time" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {pickupTimeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="mb-1 pl-1 text-[13px] font-bold uppercase tracking-widest text-black">
                  Return Date & Time
                </div>
                <div className="flex flex-col items-stretch overflow-hidden rounded-xl border border-transparent bg-white shadow-sm sm:h-[64px] sm:flex-row sm:items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-full flex-1 items-center gap-3 border-none px-4 py-3 text-left hover:bg-gray-50 focus:outline-none sm:py-0"
                      >
                        <CalendarIcon
                          className="h-[22px] w-[22px] shrink-0 text-[#0061e0]"
                          strokeWidth={2}
                        />
                        <span className="truncate text-[16px] font-bold text-black">
                          {returnDate ? format(returnDate, 'dd/MM/yyyy') : 'Select Date'}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={returnDate}
                        onSelect={(d) => d && setReturnDate(startOfDay(d))}
                        initialFocus
                        disabled={(date) => startOfDay(date) < minReturnDate}
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="h-[1px] w-full bg-amber-400/30 sm:h-[60%] sm:w-[1px]" />

                  <Select value={returnTime} onValueChange={setReturnTime}>
                    <SelectTrigger className="h-full flex-[0.8] cursor-pointer items-center gap-3 rounded-none border-none bg-transparent px-4 py-3 text-left font-sans shadow-none hover:bg-gray-50 focus:ring-0 sm:py-0 [&>svg:last-child]:hidden">
                      <Clock
                        className="h-[22px] w-[22px] shrink-0 text-[#0061e0]"
                        strokeWidth={2}
                      />
                      <span className="truncate text-[16px] font-bold text-black">
                        <SelectValue placeholder="Time" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {returnTimeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="mt-1">
              <Select
                value={selectedDriverAge || undefined}
                onValueChange={setSelectedDriverAge}
                disabled={!driverAges.length}
              >
                <SelectTrigger className="h-auto w-auto cursor-pointer gap-3 border-none bg-transparent p-0 pl-1 shadow-none hover:bg-transparent focus:ring-0 [&>svg:last-child]:hidden">
                  <User className="h-7 w-7 shrink-0 text-black" strokeWidth={2} />
                  <span className="text-[16px] text-black capitalize">DRIVER&apos;S AGE</span>
                  <span className="ml-1 text-[18px] font-extrabold text-black">
                    <SelectValue placeholder="Select" />
                  </span>
                  <ChevronDown className="ml-1 h-5 w-5 shrink-0 text-black" />
                </SelectTrigger>
                <SelectContent>
                  {driverAges.map((age, index) => {
                    const isLast = index === driverAges.length - 1;
                    const ageStr = String(age.driverage);
                    const displayAge =
                      isLast && !ageStr.endsWith('+') ? `${ageStr}+` : ageStr;
                    return (
                      <SelectItem key={String(age.id)} value={String(age.id)}>
                        {displayAge}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex h-[64px] items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
              <Tag className="h-6 w-6 shrink-0 text-[#0061e0]" strokeWidth={2} />
              <div className="w-full flex-1">
                <input
                  type="text"
                  placeholder="Apply Promo Code (If Any...)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="w-full border-none bg-transparent p-0 text-[16px] font-medium text-black placeholder:text-gray-500 focus:outline-none focus:ring-0"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFindCars}
          disabled={loading || !canSearch}
          className="group mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-[#0067B2] py-5 font-sans shadow-sm transition-colors hover:bg-[#0067B2] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-[20px] font-bold text-black">
            {loading ? 'Searching...' : 'Find Cars'}
          </span>
          {!loading && (
            <ChevronsRight
              className="h-7 w-7 text-black transition-transform group-hover:translate-x-1"
              strokeWidth={2.5}
            />
          )}
        </button>
      </div>
    </div>
  );
}
