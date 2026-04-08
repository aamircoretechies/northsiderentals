import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

import {
  MapPin,
  ChevronDown,
  Calendar as CalendarIcon,
  Clock,
  User,
  Tag,
  ChevronsRight
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
import { format, parse } from 'date-fns';
import { useCarSearch } from '@/hooks/use-car-search';

interface Location {
  id: number | string;
  location: string;
}

interface DriverAge {
  id: number | string;
  driverage: string;
}

interface CarHireWidgetProps {
  locations?: Location[];
  driverAges?: DriverAge[];
}

export function CarHireWidget({ locations = [], driverAges = [] }: CarHireWidgetProps) {
  const [pickupLocation, setPickupLocation] = useState<string>(String(locations?.[0]?.id ?? ''));
  const [returnLocation, setReturnLocation] = useState<string>(String(locations?.[0]?.id ?? ''));
  const [selectedDriverAge, setSelectedDriverAge] = useState<string>(String(driverAges?.[0]?.id ?? ''));

  useEffect(() => {
    if (locations.length > 0 && !pickupLocation) {
      setPickupLocation(String(locations[0].id));
      setReturnLocation(String(locations[0].id));
    }
  }, [locations, pickupLocation]);

  useEffect(() => {
    if (driverAges.length > 0 && !selectedDriverAge) {
      setSelectedDriverAge(String(driverAges[0].id));
    }
  }, [driverAges, selectedDriverAge]);

  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState('09:00 AM');
  const [returnTime, setReturnTime] = useState('09:00 AM');
  const [promoCode, setPromoCode] = useState('');

  const navigate = useNavigate();
  const { searchCars, loading } = useCarSearch();

  const handleFindCars = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!pickupDate || !returnDate) return;

    try {
      const formattedPickupTime = format(parse(pickupTime, "hh:mm a", new Date()), "HH:mm");
      const formattedReturnTime = format(parse(returnTime, "hh:mm a", new Date()), "HH:mm");

      const params = {
        pickup_location_id: parseInt(pickupLocation),
        dropoff_location_id: parseInt(returnLocation),
        pickup_date: format(pickupDate, "yyyy-MM-dd"),
        pickup_time: formattedPickupTime,
        dropoff_date: format(returnDate, "yyyy-MM-dd"),
        dropoff_time: formattedReturnTime,
        category_id: 0,
        age_id: parseInt(selectedDriverAge),
        campaigncode: promoCode,
        promocode: promoCode,
        couponcode: promoCode,
      };

      const result = await searchCars(params);
      navigate('/cars/search-results-grid', {
        state: {
          searchData: result,
          searchParams: params,
          locations: locations
        }
      });
    } catch (error) {
      console.error("Failed to search cars:", error);
    }
  };

  const timeOptions = [
    '05:00 AM', '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM',
  ];

  return (
    <div className="flex flex-col gap-4 font-sans mx-auto w-full">
      <div className="bg-[#ffc107] rounded-[24px] p-6 shadow-sm text-black relative flex flex-col gap-6 w-full">
        <h2 className="text-[22px] font-extrabold text-black">Car Hire</h2>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Pickup Location */}
            <Select value={pickupLocation} onValueChange={setPickupLocation}>
              <SelectTrigger className="bg-white rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer border-none shadow-none h-auto w-full focus:ring-0 [&>svg:last-child]:hidden hover:bg-gray-50 transition-colors text-left font-sans">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="text-[#0061e0] shrink-0">
                    <MapPin className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-0.5 truncate">Pickup Location</div>
                    <div className="text-[16px] font-bold text-black truncate">
                      <SelectValue placeholder="Select Location" />
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" strokeWidth={2.5} />
              </SelectTrigger>
              <SelectContent>
                {locations.length > 0 ? (
                  locations.map((location) => (
                    <SelectItem key={String(location.id)} value={String(location.id)}>{location.location}</SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="1">Welshpool Perth Airport</SelectItem>
                    <SelectItem value="2">Perth City</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Return Location */}
            <Select value={returnLocation} onValueChange={setReturnLocation}>
              <SelectTrigger className="bg-white rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer border-none shadow-none h-auto w-full focus:ring-0 [&>svg:last-child]:hidden hover:bg-gray-50 transition-colors text-left font-sans">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="text-[#0061e0] shrink-0">
                    <MapPin className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-0.5 truncate">Return Location</div>
                    <div className="text-[16px] font-bold text-black truncate">
                      <SelectValue placeholder="Select Location" />
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" strokeWidth={2.5} />
              </SelectTrigger>
              <SelectContent>
                {locations.length > 0 ? (
                  locations.map((location) => (
                    <SelectItem key={String(location.id)} value={String(location.id)}>{location.location}</SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="1">Welshpool Perth Airport</SelectItem>
                    <SelectItem value="2">Perth City</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Pickup Date & Time */}
          <div className="flex flex-col gap-2">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <div className="text-[13px] font-bold text-black uppercase tracking-widest pl-1 mb-1">Pickup Date & Time</div>
                <div className="bg-white rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center sm:h-[64px] shadow-sm overflow-hidden border border-transparent">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex-1 flex items-center gap-3 px-4 py-3 sm:py-0 h-full hover:bg-gray-50 transition-colors text-left border-none focus:outline-none">
                        <CalendarIcon className="w-[22px] h-[22px] text-[#0061e0] shrink-0" strokeWidth={2} />
                        <span className="font-bold text-black text-[16px] truncate">
                          {pickupDate ? format(pickupDate, "dd/MM/yyyy") : "Select Date"}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={pickupDate}
                        onSelect={setPickupDate}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="h-[1px] w-full sm:h-[60%] sm:w-[1px] bg-amber-400/30"></div>

                  <Select value={pickupTime} onValueChange={setPickupTime}>
                    <SelectTrigger className="flex-[0.8] flex items-center gap-3 px-4 py-3 sm:py-0 h-full bg-transparent border-none shadow-none focus:ring-0 [&>svg:last-child]:hidden hover:bg-gray-50 transition-colors cursor-pointer text-left font-sans rounded-none">
                      <Clock className="w-[22px] h-[22px] text-[#0061e0] shrink-0" strokeWidth={2} />
                      <span className="font-bold text-black text-[16px] truncate">
                        <SelectValue placeholder="Time" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>


              <div>
                {/* Return Date & Time */}
                <div className="text-[13px] font-bold text-black uppercase tracking-widest pl-1 mb-1">Return Date & Time</div>
                <div className="bg-white rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center sm:h-[64px] shadow-sm overflow-hidden border border-transparent">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex-1 flex items-center gap-3 px-4 py-3 sm:py-0 h-full hover:bg-gray-50 transition-colors text-left border-none focus:outline-none">
                        <CalendarIcon className="w-[22px] h-[22px] text-[#0061e0] shrink-0" strokeWidth={2} />
                        <span className="font-bold text-black text-[16px] truncate">
                          {returnDate ? format(returnDate, "dd/MM/yyyy") : "Select Date"}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={returnDate}
                        onSelect={setReturnDate}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="h-[1px] w-full sm:h-[60%] sm:w-[1px] bg-amber-400/30"></div>

                  <Select value={returnTime} onValueChange={setReturnTime}>
                    <SelectTrigger className="flex-[0.8] flex items-center gap-3 px-4 py-3 sm:py-0 h-full bg-transparent border-none shadow-none focus:ring-0 [&>svg:last-child]:hidden hover:bg-gray-50 transition-colors cursor-pointer text-left font-sans rounded-none">
                      <Clock className="w-[22px] h-[22px] text-[#0061e0] shrink-0" strokeWidth={2} />
                      <span className="font-bold text-black text-[16px] truncate">
                        <SelectValue placeholder="Time" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Driver's Age */}
            <div className="mt-1">
              <Select value={selectedDriverAge} onValueChange={setSelectedDriverAge}>
                <SelectTrigger className="bg-transparent border-none shadow-none flex items-center gap-3 w-auto p-0 focus:ring-0 hover:bg-transparent [&>svg:last-child]:hidden cursor-pointer h-auto pl-1">
                  <User className="w-7 h-7 text-black shrink-0" strokeWidth={2} />
                  <span className="text-[16px] text-black">Driver's Age</span>
                  <span className="text-[18px] font-extrabold text-black ml-1">
                    <SelectValue placeholder="25+" />
                  </span>
                  <ChevronDown className="w-5 h-5 text-black shrink-0 ml-1" />
                </SelectTrigger>
                <SelectContent>
                  {driverAges.length > 0 ? (
                    driverAges.map((age, index) => {
                      const isLast = index === driverAges.length - 1;
                      const ageStr = String(age.driverage);
                      const displayAge = isLast && !ageStr.endsWith('+')
                        ? `${ageStr}+`
                        : ageStr;
                      return (
                        <SelectItem key={String(age.id)} value={String(age.id)}>{displayAge}</SelectItem>
                      );
                    })
                  ) : (
                    <>
                      <SelectItem value="18-20">18-20</SelectItem>
                      <SelectItem value="21-24">21-24</SelectItem>
                      <SelectItem value="25+">25+</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Promo Code */}
            <div className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm h-[64px]">
              <Tag className="w-6 h-6 text-[#0061e0] shrink-0" strokeWidth={2} />
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="Apply Promo Code (If Any...)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-[16px] text-black placeholder:text-gray-500 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Find Cars Button */}
        <button onClick={handleFindCars} disabled={loading || !pickupDate || !returnDate} className="w-full bg-[#0067B2] hover:bg-[#0067B2] transition-colors rounded-full py-5 flex items-center justify-center gap-2 shadow-sm font-sans mt-2 group border-none cursor-pointer disabled:opacity-100 disabled:cursor-not-allowed">
          <span className="text-[20px] font-bold text-black">{loading ? 'Searching...' : 'Find Cars'}</span>
          {!loading && <ChevronsRight className="w-7 h-7 text-black group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}
