import { ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const vehicleTypes = [
  'All',
  'Small to Mid Size Cars',
  'Large/SUV',
  'People Movers',
  'Light Trucks',
  'Utes/Vans',
];

export interface CarsSearchFilters {
  activeType: string;
  maxPricePerDay: number;
  showAvailable: boolean;
}

export function CarsFiltersSheet({
  trigger,
  value,
  onApply,
  onReset,
}: {
  trigger: ReactNode;
  value: CarsSearchFilters;
  onApply: (next: CarsSearchFilters) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState(value.activeType);
  const [priceRange, setPriceRange] = useState([value.maxPricePerDay]);
  const [showAvailable, setShowAvailable] = useState(value.showAvailable);

  useEffect(() => {
    if (!open) {
      setActiveType(value.activeType);
      setPriceRange([value.maxPricePerDay]);
      setShowAvailable(value.showAvailable);
    }
  }, [value, open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full sm:w-[400px] sm:max-w-none inset-0 sm:inset-5 start-auto h-full sm:h-auto rounded-none sm:rounded-[24px] p-0 bg-white [&_[data-slot=sheet-close]]:top-5 [&_[data-slot=sheet-close]]:end-5 [&_[data-slot=sheet-close]]:bg-[#f4f7fa] [&_[data-slot=sheet-close]]:rounded-full [&_[data-slot=sheet-close]]:p-2 flex flex-col items-stretch">
        <SheetHeader className="py-5 px-6 border-b-0">
          <SheetTitle className="text-center text-[20px] font-bold text-black mt-2">Filters</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-2 flex-grow">
          <ScrollArea className="h-full">
            {/* Vehicle Type Section */}
            <div className="flex flex-col mb-8">
              <span className="text-[14px] font-bold text-[#8692a6] uppercase tracking-wide mb-4">
                VEHICLE TYPE
              </span>
              <div className="flex flex-wrap gap-2.5">
                {vehicleTypes.map((type) => {
                  const isActive = activeType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveType(type)}
                      className={`px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors border shadow-sm ${
                        isActive
                          ? 'bg-[#0061e0] text-white border-[#0061e0]'
                          : 'bg-white text-[#4b5563] border-[#d1d5db] hover:border-[#9ca3af]'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Range Section */}
            <div className="flex flex-col mb-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[14px] font-bold text-[#8692a6] uppercase tracking-wide">
                  PRICE RANGE
                </span>
                <span className="text-[15px] text-[#0061e0] font-bold">
                  ${priceRange[0]} <span className="text-[#8692a6] font-normal">per day</span>
                </span>
              </div>

              <div className="flex justify-between items-center text-[14px] text-[#8692a6] mb-3 px-1">
                <span>$30</span>
                <span>$100</span>
              </div>
              <div className="px-1">
                <Slider
                  min={30}
                  max={100}
                  step={1}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  className="[&_[data-slot=slider-range]]:bg-[#0061e0] [&_[data-slot=slider-thumb]]:bg-[#0061e0] [&_[data-slot=slider-thumb]]:border-[#0061e0] [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-track]]:bg-[#e5e7eb] [&_[data-slot=slider-track]]:h-2.5"
                />
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center justify-between py-2">
              <span className="text-[16px] text-black font-semibold">
                Show only available cars
              </span>
              <Switch 
                checked={showAvailable} 
                onCheckedChange={setShowAvailable} 
                className="data-[state=checked]:bg-[#0061e0]"
              />
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="px-6 pb-8 pt-4 flex flex-col gap-4 border-t-0 justify-end">
          <Button 
            className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[18px] py-7 rounded-full shadow-md"
            onClick={() => {
              onApply({
                activeType,
                maxPricePerDay: priceRange[0],
                showAvailable,
              });
              setOpen(false);
            }}
          >
            Apply Filter
          </Button>
          <button 
            className="w-full text-center text-[#8692a6] font-medium text-[16px] hover:text-[#4b5563] py-2"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
          >
            Reset Filters
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
